import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import Papa from 'papaparse';

function extractVideoId(url: string): string | null {
  const patterns = [
    /video\/(\d+)/,
    /\/v\/(\d+)/,
    /tiktok\.com\/@[^/]+\/video\/(\d+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const COLUMN_MAPS: Record<string, string[]> = {
  video_url: ['video link', 'video url', 'url', 'link', 'tiktok url', 'tiktok link', 'video_url', 'videourl'],
  views: ['views', 'video views', 'total views', 'view count', 'viewcount'],
  likes: ['likes', 'like count', 'total likes', 'likecount', 'digg count'],
  comments: ['comments', 'comment count', 'total comments', 'commentcount'],
  shares: ['shares', 'share count', 'total shares', 'sharecount'],
  saves: ['saves', 'save count', 'total saves', 'savecount', 'favorites', 'bookmarks'],
  avg_watch_time_seconds: ['avg watch time', 'average watch time', 'avg. watch time', 'average watch time (s)', 'avgwatchtime'],
  total_watch_time_hours: ['total watch time', 'total play time', 'watch time (hours)', 'totalwatchtime'],
  completion_rate: ['completion rate', 'finish rate', 'watched full video', 'completionrate', 'finish rate (%)'],
  new_followers: ['new followers', 'followers gained', 'follower gain', 'newfollowers'],
  snapshot_date: ['date', 'upload date', 'post date', 'created', 'posted', 'publish date', 'creation date'],
};

function mapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());

  for (const [field, aliases] of Object.entries(COLUMN_MAPS)) {
    for (const alias of aliases) {
      const idx = lowerHeaders.indexOf(alias);
      if (idx !== -1) {
        mapping[field] = headers[idx];
        break;
      }
    }
    if (!mapping[field]) {
      for (const alias of aliases) {
        const idx = lowerHeaders.findIndex(h => h.includes(alias));
        if (idx !== -1) {
          mapping[field] = headers[idx];
          break;
        }
      }
    }
  }
  return mapping;
}

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).replace(/,/g, '').replace(/%/g, '').trim();
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  const str = String(val).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  const parts = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (parts) {
    const year = parts[3].length === 2 ? '20' + parts[3] : parts[3];
    return `${year}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const snapshotDateOverride = formData.get('snapshotDate') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    let rows: Record<string, unknown>[] = [];
    let headers: string[] = [];

    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(text, { type: 'string' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
      if (jsonData.length > 0) {
        headers = Object.keys(jsonData[0]);
        rows = jsonData;
      }
    } else {
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      headers = parsed.meta.fields || [];
      rows = parsed.data as Record<string, unknown>[];
    }

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 });
    }

    const columnMapping = mapColumns(headers);

    if (!columnMapping.video_url && !columnMapping.views) {
      return NextResponse.json({
        error: 'Could not auto-detect columns. Expected headers like: video url, views, likes, comments, shares',
        detectedHeaders: headers,
      }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    let inserted = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const row of rows) {
      try {
        const videoUrl = columnMapping.video_url ? String(row[columnMapping.video_url] || '') : '';
        if (!videoUrl) { skipped++; continue; }

        const videoId = extractVideoId(videoUrl);
        const snapshotDate = snapshotDateOverride
          || (columnMapping.snapshot_date ? parseDate(row[columnMapping.snapshot_date]) : null)
          || today;

        const record = {
          video_url: videoUrl,
          video_id: videoId,
          views: columnMapping.views ? parseNumber(row[columnMapping.views]) : null,
          likes: columnMapping.likes ? parseNumber(row[columnMapping.likes]) : null,
          comments: columnMapping.comments ? parseNumber(row[columnMapping.comments]) : null,
          shares: columnMapping.shares ? parseNumber(row[columnMapping.shares]) : null,
          saves: columnMapping.saves ? parseNumber(row[columnMapping.saves]) : null,
          avg_watch_time_seconds: columnMapping.avg_watch_time_seconds ? parseNumber(row[columnMapping.avg_watch_time_seconds]) : null,
          total_watch_time_hours: columnMapping.total_watch_time_hours ? parseNumber(row[columnMapping.total_watch_time_hours]) : null,
          completion_rate: columnMapping.completion_rate ? parseNumber(row[columnMapping.completion_rate]) : null,
          new_followers: columnMapping.new_followers ? parseNumber(row[columnMapping.new_followers]) : null,
          snapshot_date: snapshotDate,
        };

        const { error } = await supabase.from('analytics_snapshots').upsert(record, {
          onConflict: 'video_url,snapshot_date',
        });

        if (error) {
          errors.push(`Row error: ${error.message}`);
          skipped++;
        } else {
          inserted++;
        }
      } catch (e) {
        errors.push(`Parse error: ${(e as Error).message}`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      skipped,
      total: rows.length,
      columnMapping,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({
      error: 'Failed to process file',
      details: (error as Error).message,
    }, { status: 500 });
  }
}
