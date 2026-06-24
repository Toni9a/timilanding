import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

const RAILWAY_API = 'https://timikeys.up.railway.app';
const SPOTIFY_CONFIG = {
  CLIENT_ID: '1701217b4ef341168d3ac65f11d0f404',
  CLIENT_SECRET: '8f05e06379fc407983b1a262a85d0d32',
};

interface ChartTrack {
  name: string;
  artist: string;
  source: string;
}

interface Recommendation {
  type: 'chart_match' | 'new_release_match' | 'trending_match';
  title: string;
  description: string;
  songName: string;
  artistName: string;
  source: string;
  chartPosition?: number;
  previousCovers: { videoUrl: string; views: number; uploadDate: string }[];
}

async function getSpotifyToken(): Promise<string> {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CONFIG.CLIENT_ID}:${SPOTIFY_CONFIG.CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  return data.access_token;
}

async function getSpotifyNewReleases(token: string): Promise<ChartTrack[]> {
  const res = await fetch('https://api.spotify.com/v1/browse/new-releases?country=GB&limit=30', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return (data.albums?.items || []).map((a: any) => ({
    name: a.name,
    artist: a.artists.map((x: any) => x.name).join(', '),
    source: 'Spotify New Releases',
  }));
}

async function getUKSpotifyChart(): Promise<ChartTrack[]> {
  try {
    const res = await fetch('https://kworb.net/spotify/country/gb_daily.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    const html = await res.text();
    const tableMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (!tableMatch) return [];

    const rows = tableMatch[1].match(/<tr>[\s\S]*?<\/tr>/g) || [];
    return rows.slice(0, 50).map(row => {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      const text = cells[2]?.replace(/<[^>]+>/g, '').trim() || '';
      const parts = text.split(' - ');
      const artist = parts[0]?.trim() || '';
      const name = parts.slice(1).join(' - ').trim() || '';
      return { name, artist, source: 'UK Spotify Daily' };
    }).filter(t => t.name && t.artist);
  } catch {
    return [];
  }
}

async function getGlobalSpotifyChart(): Promise<ChartTrack[]> {
  try {
    const res = await fetch('https://kworb.net/spotify/country/global_daily.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    const html = await res.text();
    const tableMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (!tableMatch) return [];

    const rows = tableMatch[1].match(/<tr>[\s\S]*?<\/tr>/g) || [];
    return rows.slice(0, 50).map(row => {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      const text = cells[2]?.replace(/<[^>]+>/g, '').trim() || '';
      const parts = text.split(' - ');
      const artist = parts[0]?.trim() || '';
      const name = parts.slice(1).join(' - ').trim() || '';
      return { name, artist, source: 'Global Spotify Daily' };
    }).filter(t => t.name && t.artist);
  } catch {
    return [];
  }
}

async function getUSSpotifyChart(): Promise<ChartTrack[]> {
  try {
    const res = await fetch('https://kworb.net/spotify/country/us_daily.html', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    });
    const html = await res.text();
    const tableMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
    if (!tableMatch) return [];

    const rows = tableMatch[1].match(/<tr>[\s\S]*?<\/tr>/g) || [];
    return rows.slice(0, 50).map(row => {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
      const text = cells[2]?.replace(/<[^>]+>/g, '').trim() || '';
      const parts = text.split(' - ');
      const artist = parts[0]?.trim() || '';
      const name = parts.slice(1).join(' - ').trim() || '';
      return { name, artist, source: 'US Spotify Daily' };
    }).filter(t => t.name && t.artist);
  } catch {
    return [];
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
}

function artistMatch(chartArtist: string, coveredArtist: string): boolean {
  const ca = normalize(chartArtist);
  const co = normalize(coveredArtist);
  if (ca === co) return true;
  // Check if any part of a multi-artist credit matches
  const chartParts = ca.split(/[,&]/).map(s => s.trim()).filter(Boolean);
  const coveredParts = co.split(/[,&]/).map(s => s.trim()).filter(Boolean);
  return chartParts.some(cp => coveredParts.some(cop => cp === cop || cp.includes(cop) || cop.includes(cp)));
}

function songMatch(chartSong: string, coveredSong: string): boolean {
  const cs = normalize(chartSong);
  const co = normalize(coveredSong);
  if (cs === co) return true;
  if (cs.includes(co) || co.includes(cs)) return true;
  // Handle parenthetical variants like "song (feat. X)" vs "song"
  const csBase = cs.replace(/\(.*\)/, '').trim();
  const coBase = co.replace(/\(.*\)/, '').trim();
  return csBase === coBase || (csBase.length > 3 && coBase.length > 3 && (csBase.includes(coBase) || coBase.includes(csBase)));
}

export async function GET() {
  try {
    // Fetch all chart data in parallel
    const token = await getSpotifyToken();
    const [ukChart, globalChart, usChart, newReleases] = await Promise.all([
      getUKSpotifyChart(),
      getGlobalSpotifyChart(),
      getUSSpotifyChart(),
      getSpotifyNewReleases(token),
    ]);

    // Get Timmy's covered songs/artists from Railway
    const perfResponse = await fetch(`${RAILWAY_API}/api/v1/performances/search?q=&page=1&limit=3000`);
    const perfData = await perfResponse.json();
    const performances = perfData.data?.data || [];

    // Get snapshots for view counts
    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('video_url, views, upload_date')
      .order('snapshot_date', { ascending: false });

    const viewsByUrl = new Map<string, { views: number; uploadDate: string }>();
    for (const s of snapshots || []) {
      if (!viewsByUrl.has(s.video_url)) {
        viewsByUrl.set(s.video_url, { views: s.views || 0, uploadDate: s.upload_date || '' });
      }
    }

    // Build covered artists and songs sets
    const coveredArtists = new Map<string, { songs: Set<string>; videos: { url: string; songName: string }[] }>();
    const coveredSongs = new Map<string, { artistName: string; videos: { url: string }[] }>();

    for (const p of performances) {
      if (!p.artistName) continue;
      const mainArtist = p.artistName.split(',')[0].trim();
      const url = p.tiktokVideoLink?.split('?')[0] || '';

      const artistEntry = coveredArtists.get(normalize(mainArtist)) || { songs: new Set(), videos: [] };
      if (p.songName) artistEntry.songs.add(p.songName);
      artistEntry.videos.push({ url, songName: p.songName || '' });
      coveredArtists.set(normalize(mainArtist), artistEntry);

      if (p.songName) {
        const songEntry = coveredSongs.get(normalize(p.songName)) || { artistName: mainArtist, videos: [] };
        songEntry.videos.push({ url });
        coveredSongs.set(normalize(p.songName), songEntry);
      }
    }

    const recommendations: Recommendation[] = [];
    const seen = new Set<string>();

    // Check all chart sources
    const allCharts: { tracks: ChartTrack[]; type: 'chart_match' | 'new_release_match' | 'trending_match' }[] = [
      { tracks: ukChart, type: 'chart_match' },
      { tracks: globalChart, type: 'chart_match' },
      { tracks: usChart, type: 'chart_match' },
      { tracks: newReleases, type: 'new_release_match' },
    ];

    for (const { tracks, type } of allCharts) {
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const dedupKey = normalize(track.artist);
        if (seen.has(dedupKey)) continue;

        // Check exact song match first
        let matchType: 'song' | 'artist' | null = null;
        let matchedArtistKey = '';

        for (const [coveredKey] of coveredSongs) {
          if (songMatch(track.name, coveredKey)) {
            matchType = 'song';
            break;
          }
        }

        // Check artist match
        for (const [coveredKey] of coveredArtists) {
          if (artistMatch(track.artist, coveredKey)) {
            matchType = matchType || 'artist';
            matchedArtistKey = coveredKey;
            break;
          }
        }

        if (!matchType) continue;
        seen.add(dedupKey);

        const artistData = coveredArtists.get(matchedArtistKey || normalize(track.artist.split(',')[0].trim()));
        const previousCovers = (artistData?.videos || [])
          .map(v => {
            const stats = viewsByUrl.get(v.url);
            return { videoUrl: v.url, views: stats?.views || 0, uploadDate: stats?.uploadDate || '' };
          })
          .filter(v => v.views > 0)
          .sort((a, b) => b.views - a.views)
          .slice(0, 3);

        const totalPrevViews = previousCovers.reduce((sum, v) => sum + v.views, 0);
        const songCount = artistData?.songs.size || 0;

        const title = matchType === 'song'
          ? `"${track.name}" is charting — you've covered this`
          : `${track.artist} is charting — you've covered ${songCount} of their songs`;

        const description = `Currently on ${track.source} (#${i + 1}). `
          + (previousCovers.length > 0
            ? `Your previous covers got ${totalPrevViews.toLocaleString()} total views. `
            : '')
          + (matchType === 'song'
            ? 'This exact song is trending — a fresh cover could ride the wave.'
            : `You've played ${songCount} of their songs — good time for another.`);

        recommendations.push({
          type,
          title,
          description,
          songName: track.name,
          artistName: track.artist,
          source: track.source,
          chartPosition: i + 1,
          previousCovers,
        });
      }
    }

    // Sort: exact song matches first, then by chart position
    recommendations.sort((a, b) => {
      const aIsSong = a.title.includes("you've covered this") ? 0 : 1;
      const bIsSong = b.title.includes("you've covered this") ? 0 : 1;
      if (aIsSong !== bIsSong) return aIsSong - bIsSong;
      return (a.chartPosition || 999) - (b.chartPosition || 999);
    });

    return NextResponse.json({
      recommendations: recommendations.slice(0, 6),
      charts: {
        ukChart: ukChart.length,
        globalChart: globalChart.length,
        usChart: usChart.length,
        newReleases: newReleases.length,
      },
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
