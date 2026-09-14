// Server-side helpers for generating SEO artist pages under /explore/artist/[slug]
// Pulls from the same Railway performances API the client-side explore page uses.

import { slugify } from './slugify';
export { slugify };

export interface PerformanceLite {
  id: string;
  videoNo: number;
  tiktokVideoLink: string;
  songName: string;
  artistName: string;
  albumName: string;
  spotifyId: string;
  videoLength: number;
  audioUrl?: string;
  uploadDate?: string;
}

const API_BASE = 'https://timikeys.up.railway.app';

// Cached across requests for `revalidate` seconds via Next's fetch cache.
export async function fetchAllPerformances(): Promise<PerformanceLite[]> {
  const res = await fetch(`${API_BASE}/api/v1/performances/search?q=&page=1&limit=3000`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.data ?? [];
}

export interface ArtistEntry {
  slug: string;
  displayName: string;
}

// Splits comma-joined collab credits ("Drake, 21 Savage") into separate artist entries,
// picking the most common casing seen for each slug as the display name.
export async function getAllArtists(): Promise<ArtistEntry[]> {
  const performances = await fetchAllPerformances();
  const counts = new Map<string, Map<string, number>>(); // slug -> (displayName -> count)

  for (const p of performances) {
    if (!p.artistName) continue;
    for (const raw of p.artistName.split(',')) {
      const name = raw.trim();
      if (!name) continue;
      const slug = slugify(name);
      if (!slug) continue;
      if (!counts.has(slug)) counts.set(slug, new Map());
      const byName = counts.get(slug)!;
      byName.set(name, (byName.get(name) ?? 0) + 1);
    }
  }

  const artists: ArtistEntry[] = [];
  for (const [slug, byName] of counts) {
    let best = '';
    let bestCount = -1;
    for (const [name, count] of byName) {
      if (count > bestCount) {
        best = name;
        bestCount = count;
      }
    }
    artists.push({ slug, displayName: best });
  }
  return artists.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function getArtistBySlug(slug: string): Promise<{
  displayName: string;
  performances: PerformanceLite[];
} | null> {
  const performances = await fetchAllPerformances();
  const matches = performances.filter(p =>
    p.artistName?.split(',').some(name => slugify(name.trim()) === slug)
  );
  if (matches.length === 0) return null;

  const nameCounts = new Map<string, number>();
  for (const p of matches) {
    for (const raw of p.artistName.split(',')) {
      const name = raw.trim();
      if (slugify(name) === slug) {
        nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
      }
    }
  }
  let displayName = '';
  let bestCount = -1;
  for (const [name, count] of nameCounts) {
    if (count > bestCount) {
      displayName = name;
      bestCount = count;
    }
  }

  return { displayName, performances: matches };
}
