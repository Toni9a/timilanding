import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getAllArtists, getArtistBySlug } from '../../../../lib/artist-data';
import { ExploreContent } from '../../page';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Pre-render every known artist slug at build time; new ones fall back to
// on-demand rendering (revalidated hourly via the fetch cache in artist-data.ts).
export async function generateStaticParams() {
  const artists = await getAllArtists();
  return artists.map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) return { title: 'Artist not found | Timikeys' };

  const title = `${artist.displayName} Piano Covers by Timi | Timikeys`;
  const description = `Listen to Timi's piano covers of ${artist.displayName} songs — ${artist.performances.length} performance${artist.performances.length === 1 ? '' : 's'} recorded live.`;

  return {
    title,
    description,
    alternates: { canonical: `/explore/artist/${slug}` },
    openGraph: { title, description, type: 'music.playlist', url: `/explore/artist/${slug}` },
  };
}

export default async function ArtistPage({ params }: PageProps) {
  const { slug } = await params;
  const artist = await getArtistBySlug(slug);
  if (!artist) notFound();

  const { displayName, performances } = artist;
  const uniqueSongs = Array.from(new Set(performances.map(p => p.songName))).filter(Boolean);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicPlaylist',
    name: `${displayName} Piano Covers by Timi`,
    description: `Piano covers of ${displayName} songs performed by Timi.`,
    numTracks: uniqueSongs.length,
    track: performances.slice(0, 50).map(p => ({
      '@type': 'MusicRecording',
      name: p.songName,
      byArtist: { '@type': 'MusicGroup', name: displayName },
      url: p.tiktokVideoLink,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Primary viewport: the same interactive explore experience, pre-loaded
          with this artist's search so a visitor lands exactly where they would
          have if they'd typed the name themselves. */}
      <Suspense fallback={<div style={{ minHeight: '100vh', background: 'black' }} />}>
        <ExploreContent initialQuery={displayName} />
      </Suspense>

      {/* Crawlable content: real text/links Google can index without running
          JS, and a genuine full track-list for visitors who scroll past the
          player. Not hidden or styled-off-screen — same page, same visitors. */}
      <div style={{ background: 'black', color: 'white', padding: '40px 24px 80px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
          {displayName} Piano Covers by Timi — Full List
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '15px', maxWidth: '560px', margin: '0 auto 24px' }}>
          {uniqueSongs.length} {uniqueSongs.length === 1 ? 'song' : 'songs'} by {displayName}, performed live on piano.
        </p>
        <ul style={{ listStyle: 'none', padding: 0, maxWidth: '480px', margin: '0 auto', textAlign: 'left' }}>
          {uniqueSongs.map(song => {
            const perf = performances.find(p => p.songName === song);
            return (
              <li key={song} style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '8px 0' }}>
                <a href={perf?.tiktokVideoLink} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
                  {song}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
