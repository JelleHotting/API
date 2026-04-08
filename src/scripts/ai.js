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

  try {
    const session = await LanguageModel.create({
      initialPrompts: [
        {
          role: "system",
          content:
            "Identify the country and city from the provided news headline and description. Return ONLY a JSON object with the following keys: 'country' and 'city'. If city or country is unknown, use 'Global'. Respond ONLY with the JSON.",
        },
      ],
    });

    const newsItems = document.querySelectorAll(".news-item");

    for (let i = 0; i < articles.length; i++) {
      const title = articles[i].title || "";
      const description = articles[i].description || "";
      const query = `Headline: ${title}\nDescription: ${description}`;
      const result = await session.prompt(query);
      
      try {
        // Find the JSON block to be safe
        const jsonMatch = result.match(/\{.*\}/s);
        if (!jsonMatch) throw new Error("No JSON found");
        const data = JSON.parse(jsonMatch[0]);

        const item = newsItems[i];
        if (item) {
          const textEl = item.querySelector(".location-text");
          const dotEl = item.querySelector(".status-dot");
          
          if (textEl) {
            textEl.textContent = `${data.city && data.city !== 'Global' ? data.city + ', ' : ''}${data.country}`;
          }
          if (dotEl) dotEl.classList.add("completed");

          // --- Accurate Geocoding ---
          // Use OpenStreetMap's Nominatim to get real coordinates (AI is bad at numbers)
          if (map && data.country !== 'Global') {
            const coords = await getCoordinates(data.city, data.country);
            if (coords) {
              L.circle([coords.lat, coords.lng], {
                color: '#00ff41',
                fillColor: '#00ff41',
                fillOpacity: 0.1,
                radius: 120000, 
                className: 'radar-pulse'
              }).addTo(map);
            }
          }
          
          // Respect Nominatim's rate limit (1 req/sec)
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch (e) {
        console.warn("Failed to parse AI location:", result, e);
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
