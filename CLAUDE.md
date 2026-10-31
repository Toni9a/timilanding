# timilanding (timikeys.com)

Next.js 15 site on Vercel (project `timilanding-7uxz`, domains timikeys.com / www.timikeys.com). Pushing `main` deploys to production.

- Song data comes from the TimiKeys Railway API (`~/tm-backend`). Read docs/BACKEND.md for the API, auth, database schema and how Song and Performance join.
- Admin login is server-side: `src/lib/auth.ts`, `src/middleware.ts` and `/api/auth/*`, with the password in the server-only `ADMIN_PASSWORD` env var. The middleware guards `/api/admin`, `/api/dashboard`, `/api/brand`, gallery upload and gallery writes.
- Writes to the backend go through `/api/admin/backend/*` (`src/lib/backend.ts` adds `x-api-key` from `ADMIN_API_KEY`). Never call Railway write routes from the browser, and never expose either env var with a `NEXT_PUBLIC_` prefix.
- `/brand`, the dashboard "TikTok Analytics" tab and the scrape batch-size fix are deliberately uncommitted works in progress (see BRAND_STATUS.md). Don't commit them without asking.

@docs/BACKEND.md
