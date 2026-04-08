import { initMap } from './map.js';
import { extractLocations } from './ai.js';

document.addEventListener("DOMContentLoaded", async () => {
  // --- Data Retrieval ---
  const newsDataEl = document.getElementById("news-data");
  
  const articles = JSON.parse(newsDataEl.textContent);

  // --- Map Initialization ---
  const map = initMap("map");


  // --- AI Logic ---
  extractLocations(articles, map);
});
