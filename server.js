import express from 'express';
import { Innertube, UniversalCache } from 'youtubei.js';
import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
// FIX: Render uses 10000 by default
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

let youtube;

async function initYouTube() {
  try {
    // FIX: retrieve_player: true + specific location settings help bypass signature errors
    youtube = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      retrieve_player: true 
    });
    console.log(">>> [SUCCESS] YouTube API Initialised");
  } catch (e) {
    console.error(">>> [ERROR] Init Failed:", e.message);
  }
}

initYouTube();

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    // FIX: type: 'video' avoids the ThumbnailView/Shorts parser crash
    const results = await youtube.search(q, { type: 'video' });
    
    const videos = (results.videos || []).map(v => ({
      id: v.id,
      title: v.title?.text || "Video",
      thumbnail: v.thumbnails?.[0]?.url || "",
      duration: v.duration?.text || "0:00",
      views: v.view_count?.text || "0",
      channel: v.author?.name || "Channel",
      channelAvatar: v.author?.thumbnails?.[0]?.url || ""
    }));
    res.json({ videos });
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Stream endpoint
app.get('/api/stream/:videoId', (req, res) => {
  const { videoId } = req.params;
  const { quality = '720', audioOnly = 'false' } = req.query;
  
  const args = [
    '--no-check-certificate',
    // FIX: Using multiple clients to ensure bypass if one is throttled
    '--extractor-args', 'youtube:player_client=ios,android;player_skip=webpage',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    '-f', audioOnly === 'true' ? 'bestaudio/best' : `bestvideo[height<=${quality}]+bestaudio/best`,
    '-o', '-',
    `https://www.youtube.com/watch?v=${videoId}`
  ];
  
  const ytdlp = spawn('yt-dlp', args);
  
  res.setHeader('Content-Type', audioOnly === 'true' ? 'audio/mpeg' : 'video/mp4');
  
  ytdlp.stdout.pipe(res);
  
  // Catch spawn errors
  ytdlp.on('error', (err) => {
    console.error("Failed to start yt-dlp:", err.message);
    if (!res.headersSent) res.status(500).send("Streaming tool error.");
  });

  ytdlp.stderr.on('data', (data) => console.error(`[yt-dlp] ${data.toString()}`));

  req.on('close', () => ytdlp.kill());
});

// Download endpoint
app.get('/api/download/:videoId', (req, res) => {
  const { videoId } = req.params;
  const { format = 'mp4', quality = '720' } = req.query;
  
  const formatMap = { mp4: 'mp4', mp3: 'mp3', flac: 'flac', opus: 'opus', ogg: 'ogg' };
  const ext = formatMap[format] || 'mp3';

  const args = [
    '--no-check-certificate',
    '--extractor-args', 'youtube:player_client=ios,android;player_skip=webpage',
    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    '-f', format === 'mp4' ? `bestvideo[height<=${quality}]+bestaudio/best` : 'bestaudio/best',
    '-o', '-',
    `https://www.youtube.com/watch?v=${videoId}`
  ];

  if (format !== 'mp4') {
    args.push('--extract-audio', '--audio-format', ext, '--audio-quality', '0');
  }
  
  const ytdlp = spawn('yt-dlp', args);
  
  res.setHeader('Content-Disposition', `attachment; filename="download_${videoId}.${ext}"`);
  ytdlp.stdout.pipe(res);
  
  req.on('close', () => ytdlp.kill());
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
});
