import type { MetadataRoute } from 'next';
import { getAllArtists } from '../lib/artist-data';

const SITE_URL = 'https://www.timikeys.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/gallery`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/live`, changeFrequency: 'monthly', priority: 0.5 },
  ];

  let artistRoutes: MetadataRoute.Sitemap = [];
  try {
    const artists = await getAllArtists();
    artistRoutes = artists.map(a => ({
      url: `${SITE_URL}/explore/artist/${a.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch {
    // Railway API unreachable at build time — ship the static routes rather than fail the build.
  }

  return [...staticRoutes, ...artistRoutes];
}
