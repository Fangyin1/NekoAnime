# NekoAnimeId — starter website

Starter conversion of the supplied FangManga static project into **NekoAnimeId**, a responsive anime catalog with source detail pages, episode list, and external-player detection.

## Features
- Dark responsive interface for mobile and desktop.
- Catalog/search/page navigation from `https://otakudesu.blog` via Vercel API routes.
- Detail page parses title, poster, synopsis, metadata, and episode links.
- Watch page detects external iframe embeds and lets users open the source page when no embed is available.
- Server-side source-host validation, request timeout, caching headers, and graceful error UI.
- Admin tools page for testing the catalog/detail/watch parser endpoints.

## Deploy to Vercel
1. Extract the ZIP and upload the project contents to a GitHub repository.
2. Import that repository in Vercel. Framework preset can be **Other**; keep the project root at the folder containing `index.html`, `api/`, and `package.json`.
3. Deploy. Vercel installs `cheerio` from `package.json` for serverless parser functions.
4. Open `/api/catalog` to test catalog extraction; `/admin.html` has a test UI.
5. Parser memakai beberapa selector dan fallback tautan internal karena struktur sumber dapat berubah. Jika hasil tetap kosong/502, sumber mungkin memblokir request serverless atau markup telah berubah; cek detail error di halaman admin dan uji endpoint setelah deploy.

## Endpoints
- `GET /api/catalog?page=1` — catalog list.
- `GET /api/catalog?q=naruto` — source search.
- `GET /api/detail?url=https%3A%2F%2Fotakudesu.blog%2F...` — anime detail + episodes.
- `GET /api/watch?url=...` — detects external embed URLs on an episode page.

All URL parameters are restricted to HTTPS `otakudesu.blog` to avoid using these endpoints as arbitrary URL fetchers. The watch page only embeds HTTPS external URLs detected on the source page; many providers may block embedding. This project does not download or rehost video files.

## Important implementation notes
- This is a **starter integration**, not a guarantee that every page selector matches the current source. The source site can change its HTML or block automated requests; validate endpoints after deployment.
- The catalog currently reads from the source on request with CDN cache headers. `nekoanimeid-schema.sql` is an optional database schema for a later scheduled synchronization worker; it is not automatically populated by this starter.
- The admin page is a diagnostics page, not a protected CMS. Do not add privileged operations to it without server-side authentication.
- Before public deployment, confirm that your permission covers the exact source pages, external player URLs, and intended audience. Follow the source's access rules and rate limits.
- External video providers may disallow iframe embedding; in that case the site shows a link to the source episode.

## Local testing
A local static server alone cannot execute `/api/*.js` routes. Deploy to Vercel or use Vercel CLI with Node.js installed to test API routes locally.
