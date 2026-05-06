export async function getArticles() {
  // Fetch new articles from Guardian
  const allArticles = await fetchGuardianArticles();
  
  return allArticles.map(article => {
    const id = (article.title || "").toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '').substring(0, 50);
    return { ...article, id };
  });
}

// Bron: The Guardian Open Platform (https://openplatform.theguardian.com/)
// Gebruikt voor het ophalen van wereldwijde nieuwsartikelen
async function fetchGuardianArticles() {
  const API_KEY =
    import.meta.env.GUARDIAN_API_KEY;

  if (!API_KEY) {
    console.warn("GUARDIAN_API_KEY not found in environment");
    return [];
  }

  const url = `https://content.guardianapis.com/search?q=world&order-by=newest&show-fields=trailText&api-key=${API_KEY}&page-size=20`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const results = data.response?.results || [];

    return results.map((item) => ({
      title: item.webTitle,
      description: item.fields?.trailText || "",
      url: item.webUrl,
      source: { name: "The Guardian" },
    }));
  } catch (e) {
    console.error("Error fetching from The Guardian:", e);
    return [];
  }
}
