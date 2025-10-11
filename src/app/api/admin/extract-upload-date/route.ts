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

    console.log('Extracting upload date for:', tikTokUrl);

    const escapedUrl = tikTokUrl.replace(/'/g, "'\"'\"'");
    const command = `yt-dlp --print "%(upload_date)s|%(title)s|%(duration)s" --no-download '${escapedUrl}'`;
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 30000,
      maxBuffer: 1024 * 1024 
    });
    
    const [uploadDate, title, duration] = stdout.trim().split('|');
    
    let formattedDate = null;
    if (uploadDate && uploadDate !== 'NA' && uploadDate.length === 8) {
      const year = uploadDate.substring(0, 4);
      const month = uploadDate.substring(4, 6);
      const day = uploadDate.substring(6, 8);
      formattedDate = `${year}-${month}-${day}`;
    }

    return NextResponse.json({
      success: true,
      uploadDate: formattedDate,
      title: title || '',
      duration: duration || ''
    });

  } catch (error) {
    console.error('Upload date extraction error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to extract upload date',
      details: error.message 
    }, { status: 500 });
  }
}