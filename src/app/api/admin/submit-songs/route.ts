import { NextResponse } from 'next/server';

function generateUUID() {
  let dt = new Date().getTime();
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid.toUpperCase();
}

function convertTimeToSeconds(timeString: string): number {
  if (timeString.includes(':')) {
    const [minutes, seconds] = timeString.split(':').map(Number);
    return minutes * 60 + seconds;
  }
  return parseInt(timeString) || 0;
}

async function submitToDatabase(performanceData: any, songData: any) {
  // Submit to performances endpoint
  const performanceResponse = await fetch('https://timikeys.up.railway.app/api/v1/performances/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(performanceData)
  });

  if (!performanceResponse.ok) {
    const errorText = await performanceResponse.text();
    throw new Error(`Performance API error: ${errorText}`);
  }

  // Submit to songs endpoint  
  const songResponse = await fetch('https://timikeys.up.railway.app/api/v1/songs/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(songData)
  });

  if (!songResponse.ok) {
    const errorText = await songResponse.text();
    throw new Error(`Songs API error: ${errorText}`);
  }

  return { performanceResponse, songResponse };
}

export async function POST(request: Request) {
  try {
    const { songs } = await request.json();
    
    if (!songs || !Array.isArray(songs)) {
      return NextResponse.json({ error: 'Invalid songs data' }, { status: 400 });
    }

    let successCount = 0;
    let errorCount = 0;
    const results = [];

    for (const song of songs) {
      try {
        // Validate required fields
        if (!song.tikTokVideoLink || !song.songName) {
          throw new Error('Missing required fields');
        }

        // Parse genres
        const genresArray = song.genres ? song.genres.split(',').map((g: string) => g.trim()) : [];

        // Prepare database entries (matching your original CodePen structure)
        const performanceData = {
          videoNumber: parseInt(song.videoNumber) || 0,
          videoURL: song.tikTokVideoLink,
          songName: song.songName,
          artistName: song.artistName || '',
          albumName: song.albumName || '',
          yesOrNo: song.yesOrNo === 'yes',
          videoLength: song.videoLength || '',
          videoLengthInSeconds: convertTimeToSeconds(song.videoLength || '0'),
          mainGenre: genresArray[0] || '',
          subGenre: genresArray[1] || '',
          otherGenres: genresArray.slice(2) || []
        };

        const songData = {
          id: generateUUID(),
          videoNo: parseInt(song.videoNumber) || 0,
          tiktokVideoLink: song.tikTokVideoLink,
          songName: song.songName,
          artistName: song.artistName || '',
          albumName: song.albumName || '',
          videoLength: song.videoLength || '',
          YesNo: song.yesOrNo === 'yes',
          spotifyId: song.spotifyId || ''
        };

        // Submit to database
        await submitToDatabase(performanceData, songData);

        results.push({
          song: song.songName,
          status: 'success',
          message: 'Successfully added to database'
        });
        
        successCount++;
        console.log(`✅ Successfully processed: ${song.songName}`);

      } catch (error) {
        console.error(`❌ Error processing ${song.songName}:`, error);
        results.push({
          song: song.songName,
          status: 'error',
          error: error.message
        });
        errorCount++;
      }

      // Small delay to prevent API overwhelming
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      success: successCount,
      errors: errorCount,
      results,
      message: `Processed ${successCount + errorCount} songs. Success: ${successCount}, Errors: ${errorCount}`
    });

  } catch (error) {
    console.error('Submit songs error:', error);
    return NextResponse.json({
      error: 'Failed to process songs',
      details: error.message
    }, { status: 500 });
  }
}