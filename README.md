# MeowTV Stream

A clean, deployable streaming video player built with Next.js 15, HLS.js, and Tailwind CSS 4.

## Features

- HLS.js playback with adaptive bitrate
- Server switching (Tik V17 + V4 multi-language)
- 60+ subtitle tracks with flag icons
- Episode sidebar with horizontal scroll cards
- Keyboard shortcuts (Space/K=play, F=fullscreen, M=mute, arrows=seek/volume, L=lock, C=captions)
- Mobile double-tap seek with animated ripple
- Lock mode, PiP support, Quality selector, Speed control
- Video zoom slider, Volume boost via Web Audio API
- Auto-play next episode countdown
- Seek bar with hover time tooltip
- MeowTV-style dark theme with Solar icons

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── globals.css          # MeowTV dark theme + Tailwind
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home/launcher page
│   ├── api/
│   │   ├── movie/[id]/route.ts      # Movie streams + subtitles API
│   │   └── tv/[id]/[season]/[episode]/route.ts  # TV episode API
│   └── play/
│       ├── movie/[id]/page.tsx      # Movie player page
│       └── tv/[id]/[season]/[episode]/page.tsx  # TV player page
└── components/
    └── player/
        └── video-player.tsx  # Core video player (~1185 lines)
```

## API Routes

### `GET /api/movie/{tmdb_id}`
Returns movie streams + subtitles aggregated from V17 gate, V4 gate, and subtitle API.

### `GET /api/tv/{tmdb_id}/{season}/{episode}`
Returns TV episode streams + subtitles aggregated from V17 gate, V4 gate, and subtitle API.

---

## Deployment

### Option 1: Vercel (Recommended)

1. Push this repo to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Vercel auto-detects Next.js — click Deploy
4. Done! Your app is live.

No environment variables needed. The `vercel.json` is already configured.

### Option 2: VPS with Docker

> **Important:** For Docker deployment, you must add `output: "standalone"` to `next.config.ts` first:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",  // Required for Docker
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
```

Then:

```bash
# Build and run with Docker Compose
docker compose up -d --build

# Or build manually
docker build -t meowtv .
docker run -p 3000:3000 meowtv
```

### Option 3: VPS without Docker

```bash
npm install
npm run build
npm start
# Runs on port 3000
```

Use a process manager like PM2 for production:

```bash
npm install -g pm2
pm2 start npm --name "meowtv" -- start
pm2 save
pm2 startup
```

### Reverse Proxy (Nginx)

If running behind Nginx on a VPS:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Tech Stack

- **Next.js 15** — React framework with App Router
- **HLS.js** — HLS m3u8 playback with adaptive bitrate
- **Tailwind CSS 4** — Utility-first styling
- **TypeScript** — Type-safe code
- **No external UI library** — All icons are inline SVGs (Solar icon set)

## License

MIT
