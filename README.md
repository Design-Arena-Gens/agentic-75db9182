# YouTube Shorts Generator

Create vertical 9:16 shorts from any uploaded video entirely in your browser using ffmpeg.wasm. No server or API keys required.

## Features
- Client-side processing with ffmpeg.wasm
- Center-crop to 9:16 (configurable resolution, default 1080x1920)
- Generate single clip or auto-split whole video into sequential shorts
- Adjustable CRF quality and x264 preset
- Progress bar and multiple downloads

## Getting started

```bash
npm install
npm run dev
```

Build:

```bash
npm run build && npm start
```

## Deploy

The project is ready for Vercel.

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-75db9182
```

## Notes
- Video processing happens in your browser; large files may take time.
- For best results, upload horizontal videos to crop to vertical.
