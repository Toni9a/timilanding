// src/app/api/admin/recent-entries/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://timikeys.up.railway.app/api/v1/performances/limit=2000&sort=newest');
    if (!response.ok) {
      throw new Error('Failed to fetch recent entries');
    }
    
    const data = await response.json();
    return NextResponse.json({ 
      entries: data.data?.data || [] 
    });
  } catch (error) {
    console.error('Error fetching recent entries:', error);
    return NextResponse.json({ 
      entries: [],
      error: 'Failed to fetch recent entries' 
    }, { status: 500 });
  }
}

// src/app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get total count
    const totalResponse = await fetch('https://timikeys.up.railway.app/api/v1/performances/search?limit=1');
    const totalData = await totalResponse.json();
    const total = totalData.data?.total || 0;

    // Get today's count (you may need to adjust this based on your API)
    const today = new Date().toISOString().split('T')[0];
    const todayResponse = await fetch(`https://timikeys.up.railway.app/api/v1/performances/search?date=${today}&limit=1`);
    const todayData = await todayResponse.json();
    const todayCount = todayData.data?.total || 0;

    return NextResponse.json({
      total,
      today: todayCount
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      total: 0,
      today: 0
    });
  }
}

// src/app/api/admin/spotify-search/route.ts
import { NextResponse } from 'next/server';

const SPOTIFY_CONFIG = {
  CLIENT_ID: '1701217b4ef341168d3ac65f11d0f404',
  CLIENT_SECRET: '8f05e06379fc407983b1a262a85d0d32'
};

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getSpotifyToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CONFIG.CLIENT_ID}:${SPOTIFY_CONFIG.CLIENT_SECRET}`).toString('base64')}`
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 minute early

  return cachedToken;
}

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const token = await getSpotifyToken();
    
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Spotify API error');
    }

    const data = await response.json();
    
    return NextResponse.json({
      results: data.tracks?.items || []
    });
  } catch (error) {
    console.error('Spotify search error:', error);
    return NextResponse.json({ 
      error: 'Failed to search Spotify',
      results: []
    }, { status: 500 });
  }
}

// src/app/api/admin/submit-songs/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// R2 Configuration
const R2_CONFIG = {
  PROFILE: 'r2',
  ENDPOINT: 'https://eb8193d2791bec64568e1115104e2e1d.r2.cloudflarestorage.com',
  BUCKET: 'timi-audio',
  PUBLIC_URL: 'https://pub-b8c2ac03cc924dd08beda93e65075aa1.r2.dev'
};

function generateUUID() {
  let dt = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid.toUpperCase();
}

function extractTikTokId(url: string): string | null {
  const match = url.match(/video\/(\d+)/);
  return match ? match[1] : null;
}

async function downloadAudioWithYtDlp(tikTokUrl: string, outputDir: string): Promise<string | null> {
  try {
    const tikTokId = extractTikTokId(tikTokUrl);
    if (!tikTokId) {
      throw new Error('Invalid TikTok URL');
    }

    const outputTemplate = path.join(outputDir, `${tikTokId}.%(ext)s`);
    
    // Download audio using yt-dlp
    const command = `yt-dlp -x --audio-format mp3 --output "${outputTemplate}" "${tikTokUrl}"`;
    
    console.log(`Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      console.log('yt-dlp stderr:', stderr);
    }
    
    // Check if file was created
    const expectedFile = path.join(outputDir, `${tikTokId}.mp3`);
    if (fs.existsSync(expectedFile)) {
      console.log(`Successfully downloaded: ${expectedFile}`);
      return expectedFile;
    } else {
      throw new Error('Downloaded file not found');
    }
  } catch (error) {
    console.error('yt-dlp download error:', error);
    return null;
  }
}

async function uploadToR2(filePath: string, tikTokId: string): Promise<string | null> {
  try {
    const s3Key = `${tikTokId}.mp3`;
    
    const command = `aws s3 cp "${filePath}" s3://${R2_CONFIG.BUCKET}/${s3Key} \
      --profile ${R2_CONFIG.PROFILE} \
      --endpoint-url ${R2_CONFIG.ENDPOINT} \
      --content-type "audio/mpeg" \
      --cache-control "public, max-age=31536000, immutable"`;
    
    console.log(`Uploading to R2: ${s3Key}`);
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('upload:')) {
      console.error('R2 upload stderr:', stderr);
      throw new Error('R2 upload failed');
    }
    
    // Clean up local file
    fs.unlinkSync(filePath);
    
    const publicUrl = `${R2_CONFIG.PUBLIC_URL}/${s3Key}`;
    console.log(`Successfully uploaded: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('R2 upload error:', error);
    return null;
  }
}

async function submitToDatabase(performanceData: any, songData: any) {
  // Submit to performances endpoint
  const performanceResponse = await fetch('https://timikeys.up.railway.app/api/v1/performances/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(performanceData)
  });

  if (!performanceResponse.ok) {
    const errorText = await performanceResponse.text();
    throw new Error(`Performance API error: ${errorText}`);
  }

  // Submit to songs endpoint
  const songResponse = await fetch('https://timikeys.up.railway.app/api/v1/songs/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(songData)
  });

  if (!songResponse.ok) {
    const errorText = await songResponse.text();
    throw new Error(`Songs API error: ${errorText}`);
  }

  return { performanceResponse, songResponse };
}

function convertTimeToSeconds(timeString: string): number {
  if (timeString.includes(':')) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
  }
  return parseInt(timeString) || 0;
}

export async function POST(request: Request) {
  try {
    const { songs } = await request.json();
    
    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json({ error: 'Invalid songs data' }, { status: 400 });
    }

    // Create temporary directory for downloads
    const tempDir = path.join(process.cwd(), 'temp_downloads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const song of songs) {
      try {
        // Validate required fields
        if (!song.tikTokVideoLink || !song.songName) {
          throw new Error('Missing required fields');
        }

        const tikTokId = extractTikTokId(song.tikTokVideoLink);
        if (!tikTokId) {
          throw new Error('Invalid TikTok URL');
        }

        // Prepare database entries
        const performanceData = {
          videoNumber: parseInt(song.videoNumber) || 0,
          videoURL: song.tikTokVideoLink,
          songName: song.songName,
          artistName: song.artistName || '',
          albumName: song.albumName || '',
          yesOrNo: song.yesOrNo === 'yes',
          videoLength: song.videoLength || '',
          videoLengthInSeconds: convertTimeToSeconds(song.videoLength || '0'),
          mainGenre: song.genres?.split(',')[0]?.trim() || '',
          subGenre: song.genres?.split(',')[1]?.trim() || '',
          otherGenres: song.genres?.split(',').slice(2).map((g: string) => g.trim()) || []
        };

        const songData = {
          id: generateUUID(),
          videoNo: parseInt(song.videoNumber) || 0,
          tiktokVideoLink: song.tikTokVideoLink,
          songName: song.songName,
          artistName: song.artistName || '',
          albumName: song.albumName || '',
          videoLength: song.videoLength || '',
          YesNo: song.yesOrNo === 'yes',
          spotifyId: song.spotifyId || ''
        };

        // Download audio
        console.log(`Processing: ${song.songName} - ${tikTokId}`);
        const downloadedFile = await downloadAudioWithYtDlp(song.tikTokVideoLink, tempDir);
        
        if (!downloadedFile) {
          throw new Error('Failed to download audio');
        }

        // Upload to R2
        const audioUrl = await uploadToR2(downloadedFile, tikTokId);
        
        if (!audioUrl) {
          throw new Error('Failed to upload to R2');
        }

        // Add audio URL to song data
        songData.audioUrl = audioUrl;

        // Submit to database
        await submitToDatabase(performanceData, songData);

        results.push({
          song: song.songName,
          status: 'success',
          audioUrl
        });
        
        successCount++;
        console.log(`✅ Successfully processed: ${song.songName}`);

      } catch (error) {
        console.error(`❌ Error processing ${song.songName}:`, error);
        results.push({
          song: song.songName,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }

      // Small delay to prevent overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Clean up temp directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }
    } catch (cleanupError) {
      console.warn('Failed to clean up temp directory:', cleanupError);
    }

    return NextResponse.json({
      success: successCount,
      errors: errorCount,
      results
    });

  } catch (error) {
    console.error('Submit songs error:', error);
    return NextResponse.json({
      error: 'Failed to process songs',
      details: error.message
    }, { status: 500 });
  }
}

// src/app/api/admin/tiktok-info/route.ts (Optional: TikTok metadata fetching)
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tikTokUrl } = await request.json();
    
    if (!tikTokUrl) {
      return NextResponse.json({ error: 'TikTok URL is required' }, { status: 400 });
    }

    // Use yt-dlp to extract metadata without downloading
    const command = `yt-dlp --print-json --no-download "${tikTokUrl}"`;
    
    const { stdout } = await execAsync(command);
    const metadata = JSON.parse(stdout);
    
    return NextResponse.json({
      title: metadata.title || '',
      duration: metadata.duration || 0,
      uploadDate: metadata.upload_date || '',
      uploader: metadata.uploader || '',
      description: metadata.description || ''
    });

  } catch (error) {
    console.error('TikTok info extraction error:', error);
    return NextResponse.json({
      error: 'Failed to extract TikTok info',
      title: '',
      duration: 0
    }, { status: 500 });
  }
}