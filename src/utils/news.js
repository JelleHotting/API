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

  // Fetch new articles from multiple sources
  console.log('Fetching fresh articles from GNews and The Guardian...');
  
  const [gnewsArticles, guardianArticles] = await Promise.all([
    fetchGNewsArticles(),
    fetchGuardianArticles()
  ]);

  const allArticles = [...gnewsArticles, ...guardianArticles];

  // Save to cache
  const cacheData = {
    timestamp: now,
    articles: allArticles
  };
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));

  return allArticles;
}

async function fetchGNewsArticles() {
  const API_KEY = import.meta.env.GNEWS_API_KEY || process.env.GNEWS_API_KEY || import.meta.env.NEWS_API_KEY || process.env.NEWS_API_KEY;
  const url = `https://gnews.io/api/v4/top-headlines?category=world&lang=en&max=10&apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const articles = data.articles || [];
    console.log(`GNews articles fetched: ${articles.length}`);
    return articles;
  } catch (e) {
    console.error('Error fetching from GNews:', e);
    return [];
  }
}

async function fetchGuardianArticles() {
  // Debug: toon welke meta keys beschikbaar zijn (optioneel)
  // console.log('Beschikbare env keys:', Object.keys(import.meta.env));
  
  // Gebruik de correcte spelling die nu in .env staat
  const API_KEY = import.meta.env.GUARDIAN_API_KEY || process.env.GUARDIAN_API_KEY;
  
  if (!API_KEY) {
    console.warn('GUARDIAN_API_KEY not found in environment');
    return [];
  }

  const url = `https://content.guardianapis.com/search?q=world&show-fields=trailText&api-key=${API_KEY}&page-size=10`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const results = data.response?.results || [];
    
    console.log(`The Guardian articles fetched: ${results.length}`);
    
    return results.map(item => ({
      title: item.webTitle,
      description: item.fields?.trailText || "",
      url: item.webUrl,
      source: { name: "The Guardian" }
    }));
  } catch (e) {
    console.error('Error fetching from The Guardian:', e);
    return [];
  }
}
