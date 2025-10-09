// src/components/AdminDashboard.tsx
'use client';

import { useState, useEffect } from 'react';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface Performance {
  id: string;
  videoNumber: number;
  songName: string;
  artistName: string;
  albumName: string;
  videoLength: string;
  createdAt: string;
  yesOrNo: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  album: { name: string };
  external_urls: { spotify: string };
}

interface RowData {
  id: string;
  videoNumber: string;
  tikTokVideoLink: string;
  songName: string;
  artistName: string;
  albumName: string;
  videoLength: string;
  yesOrNo: string;
  spotifyId: string;
  genres: string;
  uuid: string;
  status: 'pending' | 'success' | 'error';
}

export function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const [recentEntries, setRecentEntries] = useState<Performance[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RowData[]>([createEmptyRow()]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [processing, setProcessing] = useState(false);

  function createEmptyRow(): RowData {
    return {
      id: Math.random().toString(36).substr(2, 9),
      videoNumber: '',
      tikTokVideoLink: '',
      songName: '',
      artistName: '',
      albumName: '',
      videoLength: '',
      yesOrNo: 'no',
      spotifyId: '',
      genres: '',
      uuid: generateUniqueUUID(), // AUTO-GENERATE UUID ON ROW CREATION
      status: 'pending'
    };
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      await Promise.all([
        loadRecentEntries(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadRecentEntries() {
    try {
      const response = await fetch('https://timikeys.up.railway.app/api/v1/performances/search?q=&page=1&limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch recent entries');
      }
      
      const data = await response.json();
      const performances = data.data?.data || [];
      
      // Sort by video number descending (assuming higher = newer)
      const sortedPerformances = performances
        .sort((a: any, b: any) => (b.videoNumber || 0) - (a.videoNumber || 0))
        .slice(0, 5);
      
      setRecentEntries(sortedPerformances);
    } catch (error) {
      console.error('Error loading recent entries:', error);
      setRecentEntries([]);
    }
  }

  async function loadStats() {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }

  // UUID generation (matching CodePen exactly)
  function generateUniqueUUID(): string {
    let dt = new Date().getTime();
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (dt + Math.random() * 16) % 16 | 0;
      dt = Math.floor(dt / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    return uuid.toUpperCase();
  }

  async function fetchSpotifyData(rowId: string, songName: string) {
    if (!songName.trim()) {
      alert('Please enter a song name first');
      return;
    }

    console.log('Fetching Spotify data for:', songName);

    try {
      // Search for tracks
      const response = await fetch('/api/admin/spotify-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: songName })
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      const tracks = data.results || [];

      if (tracks.length > 0) {
        setSearchResults(tracks);
        setCurrentResultIndex(0);
        
        const track = tracks[0];

        // Get artist genres
        let genres = '';
        try {
          const artistResponse = await fetch('/api/admin/spotify-artist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ artistId: track.artists[0].id })
          });
          
          if (artistResponse.ok) {
            const artistData = await artistResponse.json();
            genres = artistData.genres?.join(', ') || '';
            console.log('Genres found:', genres);
          }
        } catch (artistError) {
          console.error('Failed to fetch artist data:', artistError);
        }

        // Update the row (UUID already exists)
        setRows(prevRows =>
          prevRows.map(row =>
            row.id === rowId
              ? {
                  ...row,
                  artistName: track.artists.map((a: any) => a.name).join(', '),
                  albumName: track.album.name,
                  spotifyId: track.id,
                  genres: genres,
                  status: 'success'
                }
              : row
          )
        );

        console.log('✅ Spotify data updated');
      } else {
        alert('Song not found on Spotify');
      }
    } catch (error) {
      console.error('Error fetching Spotify data:', error);
      alert('Error: ' + error.message);
    }
  }

  async function fetchArtistGenres(artistId: string): Promise<string> {
    try {
      const artistResponse = await fetch('/api/admin/spotify-artist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artistId })
      });
      
      if (artistResponse.ok) {
        const artistData = await artistResponse.json();
        return artistData.genres?.join(', ') || '';
      }
    } catch (error) {
      console.error('Failed to fetch artist genres:', error);
    }
    return '';
  }

  function cycleSpotifyResults(rowId: string) {
    if (searchResults.length === 0) {
      alert('No search results. Click "🎵 Fetch" first.');
      return;
    }

    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    
    const track = searchResults[nextIndex];
    
    // Get genres for the new track
    fetchArtistGenres(track.artists[0].id).then(genres => {
      setRows(prevRows =>
        prevRows.map(row =>
          row.id === rowId
            ? {
                ...row,
                artistName: track.artists.map((a: any) => a.name).join(', '),
                albumName: track.album.name,
                spotifyId: track.id,
                genres: genres // Update genres too
              }
            : row
        )
      );
    });

    console.log(`Showing result ${nextIndex + 1} of ${searchResults.length}: ${track.name}`);
  }

  function updateRowField(rowId: string, field: string, value: string) {
    setRows(prevRows =>
      prevRows.map(row =>
        row.id === rowId ? { ...row, [field]: value } : row
      )
    );
  }

  function addRow() {
    const lastVideoNumber = Math.max(...rows.map(r => parseInt(r.videoNumber) || 0));
    const newRow = createEmptyRow();
    newRow.videoNumber = (lastVideoNumber + 1).toString();
    setRows([...rows, newRow]);
  }

  function duplicateRow(rowId: string) {
    const sourceRow = rows.find(row => row.id === rowId);
    if (!sourceRow) return;

    const duplicatedRow: RowData = {
      ...sourceRow,
      id: Math.random().toString(36).substr(2, 9), // New unique ID for React
      uuid: generateUniqueUUID(), // New UUID for database
      songName: '', // Clear song-specific fields
      artistName: '',
      albumName: '',
      spotifyId: '',
      genres: '',
      status: 'pending'
      // Keep: videoNumber, tikTokVideoLink, videoLength, yesOrNo (mashup status)
    };

    setRows(prevRows => [...prevRows, duplicatedRow]);
    console.log('Duplicated row with shared video data, new UUID:', duplicatedRow.uuid);
  }

  function deleteRow(rowId: string) {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== rowId));
    }
  }

  // In AdminDashboard.tsx, change the testDatabaseUpdate function:
  async function testDatabaseUpdate() {
    const tikTokUrl = prompt('Enter TikTok URL to test update:');
    if (!tikTokUrl) return;
  
    try {
      setProcessing(true);
      
      const response = await fetch('/api/admin/test-db-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tikTokUrl })
      });
      
      const result = await response.json();
      console.log('Update result:', result);
      
      if (result.success) {
        alert(`SUCCESS: ${result.message}
  
  📅 Upload Date: ${result.extractedUploadDate}
  🎯 Total Found: ${result.totalFound}
  ✅ Updated: ${result.successfulUpdates}
  ❌ Failed: ${result.failedUpdates}`);
      } else {
        alert(`FAILED: ${result.message || result.error}`);
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcessing(false);
    }
  }

// Add this function to AdminDashboard.tsx
async function batchUpdateAllDates() {
  if (!confirm('This will extract upload dates for ALL TikTok videos in the database. This may take 10-20 minutes. Continue?')) {
    return;
  }

  try {
    setProcessing(true);
    
    const response = await fetch('/api/admin/batch-update-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const result = await response.json();
    console.log('Batch results:', result);
    
    if (result.success) {
      alert(`BATCH UPDATE COMPLETE!

📊 Stats:
- Total URLs: ${result.stats.totalUrls}
- Successful: ${result.stats.successfulExtractions} (${result.stats.successRate}%)
- Failed: ${result.stats.failedExtractions}
- Performances Updated: ${result.totalPerformancesUpdated}

Check console for detailed results.`);
      
      // Refresh recent entries to see updated dates
      await loadRecentEntries();
    } else {
      alert('Batch update failed: ' + result.error);
    }
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  } finally {
    setProcessing(false);
  }
}
async function testAudioUrlUpdate() {
  const tikTokUrl = prompt('Enter TikTok URL to test overwrite:');
  if (!tikTokUrl) return;

  try {
    setProcessing(true);
    
    const response = await fetch('/api/admin/test-audio-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tikTokUrl })
    });
    
    const result = await response.json();
    console.log('Audio URL overwrite test:', result);
    
    if (result.success) {
      alert(`SUCCESS: ${result.message}

🎵 Song: ${result.existingSong.songName}
🔗 URL: ${result.providedUrl}
🆔 Video ID: ${result.extractedVideoId}
🎧 New Audio URL: ${result.newAudioUrl}`);
    } else {
      alert(`FAILED: ${result.message || result.error}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
    alert('Error: ' + error.message);
  } finally {
    setProcessing(false);
  }
}

  // TEST SINGLE UPLOAD DATE
  async function testSingleUploadDate() {
    const tikTokUrl = prompt('Enter a TikTok URL to test:');
    if (!tikTokUrl) return;

    try {
      setProcessing(true);
      
      const response = await fetch('/api/admin/test-single-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tikTokUrl })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        console.log('🧪 Test Results:', result);
        
        alert(`Single URL Test Results:

📅 Upload Date: ${result.extractedData.uploadDate || 'Not found'}
🎬 Title: ${result.extractedData.title}
⏱️  Duration: ${result.extractedData.duration}s
🎵 Matching Performances: ${result.foundPerformances}

Check console for full details.`);
      } else {
        const errorData = await response.json();
        alert('Test failed: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error testing upload date:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcessing(false);
    }
  }

  // EXTRACT ALL UPLOAD DATES
  async function fetchAllUploadDates() {
    try {
      setProcessing(true);
      
      const response = await fetch('/api/admin/fetch-upload-dates', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        
        alert(`Upload date extraction completed!
        
📊 Results:
• Total URLs: ${result.stats.totalUrls}
• Successful: ${result.stats.successfulExtractions} (${result.stats.successRate}%)
• Failed: ${result.stats.failedExtractions}
• Database updates needed: ${result.totalUpdateNeeded}

Check console for detailed results.`);
        
        console.log('🎉 Upload date extraction results:', result);
        
        // Refresh recent entries 
        await loadRecentEntries();
      } else {
        const errorData = await response.json();
        alert('Failed to extract upload dates: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error fetching upload dates:', error);
      alert('Error fetching upload dates: ' + error.message);
    } finally {
      setProcessing(false);
    }
  }

  async function batchUpdateAudioUrls() {
    if (!confirm('Update audioUrl for all existing songs? This will add Cloudflare R2 URLs to songs that don\'t have them.')) {
      return;
    }
  
    try {
      setProcessing(true);
      
      const response = await fetch('/api/admin/batch-update-audio-urls', {
        method: 'POST'
      });
      
      const result = await response.json();
      console.log('Batch audio URL results:', result);
      
      if (result.success) {
        alert(`BATCH AUDIO URL UPDATE COMPLETE!
  
  📊 Results:
  - Songs Found: ${result.stats.totalSongsFound}
  - Successfully Updated: ${result.stats.successfulUpdates}
  - Failed: ${result.stats.failedUpdates}
  - Success Rate: ${result.stats.successRate}%
  
  Check console for detailed results.`);
      } else {
        alert('Batch update failed: ' + result.error);
      }
      
    } catch (error) {
      console.error('Error:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcessing(false);
    }
  }
  async function submitAllRows() {
    setProcessing(true);
    
    try {
      const response = await fetch('/api/admin/submit-songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songs: rows })
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Processing complete! Success: ${result.success}, Errors: ${result.errors}`);
        
        await loadInitialData();
        setRows([createEmptyRow()]);
      } else {
        alert('Error submitting songs');
      }
    } catch (error) {
      console.error('Error submitting songs:', error);
      alert('Error submitting songs');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '1.5rem' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        padding: '30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          paddingBottom: '20px',
          borderBottom: '2px solid #f0f0f0'
        }}>
          <h1 style={{
            color: '#2c3e50',
            fontSize: '2rem',
            fontWeight: '700',
            margin: 0
          }}>
            🎵 Timi Admin Dashboard
          </h1>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              gap: '20px'
            }}>
              <div style={{
                textAlign: 'center',
                padding: '10px 20px',
                background: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#667eea'
                }}>
                  {stats.total}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#666',
                  marginTop: '4px'
                }}>
                  Total Songs
                </div>
              </div>
              <div style={{
                textAlign: 'center',
                padding: '10px 20px',
                background: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: '#667eea'
                }}>
                  {stats.today}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#666',
                  marginTop: '4px'
                }}>
                  Added Today
                </div>
              </div>
            </div>
            
            <button
              onClick={onLogout}
              style={{
                padding: '8px 16px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Recent Entries */}
        <div style={{
          background: '#f8f9fa',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '25px'
        }}>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: '600',
            marginBottom: '15px',
            color: '#2c3e50'
          }}>
            📈 Recent Entries (by video number)
          </h3>
          
          {recentEntries.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666' }}>
              No recent entries found
            </div>
          ) : (
            recentEntries.map((entry, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: index < recentEntries.length - 1 ? '1px solid #dee2e6' : 'none'
              }}>
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: '#2c3e50'
                  }}>
                    {entry.songName}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#666',
                    marginTop: '2px'
                  }}>
                    {entry.artistName}
                  </div>
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#888',
                  textAlign: 'right'
                }}>
                  Video #{entry.videoNumber}<br />
                  {entry.videoLength}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '15px',
          marginBottom: '25px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => loadInitialData()}
            style={{
              padding: '12px 24px',
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={addRow}
            style={{
              padding: '12px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            ➕ Add Row
          </button>
          <button
            onClick={testSingleUploadDate}
            disabled={processing}
            style={{
              padding: '12px 24px',
              background: processing ? '#6c757d' : '#9b59b6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {processing ? '⏳ Testing...' : '🧪 Test Single URL'}
          </button>
          <button
            onClick={batchUpdateAllDates}
            disabled={processing}
            style={{
              padding: '12px 24px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              opacity: processing ? 0.6 : 1
            }}
          > 
            🚀 UPDATE ALL UPLOAD DATES
          </button>
          <button
            onClick={testDatabaseUpdate}
            disabled={processing}
            style={{
              padding: '12px 24px',
              background: processing ? '#6c757d' : '#8e44ad',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {processing ? '⏳ Testing DB...' : '🗄️ Test DB Update'}
          </button>
          <button
            onClick={fetchAllUploadDates}
            disabled={processing}
            style={{
              padding: '12px 24px',
              background: processing ? '#6c757d' : '#e67e22',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {processing ? '⏳ Extracting...' : '📅 Extract Upload Dates'}
          </button>
          <button
          onClick={batchUpdateAudioUrls}
          disabled={processing}
          style={{
            padding: '12px 24px',
            background: '#e67e22',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: processing ? 'not-allowed' : 'pointer',
            fontWeight: '600'
          }}
        >
          🎧 Update All Audio URLs
        </button>
          <button
            onClick={testAudioUrlUpdate}
            disabled={processing}
            style={{
              padding: '12px 24px',
              background: '#9b59b6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            🎧 Test Audio URL Update
          </button>
          <button
            onClick={submitAllRows}
            disabled={processing}
            style={{
              padding: '12px 24px',
              background: processing ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontWeight: '600'
            }}
          >
            {processing ? '⏳ Processing...' : '🚀 Submit All'}
          </button>
        </div>

        {/* Song Entry Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ background: '#667eea' }}>
                <th style={{ padding: '15px 12px', color: 'white', textAlign: 'left' }}>Video #</th>
                <th style={{ padding: '15px 12px', color: 'white', textAlign: 'left' }}>TikTok Link</th>
                <th style={{ padding: '15px 12px', color: 'white', textAlign: 'left' }}>Song Name</th>
                <th style={{ padding: '15px 12px', color: 'white', textAlign: 'left' }}>Artist</th>
                <th style={{ padding: '15px 12px', color: 'white', textAlign: 'left' }}>Album</th>
                <th style={{ padding: '15px 12px', color: 'white', textAlign: 'left' }}>Length</th>
                <th style={{ padding: '15px 12px', color: 'white', textAlign: 'left' }}>Mashup?</th>
                <th style={{ padding: '15px 12px', color: 'white', textAlign: 'left' }}>Genres</th>
                <th style={{ padding: '15px 12px', color: 'white', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="number"
                      value={row.videoNumber}
                      onChange={(e) => updateRowField(row.id, 'videoNumber', e.target.value)}
                      style={{
                        width: '80px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="text"
                      value={row.tikTokVideoLink}
                      onChange={(e) => updateRowField(row.id, 'tikTokVideoLink', e.target.value)}
                      placeholder="https://tiktok.com/..."
                      style={{
                        width: '200px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="text"
                      value={row.songName}
                      onChange={(e) => updateRowField(row.id, 'songName', e.target.value)}
                      placeholder="Song name"
                      style={{
                        width: '150px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="text"
                      value={row.artistName}
                      onChange={(e) => updateRowField(row.id, 'artistName', e.target.value)}
                      placeholder="Auto-filled"
                      style={{
                        width: '150px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: row.artistName ? '#f8f9fa' : 'white'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="text"
                      value={row.albumName}
                      onChange={(e) => updateRowField(row.id, 'albumName', e.target.value)}
                      placeholder="Auto-filled"
                      style={{
                        width: '150px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: row.albumName ? '#f8f9fa' : 'white'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="text"
                      value={row.videoLength}
                      onChange={(e) => updateRowField(row.id, 'videoLength', e.target.value)}
                      placeholder="0:30"
                      style={{
                        width: '80px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <select
                      value={row.yesOrNo}
                      onChange={(e) => updateRowField(row.id, 'yesOrNo', e.target.value)}
                      style={{
                        width: '80px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }}
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input
                      type="text"
                      value={row.genres}
                      onChange={(e) => updateRowField(row.id, 'genres', e.target.value)}
                      placeholder="Auto-filled"
                      style={{
                        width: '120px',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: row.genres ? '#f8f9fa' : 'white',
                        fontSize: '12px'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => fetchSpotifyData(row.id, row.songName)}
                        style={{
                          padding: '4px 8px',
                          background: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        🎵 Fetch
                      </button>
                      <button
                        onClick={() => cycleSpotifyResults(row.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#20c997',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        ⏭️ Next
                      </button>
                      <button
                        onClick={() => duplicateRow(row.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        📄 Duplicate
                      </button>
                      <button
                        onClick={() => deleteRow(row.id)}
                        style={{
                          padding: '4px 8px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}