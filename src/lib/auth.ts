import { NextRequest } from 'next/server';

// Server-only — never exposed to the client bundle (no NEXT_PUBLIC_ prefix).
// No fallback: if ADMIN_PASSWORD isn't set, every login and session check fails.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

export const ADMIN_SESSION_COOKIE = 'timi_admin_session';

// Uses Web Crypto (crypto.subtle) rather than Node's `crypto` module because this
// code runs in Next.js middleware, which executes on the Edge runtime — Node's
// crypto module isn't available there.
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Deterministic token derived from the password so no session store is needed —
// the cookie never contains the password itself, just proof it was presented once.
export function expectedSessionToken(): Promise<string> {
  return sha256Hex(ADMIN_PASSWORD);
}

export async function isCorrectPassword(candidate: string): Promise<boolean> {
  if (!ADMIN_PASSWORD) return false;
  return timingSafeStringEqual(candidate || '', ADMIN_PASSWORD);
}

export async function hasValidAdminSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token || !ADMIN_PASSWORD) return false;
  const expected = await expectedSessionToken();
  return timingSafeStringEqual(token, expected);
}
