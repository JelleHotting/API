/**
 * Initializes the Leaflet map.
 * @param {string} elementId - The ID of the HTML element to host the map.
 * @returns {L.Map} The initialized Leaflet map instance.
 */
// Bron: Leaflet JS (https://leafletjs.com/)
// Gebruikt voor het opbouwen en renderen van de interactieve kaart
export function initMap(elementId) {
  if (typeof L === "undefined") {
    console.error("Leaflet (L) is not loaded.");
    return null;
  }

  const map = L.map(elementId, {
    zoomControl: true,
    attributionControl: false,
    minZoom: 3,
    worldCopyJump: true,
    maxBounds: [
      [-85.0511, -10000],
      [85.0511, 10000],
    ],
    maxBoundsViscosity: 1.0,
  }).setView([20, 1], 3);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 20,
    minZoom: 3,
  }).addTo(map);

  return map;
}
