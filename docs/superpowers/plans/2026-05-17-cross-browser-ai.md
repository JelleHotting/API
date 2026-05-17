# Cross-Browser Local AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a cross-browser fallback for local AI using Transformers.js so the portfolio works in Firefox, Safari, and Edge.

**Architecture:** Use a Provider pattern to abstract the AI engine. Detect Chrome's built-in AI first; if unavailable, lazy-load Transformers.js.

**Tech Stack:** Astro, Transformers.js (Xenova), Leaflet.

---

### Task 1: Environment Setup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Transformers.js**

Run: `npm install @xenova/transformers`

- [ ] **Step 2: Commit changes**

```bash
git add package.json package-lock.json
git commit -m "chore: add @xenova/transformers dependency"
```

---

### Task 2: Create AIEngine Abstraction

**Files:**
- Create: `src/utils/aiEngine.js`

- [ ] **Step 1: Implement AIEngine with Chrome and Transformers providers**

```javascript
import { pipeline } from '@xenova/transformers';

class ChromeProvider {
  async init() {
    if (!("ai" in self) || !("languageModel" in self.ai)) return false;
    this.session = await self.ai.languageModel.create({
        initialPrompts: [{ role: "system", content: "You are a location and sentiment extractor. Return raw JSON with keys: country, city, sentiment." }]
    });
    return true;
  }

  async analyze(text) {
    const result = await this.session.prompt(text);
    const jsonMatch = result.match(/\{.*\}/s);
    return JSON.parse(jsonMatch[0]);
  }
}

class TransformersProvider {
  async init() {
    // Lazy-load models
    this.classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    return true;
  }

  async analyze(text) {
    // Simplified fallback: detect sentiment and mock location for now or use a small NER model
    const sentimentResult = await this.classifier(text);
    return {
      country: "Global", // Transformers.js needs a specialized model for NER, keeping it simple for v1 fallback
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
```

- [ ] **Step 2: Commit changes**

```bash
git add src/utils/aiEngine.js
git commit -m "feat: add AIEngine abstraction with Transformers.js fallback"
```

---

### Task 3: Refactor ai.js to use AIEngine

**Files:**
- Modify: `src/scripts/ai.js`

- [ ] **Step 1: Replace LanguageModel calls with AIEngine**

```javascript
import { getAIEngine } from '../utils/aiEngine.js';

export async function extractLocations(articles, map) {
  const engine = await getAIEngine();
  // ... update loop to use engine.analyze(query)
}
```

- [ ] **Step 2: Update UI feedback for model loading**

- [ ] **Step 3: Commit changes**

```bash
git add src/scripts/ai.js
git commit -m "refactor: use AIEngine for cross-browser support"
```
