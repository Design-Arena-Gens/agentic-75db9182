"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

type GeneratedClip = {
  url: string;
  filename: string;
  sizeBytes: number;
  startSec: number;
  durationSec: number;
};

const human = (s: number) => {
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60).toString().padStart(2, '0');
  return `${m}:${r}`;
};

export default function VideoShortsGenerator() {
  const [ffmpeg] = useState(() => new FFmpeg());
  const [ffmpegReady, setFfmpegReady] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [loading, setLoading] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [clips, setClips] = useState<GeneratedClip[]>([]);

  const [shortLen, setShortLen] = useState<number>(15);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [qualityCrf, setQualityCrf] = useState<number>(23);
  const [preset, setPreset] = useState<string>('veryfast');
  const [scaleHeight, setScaleHeight] = useState<number>(1920);
  const [scaleWidth, setScaleWidth] = useState<number>(1080);

  const videoEl = useRef<HTMLVideoElement | null>(null);

  // Load ffmpeg core from CDN for faster setup and smaller bundle.
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading('Loading media engine?');
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
        });
        ffmpeg.on('progress', ({ progress }) => {
          setProgress(Math.floor(progress * 100));
        });
        if (mounted) setFfmpegReady(true);
      } catch (e) {
        console.error(e);
        alert('Failed to initialize video engine. Please refresh and try again.');
      } finally {
        setLoading(null);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [ffmpeg]);

  const onPick = useCallback((f: File) => {
    setFile(f);
    setClips([]);
    setProgress(0);
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) onPick(f);
  }, [onPick]);

  const prevent = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const computeAutoStarts = useCallback(() => {
    const starts: number[] = [];
    const total = Math.max(0, Math.floor(videoDuration - startOffset));
    const step = Math.max(1, shortLen);
    for (let t = 0; t < total; t += step) {
      starts.push(startOffset + t);
    }
    return starts;
  }, [videoDuration, startOffset, shortLen]);

  const makeClip = useCallback(async (startSec: number, durationSec: number, idx: number) => {
    if (!file) return null;
    const inputName = 'input.mp4';
    const outName = `short_${idx.toString().padStart(2, '0')}.mp4`;

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Scale to target height, then center-crop to 9:16 (1080x1920) to fit shorts.
    const vf = `scale=-2:${scaleHeight},crop=${scaleWidth}:${scaleHeight}`;

    const args = [
      '-ss', `${Math.max(0, startSec)}`,
      '-t', `${Math.max(1, durationSec)}`,
      '-i', inputName,
      '-vf', vf,
      '-r', '30',
      '-c:v', 'libx264',
      '-preset', preset,
      '-crf', `${qualityCrf}`,
      '-movflags', 'faststart',
      '-an',
      outName,
    ];

    await ffmpeg.exec(args);
    const data = await ffmpeg.readFile(outName);
    const blob = new Blob([data as Uint8Array], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    return {
      url,
      filename: outName,
      sizeBytes: blob.size,
      startSec,
      durationSec,
    } as GeneratedClip;
  }, [ffmpeg, file, preset, qualityCrf, scaleHeight, scaleWidth]);

  const handleGenerateAll = useCallback(async () => {
    if (!ffmpegReady || !file) return;
    setLoading('Generating shorts?');
    setClips([]);
    setProgress(0);

    try {
      const starts = computeAutoStarts();
      const results: GeneratedClip[] = [];
      let idx = 1;
      for (const s of starts) {
        const dur = Math.min(shortLen, Math.max(0, videoDuration - s));
        if (dur <= 0.5) continue;
        const clip = await makeClip(s, dur, idx++);
        if (clip) results.push(clip);
      }
      setClips(results);
    } catch (e) {
      console.error(e);
      alert('Failed to generate. Try shorter durations or a smaller file.');
    } finally {
      setLoading(null);
    }
  }, [ffmpegReady, file, computeAutoStarts, shortLen, videoDuration, makeClip]);

  const handleGenerateSingle = useCallback(async () => {
    if (!ffmpegReady || !file) return;
    setLoading('Generating short?');
    setClips([]);
    setProgress(0);

    try {
      const dur = Math.min(shortLen, Math.max(0, videoDuration - startOffset));
      const clip = await makeClip(startOffset, dur, 1);
      if (clip) setClips([clip]);
    } catch (e) {
      console.error(e);
      alert('Failed to generate clip.');
    } finally {
      setLoading(null);
    }
  }, [ffmpegReady, file, shortLen, videoDuration, startOffset, makeClip]);

  const downloadAllZip = useCallback(async () => {
    // Simple multi-download fallback
    clips.forEach((c) => {
      const a = document.createElement('a');
      a.href = c.url;
      a.download = c.filename;
      a.click();
    });
  }, [clips]);

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={prevent}
        onDragEnter={prevent}
        className="border border-dashed border-neutral-700 rounded-xl p-6 md:p-10 text-center bg-neutral-900/50"
      >
        {!videoUrl && (
          <>
            <p className="text-neutral-300">Drag and drop a video, or</p>
            <label className="btn btn-primary mt-4 cursor-pointer">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPick(f);
                }}
              />
              Choose a file
            </label>
          </>
        )}
        {videoUrl && (
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <video
                ref={videoEl}
                className="w-full rounded-lg border border-neutral-800 bg-black"
                controls
                src={videoUrl}
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  if (!isNaN(v.duration)) setVideoDuration(v.duration);
                }}
              />
              <div className="mt-3 text-sm text-neutral-400">
                Duration: {videoDuration ? human(Math.floor(videoDuration)) : '?'}
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Short length (sec)</label>
                  <input
                    type="number"
                    className="input w-full"
                    min={1}
                    max={120}
                    value={shortLen}
                    onChange={(e) => setShortLen(parseInt(e.target.value || '15', 10))}
                  />
                </div>
                <div>
                  <label className="label">Start offset (sec)</label>
                  <input
                    type="number"
                    className="input w-full"
                    min={0}
                    value={startOffset}
                    onChange={(e) => setStartOffset(parseInt(e.target.value || '0', 10))}
                  />
                </div>
                <div>
                  <label className="label">Quality CRF (lower=better)</label>
                  <input
                    type="number"
                    className="input w-full"
                    min={18}
                    max={32}
                    value={qualityCrf}
                    onChange={(e) => setQualityCrf(parseInt(e.target.value || '23', 10))}
                  />
                </div>
                <div>
                  <label className="label">Preset</label>
                  <select className="input w-full" value={preset} onChange={(e) => setPreset(e.target.value)}>
                    {['ultrafast','superfast','veryfast','faster','fast','medium','slow','slower'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Output width</label>
                  <input
                    type="number"
                    className="input w-full"
                    min={540}
                    max={2160}
                    value={scaleWidth}
                    onChange={(e) => setScaleWidth(parseInt(e.target.value || '1080', 10))}
                  />
                </div>
                <div>
                  <label className="label">Output height</label>
                  <input
                    type="number"
                    className="input w-full"
                    min={960}
                    max={3840}
                    value={scaleHeight}
                    onChange={(e) => setScaleHeight(parseInt(e.target.value || '1920', 10))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button className="btn btn-primary" disabled={!ffmpegReady || !file || !!loading} onClick={handleGenerateSingle}>
                  Generate one short
                </button>
                <button className="btn btn-secondary" disabled={!ffmpegReady || !file || !!loading} onClick={handleGenerateAll}>
                  Auto-split whole video
                </button>
                <button className="btn btn-ghost" disabled={!clips.length} onClick={downloadAllZip}>
                  Download all
                </button>
                <button className="btn btn-ghost" onClick={() => { setFile(null); setVideoUrl(null); setClips([]); }}>
                  Reset
                </button>
              </div>
              {loading && (
                <div className="mt-2">
                  <div className="text-sm text-neutral-300 mb-1">{loading}</div>
                  <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {clips.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-3">Generated clips</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {clips.map((c) => (
              <div key={c.filename} className="card p-3">
                <video className="w-full rounded-md border border-neutral-800" controls src={c.url} />
                <div className="mt-2 text-sm text-neutral-300 flex items-center justify-between">
                  <div>
                    <div className="font-mono text-xs text-neutral-400">{c.filename}</div>
                    <div>From {human(c.startSec)} ? {human(c.durationSec)}</div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = c.url;
                      a.download = c.filename;
                      a.click();
                    }}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
