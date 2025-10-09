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
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

  return cachedToken;
}

export async function POST(request: Request) {
  try {
    const { artistId } = await request.json();
    
    if (!artistId) {
      return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
    }

    const token = await getSpotifyToken();
    
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Spotify API error');
    }

    const artistData = await response.json();
    
    return NextResponse.json({
      id: artistData.id,
      name: artistData.name,
      genres: artistData.genres || []
    });
  } catch (error) {
    console.error('Spotify artist fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch artist data',
      genres: []
    }, { status: 500 });
  }
}