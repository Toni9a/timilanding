// src/app/api/admin/fetch-upload-dates/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST() {
  try {
    console.log('🚀 Starting TikTok upload date extraction...');
    
    // Step 1: Get all performances from Railway
    const response = await fetch('https://timikeys.up.railway.app/api/v1/performances/search?q=&page=1&limit=5000');
    
    if (!response.ok) {
      throw new Error('Failed to fetch performances from Railway');
    }
    
    const data = await response.json();
    const performances = data.data?.data || [];
    
    console.log(`📊 Found ${performances.length} performances to process`);
    
    // Step 2: Extract unique TikTok URLs
    const tikTokUrls = [...new Set(
      performances
        .map((p: any) => p.videoURL || p.tiktokVideoLink)
        .filter((url: string) => url && url.includes('tiktok.com'))
    )];
    
    console.log(`🔗 Found ${tikTokUrls.length} unique TikTok URLs`);
    
    // Step 3: Process URLs in small batches to avoid overwhelming yt-dlp
    const batchSize = 5;
    const results = [];
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < tikTokUrls.length; i += batchSize) {
      const batch = tikTokUrls.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(tikTokUrls.length / batchSize);
      
      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} URLs)`);
      
      // Process batch sequentially to avoid overwhelming yt-dlp
      for (const url of batch) {
        try {
          processedCount++;
          console.log(`⏳ Processing ${processedCount}/${tikTokUrls.length}: ${url}`);
          
          // Extract upload date using yt-dlp
          const command = `yt-dlp --print "%(upload_date)s|%(title)s|%(duration)s" --no-download "${url}"`;
          
          const { stdout, stderr } = await execAsync(command, { 
            timeout: 30000,
            maxBuffer: 1024 * 1024 
          });
          
          if (stderr && !stderr.includes('WARNING')) {
            console.log(`⚠️  yt-dlp warning for ${url}: ${stderr}`);
          }
          
          const [uploadDate, title, duration] = stdout.trim().split('|');
          
          // Format upload date (YYYYMMDD -> YYYY-MM-DD)
          let formattedDate = null;
          if (uploadDate && uploadDate !== 'NA' && uploadDate.length === 8) {
            try {
              const year = uploadDate.substring(0, 4);
              const month = uploadDate.substring(4, 6);
              const day = uploadDate.substring(6, 8);
              formattedDate = `${year}-${month}-${day}`;
            } catch (dateError) {
              console.error(`❌ Error formatting date for ${url}:`, dateError);
            }
          }
          
          if (formattedDate) {
            results.push({
              url,
              uploadDate: formattedDate,
              title: title || '',
              duration: parseInt(duration) || 0,
              success: true
            });
            successCount++;
            console.log(`✅ ${processedCount}/${tikTokUrls.length}: ${url} → ${formattedDate}`);
          } else {
            results.push({
              url,
              uploadDate: null,
              success: false,
              error: 'Could not extract upload date'
            });
            errorCount++;
            console.log(`❌ ${processedCount}/${tikTokUrls.length}: Failed to get date for ${url}`);
          }
          
        } catch (error) {
          errorCount++;
          console.error(`❌ Error processing ${url}:`, error.message);
          results.push({
            url,
            uploadDate: null,
            success: false,
            error: error.message
          });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Longer delay between batches
      if (i + batchSize < tikTokUrls.length) {
        console.log('💤 Waiting between batches...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Step 4: Organize results
    const successful = results.filter(r => r.success && r.uploadDate);
    const failed = results.filter(r => !r.success || !r.uploadDate);
    
    console.log(`\n📊 Final Results:`);
    console.log(`✅ Successfully extracted: ${successful.length}`);
    console.log(`❌ Failed extractions: ${failed.length}`);
    console.log(`📈 Success rate: ${Math.round((successful.length / tikTokUrls.length) * 100)}%`);
    
    // Step 5: Create a summary for database updates
    // Note: We can't directly update Railway DB from here, but we can provide the data
    const updateSummary = successful.map(result => {
      const matchingPerformances = performances.filter((p: any) => 
        (p.videoURL === result.url || p.tiktokVideoLink === result.url)
      );
      
      return {
        tiktokUrl: result.url,
        uploadDate: result.uploadDate,
        performanceIds: matchingPerformances.map((p: any) => p.id),
        performanceCount: matchingPerformances.length
      };
    });
    
    return NextResponse.json({
      success: true,
      message: 'TikTok upload date extraction completed',
      stats: {
        totalUrls: tikTokUrls.length,
        processedUrls: processedCount,
        successfulExtractions: successCount,
        failedExtractions: errorCount,
        successRate: Math.round((successCount / tikTokUrls.length) * 100)
      },
      updateSummary: updateSummary.slice(0, 20), // First 20 for preview
      successful: successful.slice(0, 10), // First 10 successful results
      failed: failed.slice(0, 5), // First 5 failed results
      totalUpdateNeeded: updateSummary.length
    });
    
  } catch (error) {
    console.error('💥 Batch upload date extraction failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to extract upload dates',
      details: error.message
    }, { status: 500 });
  }
}
