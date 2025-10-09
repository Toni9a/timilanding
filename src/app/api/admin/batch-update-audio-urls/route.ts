// src/app/api/admin/batch-update-audio-urls/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('Starting batch audioUrl update for existing songs...');
    
    // Get all performances to find songs with TikTok URLs
    const response = await fetch('https://timikeys.up.railway.app/api/v1/performances/search?q=&page=1&limit=5000');
    
    if (!response.ok) {
      throw new Error('Failed to fetch performances from database');
    }
    
    const data = await response.json();
    const performances = data.data?.data || data.data || [];
    
    console.log(`Found ${performances.length} performances to process`);
    
    // Get songs that need audioUrl updates (including mashups with same URL)
    const songsToUpdate = [];
    
    for (const perf of performances) {
      const tiktokUrl = perf.tiktokVideoLink;
      
      // Process ALL songs that don't have audioUrl and have valid TikTok URLs
      // Don't skip duplicates - mashups need the same audioUrl
      if (tiktokUrl && 
          tiktokUrl.includes('tiktok.com') && 
          (!perf.audioUrl || perf.audioUrl === null)) {
        
        // Extract video ID
        const match = tiktokUrl.match(/\/video\/(\d+)/);
        
        if (match && match[1]) {
          const videoId = match[1];
          const audioUrl = `https://pub-b8c2ac03cc924dd08beda93e65075aa1.r2.dev/${videoId}.mp3`;
          
          songsToUpdate.push({
            songId: perf.id,
            songName: perf.songName,
            tiktokUrl,
            videoId,
            audioUrl,
            videoNo: perf.videoNo
          });
        }
      }
    }
    
    console.log(`Found ${songsToUpdate.length} songs needing audioUrl updates (includes mashups)`);
    
    // Update songs in batches
    const batchSize = 5;
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < songsToUpdate.length; i += batchSize) {
      const batch = songsToUpdate.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(songsToUpdate.length / batchSize)}`);
      
      for (const song of batch) {
        try {
          // Update the song using PUT endpoint
          const updateResponse = await fetch(`https://timikeys.up.railway.app/api/v1/songs/${song.songId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioUrl: song.audioUrl
            })
          });
          
          const updateResult = await updateResponse.json();
          
          if (updateResponse.ok && updateResult.success) {
            results.push({
              songId: song.songId,
              songName: song.songName,
              audioUrl: song.audioUrl,
              status: 'success'
            });
            successCount++;
            console.log(`✅ Updated ${song.songName} with audioUrl`);
          } else {
            results.push({
              songId: song.songId,
              songName: song.songName,
              audioUrl: song.audioUrl,
              status: 'failed',
              error: updateResult.error || 'Unknown error'
            });
            errorCount++;
            console.log(`❌ Failed to update ${song.songName}: ${updateResult.error}`);
          }
          
        } catch (error) {
          results.push({
            songId: song.songId,
            songName: song.songName,
            audioUrl: song.audioUrl,
            status: 'error',
            error: error.message
          });
          errorCount++;
          console.error(`❌ Error updating ${song.songName}:`, error);
        }
      }
      
      // Small delay between batches
      if (i + batchSize < songsToUpdate.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return NextResponse.json({
      success: successCount > 0,
      message: `Batch audioUrl update completed: ${successCount} successful, ${errorCount} failed`,
      stats: {
        totalSongsFound: songsToUpdate.length,
        successfulUpdates: successCount,
        failedUpdates: errorCount,
        successRate: Math.round((successCount / songsToUpdate.length) * 100)
      },
      results: results.slice(0, 10), // First 10 results for preview
      totalResults: results.length,
      note: 'This includes all mashup songs with same TikTok URLs'
    });
    
  } catch (error) {
    console.error('Batch audioUrl update failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update audioUrls',
      details: error.message
    }, { status: 500 });
  }
}