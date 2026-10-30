import { NextRequest, NextResponse } from 'next/server';
import { hasValidAdminSession } from '@/lib/auth';

// Gate write/admin API routes behind the admin session cookie set by /api/auth/login.
// /api/gallery GET stays public (used by the public gallery page); only its POST is gated.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isGalleryWrite = pathname === '/api/gallery' && req.method !== 'GET';
  const isProtected =
    pathname.startsWith('/api/admin/') ||
    pathname.startsWith('/api/brand/') ||
    pathname.startsWith('/api/dashboard/') ||
    pathname.startsWith('/api/gallery/upload') ||
    isGalleryWrite;

  if (isProtected && !(await hasValidAdminSession(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*', '/api/brand/:path*', '/api/dashboard/:path*', '/api/gallery/:path*'],
};
