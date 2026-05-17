/**
 * Provider using Chrome's built-in AI (Window AI)
 */
class ChromeProvider {
  /**
   * Initializes the Chrome AI session
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    if (!("ai" in self) || !("languageModel" in self.ai)) return false;
    try {
      this.session = await self.ai.languageModel.create({
          initialPrompts: [{ role: "system", content: "You are a location and sentiment extractor. Return raw JSON with keys: country, city, sentiment." }]
      });
      return true;
    } catch (e) {
      console.warn("Chrome AI initialization failed:", e);
      return false;
    }
  }

  /**
   * Analyzes text using Chrome AI
   * @param {string} text - The text to analyze
   * @returns {Promise<Object>} Analyzed data containing country, city, and sentiment
   */
  async analyze(text) {
    const result = await this.session.prompt(text);
    const jsonMatch = result.match(/\{.*\}/s);
    
    if (!jsonMatch) {
      throw new Error("Failed to extract JSON from Chrome AI response");
    }
    
    return JSON.parse(jsonMatch[0]);
  }
}

/**
 * Provider using Transformers.js as a fallback
 */
class TransformersProvider {
  /**
   * Initializes Transformers.js pipelines with dynamic import
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    try {
      // Lazy-load Transformers.js only when needed
      const { pipeline, env } = await import('@xenova/transformers');
      
      // Force remote loading to prevent 404s on local server
      env.allowLocalModels = false;
      env.remoteHost = 'https://huggingface.co';
      env.remotePathTemplate = '{model}/resolve/{revision}/';

      // Load small models for speed and memory efficiency
      this.classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
      this.ner = await pipeline('token-classification', 'Xenova/bert-base-NER');
      
      return true;
    } catch (e) {
      console.error("Transformers.js initialization failed:", e);
      return false;
    }
  }

  /**
   * Analyzes text using Transformers.js
   * @param {string} text - The text to analyze
   * @returns {Promise<Object>} Analyzed data with sentiment and extracted location
   */
  async analyze(text) {
    try {
      const [sentimentResult, nerResult] = await Promise.all([
        this.classifier(text),
        this.ner(text)
      ]);

      // Extract locations from NER results
      // LOC = Location, GPE = Geopolitical Entity
      const locations = nerResult
        .filter(entity => entity.entity === 'B-LOC' || entity.entity === 'I-LOC' || entity.entity === 'B-GPE' || entity.entity === 'I-GPE')
        .map(entity => entity.word.replace('##', '')) // Handle subword tokens
        .join(' ')
        .split(' ')
        .filter(word => word.length > 1);

      // Simple heuristic: first group of location words is the city/country
      const primaryLocation = locations[0] || "Global";

      return {
        country: primaryLocation,
        city: null,
        sentiment: sentimentResult[0].label.toLowerCase()
      };
    } catch (e) {
      console.warn("Transformers.js analysis failed:", e);
      return { country: "Global", city: null, sentiment: "neutral" };
    }
  }
}

/**
 * Factory function to get the best available AI engine
 * @returns {Promise<ChromeProvider|TransformersProvider|null>} The first available AI provider, or null if all fail
 */
export const getAIEngine = async () => {
  const chrome = new ChromeProvider();
  if (await chrome.init()) return chrome;

  const transformers = new TransformersProvider();
  if (await transformers.init()) return transformers;

  console.error("No AI engine available: Both Chrome AI and Transformers.js failed to initialize.");
  return null;
};
