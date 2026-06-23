import { SpotifyTrack, SpotifyArtist, SpotifyProfile, SonicAnalysisResult } from './types';

export const mockProfile: SpotifyProfile = {
  id: "demo_user",
  display_name: "Demo Listener",
  email: "demo@example.com",
  images: [{ url: "https://placedog.net/200/200", height: 200, width: 200 }]
};

export const mockArtists: SpotifyArtist[] = [
  { id: "1", name: "Daft Punk", genres: ["electronic", "filter house"], images: [], uri: "spotify:artist:1" },
  { id: "2", name: "Bon Iver", genres: ["folk", "indie", "ambient"], images: [], uri: "spotify:artist:2" },
  { id: "3", name: "Kendrick Lamar", genres: ["rap", "hip hop", "urban"], images: [], uri: "spotify:artist:3" }
];

const mockTrack = (id: string, name: string, artist: typeof mockArtists[0], albumName: string, albumYear: string): SpotifyTrack => ({
  id, name, popularity: 85, duration_ms: 240000, uri: `spotify:track:${id}`,
  album: { id: `a${id}`, name: albumName, images: [], release_date: albumYear, total_tracks: 12, artists: [artist] },
  artists: [artist]
});

export const mockTracks: SpotifyTrack[] = [
  mockTrack("t1", "One More Time", mockArtists[0], "Discovery", "2001"),
  mockTrack("t2", "Holocene", mockArtists[1], "Bon Iver", "2011"),
  mockTrack("t3", "HUMBLE.", mockArtists[2], "DAMN.", "2017"),
  mockTrack("t4", "Get Lucky", mockArtists[0], "Random Access Memories", "2013"),
  mockTrack("t5", "Skinny Love", mockArtists[1], "For Emma, Forever Ago", "2007"),
  mockTrack("t6", "Around the World", mockArtists[0], "Homework", "1997"),
  mockTrack("t7", "Alright", mockArtists[2], "To Pimp a Butterfly", "2015"),
  mockTrack("t8", "Flume", mockArtists[1], "For Emma, Forever Ago", "2007"),
  mockTrack("t9", "Digital Love", mockArtists[0], "Discovery", "2001"),
  mockTrack("t10", "LOYALTY.", mockArtists[2], "DAMN.", "2017"),
  mockTrack("t11", "Instant Crush", mockArtists[0], "Random Access Memories", "2013"),
  mockTrack("t12", "Perth", mockArtists[1], "Bon Iver", "2011"),
  mockTrack("t13", "DNA.", mockArtists[2], "DAMN.", "2017"),
  mockTrack("t14", "Something About Us", mockArtists[0], "Discovery", "2001"),
  mockTrack("t15", "Towers", mockArtists[1], "Bon Iver", "2011"),
];

export const mockTracksShort: SpotifyTrack[] = [
  mockTrack("s1", "Veridis Quo", mockArtists[0], "Discovery", "2001"),
  mockTrack("s2", "Wash.", mockArtists[1], "For Emma, Forever Ago", "2007"),
  mockTrack("s3", "ELEMENT.", mockArtists[2], "DAMN.", "2017"),
  mockTrack("s4", "Technologic", mockArtists[0], "Human After All", "2005"),
  mockTrack("s5", "Roslyn", mockArtists[1], "Blood Bank EP", "2009"),
  mockTrack("s6", "Money Trees", mockArtists[2], "good kid, m.A.A.d city", "2012"),
  mockTrack("s7", "Within", mockArtists[0], "Random Access Memories", "2013"),
  mockTrack("s8", "Stacks", mockArtists[1], "For Emma, Forever Ago", "2007"),
  mockTrack("s9", "FEAR.", mockArtists[2], "DAMN.", "2017"),
  mockTrack("s10", "Harder Better Faster Stronger", mockArtists[0], "Discovery", "2001"),
];

export const mockTracksLong: SpotifyTrack[] = [
  mockTrack("l1", "Aerodynamic", mockArtists[0], "Discovery", "2001"),
  mockTrack("l2", "Re: Stacks", mockArtists[1], "For Emma, Forever Ago", "2007"),
  mockTrack("l3", "Swimming Pools", mockArtists[2], "good kid, m.A.A.d city", "2012"),
  mockTrack("l4", "Da Funk", mockArtists[0], "Homework", "1997"),
  mockTrack("l5", "Michicant", mockArtists[1], "Bon Iver", "2011"),
  mockTrack("l6", "King Kunta", mockArtists[2], "To Pimp a Butterfly", "2015"),
  mockTrack("l7", "Face to Face", mockArtists[0], "Discovery", "2001"),
  mockTrack("l8", "Heavenly Father", mockArtists[1], "22, A Million", "2016"),
  mockTrack("l9", "Bitch, Don't Kill My Vibe", mockArtists[2], "good kid, m.A.A.d city", "2012"),
  mockTrack("l10", "Giorgio by Moroder", mockArtists[0], "Random Access Memories", "2013"),
  mockTrack("l11", "Blood Bank", mockArtists[1], "Blood Bank EP", "2009"),
  mockTrack("l12", "Poetic Justice", mockArtists[2], "good kid, m.A.A.d city", "2012"),
];

const toMatched = (tracks: SpotifyTrack[]) => tracks.map((track, i) => ({
  track,
  matchType: i % 3 === 0 ? 'exact' : i % 3 === 1 ? 'vibe' : 'none',
  matches: [] as { displayName: string; versions: string[] }[]
}));

export const mockMatchedSongs = toMatched(mockTracks);
export const mockMatchedSongsShort = toMatched(mockTracksShort);
export const mockMatchedSongsLong = toMatched(mockTracksLong);

export const mockSonicData: SonicAnalysisResult = {
  score: 85,
  artists: [
    { artist: mockArtists[0], vibe: "Electronic" },
    { artist: mockArtists[1], vibe: "Organic/Folk" },
    { artist: mockArtists[2], vibe: "Urban" }
  ]
};
