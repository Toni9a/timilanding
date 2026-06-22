'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import SocialMediaIcons from '../../components/SocialMediaIcons';
import { SPOTIFY_CONFIG } from '../../lib/spotify-config';
import UnifiedMenu from '../../components/UnifiedMenu';

interface Genre {
  genre: string;
  genreName: string;
}

interface SongGenre {
  genreId: string;
  performanceId: string;
  Genre: Genre;
}

interface Performance {
  id: string;
  videoNo: number;
  tiktokVideoLink: string;
  songName: string;
  artistName: string;
  albumName: string;
  spotifyId: string;
  videoLength: number;
  YesNo: boolean;
  songGenres: SongGenre[];
  audioUrl?: string;
  uploadDate?: string;
}

interface SearchResponse {
  message: string;
  success: boolean;
  data: {
    data: Performance[];
    totalCount?: number;
  };
}

interface AutocompleteOption {
  value: string;
  type: 'artist' | 'song' | 'album' | 'genre';
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: 'black' }} />}>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Performance[]>([]);
  const [playerTracks, setPlayerTracks] = useState<Performance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [autocompleteOptions, setAutocompleteOptions] = useState<AutocompleteOption[]>([]);
  const [currentAutocomplete, setCurrentAutocomplete] = useState<AutocompleteOption | null>(null);
  const [,setAutocompleteIndex] = useState(0);
  const [preloadedData, setPreloadedData] = useState<{
    artists: Set<string>;
    songs: Set<string>;
    albums: Set<string>;
    genres: Set<string>;
  }>({
    artists: new Set(),
    songs: new Set(),
    albums: new Set(),
    genres: new Set()
  });
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [videoMashupMap, setVideoMashupMap] = useState<Map<number, Performance[]>>(new Map());

  const searchParams = useSearchParams();
  const [audioOnly, setAudioOnly] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [albumCoverUrl, setAlbumCoverUrl] = useState<string | null>(null);
  const [spotifyAlbumUrl, setSpotifyAlbumUrl] = useState<string | null>(null);
  const [mashupSongs, setMashupSongs] = useState<Performance[]>([]);
  const [animatedSongIndex, setAnimatedSongIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const API_BASE = 'https://timikeys.up.railway.app';
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const placeholderSuggestions = [
    'Try "Drake"',
    'Try "r&b"',
    'Try "Radiohead"',
    'Try "neo soul"',
    'Try "Frank Ocean"',
    'Try "soundtrack"',
    'Try "Billie Eilish"',
    'Try "boom bap"',
    'Try "Kanye West"',
    'Try "rock"',
    'Try "Daniel Caesar"',
    'Try "uk rap"',
    'Try "Tyler, The Creator"',
    'Try "pop"',
    'Try "Hans Zimmer"',
    'Try "jazz rap"',
    'Try "SZA"',
    'Try "melodic drill"',
    'Try "The Weeknd"',
    'Try "Michael Jackson"',
    'Try "Kendrick Lamar"',
    'Try "Sade"',
    'Try "Ariana Grande"',
    'Try "Mac Miller"',
    'Try "Coldplay"',
    'Try "Childish Gambino"',
    'Try "Rex Orange County"',
    'Try "Clairo"',
    'Try "Prince"',
    'Try "Justin Bieber"',
    'Try "OutKast"',
  ];

  useEffect(() => {
    if (searchQuery || showResults) return;
    const interval = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % placeholderSuggestions.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [searchQuery, showResults]);

  useEffect(() => {
    if (searchParams.get('audio') === 'true') {
      setAudioOnly(true);
    }
  }, [searchParams]);

  const loadingMessages = [
    "Fetching those notes...",
    "Finding the keys...",
    "Tuning in to the right frequency...",
    "Coming right up...",
    "Searching through Timi's music...",
    "Checking the music library..."
  ];

  useEffect(() => {
    if (currentTrackIndex === null || !playerTracks[currentTrackIndex]) {
      setMashupSongs([]);
      setAnimatedSongIndex(0);
      return;
    }

    const currentTrack = playerTracks[currentTrackIndex];
    const siblings = videoMashupMap.get(currentTrack.videoNo) || [];

    if (siblings.length > 1) {
      const currentFirst = [
        currentTrack,
        ...siblings.filter(s => s.id !== currentTrack.id)
      ];
      setMashupSongs(currentFirst);
    } else {
      setMashupSongs([]);
    }
    setAnimatedSongIndex(0);
  }, [currentTrackIndex, playerTracks, videoMashupMap]);

  // Animate through mashup songs with smart timing
  useEffect(() => {
    if (mashupSongs.length <= 1) return;
    
    // Calculate animation speed: videoLength / (3 * number of songs) - faster than before
    const currentTrack = playerTracks[currentTrackIndex!];
    let videoLength = typeof currentTrack.videoLength === 'number' ? currentTrack.videoLength : 180;
    const delayBetweenSongs = (videoLength / (3 * mashupSongs.length)) * 1000;
    const interval = Math.max(400, delayBetweenSongs); // Min 400ms, faster cycling
    
    const timer = setInterval(() => {
      setAnimatedSongIndex(prev => (prev + 1) % mashupSongs.length);
    }, interval);

    return () => clearInterval(timer);
  }, [mashupSongs, currentTrackIndex, playerTracks]);

  useEffect(() => {
    const preloadSearchData = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/v1/performances/search?q=&page=1&limit=3000`);
        const data: SearchResponse = await response.json();
        const performances = data.data?.data || [];
        
        const artists = new Set<string>();
        const songs = new Set<string>();
        const albums = new Set<string>();
        const genres = new Set<string>();
        
        performances.forEach(perf => {
          if (perf.artistName) artists.add(perf.artistName);
          if (perf.songName) songs.add(perf.songName);
          if (perf.albumName) albums.add(perf.albumName);
          perf.songGenres.forEach(sg => {
            if (sg.Genre.genreName) genres.add(sg.Genre.genreName);
          });
        });
        
        setPreloadedData({ artists, songs, albums, genres });

        const videoMap = new Map<number, Performance[]>();
        performances.forEach(perf => {
          if (!videoMap.has(perf.videoNo)) videoMap.set(perf.videoNo, []);
          videoMap.get(perf.videoNo)!.push(perf);
        });
        setVideoMashupMap(videoMap);
      } catch (error) {
        console.error('Failed to preload search data:', error);
      }
    };
    
    preloadSearchData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setAutocompleteOptions([]);
      setCurrentAutocomplete(null);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const suggestions: AutocompleteOption[] = [];
    
    preloadedData.artists.forEach(artist => {
      if (artist.toLowerCase().includes(query)) suggestions.push({ value: artist, type: 'artist' });
    });
    preloadedData.songs.forEach(song => {
      if (song.toLowerCase().includes(query)) suggestions.push({ value: song, type: 'song' });
    });
    preloadedData.albums.forEach(album => {
      if (album.toLowerCase().includes(query)) suggestions.push({ value: album, type: 'album' });
    });
    preloadedData.genres.forEach(genre => {
      if (genre.toLowerCase().includes(query)) suggestions.push({ value: genre, type: 'genre' });
    });
    
    suggestions.sort((a, b) => {
      const aExact = a.value.toLowerCase().startsWith(query) ? 0 : 1;
      const bExact = b.value.toLowerCase().startsWith(query) ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.value.localeCompare(b.value);
    });
    
    setAutocompleteOptions(suggestions.slice(0, 5));
    if (suggestions.length > 0) {
      setCurrentAutocomplete(suggestions[0]);
      setAutocompleteIndex(0);
    } else {
      setCurrentAutocomplete(null);
    }
  }, [searchQuery, preloadedData]);

  useEffect(() => {
    if (autocompleteOptions.length === 0) return;
    const interval = setInterval(() => {
      setAutocompleteIndex(prev => {
        const newIndex = (prev + 1) % autocompleteOptions.length;
        setCurrentAutocomplete(autocompleteOptions[newIndex]);
        return newIndex;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [autocompleteOptions]);

  const getSpotifyToken = async () => {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CONFIG.CLIENT_ID}:${SPOTIFY_CONFIG.CLIENT_SECRET}`)}`
        },
        body: 'grant_type=client_credentials'
      });
      const data = await response.json();
      setSpotifyToken(data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Failed to get Spotify token:', error);
      return null;
    }
  };

  const getAlbumTrackOrder = async (albumId: string, token: string) => {
    try {
      const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      const trackOrder: {[key: string]: number} = {};
      data.items?.forEach((track: any, index: number) => {
        trackOrder[track.id as string] = index + 1;
      });
      return trackOrder;
    } catch (error) {
      console.error('Failed to get album track order:', error);
      return {};
    }
  };

  const fetchAlbumCover = async (albumName: string, artistName: string) => {
    try {
      const token = spotifyToken || await getSpotifyToken();
      if (!token) return;

      const response = await fetch(
        `https://api.spotify.com/v1/search?q=album:${encodeURIComponent(albumName)}%20artist:${encodeURIComponent(artistName)}&type=album&limit=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      const data = await response.json();
      if (data.albums?.items?.[0]) {
        const album = data.albums.items[0];
        if (album.images?.[0]?.url) {
          setAlbumCoverUrl(album.images[0].url);
        }
        // FIX: Properly get the Spotify URL
        if (album.external_urls?.spotify) {
          setSpotifyAlbumUrl(album.external_urls.spotify);
        }
      }
    } catch (error) {
      console.error('Failed to fetch album cover:', error);
    }
  };

  const smartSortPerformances = async (performances: Performance[], query: string) => {
    let processed = [...performances];
    
    processed.sort((a, b) => {
      if (a.uploadDate && b.uploadDate) {
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      }
      return b.videoNo - a.videoNo;
    });
    
    const albumName = query.toLowerCase().trim();
    const albumSongs = processed.filter(p => p.albumName?.toLowerCase().includes(albumName));
    
    if (albumSongs.length > 3) {
      try {
        const token = spotifyToken || await getSpotifyToken();
        if (token && albumSongs.length > 0 && albumSongs[0].spotifyId) {
          const albumResponse = await fetch(`https://api.spotify.com/v1/tracks/${albumSongs[0].spotifyId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const trackData = await albumResponse.json();
          const albumId = trackData.album?.id;

          if (albumId) {
            const trackOrder = await getAlbumTrackOrder(albumId, token);
            albumSongs.sort((a, b) => (trackOrder[a.spotifyId] || 999) - (trackOrder[b.spotifyId] || 999));
            const otherSongs = processed.filter(p => !p.albumName?.toLowerCase().includes(albumName));
            processed = [...albumSongs, ...otherSongs];
          }
        }
      } catch (error) {
        console.error('Failed to sort by album order:', error);
      }
      await fetchAlbumCover(albumSongs[0].albumName, albumSongs[0].artistName.split(',')[0].trim());
    } else {
      const songGroups = new Map<string, Performance[]>();
      processed.forEach(perf => {
        const key = perf.spotifyId || perf.songName.toLowerCase();
        if (!songGroups.has(key)) songGroups.set(key, []);
        songGroups.get(key)!.push(perf);
      });
      
      const sortedGroups: Performance[] = [];
      songGroups.forEach(group => {
        group.sort((a, b) => {
          if (a.YesNo !== b.YesNo) return a.YesNo ? -1 : 1;
          if (a.uploadDate && b.uploadDate) return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
          return b.videoNo - a.videoNo;
        });
        sortedGroups.push(...group);
      });
      processed = sortedGroups;
    }
    
    processed.sort((a, b) => {
      const aStandalone = (videoMashupMap.get(a.videoNo)?.length ?? 1) === 1 ? 0 : 1;
      const bStandalone = (videoMashupMap.get(b.videoNo)?.length ?? 1) === 1 ? 0 : 1;
      return aStandalone - bStandalone;
    });

    return processed;
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setShowResults(false);
    setError(null);
    setCurrentAutocomplete(null);
    setAlbumCoverUrl(null);
    setSpotifyAlbumUrl(null);
    // Keep currentTrackIndex - don't reset it so player display stays
    
    setTimeout(async () => {
      try {
        const trimmed = query.trim();
        const searchParams = new URLSearchParams({ q: trimmed, page: '1', limit: '3000' });
        const response = await fetch(`${API_BASE}/api/v1/performances/search?${searchParams}`);
        if (!response.ok) throw new Error(`Search failed: ${response.status} ${response.statusText}`);

        const data: SearchResponse = await response.json();
        let rawPerformances = data.data?.data || [];

        if (rawPerformances.length === 0 && trimmed.includes(' ')) {
          const words = trimmed.split(/\s+/).filter(w => w.length > 1);
          if (words.length > 1) {
            const params = new URLSearchParams({ q: words[0], page: '1', limit: '3000' });
            const res = await fetch(`${API_BASE}/api/v1/performances/search?${params}`);
            if (res.ok) {
              const d: SearchResponse = await res.json();
              const firstResults = d.data?.data || [];
              const otherWords = words.slice(1).map(w => w.toLowerCase());
              rawPerformances = firstResults.filter(p => {
                const artist = p.artistName?.toLowerCase() || '';
                const song = p.songName?.toLowerCase() || '';
                return otherWords.every(w => artist.includes(w) || song.includes(w));
              });
            }
          }
        }

        const sortedPerformances = await smartSortPerformances(rawPerformances, trimmed);
        
        setSearchResults(sortedPerformances);
        
        // Keep currently playing track in playerTracks so it stays valid
        if (currentTrackIndex !== null && playerTracks[currentTrackIndex]) {
          const currentlyPlayingTrack = playerTracks[currentTrackIndex];
          // Add it to the front so it stays at index 0
          const newPlayerTracks = [currentlyPlayingTrack, ...sortedPerformances];
          setPlayerTracks(newPlayerTracks);
          setCurrentTrackIndex(0); // Keep it at index 0
        } else {
          setPlayerTracks(sortedPerformances);
        }
        
        setTotalResults(sortedPerformances.length);
        setShowResults(true);
        setScrollProgress(0);
        
      } catch (err) {
        console.error('Search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
        setSearchResults([]);
        setPlayerTracks([]);
        setShowResults(false);
        setTotalResults(0);
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };

  useEffect(() => {
    if (!showResults) return;
    const handleScroll = (event: WheelEvent) => {
      event.preventDefault();
      const scrollContainer = document.getElementById('song-results-container');
      if (!scrollContainer) return;
      const scrollAmount = event.deltaY * 0.5;
      scrollContainer.scrollTop = Math.max(0, scrollContainer.scrollTop + scrollAmount);
      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const progress = maxScroll > 0 ? Math.min(scrollContainer.scrollTop / maxScroll, 1) : 0;
      setScrollProgress(progress);
    };
    window.addEventListener('wheel', handleScroll, { passive: false });
    return () => window.removeEventListener('wheel', handleScroll);
  }, [showResults]);

  const playTrack = (searchResultsIndex: number) => {
    const track = searchResults[searchResultsIndex];
    if (!track?.audioUrl || !audioRef.current) return;
    
    // Find this track's actual index in playerTracks
    const playerTracksIndex = playerTracks.findIndex(t => t.id === track.id);
    if (playerTracksIndex === -1) return;
    
    setCurrentTrackIndex(playerTracksIndex);
    audioRef.current.src = track.audioUrl;
    audioRef.current.play();
    setIsPlaying(true);
    
    const siblings = videoMashupMap.get(track.videoNo) || [];
    if (siblings.length > 1) {
      setMashupSongs([track, ...siblings.filter(s => s.id !== track.id)]);
      setAnimatedSongIndex(0);
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (currentTrackIndex === null && playerTracks.length > 0) playTrack(0);
      else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const skipForward = () => {
    if (currentTrackIndex === null || playerTracks.length === 0) return;
    const nextIndex = (currentTrackIndex + 1) % playerTracks.length;
    playTrack(nextIndex);
  };

  const skipBackward = () => {
    if (currentTrackIndex === null || playerTracks.length === 0) return;
    const prevIndex = currentTrackIndex === 0 ? playerTracks.length - 1 : currentTrackIndex - 1;
    playTrack(prevIndex);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const displayDuration = (videoLength: number | string) => {
    if (typeof videoLength === 'string') return videoLength;
    return formatDuration(videoLength);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch(searchQuery);
    else if (e.key === 'Tab' && currentAutocomplete) {
      e.preventDefault();
      setSearchQuery(currentAutocomplete.value);
    }
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: 'black' }}>
      <style>{`
        input::placeholder {
          color: rgba(255, 255, 255, 0.55) !important;
          font-style: italic;
        }
      `}</style>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
        <img src="/timi-clean.png" alt="Background" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {albumCoverUrl && showResults && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              position: 'fixed',
              top: '300px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: '600px',
              height: '45vh',
              backgroundImage: `url(${albumCoverUrl})`, 
              backgroundSize: 'cover',
              backgroundPosition: 'center', 
              filter: 'blur(15px)',
              zIndex: 14,
              pointerEvents: 'none'
            }}
          />
        )}
      </div>

      {spotifyAlbumUrl && showResults && (
        <a
          href={spotifyAlbumUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            bottom: '140px',
            right: '32px',
            zIndex: 45,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textDecoration: 'none'
          } as React.CSSProperties}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      )}

      <motion.div
        style={{ position: 'fixed', top: '32px', left: '32px', zIndex: 20, cursor: 'pointer' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        onClick={() => window.location.href = '/'}
      >
        <img src="/logo-animated.gif" alt="Timikeys" style={{ height: '48px', width: 'auto' }} />
      </motion.div>

      <div style={{ position: 'absolute', top: '32px', right: '32px', zIndex: 21 }}>
        <UnifiedMenu isDark={false} />
      </div>
      
      <div style={{
        position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-start', minHeight: '100vh',
        padding: '160px 24px 0 24px', boxSizing: 'border-box'
      }}>
        <motion.div
          style={{ position: 'relative', width: '100%', maxWidth: '600px', marginBottom: '16px' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <div style={{
            position: 'relative', background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)', borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.3)', padding: '0',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)', overflow: 'visible', zIndex: 1
          }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={!searchQuery ? placeholderSuggestions[placeholderIndex] : ''}
              maxLength={50}
              style={{
                width: '100%', padding: '18px 70px 18px 24px', fontSize: '18px',
                border: 'none', outline: 'none', background: 'transparent',
                color: 'rgba(255, 255, 255, 0.95)', fontWeight: '400', zIndex: 2,
                caretColor: 'white'
              }}
            />
            {currentAutocomplete && !showResults && searchQuery && (
              <div style={{
                position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)',
                pointerEvents: 'none', color: 'rgba(255, 255, 255, 0.5)', fontSize: '18px',
                whiteSpace: 'nowrap', overflow: 'hidden'
              }}>
                <span style={{ opacity: 0 }}>{searchQuery}</span>
                <span>{currentAutocomplete.value.slice(searchQuery.length)}</span>
              </div>
            )}
            <motion.button
              onClick={() => {
                if (showResults) {
                  setShowResults(false); 
                  setSearchQuery('');
                  setScrollProgress(0); 
                  setError(null); 
                  setTotalResults(0); 
                  setCurrentAutocomplete(null);
                  setAlbumCoverUrl(null);
                  setSpotifyAlbumUrl(null);
                } else handleSearch(searchQuery);
              }}
              style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                width: '44px', height: '44px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.8)',
                background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)', cursor: 'pointer',
                transition: 'all 0.3s ease', zIndex: 3
              }}
              whileHover={{ scale: 1.05, color: 'white', background: 'rgba(255, 255, 255, 0.25)' }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading}
            >
              {showResults ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              )}
            </motion.button>
          </div>
        </motion.div>

        {showResults && (
          <div style={{
            fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500',
            background: 'rgba(0, 0, 0, 0.3)', padding: '4px 12px', borderRadius: '12px',
            backdropFilter: 'blur(5px)', marginBottom: '16px'
          }}>
            {totalResults} {totalResults === 1 ? 'result' : 'results'}
          </div>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              color: 'rgba(255, 255, 255, 0.8)', marginTop: '40px', fontSize: '18px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => (
                <motion.div
                  key={bar}
                  animate={{
                    scaleY: [0.3, 1.5, 0.3],
                    backgroundColor: ['#3B82F6', '#8B5CF6', '#06B6D4', '#3B82F6']
                  }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: bar * 0.1, ease: "easeInOut" }}
                  style={{ width: '4px', height: '20px', borderRadius: '2px', transformOrigin: 'bottom' }}
                />
              ))}
            </div>
            <motion.span
              key={searchQuery}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {loadingMessages[Math.floor(Math.random() * loadingMessages.length)]}
            </motion.span>
          </motion.div>
        )}

        <AnimatePresence>
          {showResults && searchResults.length > 0 && (
            <motion.div
              id="song-results-container"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              style={{
                width: '100%', maxWidth: '600px', height: '45vh', marginTop: '20px',
                overflowY: 'auto', scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(139, 92, 246, 0.5) transparent'
              }}
            >
              {searchResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.5) }}
                  onClick={() => {
                    if (audioOnly && result.audioUrl) playTrack(index);
                    else window.open(result.tiktokVideoLink, '_blank');
                  }}
                  style={{
                    marginBottom: '12px', padding: '16px',
                    background: currentTrackIndex !== null && playerTracks[currentTrackIndex]?.id === result.id ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                    backdropFilter: 'none',
                    borderRadius: '0px',
                    cursor: 'pointer',
                    border: 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                  whileHover={{
                    background: currentTrackIndex !== null && playerTracks[currentTrackIndex]?.id === result.id ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ color: 'white', fontSize: '16px', fontWeight: '600' }}>{result.songName}</span>
                    </div>
                    <div style={{ color: 'rgba(255, 255, 255, 0.65)', fontSize: '14px' }}>
                      {result.artistName}
                      {result.videoLength && (
                        <span style={{ marginLeft: '12px', opacity: 0.5 }}>{displayDuration(result.videoLength)}</span>
                      )}
                    </div>
                    {(() => {
                      const siblings = videoMashupMap.get(result.videoNo);
                      if (!siblings || siblings.length <= 1) return null;
                      const others = siblings
                        .filter(s => s.songName !== result.songName)
                        .map(s => s.songName)
                        .filter((name, i, arr) => arr.indexOf(name) === i)
                        .slice(0, 3);
                      if (others.length === 0) return null;
                      return (
                        <div style={{ fontSize: '12px', marginTop: '4px' }}>
                          <span style={{ color: '#FCD34D', fontWeight: '500' }}>with </span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.55)' }}>{others.join(', ')}{siblings.length > 4 ? ` +${siblings.length - 4} more` : ''}</span>
                        </div>
                      );
                    })()}
                  </div>
                  {audioOnly && result.audioUrl && (
                    <Play size={20} style={{ color: 'rgba(255, 255, 255, 0.7)', flexShrink: 0, marginLeft: '12px' }} />
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SocialMediaIcons />

      {/* Player shows if there are player tracks with audio */}
      {playerTracks.some(r => r.audioUrl) && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            position: 'fixed', bottom: '94px', left: '15%', transform: 'translateX(-50%)', zIndex: 50,
            background: 'rgba(0, 0, 0, 0.0)', backdropFilter: 'blur(10px)', borderRadius: '30px',
            padding: '12px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '10px', width: '280px', border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {currentTrackIndex !== null && playerTracks[currentTrackIndex] && (
            <div style={{ color: 'white', fontSize: '13px', textAlign: 'center', width: '100%' }}>
              <div style={{ fontWeight: '600', marginBottom: '2px', minHeight: '18px', width: '100%', overflow: 'hidden' }}>
                {mashupSongs.length > 1 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                    {mashupSongs.slice(Math.floor(animatedSongIndex / 3) * 3, Math.floor(animatedSongIndex / 3) * 3 + 3).map((song, idx) => {
                      const globalIdx = Math.floor(animatedSongIndex / 3) * 3 + idx;
                      const isActive = animatedSongIndex === globalIdx;
                      return (
                        <motion.div
                          key={`${globalIdx}-${song.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              color: isActive ? 'white' : 'rgba(255, 255, 255, 0.5)',
                              fontWeight: isActive ? '600' : '400',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '70px'
                            }}
                            title={song.songName}
                          >
                            {song.songName}
                          </span>
                          {idx < 2 && (
                            <motion.span
                              animate={{ color: ['#FF8C00', '#FFB347', '#FF8C00'], textShadow: ['0 0 8px #FF8C00', '0 0 16px #FFB347', '0 0 8px #FF8C00'] }}
                              transition={{ duration: 3, repeat: Infinity }}
                              style={{ fontSize: '11px', margin: '0 2px', flexShrink: 0 }}
                            >
                              ~
                            </motion.span>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  playerTracks[currentTrackIndex].songName
                )}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}>
                <span>{playerTracks[currentTrackIndex].artistName}</span>
                {playerTracks[currentTrackIndex].videoLength && (
                  <><span>•</span><span>{displayDuration(playerTracks[currentTrackIndex].videoLength)}</span></>
                )}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button onClick={skipBackward} disabled={!audioOnly || playerTracks.length === 0} style={{
              background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: audioOnly ? 'pointer' : 'not-allowed', opacity: audioOnly ? 1 : 0.3, transition: 'all 0.2s ease'
            }} onMouseEnter={(e) => { if (audioOnly) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}>
              <SkipBack size={18} color="white" />
            </button>
            <button onClick={togglePlayPause} disabled={!audioOnly || playerTracks.length === 0} style={{
              width: '48px', height: '48px', background: audioOnly ? 'linear-gradient(135deg, #8B5CF6, #3B82F6)' : 'rgba(255, 255, 255, 0.1)',
              border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: audioOnly ? 'pointer' : 'not-allowed', opacity: audioOnly ? 1 : 0.3, transition: 'all 0.2s ease',
              boxShadow: audioOnly ? '0 4px 12px rgba(139, 92, 246, 0.4)' : 'none'
            }} onMouseEnter={(e) => { if (audioOnly) e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}>
              {isPlaying ? <Pause size={20} color="white" /> : <Play size={20} color="white" style={{ marginLeft: '2px' }} />}
            </button>
            <button onClick={skipForward} disabled={!audioOnly || playerTracks.length === 0} style={{
              background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '50%',
              width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: audioOnly ? 'pointer' : 'not-allowed', opacity: audioOnly ? 1 : 0.3, transition: 'all 0.2s ease'
            }} onMouseEnter={(e) => { if (audioOnly) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'; }}>
              <SkipForward size={18} color="white" />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0px', paddingTop: '6px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', width: '100%', justifyContent: 'center' }}>
            <span
              onClick={() => { if (audioOnly) { setAudioOnly(false); if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); } } }}
              style={{ color: !audioOnly ? 'white' : 'rgba(255, 255, 255, 0.3)', fontSize: '11px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.3s ease' }}
            >Video</span>
            <button onClick={() => { setAudioOnly(!audioOnly); if (audioOnly && isPlaying) { audioRef.current?.pause(); setIsPlaying(false); } }} style={{
              width: '40px', height: '22px', borderRadius: '11px', background: audioOnly ? '#8B5CF6' : 'rgba(255, 255, 255, 0.2)',
              border: 'none', position: 'relative', cursor: 'pointer', transition: 'all 0.3s ease', margin: '0 8px'
            }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: audioOnly ? '21px' : '3px', transition: 'all 0.3s ease', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }} />
            </button>
            <span
              onClick={() => { if (!audioOnly) { setAudioOnly(true); } }}
              style={{ color: audioOnly ? 'white' : 'rgba(255, 255, 255, 0.3)', fontSize: '11px', fontWeight: '500', cursor: 'pointer', transition: 'all 0.3s ease' }}
            >Audio</span>
          </div>
        </motion.div>
      )}

      <audio ref={audioRef} onEnded={skipForward} onError={() => { console.error('Audio playback error'); setIsPlaying(false); }} />
    </div>
  );
}