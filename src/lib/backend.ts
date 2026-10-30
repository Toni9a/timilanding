// Server-only helpers for writing to the TimiKeys Railway API.
// Writes need the x-api-key header; ADMIN_API_KEY must never reach the browser (no NEXT_PUBLIC_ prefix).
export const BACKEND_URL = process.env.TIMIKEYS_API_URL || 'https://timikeys.up.railway.app';

export function backendWriteHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ADMIN_API_KEY || '',
  };
}
