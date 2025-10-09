// src/app/api/admin/test-db-update/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { tikTokUrl } = await request.json();
    
    if (!tikTokUrl) {
      return NextResponse.json({
        success: false,
        error: 'TikTok URL is required'
      }, { status: 400 });
    }
    
    console.log('Testing update for single URL:', tikTokUrl);
    
    // Step 1: Extract upload date using yt-dlp
    const escapedUrl = tikTokUrl.replace(/'/g, "'\"'\"'");
    const command = `yt-dlp --print "%(upload_date)s|%(title)s|%(duration)s" --no-download '${escapedUrl}'`;
    
    console.log('Extracting upload date...');
    const { stdout } = await execAsync(command, { 
      timeout: 30000,
      maxBuffer: 1024 * 1024 
    });
    
    const [uploadDate, title, duration] = stdout.trim().split('|');
    
    // Format upload date (YYYYMMDD -> ISO DateTime)
    let formattedDate = null;
    if (uploadDate && uploadDate !== 'NA' && uploadDate.length === 8) {
      const year = uploadDate.substring(0, 4);
      const month = uploadDate.substring(4, 6);
      const day = uploadDate.substring(6, 8);
      formattedDate = `${year}-${month}-${day}T00:00:00.000Z`;
    }
    
    // Step 2: Get all performances
    console.log('Getting all performances...');
    const searchResponse = await fetch('https://timikeys.up.railway.app/api/v1/performances?page=1&limit=3000');
    
    if (!searchResponse.ok) {
      throw new Error(`Failed to get performances: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    const allPerformances = searchData.data?.data || searchData.data || [];
    console.log(`Found ${allPerformances.length} total performances`);
    
    // Step 3: Find matching performances
    const matchingPerformances = allPerformances.filter((p: any) => 
      p.videoURL === tikTokUrl
    );
    
    console.log(`Found ${matchingPerformances.length} performances with this URL`);
    
    if (matchingPerformances.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No performances found with this URL',
        extractedUploadDate: formattedDate,
        tikTokUrl,
        totalPerformancesChecked: allPerformances.length
      });
    }
    
    // Step 4: Update ALL matching performances
    console.log(`Updating all ${matchingPerformances.length} performances...`);
    
    const updateResults = [];
    
    for (const performance of matchingPerformances) {
      try {
        const updateResponse = await fetch(`https://timikeys.up.railway.app/api/v1/performances/${performance.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uploadDate: formattedDate
          })
        });
        
        const updateResult = await updateResponse.json();
        
        updateResults.push({
          id: performance.id,
          songName: performance.songName,
          success: updateResponse.ok,
          error: updateResponse.ok ? null : updateResult.error
        });
        
      } catch (error) {
        updateResults.push({
          id: performance.id,
          songName: performance.songName,
          success: false,
          error: error.message
        });
      }
    }
    
    const successCount = updateResults.filter(r => r.success).length;
    const failCount = updateResults.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: successCount > 0,
      message: `Updated ${successCount} of ${matchingPerformances.length} performances`,
      extractedUploadDate: formattedDate,
      totalFound: matchingPerformances.length,
      successfulUpdates: successCount,
      failedUpdates: failCount,
      updateResults: updateResults.slice(0, 3), // Show first 3 results
      tikTokUrl
    });
    
  } catch (error) {
    console.error('Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: 'Failed to test update'
    }, { status: 500 });
  }
}