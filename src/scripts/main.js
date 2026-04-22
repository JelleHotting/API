import { initMap } from "./map.js";
import { extractLocations } from "./ai.js";

let mapInstance = null;

document.addEventListener("astro:page-load", async () => {
  // --- Data Retrieval ---
  const newsDataEl = document.getElementById("news-data");
  if (!newsDataEl) return;

  const articles = JSON.parse(newsDataEl.textContent);

  // --- Map Initialization ---
  // If map container exists and doesn't have a map yet, or if we need to re-init
  const mapElement = document.getElementById("map");

  if (mapElement) {
    // Check if Leaflet already initialized this element
    if (!mapElement._leaflet_id) {
      mapInstance = initMap("map");
    }
  }

  // --- AI Logic ---
  if (mapInstance && articles.length > 0) {
    await extractLocations(articles, mapInstance);

    // If we are on a detail page (only one article), fly to it
    if (articles.length === 1) {
      // We need to wait for extractLocations to finish and cache to be available
      // extractLocations already populates markers/polygons.
      // The location data is in articles[0] or we can check the cache.
      const title = articles[0].title || "";
      const cacheKey = `ai_loc_poly_sent_${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        if (parsed.coords) {
          mapInstance.flyTo([parsed.coords.lat, parsed.coords.lng], 5, {
            duration: 2,
            easeLinearity: 0.25,
          });
        }
      }
    }
  }
});
