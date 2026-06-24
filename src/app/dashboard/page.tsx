'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  AreaChart, Area,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, TrendingUp, Eye, Heart, MessageCircle, Share2,
  Bookmark, Users, Music, BarChart3, ArrowUpRight, ArrowDownRight,
  ChevronDown, X, Loader2, Search, Download, Zap, CheckCircle, AlertCircle, Lock,
} from 'lucide-react';

interface Snapshot {
  id: string;
  video_url: string;
  video_id: string | null;
  song_name: string | null;
  artist_name: string | null;
  album_name: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  avg_watch_time_seconds: number | null;
  completion_rate: number | null;
  new_followers: number | null;
  snapshot_date: string;
  genres: string[];
  engagement_rate: string | null;
}

interface AnalyticsData {
  overview: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalSaves: number;
    uniqueVideos: number;
    snapshotDates: number;
  };
  topByViews: Snapshot[];
  topByEngagement: Snapshot[];
  highViewsLowComments: Snapshot[];
  lowViewsHighEngagement: Snapshot[];
  genreBreakdown: { genre: string; totalViews: number; totalLikes: number; videoCount: number; avgViews: number }[];
  artistBreakdown: { artist: string; totalViews: number; totalLikes: number; videoCount: number; uniqueSongs: number; avgViews: number }[];
  songIndex: SongEntry[];
  timeSeries: Snapshot[];
}

interface SongVideoEntry {
  video_url: string;
  video_id: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  engagement_rate: string | null;
  upload_date: string | null;
  description: string | null;
  is_mashup: boolean;
  song_count: number;
  song_name: string;
}

interface SongEntry {
  songName: string;
  artistName: string;
  spotifyId: string;
  videos: SongVideoEntry[];
  totalViews: number;
  totalLikes: number;
  videoCount: number;
  avgViews: number;
}

type TabId = 'overview' | 'songs' | 'songSearch' | 'genres' | 'artists' | 'timing' | 'outliers' | 'timeseries' | 'trends' | 'import';

interface TrendPoint {
  date: string;
  value: number;
}

interface TrendResult {
  keyword: string;
  type: 'artist' | 'song' | 'album';
  points: TrendPoint[];
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

interface TrendAnalysis {
  video: {
    url: string;
    songName: string;
    artistName: string;
    views: number;
    likes: number;
    uploadDate: string;
    songCount: number;
    isMashup: boolean;
    songs: { songName: string; artistName: string }[];
  };
  trends: TrendResult[];
  explanations: TrendExplanation[];
  context: { avgViews: number; viewsVsAvg: number };
}

interface ScrapeStatus {
  totalVideos: number;
  totalPerformances: number;
  mashupVideos: number;
  singleSongVideos: number;
  scrapedToday: number;
  remaining: number;
  totalSnapshots: number;
}

interface ScrapeProgress {
  isRunning: boolean;
  currentBatch: number;
  totalBatches: number;
  scraped: number;
  failed: number;
  skipped: number;
  total: number;
  currentSong: string;
  results: { songName: string; artistName?: string; status: string; stats?: any; error?: string }[];
}

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
  { id: 'songs', label: 'Top Videos', icon: <Music size={16} /> },
  { id: 'songSearch', label: 'Song Search', icon: <Search size={16} /> },
  { id: 'genres', label: 'Genres', icon: <TrendingUp size={16} /> },
  { id: 'artists', label: 'Artists', icon: <Users size={16} /> },
  { id: 'timing', label: 'Timing', icon: <BarChart3 size={16} /> },
  { id: 'outliers', label: 'Outliers', icon: <Search size={16} /> },
  { id: 'timeseries', label: 'Time Series', icon: <TrendingUp size={16} /> },
  { id: 'trends', label: 'Why It Worked', icon: <Zap size={16} /> },
  { id: 'import', label: 'Import', icon: <Upload size={16} /> },
];

const CHART_COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6',
  '#22c55e', '#eab308', '#f97316', '#ef4444', '#ec4899',
];

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{typeof value === 'number' ? formatNum(value) : value}</p>
        </div>
        <div style={{ color, opacity: 0.7 }}>{icon}</div>
      </div>
    </motion.div>
  );
}

function VideoRow({ s, rank }: { s: Snapshot; rank: number }) {
  const songCount = (s as any).song_count || 1;
  const isMashup = (s as any).is_mashup || songCount > 1;

  return (
    <div className="video-row">
      <span style={{ color: '#555', fontWeight: 600, width: 30, textAlign: 'center' }}>{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
            {s.song_name || 'Unknown Song'}
          </p>
          {isMashup && (
            <span style={{ background: '#8b5cf620', color: '#8b5cf6', fontSize: 10, padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>
              {songCount} songs
            </span>
          )}
        </div>
        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>{s.artist_name || 'Unknown Artist'}</p>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13 }}>
        <span style={{ color: '#8b5cf6' }} title="Views"><Eye size={13} /> {formatNum(s.views || 0)}</span>
        <span style={{ color: '#ef4444' }} title="Likes"><Heart size={13} /> {formatNum(s.likes || 0)}</span>
        <span style={{ color: '#3b82f6' }} title="Comments"><MessageCircle size={13} /> {formatNum(s.comments || 0)}</span>
        <span style={{ color: '#22c55e' }} title="Engagement">{s.engagement_rate ? `${s.engagement_rate}%` : '-'}</span>
      </div>
    </div>
  );
}

const DASHBOARD_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'timikeys2024';

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem('dashboard_auth');
    if (auth === 'authenticated') setIsAuthenticated(true);
    setAuthLoading(false);
  }, []);

  if (authLoading) return <div style={{ minHeight: '100vh', background: '#0a0a0a' }} />;

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Inter, sans-serif' }}>
        <form onSubmit={e => {
          e.preventDefault();
          if (password === DASHBOARD_PASSWORD) {
            setIsAuthenticated(true);
            sessionStorage.setItem('dashboard_auth', 'authenticated');
          } else {
            setAuthError('Wrong password');
            setPassword('');
          }
        }} style={{ background: '#141414', borderRadius: 16, padding: 40, width: 360, textAlign: 'center' }}>
          <Lock size={32} style={{ color: '#8b5cf6', marginBottom: 16 }} />
          <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Keys Dashboard</h2>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 24 }}>Enter password to continue</p>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setAuthError(''); }}
            placeholder="Password"
            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '10px 14px', fontSize: 14, fontFamily: 'Inter', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
            autoFocus
          />
          {authError && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{authError}</p>}
          <button type="submit" style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter' }}>
            Enter
          </button>
        </form>
      </div>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [dragOver, setDragOver] = useState(false);
  const [snapshotDate, setSnapshotDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress>({
    isRunning: false, currentBatch: 0, totalBatches: 0,
    scraped: 0, failed: 0, skipped: 0, total: 0,
    currentSong: '', results: [],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/analytics?view=overview');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to fetch analytics:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); fetchScrapeStatus(); }, [fetchData]);

  async function fetchScrapeStatus() {
    try {
      const res = await fetch('/api/dashboard/scrape');
      const json = await res.json();
      setScrapeStatus(json);
    } catch (e) {
      console.error('Failed to fetch scrape status:', e);
    }
  }

  async function startScrape(batchSize = 50) {
    setScrapeProgress(prev => ({ ...prev, isRunning: true, results: [], scraped: 0, failed: 0, skipped: 0, currentBatch: 0 }));

    let offset = 0;
    let hasMore = true;
    let totalScraped = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let batchNum = 0;
    const allResults: any[] = [];

    while (hasMore) {
      batchNum++;
      setScrapeProgress(prev => ({ ...prev, currentBatch: batchNum, currentSong: 'Fetching batch...' }));

      try {
        const res = await fetch('/api/dashboard/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batchSize, offset }),
        });

        const data = await res.json();

        if (!data.success) {
          setScrapeProgress(prev => ({ ...prev, isRunning: false, currentSong: `Error: ${data.error}` }));
          break;
        }

        totalScraped += data.scraped;
        totalFailed += data.failed;
        totalSkipped += data.skipped;
        allResults.push(...data.results);
        hasMore = data.hasMore;
        offset = data.nextOffset;

        setScrapeProgress(prev => ({
          ...prev,
          scraped: totalScraped,
          failed: totalFailed,
          skipped: totalSkipped,
          total: data.totalInDb,
          totalBatches: Math.ceil(data.totalInDb / batchSize),
          results: allResults.slice(-20),
          currentSong: data.results[data.results.length - 1]?.songName || '',
        }));
      } catch (e) {
        setScrapeProgress(prev => ({ ...prev, isRunning: false, currentSong: `Error: ${(e as Error).message}` }));
        break;
      }
    }

    setScrapeProgress(prev => ({ ...prev, isRunning: false, currentSong: 'Done!' }));
    fetchData();
    fetchScrapeStatus();
  }

  async function handleFileUpload(file: File) {
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('snapshotDate', snapshotDate);

    try {
      const res = await fetch('/api/dashboard/import', { method: 'POST', body: formData });
      const result = await res.json();
      setImportResult(result);
      if (result.success) fetchData();
    } catch (e) {
      setImportResult({ error: (e as Error).message });
    } finally {
      setImporting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  const timeSeriesForVideo = selectedVideo && data
    ? data.timeSeries
        .filter(s => s.video_url === selectedVideo)
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    : null;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <style>{`
        .stat-card {
          background: #141414;
          border-radius: 12px;
          padding: 24px;
          transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .video-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #141414;
          border-radius: 8px;
          margin-bottom: 6px;
          transition: background 0.2s;
        }
        .video-row:hover { background: #1a1a1a; }
        .tab-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: #888;
          cursor: pointer;
          font-size: 13px;
          font-family: Inter, sans-serif;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .tab-btn:hover { color: #fff; background: #1a1a1a; }
        .tab-btn.active { color: #fff; background: #8b5cf6; }
        .drop-zone {
          border: 2px dashed #333;
          border-radius: 16px;
          padding: 60px 40px;
          text-align: center;
          transition: all 0.3s;
          cursor: pointer;
        }
        .drop-zone.active { border-color: #8b5cf6; background: rgba(139,92,246,0.05); }
        .panel {
          background: #141414;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
        }
        .panel h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #fff;
        }
        .chart-tooltip {
          background: #1a1a1a !important;
          border: 1px solid #333 !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          font-size: 12px !important;
        }
        @media (max-width: 768px) {
          .stat-grid { grid-template-columns: 1fr 1fr !important; }
          .main-grid { grid-template-columns: 1fr !important; }
          .tabs-scroll { overflow-x: auto; }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Keys Dashboard
            </span>
          </h1>
          <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>TikTok Performance Analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('import')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 8, border: '1px solid #333', background: 'transparent',
              color: '#fff', cursor: 'pointer', fontSize: 13, fontFamily: 'Inter',
            }}
          >
            <Upload size={14} /> Import Data
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-scroll" style={{ padding: '12px 32px', borderBottom: '1px solid #111', display: 'flex', gap: 4 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <Loader2 size={32} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : !data || data.overview.uniqueVideos === 0 ? (
          <EmptyState onImportClick={() => setActiveTab('import')} onScrapeClick={() => { setActiveTab('import'); startScrape(10); }} />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {activeTab === 'overview' && <OverviewTab data={data} />}
              {activeTab === 'songs' && <SongsTab data={data} onSelectVideo={setSelectedVideo} />}
              {activeTab === 'songSearch' && <SongSearchTab data={data} />}
              {activeTab === 'genres' && <GenresTab data={data} />}
              {activeTab === 'artists' && <ArtistsTab data={data} />}
              {activeTab === 'timing' && <TimingTab data={data} />}
              {activeTab === 'outliers' && <OutliersTab data={data} />}
              {activeTab === 'timeseries' && <TimeSeriesTab data={data} selectedVideo={selectedVideo} onSelectVideo={setSelectedVideo} />}
              {activeTab === 'trends' && <TrendsTab data={data} />}
              {activeTab === 'import' && (
                <ImportTab
                  dragOver={dragOver}
                  setDragOver={setDragOver}
                  handleDrop={handleDrop}
                  handleFileUpload={handleFileUpload}
                  fileInputRef={fileInputRef}
                  importing={importing}
                  importResult={importResult}
                  snapshotDate={snapshotDate}
                  setSnapshotDate={setSnapshotDate}
                  scrapeStatus={scrapeStatus}
                  scrapeProgress={scrapeProgress}
                  onStartScrape={startScrape}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Video time series modal */}
      {selectedVideo && timeSeriesForVideo && activeTab !== 'timeseries' && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20,
          }}
          onClick={() => setSelectedVideo(null)}
        >
          <div
            style={{ background: '#141414', borderRadius: 16, padding: 32, maxWidth: 800, width: '100%', maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0 }}>{timeSeriesForVideo[0]?.song_name || 'Video'}</h3>
                <p style={{ color: '#888', fontSize: 13 }}>{timeSeriesForVideo[0]?.artist_name || ''}</p>
              </div>
              <button onClick={() => setSelectedVideo(null)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            {timeSeriesForVideo.length > 1 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesForVideo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="snapshot_date" stroke="#555" fontSize={11} />
                  <YAxis stroke="#555" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="views" stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="likes" stroke="#ef4444" strokeWidth={2} />
                  <Line type="monotone" dataKey="comments" stroke="#3b82f6" strokeWidth={2} />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ color: '#888', textAlign: 'center', padding: 40 }}>
                Only 1 snapshot — import more data over time to see trends.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onImportClick, onScrapeClick }: { onImportClick: () => void; onScrapeClick: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>
        <BarChart3 size={48} style={{ color: '#333' }} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>No analytics data yet</h2>
      <p style={{ color: '#888', marginBottom: 24, maxWidth: 450, margin: '0 auto 24px' }}>
        Scrape TikTok stats for all your videos automatically, or import a CSV/XLSX from TikTok Studio.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button
          onClick={onScrapeClick}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
            borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff',
            cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'Inter',
          }}
        >
          <Zap size={16} /> Scrape TikTok Stats
        </button>
        <button
          onClick={onImportClick}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
            borderRadius: 10, border: '1px solid #333', background: 'transparent', color: '#ccc',
            cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'Inter',
          }}
        >
          <Upload size={16} /> Import CSV
        </button>
      </div>
    </div>
  );
}

function RecommendationsPanel() {
  const [recs, setRecs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function loadRecs() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/recommendations');
      const json = await res.json();
      setRecs(json.recommendations || []);
      setLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const typeIcons: Record<string, { icon: string; color: string }> = {
    chart_match: { icon: '🔥', color: '#ef4444' },
    new_release_match: { icon: '💿', color: '#8b5cf6' },
    trending_match: { icon: '📈', color: '#f97316' },
  };

  return (
    <div className="panel" style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} style={{ color: '#eab308' }} />
            Smart Recommendations
          </h3>
          <p style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
            Songs and artists worth covering based on trends, history, and timing
          </p>
        </div>
        {!loaded && (
          <button
            onClick={loadRecs}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 8, border: '1px solid #333', background: 'transparent',
              color: loading ? '#555' : '#ccc', cursor: loading ? 'default' : 'pointer',
              fontSize: 12, fontFamily: 'Inter',
            }}
          >
            {loading ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Checking trends...</> : 'Load Recommendations'}
          </button>
        )}
      </div>

      {loaded && recs.length === 0 && (
        <p style={{ color: '#555', textAlign: 'center', padding: 20, fontSize: 13 }}>No strong recommendations right now. Check back when artists are trending.</p>
      )}

      {recs.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {recs.map((r, i) => {
            const ti = typeIcons[r.type] || { icon: '💡', color: '#8b5cf6' };
            return (
              <div key={i} style={{ background: '#0a0a0a', borderRadius: 10, padding: 14, borderLeft: `3px solid ${ti.color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: '#fff' }}>
                    {ti.icon} {r.title}
                  </p>
                  <span style={{ background: '#1a1a1a', color: '#888', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                    #{r.chartPosition} {r.source}
                  </span>
                </div>
                <p style={{ color: '#888', fontSize: 12, margin: '4px 0' }}>{r.description}</p>
                {r.previousCovers?.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    {r.previousCovers.map((c: any, j: number) => (
                      <span key={j} style={{ background: '#141414', fontSize: 11, color: '#555', padding: '2px 8px', borderRadius: 4 }}>
                        {formatNum(c.views)} views {c.uploadDate ? `(${c.uploadDate})` : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OverviewTab({ data }: { data: AnalyticsData }) {
  const { overview, genreBreakdown, topByViews } = data;
  const [brandWindow, setBrandWindow] = useState<'30' | '90' | '180' | 'custom'>('90');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Compute brand stats for the selected window
  const now = new Date();
  let windowStart: Date;
  let windowEnd: Date = now;
  if (brandWindow === 'custom' && customFrom && customTo) {
    windowStart = new Date(customFrom);
    windowEnd = new Date(customTo);
  } else {
    windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - parseInt(brandWindow));
  }

  const windowVideos = data.timeSeries.filter((s: any) => {
    const uploadDate = s.upload_date ? new Date(s.upload_date) : null;
    return uploadDate && uploadDate >= windowStart && uploadDate <= windowEnd;
  });
  // Dedupe by video URL (latest snapshot)
  const windowByVideo = new Map<string, any>();
  for (const s of windowVideos) {
    const existing = windowByVideo.get(s.video_url);
    if (!existing || s.snapshot_date > existing.snapshot_date) windowByVideo.set(s.video_url, s);
  }
  const windowLatest = Array.from(windowByVideo.values());
  const wViews = windowLatest.reduce((sum, s) => sum + (s.views || 0), 0);
  const wLikes = windowLatest.reduce((sum, s) => sum + (s.likes || 0), 0);
  const wComments = windowLatest.reduce((sum, s) => sum + (s.comments || 0), 0);
  const wShares = windowLatest.reduce((sum, s) => sum + (s.shares || 0), 0);
  const wSaves = windowLatest.reduce((sum, s) => sum + (s.saves || 0), 0);
  const wEngagement = wViews > 0 ? ((wLikes + wComments + wShares + wSaves) / wViews * 100).toFixed(1) : '0';
  const windowLabel = brandWindow === 'custom'
    ? `${customFrom} to ${customTo}`
    : `Last ${brandWindow} days`;

  return (
    <>
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <StatCard label="Total Views" value={overview.totalViews} icon={<Eye size={24} />} color="#8b5cf6" />
        <StatCard label="Total Likes" value={overview.totalLikes} icon={<Heart size={24} />} color="#ef4444" />
        <StatCard label="Comments" value={overview.totalComments} icon={<MessageCircle size={24} />} color="#3b82f6" />
      </div>
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
        <StatCard label="Shares" value={overview.totalShares} icon={<Share2 size={24} />} color="#22c55e" />
        <StatCard label="Saves" value={overview.totalSaves} icon={<Bookmark size={24} />} color="#eab308" />
        <StatCard
          label="Avg Engagement"
          value={overview.totalViews > 0
            ? ((overview.totalLikes + overview.totalComments + overview.totalShares + overview.totalSaves) / overview.totalViews * 100).toFixed(1) + '%'
            : '-'}
          icon={<TrendingUp size={24} />}
          color="#ec4899"
        />
      </div>
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Videos Tracked" value={overview.uniqueVideos} icon={<Music size={24} />} color="#06b6d4" />
        <StatCard label="Snapshots" value={overview.snapshotDates} icon={<BarChart3 size={24} />} color="#f97316" />
      </div>

      <RecommendationsPanel />

      {/* Brand Overview */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              Brand Overview
            </h3>
            <p style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
              Engagement stats for videos uploaded in the selected window — share with brands for promo pitches
            </p>
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {(['30', '90', '180'] as const).map(w => (
              <button
                key={w}
                onClick={() => setBrandWindow(w)}
                className={`tab-btn ${brandWindow === w ? 'active' : ''}`}
                style={{ padding: '4px 12px', fontSize: 12 }}
              >
                {w}d
              </button>
            ))}
            <button
              onClick={() => setBrandWindow('custom')}
              className={`tab-btn ${brandWindow === 'custom' ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: 12 }}
            >
              Custom
            </button>
          </div>
        </div>

        {brandWindow === 'custom' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 12, fontFamily: 'Inter' }} />
            <span style={{ color: '#555', alignSelf: 'center' }}>to</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#fff', padding: '6px 10px', fontSize: 12, fontFamily: 'Inter' }} />
          </div>
        )}

        <p style={{ color: '#555', fontSize: 11, marginBottom: 12 }}>
          {windowLabel} · {windowLatest.length} video{windowLatest.length !== 1 ? 's' : ''}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Views', value: wViews, color: '#8b5cf6' },
            { label: 'Likes', value: wLikes, color: '#ef4444' },
            { label: 'Comments', value: wComments, color: '#3b82f6' },
            { label: 'Shares', value: wShares, color: '#22c55e' },
            { label: 'Saves', value: wSaves, color: '#eab308' },
            { label: 'Engagement Rate', value: wEngagement + '%', color: '#ec4899' },
          ].map(s => (
            <div key={s.label} style={{ background: '#0a0a0a', borderRadius: 10, padding: 16, borderLeft: `3px solid ${s.color}` }}>
              <p style={{ color: '#888', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{s.label}</p>
              <p style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0 }}>
                {typeof s.value === 'number' ? formatNum(s.value) : s.value}
              </p>
            </div>
          ))}
        </div>

        {windowLatest.length > 0 && (() => {
          const windowGenres = [...new Set(windowLatest.flatMap((s: any) => s.genres || []))];
          const windowSorted = [...windowLatest].sort((a, b) => (b.views || 0) - (a.views || 0));
          return (
            <div style={{ marginTop: 16 }}>
              <p style={{ color: '#555', fontSize: 11, marginBottom: 8 }}>
                Avg per video: {formatNum(Math.round(wViews / windowLatest.length))} views · {formatNum(Math.round(wLikes / windowLatest.length))} likes
              </p>

              {windowGenres.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Genres covered</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {windowGenres.slice(0, 20).map(g => (
                      <span key={g} style={{ background: '#1a1a1a', color: '#8b5cf6', fontSize: 11, padding: '3px 8px', borderRadius: 4 }}>{g}</span>
                    ))}
                    {windowGenres.length > 20 && <span style={{ color: '#555', fontSize: 11, padding: '3px 4px' }}>+{windowGenres.length - 20} more</span>}
                  </div>
                </div>
              )}

              <p style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Videos in this period</p>
              <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                {windowSorted.map((v: any, i: number) => (
                  <div key={v.video_url} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #111', fontSize: 12 }}>
                    <span style={{ color: '#333', width: 20, textAlign: 'center' }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: '#ccc', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {(v.song_name || 'Unknown').length > 40 ? (v.song_name || '').slice(0, 40) + '…' : v.song_name}
                      </p>
                      {v.description && (
                        <p style={{ color: '#333', fontSize: 10, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.description}
                        </p>
                      )}
                    </div>
                    <span style={{ color: '#555', fontSize: 11, flexShrink: 0 }}>{v.upload_date || ''}</span>
                    <span style={{ color: '#8b5cf6', flexShrink: 0 }}>{formatNum(v.views)}</span>
                    <span style={{ color: '#ef4444', flexShrink: 0 }}>{formatNum(v.likes)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="panel">
          <h3>Top Songs by Views</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={topByViews.slice(0, 10).map(s => ({
                ...s,
                label: (s.song_name || 'Unknown').length > 25
                  ? (s.song_name || 'Unknown').slice(0, 25) + '…'
                  : (s.song_name || 'Unknown'),
              }))}
              layout="vertical"
              margin={{ left: 10, right: 20, top: 5, bottom: 5 }}
            >
              <XAxis type="number" stroke="#555" fontSize={11} tickFormatter={formatNum} />
              <YAxis type="category" dataKey="label" stroke="#555" fontSize={11} width={150} tick={{ fill: '#ccc' }} interval={0} />
              <Tooltip
                contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => formatNum(v)}
                labelFormatter={(label: string) => {
                  const match = topByViews.find(s => (s.song_name || '').startsWith(label.replace('…', '')));
                  return match?.song_name || label;
                }}
              />
              <Bar dataKey="views" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel">
          <h3>Genre Distribution</h3>
          {genreBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genreBreakdown.slice(0, 8)}
                  dataKey="totalViews"
                  nameKey="genre"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ genre, percent }) => `${genre} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  fontSize={11}
                >
                  {genreBreakdown.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatNum(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#555', textAlign: 'center', padding: 40 }}>No genre data</p>
          )}
        </div>
      </div>
    </>
  );
}

function SongsTab({ data, onSelectVideo }: { data: AnalyticsData; onSelectVideo: (url: string) => void }) {
  const [sortBy, setSortBy] = useState<'views' | 'likes' | 'engagement_rate'>('views');
  const [searchQuery, setSearchQuery] = useState('');

  const allSongs = data.topByViews;

  const filtered = searchQuery.trim()
    ? allSongs.filter(s => {
        const q = searchQuery.toLowerCase();
        const songMatch = (s.song_name || '').toLowerCase().includes(q);
        const artistMatch = (s.artist_name || '').toLowerCase().includes(q);
        const genreMatch = (s as any).genres?.some((g: string) => g.toLowerCase().includes(q));
        return songMatch || artistMatch || genreMatch;
      })
    : allSongs;

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'engagement_rate') return parseFloat(b.engagement_rate || '0') - parseFloat(a.engagement_rate || '0');
    return (b[sortBy] || 0) - (a[sortBy] || 0);
  });

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>All Songs Ranked</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['views', 'likes', 'engagement_rate'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`tab-btn ${sortBy === s ? 'active' : ''}`}
              style={{ padding: '4px 12px', fontSize: 12 }}
            >
              {s === 'engagement_rate' ? 'Engagement' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
        <input
          type="text"
          placeholder="Search by artist, song, or genre..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8,
            color: '#fff', padding: '10px 12px 10px 34px', fontSize: 13, fontFamily: 'Inter',
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        {searchQuery && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: 12 }}>
            {sorted.length} result{sorted.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {sorted.map((s, i) => (
        <div key={s.id} onClick={() => onSelectVideo(s.video_url)} style={{ cursor: 'pointer' }}>
          <VideoRow s={s} rank={i + 1} />
        </div>
      ))}
      {sorted.length === 0 && (
        <p style={{ color: '#555', textAlign: 'center', padding: 40 }}>No results for "{searchQuery}"</p>
      )}
    </div>
  );
}

function SongSearchTab({ data }: { data: AnalyticsData }) {
  const [query, setQuery] = useState('');
  const [expandedSong, setExpandedSong] = useState<string | null>(null);

  const songIndex = data.songIndex || [];

  const filtered = query.trim()
    ? songIndex.filter(s => {
        const q = query.toLowerCase();
        return s.songName.toLowerCase().includes(q) || s.artistName.toLowerCase().includes(q);
      })
    : songIndex;

  const sorted = [...filtered].sort((a, b) => b.videoCount - a.videoCount);

  return (
    <div>
      <div className="panel">
        <h3 style={{ margin: '0 0 4px' }}>Song Search</h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
          Search for a song to see every video it appeared in and how each one performed.
        </p>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input
            type="text"
            placeholder="Search by song or artist..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 8,
              color: '#fff', padding: '10px 12px 10px 34px', fontSize: 13, fontFamily: 'Inter',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          {query && (
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: 12 }}>
              {sorted.length} song{sorted.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {sorted.slice(0, 50).map(song => {
          const isExpanded = expandedSong === `${song.songName}::${song.artistName}`;
          return (
            <div key={`${song.songName}::${song.artistName}`} style={{ marginBottom: 8 }}>
              <div
                onClick={() => setExpandedSong(isExpanded ? null : `${song.songName}::${song.artistName}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: isExpanded ? '#1a1a2e' : '#141414', borderRadius: isExpanded ? '8px 8px 0 0' : 8,
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontWeight: 500, margin: 0 }}>{song.songName}</p>
                  <p style={{ color: '#888', fontSize: 12, margin: 0 }}>{song.artistName}</p>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', fontSize: 13, flexShrink: 0 }}>
                  <span style={{ color: '#8b5cf6' }}>
                    {song.videoCount} video{song.videoCount !== 1 ? 's' : ''}
                  </span>
                  <span style={{ color: '#ccc' }}>{formatNum(song.totalViews)} views</span>
                  <ChevronDown size={14} style={{ color: '#555', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
              </div>

              {isExpanded && (
                <div style={{ background: '#111', borderRadius: '0 0 8px 8px', padding: '8px 16px 12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: 4, padding: '6px 0', borderBottom: '1px solid #222', marginBottom: 6 }}>
                    {['Video', 'Uploaded', 'Views', 'Likes', 'Comments', 'Shares', 'Eng.'].map(h => (
                      <p key={h} style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, margin: 0 }}>{h}</p>
                    ))}
                  </div>
                  {song.videos.map((v, i) => (
                    <div key={v.video_url} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr', gap: 4, padding: '8px 0', borderBottom: i < song.videos.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ color: '#ccc', fontSize: 12, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {v.song_name || song.songName}
                          {v.is_mashup && <span style={{ color: '#8b5cf620', marginLeft: 4 }}>mashup</span>}
                        </p>
                        {v.description && (
                          <p style={{ color: '#444', fontSize: 10, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.description}
                          </p>
                        )}
                      </div>
                      <p style={{ color: '#888', fontSize: 12, margin: 0 }}>{v.upload_date || '—'}</p>
                      <p style={{ color: '#8b5cf6', fontSize: 12, margin: 0 }}>{formatNum(v.views)}</p>
                      <p style={{ color: '#ef4444', fontSize: 12, margin: 0 }}>{formatNum(v.likes)}</p>
                      <p style={{ color: '#3b82f6', fontSize: 12, margin: 0 }}>{formatNum(v.comments)}</p>
                      <p style={{ color: '#22c55e', fontSize: 12, margin: 0 }}>{formatNum(v.shares)}</p>
                      <p style={{ color: '#eab308', fontSize: 12, margin: 0 }}>{v.engagement_rate ? `${v.engagement_rate}%` : '—'}</p>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, paddingTop: 8, borderTop: '1px solid #222', fontSize: 11, color: '#555' }}>
                    <span>Total: {formatNum(song.totalViews)} views</span>
                    <span>Avg: {formatNum(song.avgViews)} views/video</span>
                    {song.spotifyId && <span>Spotify: {song.spotifyId}</span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sorted.length === 0 && query && (
          <p style={{ color: '#555', textAlign: 'center', padding: 40 }}>No songs matching "{query}"</p>
        )}

        {!query && (
          <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
            Showing songs with most video appearances. Search to filter.
          </p>
        )}
      </div>
    </div>
  );
}

function GenresTab({ data }: { data: AnalyticsData }) {
  return (
    <div>
      <div className="panel">
        <h3>Genre Performance</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.genreBreakdown.slice(0, 15)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="genre" stroke="#555" fontSize={11} angle={-30} textAnchor="end" height={60} />
            <YAxis stroke="#555" fontSize={11} tickFormatter={formatNum} />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatNum(v)} />
            <Bar dataKey="totalViews" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Views" />
            <Bar dataKey="totalLikes" fill="#ef4444" radius={[4, 4, 0, 0]} name="Likes" />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3>Genre Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {data.genreBreakdown.map((g, i) => (
            <div key={g.genre} style={{ background: '#1a1a1a', borderRadius: 10, padding: 16, borderLeft: `3px solid ${CHART_COLORS[i % CHART_COLORS.length]}` }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{g.genre}</p>
              <p style={{ color: '#888', fontSize: 12 }}>{g.videoCount} videos · {formatNum(g.avgViews)} avg views</p>
              <p style={{ color: '#8b5cf6', fontSize: 18, fontWeight: 700, marginTop: 4 }}>{formatNum(g.totalViews)} views</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArtistsTab({ data }: { data: AnalyticsData }) {
  return (
    <div>
      <div className="panel">
        <h3>Artist Performance</h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data.artistBreakdown.slice(0, 15)} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis type="number" stroke="#555" fontSize={11} tickFormatter={formatNum} />
            <YAxis type="category" dataKey="artist" stroke="#555" fontSize={11} width={140} tick={{ fill: '#ccc' }} />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatNum(v)} />
            <Bar dataKey="totalViews" fill="#6366f1" radius={[0, 4, 4, 0]} name="Views" />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3>Repeat Performers</h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>Artists with multiple videos that consistently perform well</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {data.artistBreakdown.filter(a => a.videoCount > 1).map((a, i) => (
            <div key={a.artist} style={{ background: '#1a1a1a', borderRadius: 10, padding: 16 }}>
              <p style={{ fontWeight: 600, marginBottom: 4 }}>{a.artist}</p>
              <p style={{ color: '#888', fontSize: 12 }}>
                {a.videoCount} videos · {a.uniqueSongs} songs · {formatNum(a.avgViews)} avg views
              </p>
              <p style={{ color: '#6366f1', fontSize: 18, fontWeight: 700, marginTop: 4 }}>{formatNum(a.totalViews)} total views</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimingTab({ data }: { data: AnalyticsData }) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const [filterArtist, setFilterArtist] = useState('');
  const [filterGenre, setFilterGenre] = useState('');

  // Get latest snapshot per video with upload_date
  const latestByVideo = new Map<string, any>();
  for (const s of data.timeSeries) {
    const existing = latestByVideo.get(s.video_url);
    if (!existing || s.snapshot_date > existing.snapshot_date) {
      latestByVideo.set(s.video_url, s);
    }
  }
  const allVideos = Array.from(latestByVideo.values()).filter((s: any) => s.upload_date);

  // Collect unique artists and genres for dropdowns
  const allArtists = [...new Set(
    allVideos.flatMap((s: any) =>
      (s.songs || []).map((song: any) => song.artistName).filter(Boolean)
    )
  )].sort();
  const allGenres = [...new Set(
    allVideos.flatMap((s: any) => s.genres || [])
  )].sort();

  // Apply filters
  const videos = allVideos.filter((s: any) => {
    if (filterArtist) {
      const artists = (s.songs || []).map((song: any) => song.artistName);
      const alsoCheckMain = s.artist_name || '';
      if (!artists.some((a: string) => a.toLowerCase().includes(filterArtist.toLowerCase()))
        && !alsoCheckMain.toLowerCase().includes(filterArtist.toLowerCase())) return false;
    }
    if (filterGenre) {
      if (!(s.genres || []).some((g: string) => g.toLowerCase() === filterGenre.toLowerCase())) return false;
    }
    return true;
  });

  const filterLabel = filterArtist || filterGenre
    ? `Showing ${videos.length} videos${filterArtist ? ` by "${filterArtist}"` : ''}${filterGenre ? ` in "${filterGenre}"` : ''}`
    : `Showing all ${videos.length} videos`;

  // Month breakdown
  const monthStats = MONTHS.map((name, i) => {
    const vids = videos.filter((s: any) => new Date(s.upload_date).getMonth() === i);
    const totalViews = vids.reduce((sum: number, s: any) => sum + (s.views || 0), 0);
    return {
      month: name,
      videoCount: vids.length,
      totalViews,
      avgViews: vids.length > 0 ? Math.round(totalViews / vids.length) : 0,
    };
  });

  // Day of week breakdown
  const dayStats = DAYS.map((name, i) => {
    const vids = videos.filter((s: any) => new Date(s.upload_date).getDay() === i);
    const totalViews = vids.reduce((sum: number, s: any) => sum + (s.views || 0), 0);
    return {
      day: name,
      videoCount: vids.length,
      totalViews,
      avgViews: vids.length > 0 ? Math.round(totalViews / vids.length) : 0,
    };
  });

  // Year breakdown
  const yearMap = new Map<number, { count: number; views: number }>();
  for (const s of videos) {
    const year = new Date((s as any).upload_date).getFullYear();
    const existing = yearMap.get(year) || { count: 0, views: 0 };
    existing.count++;
    existing.views += s.views || 0;
    yearMap.set(year, existing);
  }
  const yearStats = Array.from(yearMap.entries())
    .map(([year, stats]) => ({ year: String(year), videoCount: stats.count, totalViews: stats.views, avgViews: Math.round(stats.views / stats.count) }))
    .sort((a, b) => a.year.localeCompare(b.year));

  // Best/worst months
  const activeMonths = monthStats.filter(m => m.videoCount > 0);
  const bestMonth = activeMonths.length > 0 ? activeMonths.reduce((a, b) => a.avgViews > b.avgViews ? a : b) : null;
  const worstMonth = activeMonths.length > 0 ? activeMonths.reduce((a, b) => a.avgViews < b.avgViews ? a : b) : null;
  const bestDay = dayStats.filter(d => d.videoCount > 0).reduce((a, b) => a.avgViews > b.avgViews ? a : b, dayStats[0]);

  // Season breakdown
  const seasons = [
    { name: 'Winter', months: [11, 0, 1], color: '#3b82f6' },
    { name: 'Spring', months: [2, 3, 4], color: '#22c55e' },
    { name: 'Summer', months: [5, 6, 7], color: '#eab308' },
    { name: 'Autumn', months: [8, 9, 10], color: '#f97316' },
  ].map(season => {
    const vids = videos.filter((s: any) => season.months.includes(new Date(s.upload_date).getMonth()));
    const totalViews = vids.reduce((sum: number, s: any) => sum + (s.views || 0), 0);
    return { ...season, videoCount: vids.length, totalViews, avgViews: vids.length > 0 ? Math.round(totalViews / vids.length) : 0 };
  });

  if (videos.length === 0) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: 60 }}>
        <p style={{ color: '#888' }}>No upload dates available yet. Run the scraper to populate upload dates.</p>
      </div>
    );
  }

  const selectStyle: React.CSSProperties = {
    background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
    color: '#fff', padding: '8px 12px', fontSize: 13, fontFamily: 'Inter',
    minWidth: 180,
  };

  return (
    <div>
      {/* Filters */}
      <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <label style={{ color: '#888', fontSize: 11, display: 'block', marginBottom: 4 }}>Artist</label>
          <select value={filterArtist} onChange={e => setFilterArtist(e.target.value)} style={selectStyle}>
            <option value="">All Artists</option>
            {allArtists.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ color: '#888', fontSize: 11, display: 'block', marginBottom: 4 }}>Genre</label>
          <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)} style={selectStyle}>
            <option value="">All Genres</option>
            {allGenres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        {(filterArtist || filterGenre) && (
          <button
            onClick={() => { setFilterArtist(''); setFilterGenre(''); }}
            style={{ background: 'none', border: '1px solid #333', borderRadius: 8, color: '#888', padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'Inter', marginTop: 16 }}
          >
            Clear
          </button>
        )}
        <p style={{ color: '#555', fontSize: 12, marginLeft: 'auto', marginTop: 16 }}>{filterLabel}</p>
      </div>

      {/* Key insights */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {bestMonth && (
          <div className="stat-card" style={{ borderLeft: '3px solid #22c55e' }}>
            <p style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Best Month</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{bestMonth.month}</p>
            <p style={{ fontSize: 12, color: '#22c55e' }}>{formatNum(bestMonth.avgViews)} avg views · {bestMonth.videoCount} videos</p>
          </div>
        )}
        {worstMonth && (
          <div className="stat-card" style={{ borderLeft: '3px solid #ef4444' }}>
            <p style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Weakest Month</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{worstMonth.month}</p>
            <p style={{ fontSize: 12, color: '#ef4444' }}>{formatNum(worstMonth.avgViews)} avg views · {worstMonth.videoCount} videos</p>
          </div>
        )}
        <div className="stat-card" style={{ borderLeft: '3px solid #8b5cf6' }}>
          <p style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Best Day</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{bestDay.day}</p>
          <p style={{ fontSize: 12, color: '#8b5cf6' }}>{formatNum(bestDay.avgViews)} avg views · {bestDay.videoCount} videos</p>
        </div>
      </div>

      <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Avg views by month */}
        <div className="panel">
          <h3>Average Views by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="month" stroke="#555" fontSize={11} />
              <YAxis stroke="#555" fontSize={11} tickFormatter={formatNum} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatNum(v)} />
              <Bar dataKey="avgViews" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Avg Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg views by day of week */}
        <div className="panel">
          <h3>Average Views by Day of Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dayStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="day" stroke="#555" fontSize={11} />
              <YAxis stroke="#555" fontSize={11} tickFormatter={formatNum} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatNum(v)} />
              <Bar dataKey="avgViews" fill="#6366f1" radius={[4, 4, 0, 0]} name="Avg Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Season breakdown */}
        <div className="panel">
          <h3>Performance by Season</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {seasons.map(s => (
              <div key={s.name} style={{ background: '#0a0a0a', borderRadius: 10, padding: 16, borderLeft: `3px solid ${s.color}` }}>
                <p style={{ fontWeight: 600, marginBottom: 2 }}>{s.name}</p>
                <p style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{formatNum(s.avgViews)}</p>
                <p style={{ color: '#555', fontSize: 11 }}>avg views · {s.videoCount} videos</p>
              </div>
            ))}
          </div>
        </div>

        {/* Year over year */}
        <div className="panel">
          <h3>Year Over Year</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={yearStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="year" stroke="#555" fontSize={11} />
              <YAxis stroke="#555" fontSize={11} tickFormatter={formatNum} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatNum(v)} />
              <Bar dataKey="avgViews" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Avg Views" />
              <Bar dataKey="videoCount" fill="#333" radius={[4, 4, 0, 0]} name="Videos" />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Hour of day */}
      {videos.some((s: any) => s.upload_hour !== null && s.upload_hour !== undefined) && (
        <div className="panel">
          <h3>Average Views by Hour of Day (UTC)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={Array.from({ length: 24 }, (_, h) => {
              const vids = videos.filter((s: any) => s.upload_hour === h);
              const totalViews = vids.reduce((sum: number, s: any) => sum + (s.views || 0), 0);
              return { hour: `${h}:00`, avgViews: vids.length > 0 ? Math.round(totalViews / vids.length) : 0, videoCount: vids.length };
            })}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="hour" stroke="#555" fontSize={10} interval={1} />
              <YAxis stroke="#555" fontSize={11} tickFormatter={formatNum} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatNum(v)} />
              <Bar dataKey="avgViews" fill="#ec4899" radius={[4, 4, 0, 0]} name="Avg Views" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Upload frequency timeline */}
      <div className="panel">
        <h3>Upload Volume by Month</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={monthStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" />
            <XAxis dataKey="month" stroke="#555" fontSize={11} />
            <YAxis stroke="#555" fontSize={11} />
            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="videoCount" stroke="#8b5cf6" fill="rgba(139,92,246,0.1)" strokeWidth={2} name="Videos Uploaded" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function OutliersTab({ data }: { data: AnalyticsData }) {
  return (
    <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, overflow: 'hidden' }}>
      <div className="panel" style={{ overflow: 'hidden', minWidth: 0 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowUpRight size={16} style={{ color: '#ef4444' }} />
          High Views, Low Comments
        </h3>
        <p style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>Videos people watch but don't discuss</p>
        {data.highViewsLowComments.map((s, i) => <VideoRow key={s.id} s={s} rank={i + 1} />)}
      </div>

      <div className="panel" style={{ overflow: 'hidden', minWidth: 0 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ArrowDownRight size={16} style={{ color: '#22c55e' }} />
          High Engagement, Low Views
        </h3>
        <p style={{ color: '#888', fontSize: 12, marginBottom: 16 }}>Hidden gems — great engagement despite low reach</p>
        {data.lowViewsHighEngagement.map((s, i) => <VideoRow key={s.id} s={s} rank={i + 1} />)}
      </div>
    </div>
  );
}

function TimeSeriesTab({ data, selectedVideo, onSelectVideo }: { data: AnalyticsData; selectedVideo: string | null; onSelectVideo: (url: string) => void }) {
  const videoUrls = Array.from(new Set(data.timeSeries.map(s => s.video_url)));
  const current = selectedVideo || videoUrls[0];

  const videoData = data.timeSeries
    .filter(s => s.video_url === current)
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

  const videoInfo = videoData[0];

  return (
    <div>
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Performance Over Time</h3>
          <select
            value={current}
            onChange={e => onSelectVideo(e.target.value)}
            style={{
              background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
              color: '#fff', padding: '6px 12px', fontSize: 13, fontFamily: 'Inter',
              maxWidth: 300,
            }}
          >
            {videoUrls.map(url => {
              const info = data.timeSeries.find(s => s.video_url === url);
              return <option key={url} value={url}>{info?.song_name || url}</option>;
            })}
          </select>
        </div>

        {videoInfo && (
          <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
            {videoInfo.song_name} — {videoInfo.artist_name} · {videoData.length} snapshot{videoData.length > 1 ? 's' : ''}
          </p>
        )}

        {videoData.length > 1 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={videoData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" />
              <XAxis dataKey="snapshot_date" stroke="#555" fontSize={11} />
              <YAxis stroke="#555" fontSize={11} tickFormatter={formatNum} />
              <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => formatNum(v)} />
              <Area type="monotone" dataKey="views" stroke="#8b5cf6" fill="rgba(139,92,246,0.1)" strokeWidth={2} />
              <Area type="monotone" dataKey="likes" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={2} />
              <Area type="monotone" dataKey="comments" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={2} />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p style={{ color: '#555', textAlign: 'center', padding: 60 }}>
            Only 1 snapshot for this video. Import data on different dates to see trends over time.
          </p>
        )}
      </div>
    </div>
  );
}

function TrendsTab({ data }: { data: AnalyticsData }) {
  const [selectedVideoUrl, setSelectedVideoUrl] = useState<string | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<TrendAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topVideos = [...data.topByViews].slice(0, 30);

  async function analyzeTrends(videoUrl: string) {
    setLoading(true);
    setError(null);
    setTrendAnalysis(null);
    setSelectedVideoUrl(videoUrl);

    try {
      const res = await fetch(`/api/dashboard/trends?videoUrl=${encodeURIComponent(videoUrl)}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTrendAnalysis(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const confidenceColors: Record<string, string> = {
    high: '#22c55e',
    medium: '#eab308',
    low: '#888',
  };

  return (
    <div>
      <div className="panel">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={18} style={{ color: '#eab308' }} />
          Why Did It Work?
        </h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
          Select a video to check Google Trends for the artist, song, and album around the upload date.
          Detects whether external events (album drops, viral moments, holidays) may explain performance.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, minHeight: 400 }}>
          {/* Video selector */}
          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {topVideos.map((s, i) => (
              <div
                key={s.video_url}
                onClick={() => analyzeTrends(s.video_url)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  background: selectedVideoUrl === s.video_url ? '#1a1a2e' : '#141414',
                  borderRadius: 8, marginBottom: 4, cursor: 'pointer',
                  borderLeft: selectedVideoUrl === s.video_url ? '3px solid #8b5cf6' : '3px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ color: '#555', fontSize: 12, width: 20, textAlign: 'center' }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {(s.song_name || 'Unknown').length > 30 ? (s.song_name || '').slice(0, 30) + '…' : s.song_name}
                  </p>
                  <p style={{ color: '#666', fontSize: 11, margin: 0 }}>{formatNum(s.views)} views</p>
                </div>
              </div>
            ))}
          </div>

          {/* Analysis panel */}
          <div>
            {!selectedVideoUrl && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555' }}>
                <p>Select a video from the left to analyze trends</p>
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                <Loader2 size={24} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: '#888', fontSize: 13 }}>Checking Google Trends...</p>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: 16 }}>
                <p style={{ color: '#ef4444' }}>{error}</p>
              </div>
            )}

            {trendAnalysis && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* Video header */}
                <div style={{ background: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{trendAnalysis.video.songName}</p>
                      <p style={{ color: '#888', fontSize: 13, margin: '4px 0' }}>{trendAnalysis.video.artistName}</p>
                      <p style={{ color: '#555', fontSize: 12 }}>
                        Uploaded {trendAnalysis.video.uploadDate}
                        {trendAnalysis.video.isMashup && ` · ${trendAnalysis.video.songCount} songs`}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ color: '#8b5cf6', fontSize: 20, fontWeight: 700, margin: 0 }}>{formatNum(trendAnalysis.video.views)}</p>
                      <p style={{ color: '#555', fontSize: 11 }}>
                        {trendAnalysis.context.viewsVsAvg > 1
                          ? `${trendAnalysis.context.viewsVsAvg}x avg`
                          : `${(trendAnalysis.context.viewsVsAvg * 100).toFixed(0)}% of avg`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Explanations */}
                {trendAnalysis.explanations.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Possible Explanations</p>
                    {trendAnalysis.explanations.map((e, i) => (
                      <div key={i} style={{ background: '#141414', borderRadius: 10, padding: 14, marginBottom: 6, borderLeft: `3px solid ${confidenceColors[e.confidence]}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: '#fff' }}>{e.label}</p>
                          <span style={{ color: confidenceColors[e.confidence], fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            {e.confidence}
                          </span>
                        </div>
                        <p style={{ color: '#888', fontSize: 12, margin: 0 }}>{e.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Trend charts */}
                {trendAnalysis.trends.filter(t => t.points.length > 0).length > 0 && (
                  <div>
                    <p style={{ color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Google Trends (±30 days from upload)</p>
                    {trendAnalysis.trends.filter(t => t.points.length > 0).map((t, i) => (
                      <div key={i} style={{ background: '#141414', borderRadius: 10, padding: 14, marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, margin: 0 }}>
                            {t.keyword}
                            <span style={{ color: '#555', fontSize: 11, marginLeft: 6 }}>({t.type})</span>
                          </p>
                          {t.spikeDetected ? (
                            <span style={{ color: '#22c55e', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <ArrowUpRight size={12} /> {t.spikeRatio.toFixed(1)}x spike
                            </span>
                          ) : (
                            <span style={{ color: '#555', fontSize: 11 }}>No spike</span>
                          )}
                        </div>
                        <ResponsiveContainer width="100%" height={120}>
                          <AreaChart data={t.points}>
                            <XAxis dataKey="date" stroke="#333" fontSize={9} tick={{ fill: '#555' }} />
                            <YAxis stroke="#333" fontSize={9} tick={{ fill: '#555' }} domain={[0, 100]} />
                            <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 11 }} />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke={t.spikeDetected ? '#22c55e' : '#555'}
                              fill={t.spikeDetected ? 'rgba(34,197,94,0.1)' : 'rgba(85,85,85,0.05)'}
                              strokeWidth={1.5}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ))}
                  </div>
                )}

                {trendAnalysis.explanations.length === 0 && trendAnalysis.trends.every(t => !t.spikeDetected) && (
                  <div style={{ background: '#141414', borderRadius: 10, padding: 20, textAlign: 'center' }}>
                    <p style={{ color: '#888', fontSize: 13 }}>
                      No obvious external trend detected. This video's performance was likely driven by TikTok's algorithm, content quality, or audience timing.
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImportTab({
  dragOver, setDragOver, handleDrop, handleFileUpload, fileInputRef, importing, importResult, snapshotDate, setSnapshotDate,
  scrapeStatus, scrapeProgress, onStartScrape,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileUpload: (f: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  importing: boolean;
  importResult: any;
  snapshotDate: string;
  setSnapshotDate: (v: string) => void;
  scrapeStatus: ScrapeStatus | null;
  scrapeProgress: ScrapeProgress;
  onStartScrape: (batchSize?: number) => void;
}) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Scrape Section */}
      <div className="panel" style={{ borderLeft: '3px solid #8b5cf6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <Zap size={18} style={{ color: '#8b5cf6' }} />
              Scrape TikTok Stats
            </h3>
            <p style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
              Auto-scrape views, likes, comments, shares & saves for all videos in the database.
            </p>
          </div>
        </div>

        {scrapeStatus && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
              {[
                { label: 'Unique Videos', value: scrapeStatus.totalVideos, color: '#8b5cf6' },
                { label: 'Scraped Today', value: scrapeStatus.scrapedToday, color: '#22c55e' },
                { label: 'Remaining', value: scrapeStatus.remaining, color: '#f97316' },
                { label: 'All Snapshots', value: scrapeStatus.totalSnapshots, color: '#3b82f6' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0a0a0a', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <p style={{ color: '#555', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</p>
                  <p style={{ color: s.color, fontSize: 20, fontWeight: 700 }}>{s.value}</p>
                </div>
              ))}
            </div>
            <p style={{ color: '#555', fontSize: 11, marginBottom: 16 }}>
              {scrapeStatus.totalPerformances} performances across {scrapeStatus.totalVideos} videos
              ({scrapeStatus.mashupVideos} mashups, {scrapeStatus.singleSongVideos} single-song)
            </p>
          </>
        )}

        {scrapeProgress.isRunning ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Loader2 size={16} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#ccc', fontSize: 13 }}>
                  Batch {scrapeProgress.currentBatch}/{scrapeProgress.totalBatches || '?'}
                </span>
              </div>
              <span style={{ color: '#888', fontSize: 12 }}>
                {scrapeProgress.scraped + scrapeProgress.failed + scrapeProgress.skipped} / {scrapeProgress.total}
              </span>
            </div>

            {/* Progress bar */}
            <div style={{ background: '#1a1a1a', borderRadius: 4, height: 6, marginBottom: 12, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #8b5cf6, #6366f1)',
                  width: `${scrapeProgress.total > 0 ? ((scrapeProgress.scraped + scrapeProgress.failed + scrapeProgress.skipped) / scrapeProgress.total * 100) : 0}%`,
                  transition: 'width 0.3s',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 16, fontSize: 12, marginBottom: 12 }}>
              <span style={{ color: '#22c55e' }}><CheckCircle size={12} /> {scrapeProgress.scraped} scraped</span>
              <span style={{ color: '#888' }}>{scrapeProgress.skipped} skipped</span>
              <span style={{ color: '#ef4444' }}>{scrapeProgress.failed} failed</span>
            </div>

            {scrapeProgress.currentSong && (
              <p style={{ color: '#888', fontSize: 12 }}>Current: {scrapeProgress.currentSong}</p>
            )}

            {/* Live results feed */}
            <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
              {[...scrapeProgress.results].reverse().slice(0, 10).map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 12 }}>
                  {r.status === 'success' ? (
                    <CheckCircle size={12} style={{ color: '#22c55e', flexShrink: 0 }} />
                  ) : r.status === 'skipped' ? (
                    <span style={{ color: '#555', flexShrink: 0 }}>—</span>
                  ) : (
                    <AlertCircle size={12} style={{ color: '#ef4444', flexShrink: 0 }} />
                  )}
                  <span style={{ color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.songName || 'Unknown'}
                    {r.songCount > 1 && <span style={{ color: '#8b5cf6', marginLeft: 4 }}>({r.songCount} songs)</span>}
                  </span>
                  {r.stats && (
                    <span style={{ color: '#555', marginLeft: 'auto', flexShrink: 0 }}>
                      {formatNum(r.stats.playCount)} views
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onStartScrape(50)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 20px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', color: '#fff',
                cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'Inter',
              }}
            >
              <Zap size={16} /> Scrape All Videos
            </button>
            <button
              onClick={() => onStartScrape(10)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '12px 16px', borderRadius: 10, border: '1px solid #333',
                background: 'transparent', color: '#ccc',
                cursor: 'pointer', fontSize: 13, fontFamily: 'Inter',
              }}
            >
              Test 10
            </button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#222' }} />
        <span style={{ color: '#555', fontSize: 12 }}>or import manually</span>
        <div style={{ flex: 1, height: 1, background: '#222' }} />
      </div>

      <div className="panel">
        <h3>Import TikTok Analytics CSV</h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 20 }}>
          Upload a CSV or XLSX export from TikTok Studio / Business Hub. The parser auto-detects columns like
          video URL, views, likes, comments, shares, saves, watch time, and completion rate.
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', color: '#888', fontSize: 12, marginBottom: 6 }}>Snapshot Date</label>
          <input
            type="date"
            value={snapshotDate}
            onChange={e => setSnapshotDate(e.target.value)}
            style={{
              background: '#1a1a1a', border: '1px solid #333', borderRadius: 8,
              color: '#fff', padding: '8px 12px', fontSize: 13, fontFamily: 'Inter',
            }}
          />
          <p style={{ color: '#555', fontSize: 11, marginTop: 4 }}>
            Override the date for this import (useful for backdating historical data)
          </p>
        </div>

        <div
          className={`drop-zone ${dragOver ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {importing ? (
            <div>
              <Loader2 size={32} style={{ color: '#8b5cf6', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <p style={{ color: '#888' }}>Processing...</p>
            </div>
          ) : (
            <>
              <Upload size={32} style={{ color: '#555', marginBottom: 12 }} />
              <p style={{ color: '#ccc', fontWeight: 500, marginBottom: 4 }}>Drop CSV or XLSX here</p>
              <p style={{ color: '#555', fontSize: 13 }}>or click to browse</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
          />
        </div>

        {importResult && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 20 }}>
            {importResult.success ? (
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, padding: 16 }}>
                <p style={{ color: '#22c55e', fontWeight: 600, marginBottom: 4 }}>Import Successful</p>
                <p style={{ color: '#888', fontSize: 13 }}>
                  {importResult.inserted} rows imported, {importResult.skipped} skipped out of {importResult.total} total
                </p>
                {importResult.columnMapping && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ color: '#555', fontSize: 11, marginBottom: 4 }}>Detected columns:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {Object.entries(importResult.columnMapping).map(([field, col]) => (
                        <span key={field} style={{ background: '#1a1a1a', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#8b5cf6' }}>
                          {field}: {String(col)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: 16 }}>
                <p style={{ color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>Import Failed</p>
                <p style={{ color: '#888', fontSize: 13 }}>{importResult.error}</p>
                {importResult.detectedHeaders && (
                  <p style={{ color: '#555', fontSize: 11, marginTop: 8 }}>
                    Found headers: {importResult.detectedHeaders.join(', ')}
                  </p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      <div className="panel">
        <h3>Expected Format</h3>
        <p style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
          The parser auto-detects these columns (case-insensitive, flexible naming):
        </p>
        <div style={{ background: '#0a0a0a', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 12, color: '#888', overflowX: 'auto' }}>
          <p style={{ color: '#8b5cf6' }}>Required:</p>
          <p>• Video URL / Video Link / TikTok URL</p>
          <br />
          <p style={{ color: '#8b5cf6' }}>Optional metrics:</p>
          <p>• Views, Likes, Comments, Shares, Saves</p>
          <p>• Avg Watch Time, Total Watch Time</p>
          <p>• Completion Rate, New Followers</p>
          <p>• Date / Upload Date / Post Date</p>
        </div>
      </div>
    </div>
  );
}
