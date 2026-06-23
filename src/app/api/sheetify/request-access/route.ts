import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

const requestsPath = path.join(process.cwd(), 'src/data/sheetify-requests.json');

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }

    const requests = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'));

    if (requests.some((r: { email: string }) => r.email === email)) {
      return NextResponse.json({ ok: true, message: 'Already requested' });
    }

    requests.push({
      email,
      requestedAt: new Date().toISOString(),
      added: false,
    });
    fs.writeFileSync(requestsPath, JSON.stringify(requests, null, 2));

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: 'oluwatoniesan@gmail.com',
      subject: `Sheetify Access Request: ${email}`,
      text: `New Sheetify access request:\n\nSpotify Email: ${email}\nTime: ${new Date().toISOString()}\n\nAdd them to the Spotify Developer Dashboard to grant access.`,
      html: `
        <h2>New Sheetify Access Request</h2>
        <p><strong>Spotify Email:</strong> ${email}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p>Add them to the <a href="https://developer.spotify.com/dashboard">Spotify Developer Dashboard</a> to grant access.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Request access error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const requests = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'));
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json([]);
  }
}
