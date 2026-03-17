import express from 'express';
import { Innertube, UniversalCache } from 'youtubei.js'; // Added UniversalCache
import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

let youtube;

async function initYouTube() {
  try {
    // FIX: Using cache and local session generation helps avoid blocks
    youtube = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true
    });
    console.log("YouTube API Initialised");
  } catch (e) {
    console.error("Init Error:", e.message);
  }
}

initYouTube();

// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    // FIX: type: 'video' avoids the ThumbnailView/Shorts parser crash [1]
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
    '--extractor-args', 'youtube:player_client=ios,android;player_skip=webpage',
    '-f', audioOnly === 'true' ? 'bestaudio' : `bestvideo[height<=${quality}]+bestaudio/best`,
    '-o', '-',
    `https://www.youtube.com/watch?v=${videoId}`
  ];
  
  const ytdlp = spawn('yt-dlp', args);
  
  // Set correct content type for the player
  res.setHeader('Content-Type', audioOnly === 'true' ? 'audio/mpeg' : 'video/mp4');
  
  ytdlp.stdout.pipe(res);
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
    '-f', format === 'mp4' ? `bestvideo[height<=${quality}]+bestaudio/best` : 'bestaudio',
    '-o', '-',
    `https://www.youtube.com/watch?v=${videoId}`
  ];

  // FIX: Only add audio extraction if the user didn't ask for MP4
  if (format !== 'mp4') {
    args.push('--extract-audio', '--audio-format', ext, '--audio-quality', '0');
  }
  
  const ytdlp = spawn('yt-dlp', args);
  
  res.setHeader('Content-Disposition', `attachment; filename="download.${ext}"`);
  ytdlp.stdout.pipe(res);
  
  req.on('close', () => ytdlp.kill());
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
});
