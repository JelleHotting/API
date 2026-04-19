export async function getArticles() {
  // Fetch new articles from multiple sources
  const [gnewsArticles, guardianArticles] = await Promise.all([
    fetchGNewsArticles(),
    fetchGuardianArticles()
  ]);

  return [...gnewsArticles, ...guardianArticles];
}

async function fetchGNewsArticles() {
  const API_KEY = import.meta.env.GNEWS_API_KEY || process.env.GNEWS_API_KEY || import.meta.env.NEWS_API_KEY || process.env.NEWS_API_KEY;
  const url = `https://gnews.io/api/v4/top-headlines?category=world&lang=en&max=10&apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const articles = data.articles || [];
    return articles;
  } catch (e) {
    console.error('Error fetching from GNews:', e);
    return [];
  }
}

async function fetchGuardianArticles() {
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
