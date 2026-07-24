"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, Maximize, Volume2 } from "lucide-react";

type Props = {
  src: string;
  title: string;
  onProgress?: (pct: number) => void;
};

export default function VideoPlayer({ src, title, onProgress }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reportedAt = useRef(0);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const resetHideTimer = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowControls(true);
    if (isPlaying) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.duration > 0) {
      const pct = Math.round((v.currentTime / v.duration) * 100);
      if (pct >= reportedAt.current + 10 || pct >= 90) {
        reportedAt.current = pct;
        onProgress?.(pct);
      }
    }
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
    } else {
      v.pause();
    }
  }

  function changeSpeed(s: number) {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Number(e.target.value);
  }

  function toggleFullscreen() {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  }

  return (
    <div
      className="relative bg-black rounded-xl overflow-hidden group shadow-e3"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        title={title}
        className="w-full aspect-video"
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onPlay={() => { setIsPlaying(true); resetHideTimer(); }}
        onPause={() => { setIsPlaying(false); setShowControls(true); }}
        onEnded={() => { setIsPlaying(false); setShowControls(true); onProgress?.(100); }}
      />

      {/* Click-to-play overlay */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Putar video"
          className="group/play absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/10"
        >
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-gradient text-white shadow-e3 transition-transform group-hover/play:scale-110">
            <Play aria-hidden="true" className="h-8 w-8 translate-x-0.5" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* Progress bar */}
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={seek}
          className="w-full h-1 accent-[#0077A8] cursor-pointer mb-3"
          aria-label="Seek video"
        />

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="text-white hover:text-[#0077A8] transition"
            >
              {isPlaying ? (
                <Pause aria-hidden="true" className="w-5 h-5" fill="currentColor" />
              ) : (
                <Play aria-hidden="true" className="w-5 h-5" fill="currentColor" />
              )}
            </button>

            <div className="flex items-center gap-1.5">
              <Volume2 aria-hidden="true" className="w-4 h-4 text-white/80" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setVolume(v);
                  if (videoRef.current) videoRef.current.volume = v;
                }}
                className="w-20 h-1 accent-[#0077A8]"
                aria-label="Volume"
              />
            </div>

            <span className="text-white text-xs tabular-nums">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={speed}
              onChange={(e) => changeSpeed(Number(e.target.value))}
              className="bg-black/60 text-white text-xs border border-white/20 rounded px-1 py-0.5"
              aria-label="Kecepatan"
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                <option key={s} value={s}>{s}×</option>
              ))}
            </select>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Fullscreen"
              className="text-white hover:text-[#0077A8] transition"
            >
              <Maximize aria-hidden="true" className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
