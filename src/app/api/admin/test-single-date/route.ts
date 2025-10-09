// src/app/api/admin/test-single-date/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    // Fix: Proper JSON parsing
    const { tikTokUrl } = await request.json();
    
    if (!tikTokUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'TikTok URL is required' 
      }, { status: 400 });
    }

    console.log('🧪 Testing single TikTok URL:', tikTokUrl);

    // Step 1: Extract upload date using yt-dlp - properly escape URL
    const escapedUrl = tikTokUrl.replace(/'/g, "'\"'\"'"); // Escape single quotes for shell
    const command = `yt-dlp --print "%(upload_date)s|%(title)s|%(duration)s" --no-download '${escapedUrl}'`;
    
    console.log('⏳ Running yt-dlp command...');
    console.log('Command:', command);
    
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 45000, // Increased timeout
      maxBuffer: 1024 * 1024 
    });
    
    if (stderr && !stderr.includes('WARNING')) {
      console.log('⚠️  yt-dlp stderr:', stderr);
    }
    
    if (!stdout || !stdout.trim()) {
      throw new Error('No output from yt-dlp - video may be private or unavailable');
    }
    
    const [uploadDate, title, duration] = stdout.trim().split('|');
    console.log('📅 Raw upload date:', uploadDate);
    console.log('🎬 Video title:', title);
    console.log('⏱️  Duration:', duration);
    
    // Step 2: Format upload date (YYYYMMDD -> YYYY-MM-DD)
    let formattedDate = null;
    if (uploadDate && uploadDate !== 'NA' && uploadDate.length === 8) {
      try {
        const year = uploadDate.substring(0, 4);
        const month = uploadDate.substring(4, 6);
        const day = uploadDate.substring(6, 8);
        formattedDate = `${year}-${month}-${day}`;
        console.log('✅ Formatted date:', formattedDate);
      } catch (dateError) {
        console.error('❌ Error formatting date:', dateError);
      }
    }

    // Step 3: Find all performances with this TikTok URL
    console.log('🔍 Searching for performances with this URL...');
    
    let matchingPerformances = [];
    let searchError = null;
    
    try {
      const searchResponse = await fetch('https://timikeys.up.railway.app/api/v1/performances/search?q=&page=1&limit=3000');
      
      if (!searchResponse.ok) {
        throw new Error(`Failed to fetch performances: ${searchResponse.status}`);
      }
      
      const searchData = await searchResponse.json();
      const allPerformances = searchData.data?.data || [];
      
      // Find matching performances - check both possible URL fields
      matchingPerformances = allPerformances.filter((p: any) => 
        p.videoURL === tikTokUrl || 
        p.tiktokVideoLink === tikTokUrl ||
        p.tikTokVideoLink === tikTokUrl  // Check alternative spelling
      );
      
      console.log(`🎵 Found ${matchingPerformances.length} performances with this URL`);
      
    } catch (error) {
      console.error('❌ Error searching performances:', error);
      searchError = error.message;
    }
    
    // Step 4: Return comprehensive test results
    const testResults = {
      success: true,
      message: 'Upload date extraction test completed',
      extractedData: {
        tikTokUrl,
        uploadDate: formattedDate,
        rawUploadDate: uploadDate,
        title: title || 'Not available',
        duration: parseInt(duration) || 0
      },
      foundPerformances: matchingPerformances.length,
      performanceDetails: matchingPerformances.slice(0, 5).map((p: any) => ({
        id: p.id,
        songName: p.songName,
        videoNumber: p.videoNumber,
        existingUploadDate: p.uploadDate || 'Not set'
      })),
      searchError,
      nextSteps: [
        '1. Verify the extracted date looks correct',
        '2. Test updating one performance with this date',
        '3. If successful, proceed with batch processing'
      ]
    };

    return NextResponse.json(testResults);

  } catch (error) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test upload date extraction',
      details: error.message,
      troubleshooting: [
        'Check if yt-dlp is installed on the server',
        'Verify the TikTok URL is accessible',
        'Check network connectivity to TikTok',
        'Ensure the video is not private or deleted'
      ]
    }, { status: 500 });
  }
}