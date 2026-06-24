# Keys Dashboard

TikTok performance analytics dashboard for Timikeys.

## Access

Password-protected at `/dashboard`. Not linked from the main site — access by URL only.

## Features

### Data Collection
- **TikTok Scraper** — scrapes views, likes, comments, shares, saves, upload date, and captions for all 492 videos directly from TikTok (no API key needed)
- **CSV/XLSX Import** — manual import from TikTok Studio exports with auto-column detection
- **Mashup-aware** — groups multi-song videos correctly (1,604 performances → 492 unique videos)

### Dashboard Tabs

| Tab | Description |
|-----|-------------|
| **Overview** | Stat cards, brand overview with date range picker, smart recommendations |
| **Top Videos** | All videos ranked by views/likes/engagement with search |
| **Song Search** | Find a song, see every video it appeared in with per-video stats |
| **Genres** | Genre performance breakdown with charts |
| **Artists** | Artist rankings and repeat performer detection |
| **Timing** | Best month, day, season, hour analysis — filterable by artist/genre |
| **Outliers** | High views + low comments, high engagement + low views |
| **Time Series** | Per-video performance over time (requires multiple scrape snapshots) |
| **Why It Worked** | Google Trends analysis around upload date to explain spikes |
| **Import** | Scrape button + CSV upload |

### Smart Recommendations
Cross-references live music charts against Timmy's catalog:
- UK Spotify Daily Top 50
- Global Spotify Daily Top 50
- US Spotify Daily Top 50
- Spotify New Releases

Shows which charting songs/artists Timmy has covered before, with previous view counts.

### Brand Overview
Date range picker (30d / 90d / 180d / custom) showing engagement stats, genre tags, and video list for the selected period. Built for brand/promo pitches.

## Stack
- **Frontend**: Next.js 15, React, Recharts, Framer Motion
- **Analytics DB**: Supabase (project: `keysdashboard`)
- **Performances DB**: Railway API (`timikeys.up.railway.app`)
- **Charts**: Spotify API + kworb.net scraping
- **Trends**: google-trends-api (npm)
- **TikTok scraping**: Direct HTML parse of `__UNIVERSAL_DATA_FOR_REHYDRATION__`

## Data Model
```
analytics_snapshots (Supabase)
├── video_url (unique per snapshot_date)
├── video_id
├── song_name (joined with / for mashups)
├── artist_name
├── views, likes, comments, shares, saves
├── upload_date, upload_hour
├── description (TikTok caption + hashtags)
└── snapshot_date

performances (Railway)
├── tiktokVideoLink
├── songName, artistName, albumName
├── spotifyId
├── videoNo
├── songGenres[]
└── YesNo (mashup flag — not relied on, detected by URL grouping)
```
