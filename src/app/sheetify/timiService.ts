import { SpotifyAlbum, SpotifyArtist, SpotifyTrack, TimiVideo, SonicAnalysisResult, SonicPole } from './types';

export async function fetchTimiSongs(): Promise<TimiVideo[]> {
  try {
    const res = await fetch('https://timikeys.up.railway.app/api/v1/performances/search?page=1&limit=3000');
    const json = await res.json();
    return json.data?.data || [];
  } catch (e) {
    console.error("Timi API Error", e);
    return [];
  }
}

export async function hydrateAlbumTracks(token: string, albums: SpotifyAlbum[]): Promise<SpotifyAlbum[]> {
  const topAlbums = albums.slice(0, 10);

  const hydrated = await Promise.all(topAlbums.map(async (album) => {
    try {
      const res = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return { ...album, fullTrackList: data.items || [] };
    } catch (e) {
      console.warn(`Could not fetch tracks for ${album.name}`, e);
      return { ...album, fullTrackList: [] };
    }
  }));

  return [...hydrated, ...albums.slice(10)] as SpotifyAlbum[];
}

export function cleanString(str: string): string {
  if (!str) return "";
  return str.toLowerCase()
    .replace(/\(.*\)/g, '')
    .replace(/\[.*\]/g, '')
    .replace(/-.*/g, '')
    .replace(/feat\..*/g, '')
    .replace(/ft\..*/g, '')
    .trim();
}

export function groupCoversBySong(covers: TimiVideo[]): { displayName: string, versions: string[] }[] {
  const grouped: Record<string, { displayName: string, versions: string[] }> = {};

  covers.forEach(cover => {
    const key = cleanString(cover.songName);
    if (!grouped[key]) {
      grouped[key] = {
        displayName: cover.songName,
        versions: []
      };
    }
    if (!grouped[key].versions.includes(cover.tiktokVideoLink)) {
      grouped[key].versions.push(cover.tiktokVideoLink);
    }
  });

  return Object.values(grouped);
}

export function findMatchesForTrack(track: SpotifyTrack, timiSongs: TimiVideo[]) {
  const directMatches = timiSongs.filter(t => {
    if (t.spotifyId === track.id) return true;
    const tName = cleanString(t.songName);
    const uName = cleanString(track.name);
    const tArtist = t.artistName.toLowerCase();

    const hasArtist = track.artists.some(a => tArtist.includes(a.name.toLowerCase()));

    return hasArtist && (tName === uName || (tName.length > 3 && uName.includes(tName)) || (uName.length > 3 && tName.includes(uName)));
  });

  const artistMatches = timiSongs.filter(t => {
    const tArtist = t.artistName.toLowerCase();
    return track.artists.some(a => tArtist.includes(a.name.toLowerCase()));
  }).filter(t => !directMatches.includes(t));

  artistMatches.sort((a, b) => {
    const tName = track.artists[0]?.name.toLowerCase() || "";
    const startA = a.artistName.toLowerCase().startsWith(tName);
    const startB = b.artistName.toLowerCase().startsWith(tName);
    return (startA === startB) ? 0 : startA ? -1 : 1;
  });

  const groupedDirect = groupCoversBySong(directMatches);
  const groupedArtist = groupCoversBySong(artistMatches);

  return {
    type: groupedDirect.length > 0 ? 'exact' : (groupedArtist.length > 0 ? 'artist' : 'none'),
    matches: groupedDirect.length > 0 ? groupedDirect : groupedArtist.slice(0, 3)
  };
}

export function calculateSonicRange(userArtists: SpotifyArtist[]): SonicAnalysisResult {
  const poles: Record<string, string[]> = {
    'Organic/Folk': ['folk', 'acoustic', 'country', 'singer-songwriter', 'americana'],
    'Electronic': ['edm', 'house', 'techno', 'dance', 'hyperpop', 'synth'],
    'Urban': ['rap', 'hip hop', 'r&b', 'soul', 'trap', 'drill'],
    'Heavy': ['rock', 'metal', 'punk', 'grunge', 'indie rock'],
    'Atmospheric': ['ambient', 'classical', 'jazz', 'cinematic', 'lo-fi']
  };

  const selected: SonicPole[] = [];
  const usedIds = new Set<string>();
  const poleMatches: Record<string, SpotifyArtist[]> = {};

  userArtists.forEach(artist => {
    const genres = artist.genres.join(' ');
    for (const [pole, keywords] of Object.entries(poles)) {
      if (keywords.some(k => genres.includes(k))) {
        if (!poleMatches[pole]) poleMatches[pole] = [];
        poleMatches[pole].push(artist);
      }
    }
  });

  Object.keys(poles).forEach(pole => {
    if (poleMatches[pole]) {
      const candidate = poleMatches[pole].find(a => !usedIds.has(a.id));
      if (candidate) {
        selected.push({ artist: candidate, vibe: pole });
        usedIds.add(candidate.id);
      }
    }
  });

  if (selected.length < 5) {
    userArtists.forEach(artist => {
      if (selected.length >= 5) return;
      if (!usedIds.has(artist.id)) {
        selected.push({ artist, vibe: artist.genres[0] || 'Pop' });
        usedIds.add(artist.id);
      }
    });
  }

  return {
    score: Math.min(100, (selected.length / 5) * 100),
    artists: selected.slice(0, 5)
  };
}
