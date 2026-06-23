export interface Song {
  title: string;
  artist: string;
  key?: string;
  notes?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface NoteSymbol {
  id: number;
  type: 'quarter' | 'eighth' | 'sixteenth' | 'half' | 'treble';
  y: number;
  xOffset: number;
}

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  images: SpotifyImage[];
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date: string;
  total_tracks: number;
  artists: SpotifyArtist[];
  fullTrackList?: SpotifyTrack[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  album: SpotifyAlbum;
  artists: SpotifyArtist[];
  duration_ms: number;
  popularity: number;
  uri: string;
}

export interface SpotifyProfile {
  id: string;
  display_name: string;
  email: string;
  images: SpotifyImage[];
}

export interface TimiVideo {
  _id?: string;
  songName: string;
  artistName: string;
  tiktokVideoLink: string;
  spotifyId?: string;
}

export interface SonicPole {
  artist: SpotifyArtist;
  vibe: string;
}

export interface SonicAnalysisResult {
  score: number;
  artists: SonicPole[];
}
