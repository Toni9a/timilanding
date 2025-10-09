import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { tikTokUrl } = await request.json();
    
    if (!tikTokUrl) {
      return NextResponse.json({ error: 'TikTok URL is required' }, { status: 400 });
    }

    // Extract metadata using yt-dlp (NO DOWNLOAD)
    const command = `yt-dlp --print "%(title)s|%(duration)s|%(upload_date)s|%(uploader)s" --no-download "${tikTokUrl}"`;
    
    console.log(`Extracting TikTok metadata from: ${tikTokUrl}`);
    const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
    
    if (stderr && !stderr.includes('WARNING')) {
      console.log('yt-dlp stderr:', stderr);
    }
    
    const [title, duration, uploadDate, uploader] = stdout.trim().split('|');
    
    // Format upload date (YYYYMMDD -> YYYY-MM-DD)
    let formattedDate = '';
    if (uploadDate && uploadDate !== 'NA' && uploadDate.length === 8) {
      try {
        const year = uploadDate.substring(0, 4);
        const month = uploadDate.substring(4, 6);
        const day = uploadDate.substring(6, 8);
        formattedDate = `${year}-${month}-${day}`;
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }

    return NextResponse.json({
      title: title || '',
      duration: parseInt(duration) || 0,
      uploadDate: formattedDate,
      uploader: uploader || '',
      success: true
    });

  } catch (error) {
    console.error('TikTok info extraction error:', error);
    
    // If yt-dlp fails, return empty data instead of erroring
    return NextResponse.json({
      title: '',
      duration: 0,
      uploadDate: '',
      uploader: '',
      success: false,
      error: error.message
    });
  }
}