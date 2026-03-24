# Short Video Reels Frontend

A high-performance, mobile-optimized short-video scrolling feed built with React and Vite. This application is designed to mimic the seamless experience of platforms like TikTok, utilizing HLS (HTTP Live Streaming) for efficient video delivery and custom preloading strategies to minimize bandwidth.

## ?? Key Technical Features

- **Intelligent Preloading (Manifest Surgery)**: Uses a custom `pLoader` in `hls.js` to intercept and rewrite `.m3u8` files on the fly. During preloading, it strictly limits the engine to the first 3 segments at 480p, preventing massive background data spikes.
- **Debounced Feed Logic**: Implements a 120ms debounce on active index changes. This ensures that users scrolling quickly past videos do not trigger unnecessary network requests or video mounting.
- **Intersection Observer Integration**: Precisely tracks which video is in view to trigger playback, view counts, and cleanup of off-screen players.
- **Adaptive Quality**: Dynamically un-blindfolds the HLS engine when a video becomes active, allowing it to seamlessly upgrade to 720p for the best viewing experience.
- **Global State Management**: Uses `FeedContext` to synchronize playback state, volume/mute preferences, and interaction data (likes/views) across the entire feed.

## ??? Tech Stack

- **Framework**: React 18+ (Vite)
- **Video Engine**: hls.js
- **Styling**: CSS3 (featuring Glassmorphism overlays)
- **API Client**: Axios
- **State Management**: React Context API

## ?? Environment Variables

Create a `.env` file in the root directory and configure the following variables to point to your VPS services:

```env
VITE_API_BASE_URL=https://chheu-api.duckdns.org:8080
VITE_REEL_THUMB_BASE_URL=https://chheu-api.duckdns.org:9000/reels-thumbnails
VITE_REEL_STREAM_BASE_URL=https://chheu-api.duckdns.org:9000/reels-stream
```

## ?? Installation & Setup

### Local Development

Clone and install:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

### Docker Deployment

This project includes a multi-stage Dockerfile optimized for production:

Build image:

```bash
docker build -t reel-frontend .
```

Run with Compose:

The frontend is part of the root `docker-compose.yml` and connects automatically to the backend API.

## ?? Project Structure

- `ScrollContent.jsx`: The main feed coordinator; handles infinite scroll and debouncing.
- `ReelContainer.jsx`: Logic for mounting/unmounting players and tracking intersection thresholds.
- `ReelPlayer.jsx`: The core video component; contains the custom HLS loader and manifest filtering logic.
- `FeedContext.jsx`: Provides a unified state for the reel list and user preferences.
