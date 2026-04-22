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
      .forEach(
        (el) => (el.textContent = "API not found, use Chrome with flags."),
      );
    return;
  }

  const newsItems = document.querySelectorAll(".news-item");

  try {
    let session = null;

    for (let i = 0; i < articles.length; i++) {
      const title = articles[i].title || "";
      const description = articles[i].description || "";

      // Cache-sleutel maken op basis van titel (vernieuwd voor polygonen en sentiment)
      const cacheKey = `ai_loc_poly_sent_${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}`;
      const cachedData = localStorage.getItem(cacheKey);

      let data;
      let coords;

      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        data = {
          country: parsed.country,
          city: parsed.city,
          sentiment: parsed.sentiment,
        };
        coords = parsed.coords;
      } else {
        // Alleen sessie aanmaken als we echt de AI nodig hebben
        if (!session) {
          session = await LanguageModel.create({
            initialPrompts: [
              {
                role: "system",
                content: `You are a location and sentiment extractor. Your task is to identify the PRIMARY location where the event in a news article took place and determine the overall positivity of the event.

Return ONLY a raw JSON object (no markdown, no explanation) with these keys:
- "country": the country where the event took place (in English)
- "city": the city or region where the event took place (in English)
- "sentiment": the overall positivity of the event ("positive", "neutral", or "negative")

Rules:
- If multiple locations are mentioned, pick the one where the core event happened
- If only a country is known, set "city" to null
- If the location is truly unknown or the event is global in nature, use "Global" for country and null for city
- Country must be a recognized country name in English (e.g. "Netherlands", not "Dutch" or "Holland")

Example output for global: {"country": "Global", "city": null, "sentiment": "neutral"}
Example output for local: {"country": "France", "city": "Paris", "sentiment": "negative"}`,
              },
            ],
          });
        }
        const query = `Headline: ${title}\nDescription: ${description}`;
        const result = await session.prompt(query);

        try {
          const jsonMatch = result.match(/\{.*\}/s);
          if (!jsonMatch) throw new Error("No JSON found");
          data = JSON.parse(jsonMatch[0]);

          if (data && data.country && data.country !== "Global") {
            coords = await getCoordinates(data.city, data.country);
          }

          // Opslaan in cache
          try {
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                country: data.country,
                city: data.city,
                sentiment: data.sentiment,
                coords: coords,
              }),
            );
          } catch (e) {
            console.warn("Failed to save to cache:", e);
          }
        } catch (e) {
          console.warn("Failed to parse AI location:", result, e);
          continue;
        }
      }

      // UI Update
      const item = newsItems[i];
      if (item) {
        if (data.sentiment) {
          item.classList.add(`sentiment-${data.sentiment}`);
        }

        const textEl = item.querySelector(".location-text");
        const dotEl = item.querySelector(".status-dot");

        if (textEl) {
          if (data.country === "Global") {
            textEl.textContent = "GLOBAL";
            item.classList.add("global");
          } else {
            textEl.textContent = `${data.city && data.city !== "Global" ? data.city + ", " : ""}${data.country || "Unknown"}`;
          }
        }
        if (dotEl) dotEl.classList.add("completed");

        if (map && coords) {
          let mapLayer;

          let itemColor = "color(display-p3 0 1 0.25)"; 
          if (data.sentiment === "neutral")
            itemColor = "color(display-p3 1 0.8 0)";
          else if (data.sentiment === "negative")
            itemColor = "color(display-p3 1 0 0.33)";

          if (coords.geojson ) {
            mapLayer = L.geoJSON(coords.geojson, {
              style: {
                color: itemColor,
                fillColor: itemColor,
                fillOpacity: 0.1,
                weight: 2,
              },
              pointToLayer: function (feature, latlng) {
                return L.circle(latlng, {
                  color: itemColor,
                  fillColor: itemColor,
                  fillOpacity: 0.1,
                  radius: 120000,
                });
              },
            }).addTo(map);
          } else {
            mapLayer = L.circle([coords.lat, coords.lng], {
              color: itemColor,
              fillColor: itemColor,
              fillOpacity: 0.1,
              radius: 120000,
            }).addTo(map);
          }

          // Link mapLayer to its corresponding news item
          mapLayer.on("click", () => {
            // Remove active class from all items
            newsItems.forEach((ni) => ni.classList.remove("active"));

            // Highlight the specific item
            if (item) {
              item.classList.add("active");
              item.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
          });
        }

        item.addEventListener("click", () => {
          // Remove active class from all items
          newsItems.forEach((ni) => ni.classList.remove("active"));

          // Highlight this item
          item.classList.add("active");

          if (coords) {
            // Pan map to location
            map.flyTo([coords.lat, coords.lng], 5, {
              duration: 1.5,
              easeLinearity: 0.25,
            });
          } else if (data.country === "Global") {
            // World View Zoom
            map.flyTo([20, 0], 2, {
              duration: 2,
              easeLinearity: 0.25,
            });
          }
        });

        // Alleen wachten als de AI echt is gebruikt
        if (!cachedData && i < articles.length - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }
  } catch (error) {
    console.error("Error extracting locations:", error);
  }
}

async function getCoordinates(city, country) {
  const query = city && city !== "Global" ? `${city}, ${country}` : country;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&polygon_geojson=1`;
    const response = await fetch(url, {
      headers: {
        "Accept-Language": "en",
      },
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        geojson: data[0].geojson,
      };
    }
  } catch (e) {
    console.warn(`Geocoding failed for ${query}:`, e);
  }
  return null;
}
