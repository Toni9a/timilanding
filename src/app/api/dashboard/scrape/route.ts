import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

const RAILWAY_API = 'https://timikeys.up.railway.app';
const SCRAPE_DELAY_MS = 1500;

function cleanVideoUrl(url: string): string {
  return url.split('?')[0];
}

function extractVideoId(url: string): string | null {
  const m = url.match(/video\/(\d+)/);
  return m ? m[1] : null;
}

interface VideoGroup {
  videoUrl: string;
  videoId: string | null;
  videoNo: number;
  songs: { songName: string; artistName: string; genres: string[] }[];
  isMashup: boolean;
}

function groupPerformancesByVideo(performances: any[]): VideoGroup[] {
  const videoMap = new Map<string, VideoGroup>();

  for (const p of performances) {
    if (!p.tiktokVideoLink?.includes('tiktok.com')) continue;

    const url = cleanVideoUrl(p.tiktokVideoLink);
    const existing = videoMap.get(url);

    const genres = (p.songGenres || [])
      .map((sg: any) => sg.Genre?.genreName)
      .filter(Boolean);

    const song = {
      songName: p.songName || '',
      artistName: p.artistName || '',
      genres,
    };

    if (existing) {
      existing.songs.push(song);
      existing.isMashup = true;
    } else {
      videoMap.set(url, {
        videoUrl: url,
        videoId: extractVideoId(url),
        videoNo: p.videoNo || 0,
        songs: [song],
        isMashup: false,
      });
    }
  }

  return Array.from(videoMap.values());
}

interface ScrapeResult {
  success: boolean;
  stats?: { playCount: number; diggCount: number; commentCount: number; shareCount: number; collectCount: number };
  createTime?: number;
  description?: string;
  error?: string;
}

async function scrapeTikTokStats(url: string): Promise<ScrapeResult> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) return { success: false, error: `HTTP ${res.status}` };

    const html = await res.text();
    const universalMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>(.*?)<\/script>/s);
    if (!universalMatch) return { success: false, error: 'No universal data found' };

    const data = JSON.parse(universalMatch[1]);
    const detail = data.__DEFAULT_SCOPE__?.['webapp.reflow.video.detail']
      || data.__DEFAULT_SCOPE__?.['webapp.video-detail'];

    const item = detail?.itemInfo?.itemStruct;
    if (!item?.stats) return { success: false, error: 'No stats in response' };

    return {
      success: true,
      stats: item.stats,
      createTime: item.createTime ? parseInt(item.createTime) : undefined,
      description: item.desc || undefined,
    };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize || 50, 200);
    const offset = body.offset || 0;

    const perfResponse = await fetch(`${RAILWAY_API}/api/v1/performances/search?q=&page=1&limit=3000`);
    const perfData = await perfResponse.json();
    const allPerformances = perfData.data?.data || [];

    if (allPerformances.length === 0) {
      return NextResponse.json({ error: 'No performances found in database' }, { status: 404 });
    }

    // Group by unique video URL — same video with multiple songs = one scrape
    const uniqueVideos = groupPerformancesByVideo(allPerformances);
    const batch = uniqueVideos.slice(offset, offset + batchSize);
    const today = new Date().toISOString().split('T')[0];

    const results: any[] = [];
    let scraped = 0;
    let failed = 0;
    let skipped = 0;

    for (const video of batch) {
      // Check if already scraped today
      const { data: existing } = await supabase
        .from('analytics_snapshots')
        .select('id')
        .eq('video_url', video.videoUrl)
        .eq('snapshot_date', today)
        .maybeSingle();

      if (existing) {
        skipped++;
        results.push({
          videoId: video.videoId,
          videoNo: video.videoNo,
          songName: video.songs.map(s => s.songName).join(' / '),
          songCount: video.songs.length,
          isMashup: video.isMashup,
          status: 'skipped',
          reason: 'Already scraped today',
        });
        continue;
      }

      const scrapeResult = await scrapeTikTokStats(video.videoUrl);

      if (scrapeResult.success && scrapeResult.stats) {
        // Build combined song/artist/genre labels for this video
        const allSongNames = video.songs.map(s => s.songName).filter(Boolean);
        const allArtists = [...new Set(video.songs.map(s => s.artistName).filter(Boolean))];

        const uploadDateTime = scrapeResult.createTime
          ? new Date(scrapeResult.createTime * 1000)
          : null;
        const uploadDate = uploadDateTime
          ? uploadDateTime.toISOString().split('T')[0]
          : null;
        const uploadHour = uploadDateTime
          ? uploadDateTime.getUTCHours()
          : null;

        const { error: insertError } = await supabase.from('analytics_snapshots').upsert({
          video_url: video.videoUrl,
          video_id: video.videoId,
          song_name: allSongNames.join(' / '),
          artist_name: allArtists.join(', '),
          views: scrapeResult.stats.playCount || 0,
          likes: scrapeResult.stats.diggCount || 0,
          comments: scrapeResult.stats.commentCount || 0,
          shares: scrapeResult.stats.shareCount || 0,
          saves: scrapeResult.stats.collectCount || 0,
          upload_date: uploadDate,
          upload_hour: uploadHour,
          description: scrapeResult.description || null,
          snapshot_date: today,
        }, { onConflict: 'video_url,snapshot_date' });

        if (insertError) {
          failed++;
          results.push({ videoId: video.videoId, videoNo: video.videoNo, songName: allSongNames.join(' / '), songCount: video.songs.length, isMashup: video.isMashup, status: 'error', error: insertError.message });
        } else {
          scraped++;
          results.push({
            videoId: video.videoId,
            videoNo: video.videoNo,
            songName: allSongNames.join(' / '),
            songCount: video.songs.length,
            isMashup: video.isMashup,
            artistName: allArtists.join(', '),
            status: 'success',
            stats: scrapeResult.stats,
          });
        }
      } else {
        failed++;
        results.push({ videoId: video.videoId, videoNo: video.videoNo, songName: video.songs[0]?.songName, songCount: video.songs.length, isMashup: video.isMashup, status: 'error', error: scrapeResult.error });
      }

      await new Promise(resolve => setTimeout(resolve, SCRAPE_DELAY_MS));
    }

    return NextResponse.json({
      success: true,
      totalInDb: uniqueVideos.length,
      totalPerformances: allPerformances.length,
      batchStart: offset,
      batchEnd: offset + batch.length,
      scraped,
      failed,
      skipped,
      hasMore: offset + batchSize < uniqueVideos.length,
      nextOffset: offset + batchSize,
      results,
    });
  } catch (error) {
    console.error('Scrape error:', error);
    return NextResponse.json({
      error: 'Scrape failed',
      details: (error as Error).message,
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    const perfResponse = await fetch(`${RAILWAY_API}/api/v1/performances/search?q=&page=1&limit=3000`);
    const perfData = await perfResponse.json();
    const allPerformances = perfData.data?.data || [];
    const uniqueVideos = groupPerformancesByVideo(allPerformances);

    const today = new Date().toISOString().split('T')[0];
    const { count } = await supabase
      .from('analytics_snapshots')
      .select('*', { count: 'exact', head: true })
      .eq('snapshot_date', today);

    const { count: totalSnapshots } = await supabase
      .from('analytics_snapshots')
      .select('*', { count: 'exact', head: true });

    const mashupCount = uniqueVideos.filter(v => v.isMashup).length;

    return NextResponse.json({
      totalVideos: uniqueVideos.length,
      totalPerformances: allPerformances.length,
      mashupVideos: mashupCount,
      singleSongVideos: uniqueVideos.length - mashupCount,
      scrapedToday: count || 0,
      remaining: uniqueVideos.length - (count || 0),
      totalSnapshots: totalSnapshots || 0,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
