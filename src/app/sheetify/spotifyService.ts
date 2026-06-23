import { SpotifyArtist, SpotifyProfile, SpotifyTrack } from './types';

const CLIENT_ID = '777467180d2245268a539312c57f4696';
const SCOPES = 'user-top-read';

function getRedirectUri(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin + '/sheetify';
}

function generateRandomString(length: number): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function redirectToAuthCodeFlow() {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  localStorage.setItem('pkce_verifier', codeVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function getAccessToken(code: string): Promise<string | null> {
  const codeVerifier = localStorage.getItem('pkce_verifier');

  if (!codeVerifier) {
    console.error('No PKCE verifier found in local storage');
    return null;
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: getRedirectUri(),
    client_id: CLIENT_ID,
    code_verifier: codeVerifier
  });

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    const data = await response.json();
    localStorage.setItem('spotifyToken', data.access_token);
    return data.access_token;
  } catch (err) {
    console.error('Auth Error:', err);
    return null;
  }
}

export function logout() {
  localStorage.removeItem('spotifyToken');
  localStorage.removeItem('pkce_verifier');
  window.location.href = '/sheetify';
}

export async function fetchProfile(token: string): Promise<SpotifyProfile | null> {
  try {
    const result = await fetch('https://api.spotify.com/v1/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (result.status === 401) {
      logout();
      return null;
    }
    return await result.json();
  } catch (e) {
    console.error('Error fetching profile:', e);
    return null;
  }
}

export async function fetchTopTracks(token: string, timeRange: string = 'medium_term'): Promise<SpotifyTrack[]> {
  try {
    const result = await fetch(`https://api.spotify.com/v1/me/top/tracks?limit=50&time_range=${timeRange}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (result.status === 401) {
      logout();
      return [];
    }
    const data = await result.json();
    return data.items || [];
  } catch (e) {
    console.error('Error fetching top tracks:', e);
    return [];
  }
}

export async function fetchTopArtists(token: string, timeRange: string = 'medium_term'): Promise<SpotifyArtist[]> {
  try {
    const result = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=50&time_range=${timeRange}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (result.status === 401) {
      logout();
      return [];
    }
    const data = await result.json();
    return data.items || [];
  } catch (e) {
    console.error('Error fetching top artists:', e);
    return [];
  }
}
