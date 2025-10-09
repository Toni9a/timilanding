// src/app/api/admin/test-audio-url/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tikTokUrl } = await request.json();
    
    if (!tikTokUrl) {
      return NextResponse.json({
        success: false,
        error: 'TikTok URL is required'
      }, { status: 400 });
    }
    
    console.log('Testing audio URL overwrite for URL:', tikTokUrl);
    
    // Step 1: Extract video ID from provided TikTok URL
    let videoId = null;
    
    if (tikTokUrl && tikTokUrl.includes('/video/')) {
      const match = tikTokUrl.match(/\/video\/(\d+)/);
      videoId = match ? match[1] : null;
    }
    
    if (!videoId) {
      return NextResponse.json({
        success: false,
        message: 'Could not extract video ID from TikTok URL',
        providedUrl: tikTokUrl
      });
    }
    
    // Step 2: Find existing song with this TikTok URL
    const searchResponse = await fetch('https://timikeys.up.railway.app/api/v1/performances/search?q=&page=1&limit=3000');
    
    if (!searchResponse.ok) {
      throw new Error(`Failed to fetch data: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const allPerformances = searchData.data?.data || searchData.data || [];
    
    // Find song with matching TikTok URL
    const existingSong = allPerformances.find((perf: any) => 
      perf.tiktokVideoLink === tikTokUrl
    );
    
    if (!existingSong) {
      return NextResponse.json({
        success: false,
        message: 'No existing song found with this TikTok URL',
        providedUrl: tikTokUrl,
        searchedSongs: allPerformances.length
      });
    }
    
    console.log('Found existing song:', existingSong.songName);
    
    // Step 3: Construct new audioUrl
    const newAudioUrl = `https://pub-b8c2ac03cc924dd08beda93e65075aa1.r2.dev/${videoId}.mp3`;
    
    // Step 4: Update existing song using PUT endpoint
    console.log('Updating existing song with audioUrl...');

    const updateResponse = await fetch(`https://timikeys.up.railway.app/api/v1/songs/${existingSong.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioUrl: newAudioUrl
      })
    });

    const updateResult = await updateResponse.json();

    return NextResponse.json({
      success: updateResponse.ok,
      message: updateResponse.ok ? 'SUCCESS: Song updated with audioUrl' : 'FAILED: Song update failed',
      providedUrl: tikTokUrl,
      extractedVideoId: videoId,
      existingSong: {
        id: existingSong.id,
        songName: existingSong.songName,
        previousAudioUrl: existingSong.audioUrl || 'Not set'
      },
      newAudioUrl: newAudioUrl,
      backendResponse: updateResult,
      statusCode: updateResponse.status,
      note: 'This actually updates the existing song record'
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Failed to test song overwrite'
    }, { status: 500 });
  }
}