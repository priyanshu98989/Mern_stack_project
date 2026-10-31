"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export const TOTAL_FRAMES = 80;

export type FrameStatus = "loading" | "ready" | "error";

export function frameSrc(index: number) {
  const n = Math.min(Math.max(index, 0), TOTAL_FRAMES - 1) + 1;
  return `/frames/frame_${String(n).padStart(3, "0")}.jpg`;
}

export function useScrollFrames() {
  const [status, setStatus] = useState<FrameStatus>("loading");
  const [progress, setProgress] = useState(0);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const loadedCountRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const imgs: HTMLImageElement[] = [];
    imagesRef.current = imgs;
    loadedCountRef.current = 0;

    const onLoad = () => {
      loadedCountRef.current += 1;
      if (cancelled) return;
      setProgress(loadedCountRef.current / TOTAL_FRAMES);
      if (loadedCountRef.current === TOTAL_FRAMES) setStatus("ready");
    };
    const onError = () => {
      if (cancelled) return;
      // fallback: still mark ready if at least first frame loads
      loadedCountRef.current += 1;
      setProgress(loadedCountRef.current / TOTAL_FRAMES);
      if (loadedCountRef.current === TOTAL_FRAMES) {
        // if first frame missing, error
        if (!imgs[0] || !imgs[0].complete || imgs[0].naturalWidth === 0) setStatus("error");
        else setStatus("ready");
      }
    };

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.decoding = "async";
      img.src = frameSrc(i);
      img.onload = onLoad;
      img.onerror = onError;
      imgs.push(img);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const getImage = useCallback((index: number) => {
    const i = Math.min(Math.max(Math.round(index), 0), TOTAL_FRAMES - 1);
    return imagesRef.current[i] ?? null;
  }, []);

  return { status, progress, getImage, total: TOTAL_FRAMES };
}
