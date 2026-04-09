/**
 * Interface with Chrome's LanguageModel API to extract locations from news articles.
 * @param {Array} articles - The list of news articles.
 * @param {L.Map} map - The Leaflet map instance to add circles to.
 */
export async function extractLocations(articles, map) {
  if (!("LanguageModel" in self)) {
    console.warn("LanguageModel not found in self. Check flags.");
    document
      .querySelectorAll(".location-text")
      .forEach((el) => (el.textContent = "API not found, use Chrome with flags."));
    return;
  }

  const newsItems = document.querySelectorAll(".news-item");

  try {
    let session = null;

    for (let i = 0; i < articles.length; i++) {
      const title = articles[i].title || "";
      const description = articles[i].description || "";
      
      // Cache-sleutel maken op basis van titel
      const cacheKey = `ai_loc_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      const cachedData = localStorage.getItem(cacheKey);
      
      let data;
      let coords;

      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        data = { country: parsed.country, city: parsed.city };
        coords = parsed.coords;
      } else {
        // Alleen sessie aanmaken als we echt de AI nodig hebben
        if (!session) {
          session = await LanguageModel.create({
initialPrompts: [
  {
    role: "system",
    content: `You are a location extractor. Your task is to identify the PRIMARY location where the event in a news article took place — not where it was reported from, not the origin of involved parties, but where the event physically occurred.

Return ONLY a raw JSON object (no markdown, no explanation) with these keys:
- "country": the country where the event took place (in English)
- "city": the city or region where the event took place (in English)

Rules:
- If multiple locations are mentioned, pick the one where the core event happened
- If only a country is known, set "city" to null
- If the location is truly unknown or the event is global in nature (e.g. world economy, space, global pandemic), use "Global" for country and null for city
- If only a country is known, set "city" to null
- Country must be a recognized country name in English (e.g. "Netherlands", not "Dutch" or "Holland")

Example output for global: {"country": "Global", "city": null}
Example output for local: {"country": "France", "city": "Paris"}`,
  },
],
          });
        }

        console.log(`AI aan het werk voor: ${title}`);
        const query = `Headline: ${title}\nDescription: ${description}`;
        const result = await session.prompt(query);
        
        try {
          const jsonMatch = result.match(/\{.*\}/s);
          if (!jsonMatch) throw new Error("No JSON found");
          data = JSON.parse(jsonMatch[0]);

          if (data && data.country && data.country !== 'Global') {
            coords = await getCoordinates(data.city, data.country);
          }

          // Opslaan in cache
          localStorage.setItem(cacheKey, JSON.stringify({
            country: data.country,
            city: data.city,
            coords: coords
          }));
        } catch (e) {
          console.warn("Failed to parse AI location:", result, e);
          continue;
        }
      }

      // UI Update
      const item = newsItems[i];
      if (item) {
        const textEl = item.querySelector(".location-text");
        const dotEl = item.querySelector(".status-dot");
        
        if (textEl) {
          if (data.country === 'Global') {
            textEl.textContent = 'GLOBAL';
            item.classList.add('global');
          } else {
            textEl.textContent = `${data.city && data.city !== 'Global' ? data.city + ', ' : ''}${data.country || 'Unknown'}`;
          }
        }
        if (dotEl) dotEl.classList.add("completed");

        if (map && coords) {
          const circle = L.circle([coords.lat, coords.lng], {
            color: '#00ff41',
            fillColor: '#00ff41',
            fillOpacity: 0.1,
            radius: 120000, 
            className: 'radar-pulse'
          }).addTo(map);

          // Link circle to its corresponding news item
          circle.on('click', () => {
             // Remove active class from all items
             newsItems.forEach(ni => ni.classList.remove('active'));
             
             // Highlight the specific item
             if (item) {
               item.classList.add('active');
               item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
             }
          });
        }

        // Link news item to map (now handles global cases too)
        item.addEventListener('click', () => {
           // Remove active class from all items
           newsItems.forEach(ni => ni.classList.remove('active'));
           
           // Highlight this item
           item.classList.add('active');
           
           if (coords) {
             // Pan map to location
             map.flyTo([coords.lat, coords.lng], 5, {
               duration: 1.5,
               easeLinearity: 0.25
             });
           } else if (data.country === 'Global') {
             // World View Zoom
             map.flyTo([20, 0], 2, {
               duration: 2,
               easeLinearity: 0.25
             });
           }
        });
        
        // Alleen wachten als we de AI echt hebben gebruikt
        if (!cachedData && i < articles.length - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  } catch (error) {
    console.error("Error extracting locations:", error);
  }
}

async function getCoordinates(city, country) {
  const query = city && city !== 'Global' ? `${city}, ${country}` : country;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en'
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (e) {
    console.warn(`Geocoding failed for ${query}:`, e);
  }
  return null;
}
