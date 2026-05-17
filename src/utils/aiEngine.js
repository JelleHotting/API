import { pipeline } from '@xenova/transformers';

class ChromeProvider {
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

  async analyze(text) {
    const result = await this.session.prompt(text);
    const jsonMatch = result.match(/\{.*\}/s);
    return JSON.parse(jsonMatch[0]);
  }
}

class TransformersProvider {
  async init() {
    try {
      // Lazy-load models
      this.classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
      return true;
    } catch (e) {
      console.error("Transformers.js initialization failed:", e);
      return false;
    }
  }

  async analyze(text) {
    const sentimentResult = await this.classifier(text);
    // Simplified fallback as discussed in the plan
    return {
      country: "Global",
      city: null,
      sentiment: sentimentResult[0].label.toLowerCase()
    };
  }
}

export const getAIEngine = async () => {
  const chrome = new ChromeProvider();
  if (await chrome.init()) return chrome;

  const transformers = new TransformersProvider();
  await transformers.init();
  return transformers;
};
