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
  uploadDate?: string;
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
      uuid: generateUniqueUUID(),
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
      const response = await fetch('https://timikeys.up.railway.app/api/v1/performances?q=&page=1&limit=2000');
      if (!response.ok) {
        throw new Error('Failed to fetch recent entries');
      }
      
      const data = await response.json();
      const performances = data.data?.data || [];
      // DEBUG: Check what fields are actually returned
      console.log('🔍 First performance object:', performances[0]);
      console.log('🔍 Available fields:', performances[0] ? Object.keys(performances[0]) : 'No performances');
      
      // Sort by upload date (newest first), fallback to video number if no upload date
      const sortedPerformances = performances
        .sort((a: any, b: any) => {
          // Primary sort: upload date (newest first)
          if (a.uploadDate && b.uploadDate) {
            return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
          }
          
          // If one has upload date and other doesn't, prioritize the one with upload date
          if (a.uploadDate && !b.uploadDate) return -1;
          if (!a.uploadDate && b.uploadDate) return 1;
          
          // Fallback sort: video number (highest first - assuming higher = newer)
          return (b.videoNumber || 0) - (a.videoNumber || 0);
        })
        .slice(0, 5);
      
      setRecentEntries(sortedPerformances);
      console.log('Recent entries loaded and sorted by upload date:', sortedPerformances);
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

  // Auto-populate video length from TikTok URL
  async function populateVideoLength(rowId: string, tikTokUrl: string) {
    if (!tikTokUrl.trim()) {
      alert('Please enter a TikTok URL first');
      return;
    }

    try {
      setProcessing(true);
      
      const response = await fetch('/api/admin/extract-upload-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tikTokUrl })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.duration) {
          // Convert seconds to MM:SS format
          const minutes = Math.floor(parseInt(result.duration) / 60);
          const seconds = parseInt(result.duration) % 60;
          const formattedLength = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          
          updateRowField(rowId, 'videoLength', formattedLength);
          console.log('Video length populated:', formattedLength);
        }
      } else {
        alert('Failed to get video duration');
      }
    } catch (error) {
      console.error('Error getting video length:', error);
      alert('Error: ' + error.message);
    } finally {
      setProcessing(false);
    }
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

        // Update the row
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
                genres: genres
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
      id: Math.random().toString(36).substr(2, 9),
      uuid: generateUniqueUUID(),
      songName: '',
      artistName: '',
      albumName: '',
      spotifyId: '',
      genres: '',
      status: 'pending'
    };

    setRows(prevRows => [...prevRows, duplicatedRow]);
    console.log('Duplicated row with shared video data, new UUID:', duplicatedRow.uuid);
  }

  function deleteRow(rowId: string) {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== rowId));
    }
  }

  // Convert time format (0:30) to seconds
  function convertTimeToSeconds(timeString: string): number {
    if (!timeString) return 0;
    const parts = timeString.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return parseInt(timeString) || 0;
  }

  // CORE SUBMIT FUNCTION - MATCHES CODEPEN STRUCTURE
  async function submitAllRows() {
    if (rows.length === 0) {
      alert('No songs to submit. Please add some songs first.');
      return;
    }

    if (!confirm(`Ready to submit ${rows.length} song(s) with full automation?\n\nThis will:\n• Extract upload dates from TikTok\n• Download and upload MP3s to R2\n• Submit to database\n\nProceed?`)) {
      return;
    }

    setProcessing(true);
    
    try {
      console.log('🚀 Starting automated submission for', rows.length, 'songs...');
      
      const results = {
        total: rows.length,
        successful: 0,
        failed: 0,
        errors: [],
        details: []
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        console.log(`\n📝 Processing song ${i + 1}/${rows.length}: ${row.songName}`);
        
        try {
          // Step 1: Extract upload date from TikTok URL
          // ✅ STEP 1: Extract upload date from TikTok URL
          let uploadDate = null;
          if (row.tikTokVideoLink) {
            console.log('📅 Extracting upload date...');
            const dateResponse = await fetch('/api/admin/extract-upload-date', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tikTokUrl: row.tikTokVideoLink })
            });

            if (dateResponse.ok) {
              const dateResult = await dateResponse.json();
              uploadDate = new Date(dateResult.uploadDate + 'T00:00:00.000Z').toISOString();
              console.log('✅ Upload date extracted:', uploadDate);
            } else {
              // ❌ CRITICAL ERROR - Stop everything
              const errorMsg = `❌ CRITICAL: Failed to extract upload date for "${row.songName}"`;
              console.error(errorMsg);
              alert(`${errorMsg}\n\nSubmission STOPPED.\n\nPossible fixes:\n1. Restart dev server (npm run dev)\n2. Check yt-dlp works in terminal\n3. Verify TikTok URL is correct`);
              setProcessing(false);
              return; // STOP EVERYTHING
            }
          } else {
            alert(`❌ No TikTok URL for "${row.songName}". Submission stopped.`);
            setProcessing(false);
            return;
          }

          // ✅ STEP 2: Download MP3 and upload to R2
          let audioUrl = null;
          if (row.tikTokVideoLink) {
            console.log('🎵 Processing MP3 download/upload...');
            const mp3Response = await fetch('/api/admin/download-upload-mp3', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tikTokUrl: row.tikTokVideoLink })
            });

            if (mp3Response.ok) {
              const mp3Result = await mp3Response.json();
              audioUrl = mp3Result.audioUrl;
              console.log('✅ MP3 processed:', mp3Result.cached ? '(cached)' : '(new download)', audioUrl);
              
              // ❌ REMOVED CORS VERIFICATION SECTION - Backend already verifies the upload
              
            } else {
              const errorMsg = `❌ CRITICAL: Failed to process MP3 for "${row.songName}"`;
              alert(`${errorMsg}\n\nSubmission STOPPED.\n\nFixes:\n1. Restart dev server\n2. Check R2 credentials\n3. Test yt-dlp in terminal`);
              setProcessing(false);
              return; // STOP EVERYTHING
            }
          }

          // ✅ STEP 3: Final validation
          if (!uploadDate) {
            alert(`❌ Upload date is null for "${row.songName}". Submission STOPPED.`);
            setProcessing(false);
            return;
          }

          if (!audioUrl) {
            alert(`❌ Audio URL is null for "${row.songName}". Submission STOPPED.`);
            setProcessing(false);
            return;
          }

          // Step 3: Prepare data for submission (MATCHING CODEPEN STRUCTURE)
          const genresArray = row.genres ? row.genres.split(',').map(g => g.trim()) : [];
          
          const performanceData = {
            videoNumber: parseInt(row.videoNumber) || 0,
            videoURL: row.tikTokVideoLink, // Note: videoURL not tiktokVideoLink
            songName: row.songName,
            artistName: row.artistName,
            albumName: row.albumName,
            yesOrNo: row.yesOrNo === 'yes', // Note: yesOrNo not YesNo
            videoLength: row.videoLength || '',
            videoLengthInSeconds: convertTimeToSeconds(row.videoLength || '0'),
            mainGenre: genresArray[0] || '',
            subGenre: genresArray[1] || '',
            otherGenres: genresArray.slice(2) || [],
            uploadDate: uploadDate
          };

          const songData = {
            id: row.uuid, // UUID for songs
            videoNo: parseInt(row.videoNumber) || 0,
            tiktokVideoLink: row.tikTokVideoLink,
            songName: row.songName,
            artistName: row.artistName,
            albumName: row.albumName,
            videoLength: row.videoLength || '',
            YesNo: row.yesOrNo === 'yes', // Note: YesNo not yesOrNo
            spotifyId: row.spotifyId,
            audioUrl: audioUrl
          };

          // Step 4: Submit to backend (performances table)
          console.log('📤 Submitting to performances table...');
          const performanceResponse = await fetch('https://timikeys.up.railway.app/api/v1/performances/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(performanceData)
          });

          if (!performanceResponse.ok) {
            const errorText = await performanceResponse.text();
            throw new Error(`Performance submission failed: ${errorText}`);
          }

          // Step 5: Submit to backend (songs table)
          console.log('📤 Submitting to songs table...');
          const songResponse = await fetch('https://timikeys.up.railway.app/api/v1/songs/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(songData)
          });

          if (!songResponse.ok) {
            const errorText = await songResponse.text();
            throw new Error(`Song submission failed: ${errorText}`);
          }

          console.log('✅ Successfully submitted:', row.songName);
          results.successful++;
          results.details.push({
            song: row.songName,
            uploadDate,
            audioUrl,
            status: 'success'
          });

        } catch (error) {
          console.error(`❌ Failed to process ${row.songName}:`, error);
          results.failed++;
          results.errors.push(`${row.songName}: ${error.message}`);
          results.details.push({
            song: row.songName,
            status: 'failed',
            error: error.message
          });
        }
      }

      // Show comprehensive results
      const successRate = Math.round((results.successful / results.total) * 100);
      
      let alertMessage = `🎉 SUBMISSION COMPLETE!\n\n`;
      alertMessage += `📊 Results:\n`;
      alertMessage += `• Total songs: ${results.total}\n`;
      alertMessage += `• Successful: ${results.successful} (${successRate}%)\n`;
      alertMessage += `• Failed: ${results.failed}\n\n`;
      
      if (results.errors.length > 0) {
        alertMessage += `⚠️  Errors:\n${results.errors.slice(0, 3).join('\n')}`;
        if (results.errors.length > 3) {
          alertMessage += `\n... and ${results.errors.length - 3} more (check console)`;
        }
      }

      alert(alertMessage);

      console.log('🎯 Complete submission results:', results);

      // Clear the form if all submissions were successful
      if (results.failed === 0) {
        setRows([createEmptyRow()]);
        setSearchResults([]);
        setCurrentResultIndex(0);
        console.log('🧹 Form cleared after successful submission');
      }

      // Refresh recent entries to show new submissions
      await loadRecentEntries();

    } catch (error) {
      console.error('💥 Critical submission error:', error);
      alert(`Critical error during submission: ${error.message}\n\nCheck console for details.`);
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
            📈 Recent Entries (by upload date)
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
                  {entry.uploadDate ? (
                    <span style={{ color: '#28a745' }}>
                      {new Date(entry.uploadDate).toLocaleDateString()}
                    </span>
                  ) : (
                    <span style={{ color: '#dc3545' }}>No upload date</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* MAIN CONTROLS - CORE FUNCTIONALITY */}
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
            onClick={submitAllRows}
            disabled={processing}
            style={{
              padding: '12px 24px',
              background: processing ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              fontSize: '16px'
            }}
          >
            {processing ? '⏳ Processing...' : '🚀 Submit All Songs'}
          </button>
        </div>

        {/* COMMENTED OUT TESTING BUTTONS */}
        {/*
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          flexWrap: 'wrap',
          marginBottom: '20px',
          padding: '15px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <button onClick={testSingleUploadDate}>🧪 Test Single URL</button>
          <button onClick={batchUpdateAllDates}>🚀 UPDATE ALL UPLOAD DATES</button>
          <button onClick={testDatabaseUpdate}>🗄️ Test DB Update</button>
          <button onClick={fetchAllUploadDates}>📅 Extract Upload Dates</button>
          <button onClick={batchUpdateAudioUrls}>🎧 Update All Audio URLs</button>
          <button onClick={testAudioUrlUpdate}>🎧 Test Audio URL Update</button>
        </div>
        */}

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
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input
                        type="text"
                        value={row.videoLength}
                        onChange={(e) => updateRowField(row.id, 'videoLength', e.target.value)}
                        placeholder="0:30"
                        style={{
                          width: '60px',
                          padding: '8px',
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }}
                      />
                      <button
                        onClick={() => populateVideoLength(row.id, row.tikTokVideoLink)}
                        disabled={processing || !row.tikTokVideoLink}
                        style={{
                          padding: '4px 8px',
                          background: '#ffc107',
                          color: 'black',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                        title="Auto-populate from video"
                      >
                        ⏱️
                      </button>
                    </div>
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