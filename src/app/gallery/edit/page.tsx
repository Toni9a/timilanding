'use client';

import { useState, useEffect } from 'react';

interface Photo {
  src: string;
  caption: string;
  hidden: boolean;
  w: number;
  h: number;
  votes?: number;
}

export default function GalleryEdit() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [current, setCurrent] = useState(0);
  const [mode, setMode] = useState<'vote' | 'list'>('vote');

  useEffect(() => {
    fetch('/api/gallery').then(r => r.json()).then((data: Photo[]) => {
      setPhotos(data.map(p => ({ ...p, votes: p.votes ?? 0 })));
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const sorted = [...photos].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
    await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sorted),
    });
    setPhotos(sorted);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const vote = (i: number, amount: number) => {
    const next = [...photos];
    next[i] = { ...next[i], votes: (next[i].votes ?? 0) + amount };
    setPhotos(next);
    if (mode === 'vote' && current < photos.length - 1) {
      setCurrent(current + 1);
    }
  };

  const toggleHidden = (i: number) => {
    const next = [...photos];
    next[i] = { ...next[i], hidden: !next[i].hidden };
    setPhotos(next);
    if (mode === 'vote' && current < photos.length - 1) {
      setCurrent(current + 1);
    }
  };

  const setCaption = (i: number, caption: string) => {
    const next = [...photos];
    next[i] = { ...next[i], caption };
    setPhotos(next);
  };

  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    for (const file of Array.from(files)) {
      formData.append('files', file);
    }
    await fetch('/api/gallery/upload', { method: 'POST', body: formData });
    const data = await fetch('/api/gallery').then(r => r.json());
    setPhotos(data.map((p: Photo) => ({ ...p, votes: p.votes ?? 0 })));
    setUploading(false);
  };

  const filtered = photos
    .map((p, i) => ({ ...p, originalIndex: i }))
    .filter(p => {
      if (filter === 'visible') return !p.hidden;
      if (filter === 'hidden') return p.hidden;
      return true;
    });

  const filename = (src: string) => src.split('/').pop() || src;
  const visibleCount = photos.filter(p => !p.hidden).length;
  const votedCount = photos.filter(p => (p.votes ?? 0) !== 0).length;
  const photo = photos[current];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #111; }
        .edit-wrap {
          max-width: 900px;
          margin: 0 auto;
          padding: 30px 20px 100px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #fff;
        }
        .edit-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .edit-header h1 { font-size: 22px; font-weight: 500; letter-spacing: 1px; }
        .counts { font-size: 13px; color: #888; }
        .toolbar {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .pill {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid #333;
          background: transparent;
          color: #aaa;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pill.active { background: #fff; color: #000; border-color: #fff; }
        .save-btn {
          margin-left: auto;
          padding: 8px 24px;
          border-radius: 20px;
          border: none;
          background: #4f8cff;
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .save-btn:hover { background: #3a7af0; }
        .save-btn:disabled { opacity: 0.5; cursor: default; }
        .save-btn.saved { background: #2ea043; }

        /* Vote mode */
        .vote-card {
          text-align: center;
          padding: 20px;
        }
        .vote-progress {
          font-size: 13px;
          color: #666;
          margin-bottom: 16px;
        }
        .vote-progress .bar {
          width: 100%;
          height: 3px;
          background: #222;
          border-radius: 2px;
          margin-top: 8px;
          overflow: hidden;
        }
        .vote-progress .bar-fill {
          height: 100%;
          background: #4f8cff;
          border-radius: 2px;
          transition: width 0.3s;
        }
        .vote-img-wrap {
          position: relative;
          display: inline-block;
          margin-bottom: 20px;
        }
        .vote-img {
          max-width: 100%;
          max-height: 55vh;
          border-radius: 10px;
          object-fit: contain;
        }
        .vote-score {
          font-size: 14px;
          color: #888;
          margin-bottom: 16px;
        }
        .vote-score strong {
          color: #fff;
          font-size: 18px;
        }
        .vote-buttons {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .vote-btn {
          padding: 10px 18px;
          border-radius: 10px;
          border: 1px solid #333;
          background: #1a1a1a;
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s;
          min-width: 56px;
        }
        .vote-btn:hover { background: #2a2a2a; }
        .vote-btn.up4 { border-color: #16a34a; color: #16a34a; }
        .vote-btn.up4:hover { background: #16a34a22; }
        .vote-btn.up3 { border-color: #2ea043; color: #2ea043; }
        .vote-btn.up3:hover { background: #2ea04322; }
        .vote-btn.up2 { border-color: #59b86c; color: #59b86c; }
        .vote-btn.up2:hover { background: #59b86c22; }
        .vote-btn.up1 { border-color: #4f8cff; color: #4f8cff; }
        .vote-btn.up1:hover { background: #4f8cff22; }
        .vote-btn.down1 { border-color: #e09040; color: #e09040; }
        .vote-btn.down1:hover { background: #e0904022; }
        .vote-btn.down2 { border-color: #e07030; color: #e07030; }
        .vote-btn.down2:hover { background: #e0703022; }
        .vote-btn.down3 { border-color: #f85149; color: #f85149; }
        .vote-btn.down3:hover { background: #f8514922; }
        .vote-btn.down4 { border-color: #d1242f; color: #d1242f; }
        .vote-btn.down4:hover { background: #d1242f22; }
        .vote-btn.hide { border-color: #666; color: #666; }
        .vote-btn.hide:hover { background: #66666622; }
        .vote-btn.skip { border-color: #444; color: #666; }
        .upload-btn {
          padding: 8px 20px;
          border-radius: 20px;
          border: 1px solid #333;
          background: transparent;
          color: #aaa;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .upload-btn:hover { background: #222; color: #fff; }
        .upload-btn:disabled { opacity: 0.5; cursor: default; }
        .vote-caption {
          max-width: 500px;
          margin: 0 auto;
        }
        .vote-caption input {
          width: 100%;
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid #333;
          background: #1a1a1a;
          color: #fff;
          font-size: 13px;
          outline: none;
          text-align: center;
        }
        .vote-caption input:focus { border-color: #4f8cff; }
        .vote-caption input::placeholder { color: #555; }
        .vote-nav {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin-top: 16px;
        }
        .vote-nav button {
          padding: 6px 16px;
          border-radius: 8px;
          border: 1px solid #333;
          background: transparent;
          color: #aaa;
          font-size: 13px;
          cursor: pointer;
        }
        .vote-nav button:hover { background: #222; color: #fff; }

        /* List mode */
        .photo-item {
          display: flex;
          gap: 14px;
          padding: 14px;
          margin-bottom: 6px;
          border-radius: 10px;
          background: #1a1a1a;
          align-items: center;
          transition: background 0.2s;
        }
        .photo-item:hover { background: #222; }
        .photo-item.is-hidden { opacity: 0.4; }
        .photo-item .thumb {
          width: 70px;
          height: 70px;
          border-radius: 6px;
          object-fit: cover;
          flex-shrink: 0;
        }
        .photo-item .info { flex: 1; min-width: 0; }
        .photo-item .filename {
          font-size: 11px;
          color: #555;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .photo-item .caption-input {
          width: 100%;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #333;
          background: #111;
          color: #fff;
          font-size: 13px;
          outline: none;
        }
        .photo-item .caption-input:focus { border-color: #4f8cff; }
        .photo-item .caption-input::placeholder { color: #555; }
        .photo-item .vote-badge {
          font-size: 13px;
          font-weight: 600;
          min-width: 36px;
          text-align: center;
          flex-shrink: 0;
        }
        .photo-item .vote-badge.pos { color: #2ea043; }
        .photo-item .vote-badge.neg { color: #f85149; }
        .photo-item .vote-badge.zero { color: #444; }
        .list-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .action-btn {
          width: 30px;
          height: 30px;
          border-radius: 6px;
          border: 1px solid #333;
          background: transparent;
          color: #aaa;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-btn:hover { background: #333; color: #fff; }
        .back-link {
          color: #666;
          text-decoration: none;
          font-size: 13px;
          transition: color 0.2s;
        }
        .back-link:hover { color: #fff; }
      `}</style>
      <div className="edit-wrap">
        <div className="edit-header">
          <div>
            <h1>Gallery Editor</h1>
            <span className="counts">
              {visibleCount} visible / {photos.length} total &middot; {votedCount} voted
            </span>
          </div>
          <a href="/gallery" className="back-link">← Gallery</a>
        </div>

        <div className="toolbar">
          <button className={`pill ${mode === 'vote' ? 'active' : ''}`} onClick={() => setMode('vote')}>
            Vote Mode
          </button>
          <button className={`pill ${mode === 'list' ? 'active' : ''}`} onClick={() => setMode('list')}>
            List View
          </button>
          {mode === 'list' && (
            <>
              <span style={{ color: '#333' }}>|</span>
              {(['all', 'visible', 'hidden'] as const).map(f => (
                <button
                  key={f}
                  className={`pill ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </>
          )}
          <label className="upload-btn" style={{ cursor: uploading ? 'default' : 'pointer' }}>
            {uploading ? 'Uploading...' : '+ Upload Photos'}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
          <button
            className={`save-btn ${saved ? 'saved' : ''}`}
            onClick={save}
            disabled={saving}
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save & Sort'}
          </button>
        </div>

        {mode === 'vote' && photo && (
          <div className="vote-card">
            <div className="vote-progress">
              {current + 1} of {photos.length}
              <div className="bar">
                <div className="bar-fill" style={{ width: `${((current + 1) / photos.length) * 100}%` }} />
              </div>
            </div>

            <div className="vote-img-wrap">
              <img className="vote-img" src={photo.src} alt="" />
            </div>

            <div className="vote-score">
              Score: <strong>{photo.votes ?? 0}</strong>
            </div>

            <div className="vote-buttons">
              <button className="vote-btn down4" onClick={() => vote(current, -4)}>-4</button>
              <button className="vote-btn down3" onClick={() => vote(current, -3)}>-3</button>
              <button className="vote-btn down2" onClick={() => vote(current, -2)}>-2</button>
              <button className="vote-btn down1" onClick={() => vote(current, -1)}>-1</button>
              <button className="vote-btn skip" onClick={() => { if (current < photos.length - 1) setCurrent(current + 1); }}>
                Skip
              </button>
              <button className="vote-btn up1" onClick={() => vote(current, 1)}>+1</button>
              <button className="vote-btn up2" onClick={() => vote(current, 2)}>+2</button>
              <button className="vote-btn up3" onClick={() => vote(current, 3)}>+3</button>
              <button className="vote-btn up4" onClick={() => vote(current, 4)}>+4</button>
              <button className="vote-btn hide" onClick={() => toggleHidden(current)}>
                {photo.hidden ? 'Unhide' : 'Hide'}
              </button>
            </div>

            <div className="vote-caption">
              <input
                type="text"
                placeholder="Add caption..."
                value={photo.caption}
                onChange={(e) => setCaption(current, e.target.value)}
              />
            </div>

            <div className="vote-nav">
              <button onClick={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0}>
                ← Prev
              </button>
              <button onClick={() => setCurrent(Math.min(photos.length - 1, current + 1))} disabled={current === photos.length - 1}>
                Next →
              </button>
            </div>
          </div>
        )}

        {mode === 'vote' && current >= photos.length - 1 && photos.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '20px', color: '#888', fontSize: '14px' }}>
            All done! Hit <strong>Save & Sort</strong> to apply your votes.
          </div>
        )}

        {mode === 'list' && filtered.map((photo) => {
          const i = photo.originalIndex;
          const v = photo.votes ?? 0;
          return (
            <div key={photo.src} className={`photo-item ${photo.hidden ? 'is-hidden' : ''}`}>
              <div className={`vote-badge ${v > 0 ? 'pos' : v < 0 ? 'neg' : 'zero'}`}>
                {v > 0 ? `+${v}` : v}
              </div>
              <img className="thumb" src={photo.src} alt="" loading="lazy" />
              <div className="info">
                <div className="filename">{filename(photo.src)}</div>
                <input
                  className="caption-input"
                  type="text"
                  placeholder="Add caption..."
                  value={photo.caption}
                  onChange={(e) => setCaption(i, e.target.value)}
                />
              </div>
              <div className="list-actions">
                <button className="action-btn" onClick={() => vote(i, 1)} title="+1">↑</button>
                <button className="action-btn" onClick={() => vote(i, -1)} title="-1">↓</button>
                <button
                  className="action-btn"
                  onClick={() => toggleHidden(i)}
                  title={photo.hidden ? 'Show' : 'Hide'}
                  style={{ fontSize: '11px' }}
                >
                  {photo.hidden ? '👁' : '✕'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
