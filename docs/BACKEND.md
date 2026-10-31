<!-- Copy of tm-backend/CLAUDE.md (31 Oct 2026). The backend repo copy is the source of truth; update both together. -->

# tm-backend: TimiKeys API

Context for agents working on this repo. Facts checked against the live database on 30-31 Oct 2026.
No secrets live in this file; it says where to find them.

## What it is

- Express + TypeScript + Prisma 5 on Postgres. The API behind timikeys.com (the `timilanding` Next.js repo,
  `Toni9a/timilanding`) and timikeys.live (song requests at gigs, repo `Bankole2000/tm-frontend`, Vue on GitHub Pages).
- Live at `https://timikeys.up.railway.app/api/v1`.
- Railway auto-deploys `main` of `Bankole2000/tm-backend`. The build runs `prisma migrate deploy && tsc --build`
  and the start command is `node dist/index.js`. Only `src/` is compiled (`tsconfig.json` include), so
  `scripts/` never ships.
- Local dev: `npm run dev` (nodemon + ts-node). Needs `DATABASE_URL`, and `ADMIN_API_KEY` if you're testing writes.

## Secrets and env vars (names only)

| Var | Where | Notes |
|---|---|---|
| `DATABASE_URL` | Railway backend service; local `.env` (gitignored) | Local `.env` holds the **public** proxy URL (`*.proxy.rlwy.net`). Railway charges egress on it. The Postgres service also exposes `DATABASE_PRIVATE_URL` (`*.railway.internal`), which only works inside Railway. |
| `ADMIN_API_KEY` | Railway backend service; Vercel (`timilanding-7uxz`); `timilanding/.env.local` | Required on writes, see Auth. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Railway | Used only by `POST /login` (timikeys.live admin). |
| `PORT` | Railway | |

The DB password was pasted into a chat on 30 Oct 2026, so rotating it is pending. Rotating it means updating
Railway's backend `DATABASE_URL`, the local `.env`, and Toni's DBeaver connection.

## Auth (since 30 Oct 2026, `src/middleware/apiKey.middleware.ts`)

- Reads (GET/HEAD/OPTIONS) are public.
- Writes (POST/PUT/PATCH/DELETE) need header `x-api-key` matching `ADMIN_API_KEY`. If the var is unset, every write is refused.
- Keyless exceptions for timikeys.live, which calls from the browser: `POST /login`, `POST /requests`,
  `PUT|PATCH|DELETE /requests/:id`.
- Rate limit: only failed key checks count, 30 per 15 min per IP (`trust proxy` = 1). Keyed bulk writes are never throttled.
- timikeys.com sends writes server-side: the admin page posts to `timilanding`'s `/api/admin/backend/*` proxy,
  which adds the key. That proxy is gated by the site's admin session (`src/middleware.ts` there).
- Known gap: timikeys.live's "edit performance" (`PUT /performances/:id` from the browser) is now refused. Toni
  edits through timikeys.com admin instead.
- CORS is still `*`.

## Routes (`src/routes/index.routes.ts`, all under `/api/v1`)

- `GET /performances/search?q=&genres=&page=&limit=` reads the **Song** table (naming trap). `genres` takes genre slugs, comma-separated.
- `GET /performances?page=&limit=` reads the **Performance** table. Its `total` is wrong: it counts Song rows.
- `GET /performances/genres` returns every Genre with a `_count.SongGenres`.
- `POST /songs/add` accepts an optional `genres: string[]` (display names). In one transaction it upserts missing
  Genre rows and creates the Song plus its SongGenre links. It drops any client `id`, so the DB generates a lowercase
  uuid. It auto-fills `audioUrl` from the TikTok video id if missing.
- `PUT /songs/:id`, `POST /performances/add`, `POST /performances/batch`, `PUT|DELETE /performances/:id`
- `GET|POST /requests`, `PUT|PATCH|DELETE /requests/:id` (SongRequest), `POST /login`
- `GET /json-songs` (outside `/api/v1`)

## Database

Postgres on Railway, about 13 MB. The TimescaleDB extension is installed (Railway image), and its internal tables
show up in catalog queries; ignore them. Tables are PascalCase and columns camelCase, so **double-quote them in SQL**.

### Tables (counts as of 31 Oct 2026)

**`Song`** (1859): the live catalogue that the site and search read.
`id` (uuid; uppercase for 2023-era rows, lowercase for rows created via the API), `videoNo` int, `tiktokVideoLink`,
`songName`, `artistName` (comma-separated for features, typed inconsistently), `albumName`, `spotifyId` (null for
unreleased songs), `videoLength` (free text in mixed formats: `"4.15"`, `"3:02"`), `YesNo` bool, `audioUrl` (R2 mp3).
**There is no upload date on Song.**

**`Performance`** (1768): the original flat log, kept in parallel by the admin.
`id`, `videoNumber`, `videoURL`, `songName`, `artistName`, `albumName`, `yesOrNo`, `videoLength`,
`videoLengthInSeconds` (the default `1` on ~1000 rows, so unreliable), `mainGenre`, `subGenre`, `otherGenres text[]`
(genres as typed), `uploadDate` (set on 1760 rows; missing for videos 309, 310, 311; range 2022-06-02 to 2026-10-29).

**`Genre`** (173): `genre` = slug PK, `genreName` = display name. Slug rule: lowercase and strip non-alphanumerics
(`"alternative r&b"` becomes `alternativerb`). The admin, `/songs/add` and the backfill script all use this rule.

**`SongGenre`** (5104): join table (`songId`, `genreId`), composite PK. Every Song has at least one link.

**`SongRequest`** (~1580): the timikeys.live gig request queue (`title`, `artist`, `requestedBy`, `hasBeenPlayed`,
`requestedAt`, `playedAt`).

### Joining Song and Performance

**They share no id and have no foreign key.** The admin generates a uuid per row, but the backend drops it.
Match on **`videoNo` = `videoNumber` plus `lower(trim(songName))`**. That matches 1752 of 1768 Performance rows to
exactly one Song. Falling back to `tiktokVideoLink = videoURL` plus name gets 1760. Spotify id and video number
on their own are not unique (one video holds up to 12 songs, and one track appears in up to 13 videos).

```sql
-- songs with their upload date (one row per song; duplicate Performance rows would otherwise repeat songs)
select distinct on (s.id) s."videoNo", s."songName", s."artistName", p."uploadDate"
from "Song" s
left join "Performance" p
  on p."videoNumber" = s."videoNo" and lower(trim(p."songName")) = lower(trim(s."songName"))
order by s.id, p."uploadDate" nulls last;

-- songs in a genre
select s.* from "Song" s
join "SongGenre" sg on sg."songId" = s.id
where sg."genreId" = 'neosoul';
```

### Schema drift (don't run `prisma migrate dev` against prod)

- `Song.audioUrl` and `Performance.uploadDate` exist in the DB and in `schema.prisma`, but in no migration.
- The `SongGenre` FKs are `ON DELETE RESTRICT` in the DB, but `schema.prisma` says Cascade.
- The only indexes are primary keys.
- Five migrations are applied (latest `20240611033909_new_data`). `migrate deploy` has nothing pending.
  `migrate dev` would see drift and offer to reset the database. Fix: a baseline migration marked as applied.

## Startup seed

`src/index.ts` calls `newUpdateData()` 5 s after boot. It re-inserts the 2023 spreadsheet
(`src/utils/data/new/keysdata.json`) with skipDuplicates. It never overwrites rows, **but a deleted 2023-era song
comes back on the next restart.** Remove that call before any data clean-up that deletes rows.

## Known data issues (not fixed yet)

- A song literally named "undefined" (video 196); a Performance artist `undefined` (video 248).
- Duplicate songs: video 89 ("feather", "luv(sic)pt4"), video 77 ("heart of the city"), plus "wait for u",
  "emotionless", "always".
- Video 338 has a link ending in a stray `e`. Videos 338, 366 and 373 each have two different links.
- Links shared by two video numbers: 138/185, 164/165, 370/371, 407/408. Missing video numbers: 33, 346, 353, 432, 484.
- 15 songs have no Spotify id, which is expected for unreleased songs (tagged genre `unreleased`).
- 36 Song links have no Performance row; 4 the other way; 7 duplicate Performance rows.

## Scripts

- `scripts/backfill-song-genres.ts` links genre-less songs from their Performance genre text. Dry run by default,
  `--apply` writes. It ran on prod on 30 Oct 2026 (964 songs, 52 new genres) and a rerun is now a no-op.

## Read-only access (for an MCP server or reports)

Not set up yet. Create a dedicated Postgres role with `SELECT` only (no writes) and connect with that, rather
than with the `postgres` superuser URL in `.env`. Use the public proxy host from outside Railway.
