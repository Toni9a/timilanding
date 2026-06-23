'use client';

import { useState, useEffect, useRef } from 'react';
import {
  redirectToAuthCodeFlow,
  getAccessToken,
  fetchProfile,
  fetchTopTracks,
  fetchTopArtists
} from './spotifyService';
import {
  fetchTimiSongs,
  hydrateAlbumTracks,
  findMatchesForTrack,
  calculateSonicRange
} from './timiService';
import {
  mockProfile,
  mockTracks,
  mockTracksShort,
  mockTracksLong,
  mockArtists,
  mockMatchedSongs,
  mockMatchedSongsShort,
  mockMatchedSongsLong,
  mockSonicData
} from './dummyData';
import {
  SpotifyProfile,
  SpotifyTrack,
  SpotifyArtist,
  SpotifyAlbum,
  TimiVideo,
  SonicAnalysisResult
} from './types';

export interface SheetifyDataState {
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  userProfile: SpotifyProfile | null;
  userTracks: SpotifyTrack[];
  userArtists: SpotifyArtist[];
  userAlbums: SpotifyAlbum[];
  timiSongs: TimiVideo[];
  matchedSongs: Array<{ track: SpotifyTrack, matchType: string, matches: { displayName: string; versions: string[] }[] }>;
  sonicData: SonicAnalysisResult | null;
  timeRange: string;
  isDemoMode?: boolean;
}

export function useSheetifyData() {
  const [state, setState] = useState<SheetifyDataState>({
    token: null,
    isAuthenticated: false,
    loading: true,
    userProfile: null,
    userTracks: [],
    userArtists: [],
    userAlbums: [],
    timiSongs: [],
    matchedSongs: [],
    sonicData: null,
    timeRange: 'medium_term',
    isDemoMode: false
  });

  const timiCacheRef = useRef<TimiVideo[]>([]);

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      let token = localStorage.getItem('spotifyToken');

      if (code) {
        const newToken = await getAccessToken(code);
        if (newToken) {
          token = newToken;
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      if (token) {
        setState(prev => ({ ...prev, token, isAuthenticated: true }));
        fetchData(token, 'medium_term');
      } else {
        setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      }
    };

    init();
  }, []);

  const fetchData = async (token: string, range: string) => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      if (timiCacheRef.current.length === 0) {
        timiCacheRef.current = await fetchTimiSongs();
      }
      const timiData = timiCacheRef.current;

      const [profile, tracks, artists] = await Promise.all([
        fetchProfile(token),
        fetchTopTracks(token, range),
        fetchTopArtists(token, range),
      ]);

      const albumMap: Record<string, SpotifyAlbum & { count: number; matchedTracks: SpotifyTrack[] }> = {};
      tracks.forEach(track => {
        const a = track.album;
        if (!albumMap[a.id]) {
          albumMap[a.id] = { ...a, count: 0, matchedTracks: [] };
        }
        albumMap[a.id].count++;
        if (!albumMap[a.id].matchedTracks.find(t => t.id === track.id)) {
          albumMap[a.id].matchedTracks.push(track);
        }
      });
      const albums = Object.values(albumMap).sort((a, b) => b.count - a.count);
      const hydratedAlbums = await hydrateAlbumTracks(token, albums as SpotifyAlbum[]);

      const processedMatches = tracks.map(track => {
        const matchResult = findMatchesForTrack(track, timiData);
        return {
          track,
          matchType: matchResult.type,
          matches: matchResult.matches
        };
      });

      const sonic = calculateSonicRange(artists);

      setState(prev => ({
        ...prev,
        loading: false,
        userProfile: profile,
        userTracks: tracks,
        userArtists: artists,
        userAlbums: hydratedAlbums,
        timiSongs: timiData,
        matchedSongs: processedMatches,
        sonicData: sonic
      }));

    } catch (error) {
      console.error("Error fetching data:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const getDemoDataForRange = (range: string) => {
    switch (range) {
      case 'short_term':
        return { tracks: mockTracksShort, matched: mockMatchedSongsShort, score: 72 };
      case 'long_term':
        return { tracks: mockTracksLong, matched: mockMatchedSongsLong, score: 91 };
      default:
        return { tracks: mockTracks, matched: mockMatchedSongs, score: 85 };
    }
  };

  const setTimeRange = (range: string) => {
    if (state.isDemoMode) {
      const demo = getDemoDataForRange(range);
      setState(prev => ({
        ...prev,
        timeRange: range,
        userTracks: demo.tracks,
        matchedSongs: demo.matched,
        sonicData: { ...mockSonicData, score: demo.score },
      }));
    } else if (state.token) {
      setState(prev => ({ ...prev, timeRange: range }));
      fetchData(state.token, range);
    }
  };

  const login = () => {
    redirectToAuthCodeFlow();
  };

  const enableDemoMode = () => {
    const demo = getDemoDataForRange('medium_term');
    setState(prev => ({
      ...prev,
      loading: false,
      isAuthenticated: true,
      isDemoMode: true,
      userProfile: mockProfile,
      userTracks: demo.tracks,
      userArtists: mockArtists,
      matchedSongs: demo.matched,
      sonicData: mockSonicData,
      token: "demo_token"
    }));
  };

  return {
    ...state,
    setTimeRange,
    login,
    enableDemoMode
  };
}
