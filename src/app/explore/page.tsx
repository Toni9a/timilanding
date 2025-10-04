'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Performance[]>([]);
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
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const API_BASE = 'https://timikeys.up.railway.app';

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
      } catch (error) {
        console.error('Failed to preload search data:', error);
      }
    };
    
    preloadSearchData();
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setCurrentAutocomplete(null);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const suggestions: AutocompleteOption[] = [];
    
    preloadedData.artists.forEach(artist => {
      if (artist.toLowerCase().includes(query)) {
        suggestions.push({ value: artist, type: 'artist' });
      }
    });
    
    preloadedData.songs.forEach(song => {
      if (song.toLowerCase().includes(query)) {
        suggestions.push({ value: song, type: 'song' });
      }
    });
    
    preloadedData.albums.forEach(album => {
      if (album.toLowerCase().includes(query)) {
        suggestions.push({ value: album, type: 'album' });
      }
    });
    
    preloadedData.genres.forEach(genre => {
      if (genre.toLowerCase().includes(query)) {
        suggestions.push({ value: genre, type: 'genre' });
      }
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

  // Cycle through autocomplete suggestions
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      const trackOrder: {[key: string]: number} = {};
      
      data.items?.forEach((track: Record<string, unknown>, index: number) => {
        trackOrder[track.id as string] = index + 1;
      });
      
      return trackOrder;
    } catch (error) {
      console.error('Failed to get album track order:', error);
      return {};
    }
  };

  const smartSortPerformances = async (performances: Performance[], query: string) => {
    let processed = [...performances];
    
    const albumName = query.toLowerCase().trim();
    const albumSongs = processed.filter(p => 
      p.albumName?.toLowerCase().includes(albumName)
    );
    
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
            
            albumSongs.sort((a, b) => {
              const orderA = trackOrder[a.spotifyId] || 999;
              const orderB = trackOrder[b.spotifyId] || 999;
              return orderA - orderB;
            });
            
            const otherSongs = processed.filter(p => 
              !p.albumName?.toLowerCase().includes(albumName)
            );
            
            processed = [...albumSongs, ...otherSongs];
          }
        }
      } catch (error) {
        console.error('Failed to sort by album order:', error);
      }
    } else {
      const songGroups = new Map<string, Performance[]>();
      
      processed.forEach(perf => {
        const key = perf.spotifyId || perf.songName.toLowerCase();
        if (!songGroups.has(key)) {
          songGroups.set(key, []);
        }
        songGroups.get(key)!.push(perf);
      });
      
      const sortedGroups: Performance[] = [];
      songGroups.forEach(group => {
        group.sort((a, b) => {
          if (a.YesNo !== b.YesNo) {
            return a.YesNo ? 1 : -1;
          }
          return b.videoNo - a.videoNo;
        });
        sortedGroups.push(...group);
      });
      
      processed = sortedGroups;
    }
    
    return processed;
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setIsLoading(true);
    setShowResults(false);
    setError(null);
    setCurrentAutocomplete(null);
    
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('q', query.trim());
      searchParams.append('page', '1');
      searchParams.append('limit', '3000');
      
      const response = await fetch(`${API_BASE}/api/v1/performances/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      const rawPerformances = data.data?.data || [];
      const sortedPerformances = await smartSortPerformances(rawPerformances, query.trim());
      
      setSearchResults(sortedPerformances);
      setTotalResults(sortedPerformances.length);
      setShowResults(true);
      setScrollProgress(0);
      
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed. Please try again.');
      setSearchResults([]);
      setShowResults(false);
      setTotalResults(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!showResults) return;

    const handleScroll = (event: WheelEvent) => {
      event.preventDefault();
      const scrollContainer = document.getElementById('song-results-container');
      if (!scrollContainer) return;

      const scrollAmount = event.deltaY * 0.5;
      const newScrollTop = Math.max(0, scrollContainer.scrollTop + scrollAmount);
      scrollContainer.scrollTop = newScrollTop;

      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      const progress = maxScroll > 0 ? Math.min(newScrollTop / maxScroll, 1) : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('wheel', handleScroll, { passive: false });
    return () => window.removeEventListener('wheel', handleScroll);
  }, [showResults]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    } else if (e.key === 'Tab' && currentAutocomplete) {
      e.preventDefault();
      setSearchQuery(currentAutocomplete.value);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundImage: 'url(/timi-clean.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 1
        }}
      />

      <motion.div
        style={{
          position: 'fixed',
          top: '32px',
          left: '32px',
          zIndex: 20,
          cursor: 'pointer'
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8 }}
        onClick={() => window.location.href = '/'}
      >
        <img 
          src="/logo-animated.gif" 
          alt="Timikeys"
          style={{
            height: '48px',
            width: 'auto'
          }}
        />
      </motion.div>

      <div style={{
  position: 'absolute',
  top: '32px',
  right: '32px',
  zIndex: 21
}}>
  <UnifiedMenu isDark={false} />
</div>
      <div 
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          minHeight: '100vh',
          padding: '0 24px',
          paddingTop: '160px'
        }}
      >
        <motion.div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '600px',
            marginBottom: '16px'
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          <div style={{
            position: 'absolute',
            inset: '-2px',
            borderRadius: '26px',
            background: showResults && scrollProgress < 1
              ? `conic-gradient(from 0deg, #8B5CF6 ${scrollProgress * 360}deg, transparent ${scrollProgress * 360}deg)`
              : 'transparent',
            opacity: showResults && scrollProgress < 1 ? 1 : 0,
            transition: 'opacity 0.3s ease',
            zIndex: 0
          }} />
          
          <div style={{
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            padding: '0',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            overflow: 'visible',
            zIndex: 1
          }}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search artists, songs, albums, or genres..."
              maxLength={50}
              style={{
                width: '100%',
                padding: '18px 70px 18px 24px',
                fontSize: '18px',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'white',
                fontWeight: '400',
                zIndex: 2
              }}
            />

            {/* Faded autocomplete text inside search bar */}
            {currentAutocomplete && searchQuery.length >= 2 && !searchQuery.toLowerCase().includes(currentAutocomplete.value.toLowerCase()) && (
              <div style={{
                position: 'absolute',
                left: '24px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '18px',
                color: 'rgba(255, 255, 255, 0.4)',
                pointerEvents: 'none',
                zIndex: 1,
                maxWidth: '400px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {currentAutocomplete.value}
              </div>
            )}

            <motion.button
              onClick={() => {
                if (showResults) {
                  setShowResults(false);
                  setSearchResults([]);
                  setSearchQuery('');
                  setScrollProgress(0);
                  setError(null);
                  setTotalResults(0);
                  setCurrentAutocomplete(null);
                } else {
                  handleSearch(searchQuery);
                }
              }}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255, 255, 255, 0.8)',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                zIndex: 3
              }}
              whileHover={{ 
                scale: 1.05,
                color: 'white',
                background: 'rgba(255, 255, 255, 0.25)'
              }}
              whileTap={{ scale: 0.95 }}
              disabled={isLoading}
            >
              {showResults ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Results counter - moved outside search bar */}
        {showResults && (
          <div style={{
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontWeight: '500',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '4px 12px',
            borderRadius: '12px',
            backdropFilter: 'blur(5px)',
            marginBottom: '16px'
          }}>
            {totalResults} {totalResults === 1 ? 'result' : 'results'}
          </div>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '32px',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}
          >
            {/* Animated waveform */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((bar) => (
                <motion.div
                  key={bar}
                  animate={{
                    scaleY: [0.3, 1.5, 0.3],
                    backgroundColor: [
                      '#3B82F6',
                      '#8B5CF6', 
                      '#06B6D4',
                      '#3B82F6'
                    ]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: bar * 0.1,
                    ease: "easeInOut"
                  }}
                  style={{
                    width: '4px',
                    height: '20px',
                    borderRadius: '2px',
                    transformOrigin: 'bottom'
                  }}
                />
              ))}
            </div>
            <motion.span
              key={searchQuery}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {(() => {
                const messages = [
                  "Fetching those notes...",
                  "Finding the keys...", 
                  "Searching through Timi's music...",
                  "Coming right up...",
                  "Tuning in to the right frequency...",
                  "Checking the music library..."
                ];
                return messages[Math.floor(Math.random() * messages.length)];
              })()}
            </motion.span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              color: '#ff6b6b',
              backgroundColor: 'rgba(255, 107, 107, 0.1)',
              padding: '16px 24px',
              borderRadius: '12px',
              marginBottom: '32px',
              fontSize: '16px',
              textAlign: 'center',
              border: '1px solid rgba(255, 107, 107, 0.3)'
            }}
          >
            {error}
          </motion.div>
        )}

        <AnimatePresence>
          {showResults && searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              style={{
                position: 'fixed',
                top: '240px',
                left: '0%',
                transform: 'translateX(-50%)',
                width: '100%',
                maxWidth: '100vw',
                height: '32vh',
                zIndex: 15,
                overflow: 'hidden',
                display: 'flex',
                justifyContent: 'center'  
              }}
            >
              <div
                id="song-results-container"
                style={{
                  width: '100%',
                  maxWidth: '600px',
                  height: '100%',
                  overflowY: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  paddingTop: '20px'
                }}
              >
                {searchResults.map((performance, index) => (
                  <motion.div
                    key={performance.id}
                    style={{
                      textAlign: 'center',
                      marginBottom: '12px',
                      color: 'black',
                      cursor: 'pointer',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      transition: 'all 0.3s ease',
                      width: '100%',
                      maxWidth: '400px',
                      margin: '0 auto 12px auto'
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    whileHover={{
                      background: 'rgba(255,255,255,0.2)',
                      scale: 1.02
                    }}
                    onClick={() => {
                      if (performance.tiktokVideoLink) {
                        window.open(performance.tiktokVideoLink, '_blank');
                      }
                    }}
                  >
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '500',
                        margin: '0',
                        textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
                        fontStyle: 'italic'
                      }}>
                        {performance.songName}
                      </h3>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {showResults && searchResults.length === 0 && !isLoading && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '18px',
              textAlign: 'center',
              marginTop: '40px'
            }}
          >
            {(() => {
              const isArtistSearch = preloadedData.artists.has(searchQuery);
              const isSongSearch = preloadedData.songs.has(searchQuery);
              
              if (isArtistSearch) {
                // For known artists, suggest similar ones
                const similarArtists = Array.from(preloadedData.artists).filter(artist => 
                  artist !== searchQuery && (
                    artist.toLowerCase().includes(searchQuery.toLowerCase().split(' ')[0]) ||
                    searchQuery.toLowerCase().includes(artist.toLowerCase().split(' ')[0])
                  )
                ).slice(0, 2);
                
                if (similarArtists.length > 0) {
                  return `Looks like Timi hasn't covered ${searchQuery} yet. But he's played ${similarArtists.join(' and ')}!`;
                }
                return `Timi hasn't played any ${searchQuery} yet. Maybe suggest it for a future cover?`;
              } else if (isSongSearch) {
                return `That song hasn't made it to Timi's keys yet. Try searching for the artist instead!`;
              } else {
                // Random encouraging messages
                const messages = [
                  `Hmm, looks like "${searchQuery}" hasn't crossed Timi's piano yet.`,
                  `That one's not in the repertoire yet. Try searching for an artist or genre!`,
                  `Timi hasn't played that one yet -  it's coming soon!`
                ];
                return messages[Math.floor(Math.random() * messages.length)];
              }
            })()}
          </motion.div>
        )}
      </div>

      <SocialMediaIcons />
    </div>
  );
}