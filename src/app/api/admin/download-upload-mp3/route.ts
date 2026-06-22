// src/app/api/admin/download-upload-mp3/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

const R2_CONFIG = {
  BUCKET: 'timi-audio',
  PUBLIC_URL: 'https://pub-b8c2ac03cc924dd08beda93e65075aa1.r2.dev',
  ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  ACCESS_KEY: process.env.R2_ACCESS_KEY_ID,
  SECRET_KEY: process.env.R2_SECRET_ACCESS_KEY,
  ENDPOINT: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
};

function extractTikTokId(url: string): string | null {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  let tempDir: string | null = null;
  
  try {
    const { tikTokUrl } = await request.json();
    
    if (!tikTokUrl) {
      return NextResponse.json({ error: 'TikTok URL is required' }, { status: 400 });
    }

    const tikTokId = extractTikTokId(tikTokUrl);
    if (!tikTokId) {
      return NextResponse.json({ error: 'Invalid TikTok URL format' }, { status: 400 });
    }

    console.log('🎬 Processing MP3 for TikTok ID:', tikTokId);

    // Check if audio already exists in R2
    const potentialUrl = `${R2_CONFIG.PUBLIC_URL}/${tikTokId}.mp3`;
    try {
      const checkResponse = await fetch(potentialUrl, { method: 'HEAD' });
      if (checkResponse.ok) {
        console.log('🎯 Audio already exists in R2:', potentialUrl);
        return NextResponse.json({
          success: true,
          audioUrl: potentialUrl,
          message: 'Audio already exists in R2',
          cached: true
        });
      }
    } catch (checkError) {
      console.log('🔍 Audio not found in R2, proceeding with download...');
    }

    // Create temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'timi-audio-'));
    console.log(`📁 Created temp directory: ${tempDir}`);

    // Step 1: Download audio using yt-dlp
    const outputTemplate = path.join(tempDir, `${tikTokId}.%(ext)s`);
    const escapedUrl = tikTokUrl.replace(/'/g, "'\"'\"'");
    const downloadCommand = `yt-dlp -f "bv*[vcodec^=h264]+ba/b[vcodec^=h264]/bv*+ba/b" -x --audio-format mp3 --output "${outputTemplate}" '${escapedUrl}'`;
    
    console.log(`⬇️ Downloading audio for video ID: ${tikTokId}`);
    await execAsync(downloadCommand, { 
      timeout: 120000, // 2 minutes
      maxBuffer: 1024 * 1024 * 50 // 50MB buffer
    });
    
    const expectedFile = path.join(tempDir, `${tikTokId}.mp3`);
    if (!fs.existsSync(expectedFile)) {
      throw new Error('Downloaded file not found after yt-dlp execution');
    }

    console.log(`✅ Successfully downloaded: ${expectedFile}`);
    
    // Step 2: Upload to R2 using AWS CLI
    const s3Key = `${tikTokId}.mp3`;
    const uploadCommand = `aws s3 cp "${expectedFile}" s3://${R2_CONFIG.BUCKET}/${s3Key} \
      --endpoint-url ${R2_CONFIG.ENDPOINT} \
      --content-type "audio/mpeg" \
      --cache-control "public, max-age=31536000"`;
    
    console.log(`🚀 Uploading to R2: ${s3Key}`);
    
    // Set AWS credentials as environment variables for this command
    const uploadEnv = {
      ...process.env,
      AWS_ACCESS_KEY_ID: R2_CONFIG.ACCESS_KEY,
      AWS_SECRET_ACCESS_KEY: R2_CONFIG.SECRET_KEY,
      AWS_DEFAULT_REGION: 'auto'
    };
    
    const { stdout, stderr } = await execAsync(uploadCommand, { 
      timeout: 120000, // 2 minutes
      env: uploadEnv
    });
    
    if (stderr && !stderr.includes('upload:') && !stderr.includes('Completed')) {
      console.error('R2 upload stderr:', stderr);
      throw new Error(`R2 upload failed: ${stderr}`);
    }
    
    console.log('✅ Upload completed successfully');
    
    // Verify upload by checking if file exists
    try {
      const verifyResponse = await fetch(potentialUrl, { method: 'HEAD' });
      if (!verifyResponse.ok) {
        throw new Error('Upload verification failed - file not accessible');
      }
      console.log('✅ Upload verified - file is accessible');
    } catch (verifyError) {
      console.warn('⚠️ Upload verification failed:', verifyError.message);
    }
    
    return NextResponse.json({
      success: true,
      audioUrl: potentialUrl,
      tikTokId,
      message: 'Successfully downloaded and uploaded MP3',
      cached: false
    });

  } catch (error) {
    console.error('💥 MP3 download/upload error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to process MP3',
      details: error.message 
    }, { status: 500 });
  } finally {
    // Clean up temporary directory
    if (tempDir && fs.existsSync(tempDir)) {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`🧹 Cleaned up temp directory: ${tempDir}`);
      } catch (cleanupError) {
        console.error('Failed to clean up temp directory:', cleanupError);
      }
    }
  }
}