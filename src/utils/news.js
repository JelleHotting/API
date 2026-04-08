// Bron: Google. (2026, April 8). Antigravity [AI coding assistant]. Sessie met prompt: "zorg dat er maar eens per uur nieuwe artikelen worden gevraagd". Conversatie ID: 053cd16d-9d7e-4f1f-b62b-8e8e04d8cb3d.
import fs from 'node:fs';
import path from 'node:path';

const CACHE_FILE = path.join(process.cwd(), 'news-cache.json');
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

export async function getCachedArticles() {
  const now = Date.now();
  
  // Check if cache file exists
  if (fs.existsSync(CACHE_FILE)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      
      // If cache is not expired, return it
      if (now - cacheData.timestamp < CACHE_DURATION_MS) {
        console.log('Using cached articles (less than 1 hour old)');
        return cacheData.articles;
      }
    } catch (e) {
      console.error('Error reading cache file:', e);
    }
  }

  // Fetch new articles
  console.log('Fetching fresh articles from NewsAPI...');
  const API_KEY = process.env.NEWS_API_KEY || import.meta.env.NEWS_API_KEY;
  const url = `https://newsapi.org/v2/top-headlines?language=en&pageSize=20&apiKey=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const articles = data.articles || [];

    // Save to cache
    const cacheData = {
      timestamp: now,
      articles: articles
    };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));

    return articles;
  } catch (e) {
    console.error('Error fetching articles:', e);
    return [];
  }
}
