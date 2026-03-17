import React, { useState, useRef } from 'react';
import PlayerControls from './PlayerControls';
import DownloadMenu from './DownloadMenu';

function VideoPlayer({ video, onBack }) {
  const [quality, setQuality] = useState('720');
  const [speed, setSpeed] = useState(1);
  const [audioOnly, setAudioOnly] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const videoRef = useRef(null);

  const streamUrl = `/api/stream/${video.id}?quality=${quality}&audioOnly=${audioOnly}`;

  const handleQualityChange = (q) => {
    setQuality(q);
    setStreamKey(k => k + 1);
  };

  const handleAudioToggle = (v) => {
    setAudioOnly(v);
    setStreamKey(k => k + 1);
  };

  const handleSpeedChange = (s) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <button onClick={onBack} className="mb-4 flex items-center gap-2 hover:text-[var(--accent)]">
        <div className="icon-arrow-left"></div>
        <span>Back to results</span>
      </button>

      <div className="breeze-card overflow-hidden">
        <video
          key={streamKey}
          ref={videoRef}
          src={streamUrl}
          controls
          autoPlay
          className="w-full aspect-video bg-black"
          controlsList="nodownload"
          onError={(e) => console.error('Video error:', e.target.error)}
        />

        <div className="p-4">
          <h2 className="text-xl font-bold mb-2">{video.title}</h2>

          <div className="flex items-center gap-4 mb-4">
            <img
              src={video.channelAvatar}
              alt={video.channel}
              className="w-10 h-10 rounded-full"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <div>
              <p className="font-medium">{video.channel}</p>
              <p className="text-sm text-[var(--text-secondary)]">{video.views}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <PlayerControls
              quality={quality}
              speed={speed}
              audioOnly={audioOnly}
              onQualityChange={handleQualityChange}
              onSpeedChange={handleSpeedChange}
              onAudioToggle={handleAudioToggle}
            />
            <DownloadMenu videoId={video.id} quality={quality} audioOnly={audioOnly} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
