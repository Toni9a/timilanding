import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
// @ts-expect-error no types for google-trends-api
import googleTrends from 'google-trends-api';

const RAILWAY_API = 'https://timikeys.up.railway.app';

function cleanVideoUrl(url: string): string {
  return url.split('?')[0];
}

interface TrendPoint {
  date: string;
  value: number;
}

interface TrendResult {
  keyword: string;
  type: 'artist' | 'song' | 'album';
  points: TrendPoint[];
  avgBefore: number;
  avgDuring: number;
  avgAfter: number;
  spikeDetected: boolean;
  spikeRatio: number;
  peakDate: string;
  peakValue: number;
}

interface TrendExplanation {
  label: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

async function fetchTrendData(keyword: string, uploadDate: Date): Promise<TrendPoint[]> {
  const before = new Date(uploadDate);
  before.setDate(before.getDate() - 30);
  const after = new Date(uploadDate);
  after.setDate(after.getDate() + 30);

  try {
    const raw = await googleTrends.interestOverTime({
      keyword,
      startTime: before,
      endTime: after,
      geo: 'GB',
    });
    const parsed = JSON.parse(raw);
    return (parsed.default?.timelineData || []).map((p: any) => ({
      date: p.formattedAxisTime || p.formattedTime,
      value: p.value[0],
    }));
  } catch {
    return [];
  }
}

function analyzeTrend(points: TrendPoint[], uploadDate: Date): { avgBefore: number; avgDuring: number; avgAfter: number; spikeDetected: boolean; spikeRatio: number; peakDate: string; peakValue: number } {
  if (points.length === 0) return { avgBefore: 0, avgDuring: 0, avgAfter: 0, spikeDetected: false, spikeRatio: 0, peakDate: '', peakValue: 0 };

  const uploadTime = uploadDate.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  const before: number[] = [];
  const during: number[] = [];
  const after: number[] = [];
  let peakValue = 0;
  let peakDate = '';

  for (const p of points) {
    if (p.value > peakValue) {
      peakValue = p.value;
      peakDate = p.date;
    }

    const pDate = new Date(p.date).getTime();
    if (pDate < uploadTime - weekMs) before.push(p.value);
    else if (pDate <= uploadTime + weekMs) during.push(p.value);
    else after.push(p.value);
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const avgBefore = avg(before);
  const avgDuring = avg(during);
  const avgAfter = avg(after);
  const baseline = Math.max(avgBefore, 1);
  const spikeRatio = avgDuring / baseline;
  const spikeDetected = spikeRatio > 1.5;

  return { avgBefore, avgDuring, avgAfter, spikeDetected, spikeRatio, peakDate, peakValue };
}

function generateExplanations(
  trends: TrendResult[],
  videoViews: number,
  avgViews: number,
  uploadDate: Date
): TrendExplanation[] {
  const explanations: TrendExplanation[] = [];

  for (const t of trends) {
    if (t.spikeDetected && t.spikeRatio > 2) {
      explanations.push({
        label: `${t.keyword} was trending`,
        confidence: 'high',
        reason: `Google Trends interest for "${t.keyword}" was ${t.spikeRatio.toFixed(1)}x higher than baseline around the upload date. Peak: ${t.peakDate}.`,
      });
    } else if (t.spikeDetected) {
      explanations.push({
        label: `${t.keyword} had elevated interest`,
        confidence: 'medium',
        reason: `Google Trends showed a ${t.spikeRatio.toFixed(1)}x bump in interest for "${t.keyword}" around the upload date.`,
      });
    }
  }

  const month = uploadDate.getMonth();
  if (month === 11 || month === 0) {
    explanations.push({
      label: 'Holiday season boost',
      confidence: 'medium',
      reason: 'Uploaded during December/January — TikTok engagement tends to spike during holidays.',
    });
  }

  const day = uploadDate.getDay();
  if (day === 0 || day === 6) {
    explanations.push({
      label: 'Weekend upload',
      confidence: 'low',
      reason: 'Posted on a weekend — engagement can be higher due to more browsing time.',
    });
  }

  if (videoViews > avgViews * 3) {
    const noTrendSpike = trends.every(t => !t.spikeDetected);
    if (noTrendSpike) {
      explanations.push({
        label: 'Organic viral moment',
        confidence: 'medium',
        reason: `This video got ${(videoViews / avgViews).toFixed(1)}x the average views without any detectable trend spike — likely went viral organically on TikTok.`,
      });
    }
  }

  if (videoViews < avgViews * 0.3) {
    explanations.push({
      label: 'Below average performance',
      confidence: 'low',
      reason: `This video underperformed at ${(videoViews / avgViews * 100).toFixed(0)}% of the average. Could be timing, niche song, or algorithm.`,
    });
  }

  return explanations;
}

// GET: Analyze trends for a specific video
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('videoUrl');
    const videoId = searchParams.get('videoId');

    if (!videoUrl && !videoId) {
      return NextResponse.json({ error: 'videoUrl or videoId required' }, { status: 400 });
    }

    // Get snapshot data
    const query = supabase.from('analytics_snapshots').select('*');
    if (videoUrl) query.eq('video_url', videoUrl);
    else if (videoId) query.eq('video_id', videoId);

    const { data: snapshots } = await query.order('snapshot_date', { ascending: false }).limit(1);
    const snapshot = snapshots?.[0];
    if (!snapshot) {
      return NextResponse.json({ error: 'No analytics data for this video' }, { status: 404 });
    }

    // Get all performances for this video URL from Railway
    const perfResponse = await fetch(`${RAILWAY_API}/api/v1/performances/search?q=&page=1&limit=3000`);
    const perfData = await perfResponse.json();
    const allPerfs = perfData.data?.data || [];
    const videoPerfs = allPerfs.filter((p: any) =>
      cleanVideoUrl(p.tiktokVideoLink || '') === cleanVideoUrl(snapshot.video_url)
    );

    // Use actual upload date from scraper (createTime), fall back to performance data
    const uploadDate = snapshot.upload_date
      ? new Date(snapshot.upload_date)
      : videoPerfs[0]?.uploadDate
        ? new Date(videoPerfs[0].uploadDate)
        : new Date(snapshot.snapshot_date);

    // Collect unique keywords to search
    const keywords = new Map<string, 'artist' | 'song' | 'album'>();
    for (const p of videoPerfs) {
      if (p.artistName) {
        // For multi-artist entries, split and search the main artist
        const mainArtist = p.artistName.split(',')[0].trim();
        keywords.set(mainArtist, 'artist');
      }
      if (p.songName) keywords.set(p.songName, 'song');
      if (p.albumName) keywords.set(p.albumName, 'album');
    }

    // Limit to avoid hammering Google Trends (max 5 queries)
    const keywordEntries = Array.from(keywords.entries()).slice(0, 5);

    // Calculate average views across all videos for context
    const { data: allSnapshots } = await supabase
      .from('analytics_snapshots')
      .select('views')
      .order('snapshot_date', { ascending: false });

    const latestByUrl = new Map<string, number>();
    for (const s of allSnapshots || []) {
      if (!latestByUrl.has(s.video_url)) latestByUrl.set(s.video_url, s.views || 0);
    }
    const allViews = Array.from(latestByUrl.values());
    const avgViews = allViews.length > 0 ? allViews.reduce((a, b) => a + b, 0) / allViews.length : 0;

    // Fetch trends with delays to avoid rate limiting
    const trends: TrendResult[] = [];
    for (const [keyword, type] of keywordEntries) {
      const points = await fetchTrendData(keyword, uploadDate);
      const analysis = analyzeTrend(points, uploadDate);
      trends.push({ keyword, type, points, ...analysis });
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const explanations = generateExplanations(trends, snapshot.views || 0, avgViews, uploadDate);

    return NextResponse.json({
      video: {
        url: snapshot.video_url,
        songName: snapshot.song_name,
        artistName: snapshot.artist_name,
        views: snapshot.views,
        likes: snapshot.likes,
        comments: snapshot.comments,
        shares: snapshot.shares,
        saves: snapshot.saves,
        uploadDate: uploadDate.toISOString().split('T')[0],
        songCount: videoPerfs.length,
        isMashup: videoPerfs.length > 1,
        songs: videoPerfs.map((p: any) => ({ songName: p.songName, artistName: p.artistName, albumName: p.albumName })),
      },
      trends,
      explanations,
      context: {
        avgViews: Math.round(avgViews),
        viewsVsAvg: avgViews > 0 ? parseFloat((snapshot.views / avgViews).toFixed(2)) : 0,
      },
    });
  } catch (error) {
    console.error('Trends error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

// POST: Batch analyze top/bottom performers
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body.mode || 'top';
    const limit = Math.min(body.limit || 5, 10);

    const { data: snapshots } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .order('views', { ascending: mode === 'bottom' })
      .limit(limit);

    if (!snapshots?.length) {
      return NextResponse.json({ error: 'No data' }, { status: 404 });
    }

    const results = [];
    for (const s of snapshots) {
      const url = `/api/dashboard/trends?videoUrl=${encodeURIComponent(s.video_url)}`;
      try {
        const res = await fetch(new URL(url, request.url).toString());
        const data = await res.json();
        results.push(data);
      } catch {
        results.push({ video: { url: s.video_url, songName: s.song_name }, error: 'Failed to analyze' });
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({ mode, results });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
