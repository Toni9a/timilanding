import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

const RAILWAY_API = 'https://timikeys.up.railway.app';

function cleanVideoUrl(url: string): string {
  return url.split('?')[0];
}

interface VideoPerformances {
  songs: { songName: string; artistName: string; albumName: string }[];
  genres: string[];
  videoNo: number;
  isMashup: boolean;
}

function buildVideoMap(performances: any[]): Map<string, VideoPerformances> {
  const map = new Map<string, VideoPerformances>();

  for (const p of performances) {
    if (!p.tiktokVideoLink) continue;
    const url = cleanVideoUrl(p.tiktokVideoLink);
    const genres = (p.songGenres || [])
      .map((sg: any) => sg.Genre?.genreName)
      .filter(Boolean);

    const existing = map.get(url);
    if (existing) {
      existing.songs.push({
        songName: p.songName || '',
        artistName: p.artistName || '',
        albumName: p.albumName || '',
      });
      existing.genres.push(...genres);
      existing.isMashup = true;
    } else {
      map.set(url, {
        songs: [{
          songName: p.songName || '',
          artistName: p.artistName || '',
          albumName: p.albumName || '',
        }],
        genres,
        videoNo: p.videoNo || 0,
        isMashup: false,
      });
    }
  }

  // Dedupe genres per video
  for (const v of map.values()) {
    v.genres = [...new Set(v.genres)];
  }

  return map;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'overview';

    const { data: snapshots, error } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false });

    if (error) throw error;

    const perfResponse = await fetch(`${RAILWAY_API}/api/v1/performances/search?q=&page=1&limit=3000`);
    const perfData = await perfResponse.json();
    const performances = perfData.data?.data || [];

    const videoMap = buildVideoMap(performances);

    // Enrich snapshots with video-level data
    const enriched = (snapshots || []).map((s: any) => {
      const videoInfo = videoMap.get(s.video_url);
      const uniqueArtists = videoInfo
        ? [...new Set(videoInfo.songs.map(song => song.artistName).filter(Boolean))]
        : [];

      return {
        ...s,
        song_name: s.song_name || videoInfo?.songs.map(song => song.songName).join(' / ') || null,
        artist_name: s.artist_name || uniqueArtists.join(', ') || null,
        songs: videoInfo?.songs || [],
        genres: videoInfo?.genres || [],
        video_no: videoInfo?.videoNo || null,
        is_mashup: videoInfo?.isMashup || false,
        song_count: videoInfo?.songs.length || 1,
        engagement_rate: s.views > 0
          ? (((s.likes || 0) + (s.comments || 0) + (s.shares || 0) + (s.saves || 0)) / s.views * 100).toFixed(2)
          : null,
      };
    });

    if (view === 'overview') {
      const totalViews = enriched.reduce((sum: number, s: any) => sum + (s.views || 0), 0);
      const totalLikes = enriched.reduce((sum: number, s: any) => sum + (s.likes || 0), 0);
      const totalComments = enriched.reduce((sum: number, s: any) => sum + (s.comments || 0), 0);
      const totalShares = enriched.reduce((sum: number, s: any) => sum + (s.shares || 0), 0);
      const totalSaves = enriched.reduce((sum: number, s: any) => sum + (s.saves || 0), 0);

      const uniqueVideos = new Set(enriched.map((s: any) => s.video_url)).size;
      const uniqueDates = new Set(enriched.map((s: any) => s.snapshot_date)).size;

      // Latest snapshot per video
      const latestByVideo = new Map<string, any>();
      for (const s of enriched) {
        const existing = latestByVideo.get(s.video_url);
        if (!existing || s.snapshot_date > existing.snapshot_date) {
          latestByVideo.set(s.video_url, s);
        }
      }
      const latest = Array.from(latestByVideo.values());

      const topByViews = [...latest].sort((a, b) => (b.views || 0) - (a.views || 0));
      const topByEngagement = [...latest]
        .filter(s => s.engagement_rate !== null)
        .sort((a, b) => parseFloat(b.engagement_rate) - parseFloat(a.engagement_rate));

      // Song index — group all videos by song (using spotifyId or songName as key)
      const songMap = new Map<string, { songName: string; artistName: string; spotifyId: string; videos: any[] }>();
      for (const video of latest) {
        const songs = video.songs?.length ? video.songs : [{ songName: video.song_name, artistName: video.artist_name, albumName: '' }];
        for (const song of songs) {
          if (!song.songName) continue;
          // Find spotifyId from performances
          const perfMatch = performances.find((p: any) =>
            p.songName === song.songName && p.artistName === song.artistName
          );
          const spotifyId = perfMatch?.spotifyId || '';
          const key = spotifyId || `${song.songName}::${song.artistName}`.toLowerCase();

          const existing = songMap.get(key);
          const videoEntry = {
            video_url: video.video_url,
            video_id: video.video_id,
            views: video.views,
            likes: video.likes,
            comments: video.comments,
            shares: video.shares,
            saves: video.saves,
            engagement_rate: video.engagement_rate,
            upload_date: video.upload_date,
            description: video.description,
            is_mashup: video.is_mashup,
            song_count: video.song_count,
            song_name: video.song_name,
          };

          if (existing) {
            existing.videos.push(videoEntry);
          } else {
            songMap.set(key, {
              songName: song.songName,
              artistName: song.artistName,
              spotifyId,
              videos: [videoEntry],
            });
          }
        }
      }
      const songIndex = Array.from(songMap.values())
        .map(s => ({
          ...s,
          totalViews: s.videos.reduce((sum, v) => sum + (v.views || 0), 0),
          totalLikes: s.videos.reduce((sum, v) => sum + (v.likes || 0), 0),
          videoCount: s.videos.length,
          avgViews: Math.round(s.videos.reduce((sum, v) => sum + (v.views || 0), 0) / s.videos.length),
          videos: s.videos.sort((a, b) => (b.views || 0) - (a.views || 0)),
        }))
        .sort((a, b) => b.videoCount - a.videoCount);

      const highViewsLowComments = [...latest]
        .filter(s => s.views > 0 && s.comments !== null)
        .sort((a, b) => {
          const ratioA = (a.comments || 0) / (a.views || 1);
          const ratioB = (b.comments || 0) / (b.views || 1);
          return ratioA - ratioB;
        })
        .slice(0, 10);

      const lowViewsHighEngagement = [...latest]
        .filter(s => s.views > 0 && s.engagement_rate !== null)
        .sort((a, b) => (a.views || 0) - (b.views || 0))
        .filter(s => parseFloat(s.engagement_rate) > 5)
        .slice(0, 10);

      // Genre stats — each video's stats count once per genre it contains
      const genreStats = new Map<string, { views: number; likes: number; count: number }>();
      for (const s of latest) {
        for (const g of s.genres) {
          const existing = genreStats.get(g) || { views: 0, likes: 0, count: 0 };
          existing.views += s.views || 0;
          existing.likes += s.likes || 0;
          existing.count++;
          genreStats.set(g, existing);
        }
      }
      const genreBreakdown = Array.from(genreStats.entries())
        .map(([genre, stats]) => ({
          genre,
          totalViews: stats.views,
          totalLikes: stats.likes,
          videoCount: stats.count,
          avgViews: Math.round(stats.views / stats.count),
        }))
        .sort((a, b) => b.totalViews - a.totalViews);

      // Artist stats — attribute video stats to each artist in the video
      const artistStats = new Map<string, { views: number; likes: number; count: number; songs: Set<string>; videoUrls: Set<string> }>();
      for (const s of latest) {
        const artists = s.songs?.length
          ? [...new Set(s.songs.map((song: any) => song.artistName).filter(Boolean))]
          : s.artist_name ? [s.artist_name] : [];

        for (const artist of artists) {
          const existing = artistStats.get(artist) || { views: 0, likes: 0, count: 0, songs: new Set(), videoUrls: new Set() };
          if (!existing.videoUrls.has(s.video_url)) {
            existing.views += s.views || 0;
            existing.likes += s.likes || 0;
            existing.videoUrls.add(s.video_url);
          }
          existing.count++;
          const artistSongs = s.songs
            ?.filter((song: any) => song.artistName === artist)
            .map((song: any) => song.songName) || [];
          for (const song of artistSongs) existing.songs.add(song);
          artistStats.set(artist, existing);
        }
      }
      const artistBreakdown = Array.from(artistStats.entries())
        .map(([artist, stats]) => ({
          artist,
          totalViews: stats.views,
          totalLikes: stats.likes,
          videoCount: stats.videoUrls.size,
          uniqueSongs: stats.songs.size,
          avgViews: Math.round(stats.views / stats.videoUrls.size),
        }))
        .sort((a, b) => b.totalViews - a.totalViews);

      return NextResponse.json({
        overview: {
          totalViews,
          totalLikes,
          totalComments,
          totalShares,
          totalSaves,
          uniqueVideos,
          snapshotDates: uniqueDates,
        },
        topByViews,
        topByEngagement,
        highViewsLowComments,
        lowViewsHighEngagement,
        genreBreakdown,
        artistBreakdown,
        songIndex,
        timeSeries: enriched,
      });
    }

    return NextResponse.json({ data: enriched });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({
      error: 'Failed to fetch analytics',
      details: (error as Error).message,
    }, { status: 500 });
  }
}
