import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL, backendWriteHeaders } from '@/lib/backend';

// Forwards admin writes (e.g. /api/admin/backend/songs/add) to the Railway API with the API key.
// Only reachable with an admin session: middleware guards everything under /api/admin/.
async function forward(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const response = await fetch(`${BACKEND_URL}/api/v1/${path.map(encodeURIComponent).join('/')}`, {
    method: req.method,
    headers: backendWriteHeaders(),
    body: await req.text(),
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  });
}

export { forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
