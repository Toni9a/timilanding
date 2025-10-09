// src/app/api/admin/batch-update-dates/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    console.log('Starting batch upload date extraction...');
    
    // Step 1: Get all performances
    const response = await fetch('https://timikeys.up.railway.app/api/v1/performances?page=1&limit=5000');
    
    if (!response.ok) {
      throw new Error('Failed to fetch performances from database');
    }
    
    const data = await response.json();
    const performances = data.data?.data || data.data || [];
    
    console.log(`Found ${performances.length} performances to process`);
    
    // Step 2: Extract unique TikTok URLs
    const tikTokUrls = [...new Set(
      performances
        .map((p: any) => p.videoURL)
        .filter((url: string) => url && url.includes('tiktok.com'))
    )];
    
    console.log(`Found ${tikTokUrls.length} unique TikTok URLs`);
    
    // Step 3: Process URLs in batches to avoid overwhelming yt-dlp
    const batchSize = 3;
    const results = [];
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < tikTokUrls.length; i += batchSize) {
      const batch = tikTokUrls.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(tikTokUrls.length / batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches}: ${batch.length} URLs`);
      
      for (const url of batch) {
        try {
          processedCount++;
          
          // Extract upload date using yt-dlp
          const escapedUrl = url.replace(/'/g, "'\"'\"'");
          const command = `yt-dlp --print "%(upload_date)s" --no-download '${escapedUrl}'`;
          
          const { stdout, stderr } = await execAsync(command, { 
            timeout: 30000,
            maxBuffer: 1024 * 1024 
          });
          
          if (stderr && !stderr.includes('WARNING')) {
            console.log(`Warning for ${url}:`, stderr);
          }
          
          const uploadDate = stdout.trim();
          
          // Format upload date (YYYYMMDD -> ISO DateTime)
          let formattedDate = null;
          if (uploadDate && uploadDate !== 'NA' && uploadDate.length === 8) {
            const year = uploadDate.substring(0, 4);
            const month = uploadDate.substring(4, 6);
            const day = uploadDate.substring(6, 8);
            formattedDate = `${year}-${month}-${day}T00:00:00.000Z`;
          }
          
          if (formattedDate) {
            // Find all performances with this URL
            const matchingPerformances = performances.filter((p: any) => p.videoURL === url);
            
            // Update all matching performances
            let updatedCount = 0;
            for (const performance of matchingPerformances) {
              try {
                const updateResponse = await fetch(`https://timikeys.up.railway.app/api/v1/performances/${performance.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    uploadDate: formattedDate
                  })
                });
                
                if (updateResponse.ok) {
                  updatedCount++;
                }
              } catch (updateError) {
                console.error(`Failed to update performance ${performance.id}:`, updateError);
              }
            }
            
            results.push({
              url,
              uploadDate: formattedDate,
              performancesFound: matchingPerformances.length,
              performancesUpdated: updatedCount,
              status: 'success'
            });
            
            successCount++;
            console.log(`✅ ${processedCount}/${tikTokUrls.length}: ${url} -> ${formattedDate} (${updatedCount} performances updated)`);
          } else {
            results.push({
              url,
              uploadDate: null,
              performancesFound: 0,
              performancesUpdated: 0,
              status: 'no_date'
            });
            errorCount++;
            console.log(`❌ ${processedCount}/${tikTokUrls.length}: ${url} -> No date found`);
          }
          
        } catch (error) {
          results.push({
            url,
            uploadDate: null,
            performancesFound: 0,
            performancesUpdated: 0,
            status: 'error',
            error: error.message
          });
          errorCount++;
          console.error(`❌ ${processedCount}/${tikTokUrls.length}: ${url} -> Error:`, error.message);
        }
      }
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < tikTokUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`Batch processing complete: ${successCount} successful, ${errorCount} failed`);
    
    return NextResponse.json({
      success: true,
      message: 'Batch upload date extraction completed',
      stats: {
        totalUrls: tikTokUrls.length,
        processedUrls: processedCount,
        successfulExtractions: successCount,
        failedExtractions: errorCount,
        successRate: Math.round((successCount / tikTokUrls.length) * 100)
      },
      results: results.slice(0, 10), // First 10 results for preview
      totalPerformancesUpdated: results.reduce((sum, r) => sum + (r.performancesUpdated || 0), 0)
    });
    
  } catch (error) {
    console.error('Batch upload date extraction failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to extract upload dates',
      details: error.message
    }, { status: 500 });
  }
}