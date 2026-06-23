import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'src/data/gallery-config.json');

export async function GET() {
  const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const data = await req.json();
  fs.writeFileSync(configPath, JSON.stringify(data, null, 2));
  return NextResponse.json({ ok: true });
}
