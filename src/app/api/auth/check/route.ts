import { NextRequest, NextResponse } from 'next/server';
import { hasValidAdminSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  return NextResponse.json({ authenticated: await hasValidAdminSession(req) });
}
