/**
 * Initializes the Leaflet map.
 * @param {string} elementId - The ID of the HTML element to host the map.
 * @returns {L.Map} The initialized Leaflet map instance.
 */
export function initMap(elementId) {
  if (typeof L === "undefined") {
    console.error("Leaflet (L) is not loaded.");
    return null;
  }

  const map = L.map(elementId, {
    zoomControl: true,
    attributionControl: false,
    minZoom: 2,
    worldCopyJump: true,
    maxBounds: [
      [-90, -10000],
      [90, 10000],
    ],
    maxBoundsViscosity: 1.0,
  }).setView([1, 1], 2);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    subdomains: "abcd",
    maxZoom: 8,
    minZoom: 2,
  }).addTo(map);

  return map;
}
