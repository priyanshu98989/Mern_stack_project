"use client";

import { useEffect, useRef, useState } from "react";
import { useScrollFrames, frameSrc, TOTAL_FRAMES } from "@/hooks/useScrollFrames";
import { motion, AnimatePresence } from "framer-motion";

const SECTION_VH = 460;

export default function ScrollAnimation() {
  const { status, progress, getImage } = useScrollFrames();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const targetRef = useRef(0);
  const currentRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [scrollP, setScrollP] = useState(0);
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // scroll progress target
  useEffect(() => {
    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = -rect.top;
      const p = total > 0 ? Math.min(1, Math.max(0, scrolled / total)) : 0;
      targetRef.current = p;
      setScrollP(p);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // draw loop
  useEffect(() => {
    if (status !== "ready" || reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      // lerp
      const target = targetRef.current;
      currentRef.current += (target - currentRef.current) * 0.12;
      if (Math.abs(target - currentRef.current) < 0.0001) currentRef.current = target;

      const p = currentRef.current;
      const idx = p * (TOTAL_FRAMES - 1);
      const img = getImage(idx);

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      if (img && img.complete && img.naturalWidth > 0) {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const scale = Math.max(w / iw, h / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (w - dw) / 2;
        const dy = (h - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [status, reduced, getImage]);

  // reduced motion: static gallery
  if (reduced) {
    return (
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-8">
            Aether One â€” exploded view
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 20, 40, 60].map((i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={frameSrc(i)}
                alt={`Aether One frame ${i + 1}`}
                className="rounded-xl w-full aspect-video object-cover"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: `${SECTION_VH}vh` }}
      aria-label="Scroll-driven product animation"
    >
      {/* loading overlay */}
      <AnimatePresence>
        {status !== "ready" && (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          >
            <div className="w-64">
              <div className="text-sm text-muted mb-3 text-center">Loading experienceâ€¦</div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <div className="text-xs text-muted mt-2 text-center">
                {Math.round(progress * 100)}%
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* fallback static image on error */}
      {status === "error" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frameSrc(0)}
          alt="Aether One"
          className="fixed inset-0 w-full h-full object-cover"
        />
      )}

      <div className="sticky top-0 h-screen w-full overflow-hidden relative">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/30 via-transparent to-black/40" />

        {/* Story overlays */}
        <StoryOverlay progress={scrollP} />
      </div>
    </section>
  );
}

function StoryOverlay({ progress }: { progress: number }) {
  const show = (a: number, b: number) => progress >= a && progress <= b;
  const opacityFor = (a: number, b: number) => {
    const mid = (a + b) / 2;
    const half = (b - a) / 2;
    const d = Math.abs(progress - mid);
    return Math.max(0, 1 - d / half);
  };

  return (
    <div className="absolute inset-0 z-10 flex items-center">
      <div className="w-full px-6 md:px-12 lg:px-20">
        {/* Hero */}
        <motion.div
          className="max-w-3xl"
          animate={{ opacity: opacityFor(0, 0.15), y: show(0, 0.15) ? 0 : 20 }}
          transition={{ duration: 0.4 }}
          style={{ pointerEvents: show(0, 0.15) ? "auto" : "none" }}
        >
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] tracking-tight">
            Aether One
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-muted">Sound, reimagined.</p>
          <div className="mt-10 flex items-center gap-3 text-sm text-muted">
            <span className="inline-block w-8 h-px bg-accent-2" />
            Scroll to explore
          </div>
        </motion.div>

        {/* Feature 1 */}
        <motion.div
          className="max-w-xl ml-auto text-right"
          animate={{ opacity: opacityFor(0.2, 0.4), x: show(0.2, 0.4) ? 0 : 30 }}
          transition={{ duration: 0.4 }}
          style={{ pointerEvents: show(0.2, 0.4) ? "auto" : "none", position: "absolute", right: "5rem", top: "40%" }}
        >
          <span className="text-accent-2 text-sm font-mono">01</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-2">
            Adaptive Noise Cancellation
          </h2>
          <p className="mt-3 text-muted text-lg">
            Reads the room 200Ã— per second and cancels what you don&apos;t want to hear.
          </p>
        </motion.div>

        {/* Features 2 & 3 */}
        <motion.div
          className="absolute left-6 md:left-12 lg:left-20 top-1/3 max-w-md"
          animate={{ opacity: opacityFor(0.45, 0.65), x: show(0.45, 0.65) ? 0 : -30 }}
          transition={{ duration: 0.4 }}
          style={{ pointerEvents: show(0.45, 0.65) ? "auto" : "none" }}
        >
          <span className="text-accent-2 text-sm font-mono">02</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-2">
            Spatial Audio Engine
          </h2>
          <p className="mt-3 text-muted text-lg">
            3D soundstage that tracks your head for immersive listening.
          </p>
        </motion.div>
        <motion.div
          className="absolute right-6 md:right-12 lg:right-20 bottom-1/3 max-w-md text-right"
          animate={{ opacity: opacityFor(0.45, 0.65), x: show(0.45, 0.65) ? 0 : 30 }}
          transition={{ duration: 0.4 }}
          style={{ pointerEvents: show(0.45, 0.65) ? "auto" : "none" }}
        >
          <span className="text-accent-2 text-sm font-mono">03</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-2">
            48-Hour Battery
          </h2>
          <p className="mt-3 text-muted text-lg">
            A week of listening on a single charge, with fast-charge in 10 minutes.
          </p>
        </motion.div>

        {/* Specs */}
        <motion.div
          className="absolute left-6 md:left-12 lg:left-20 top-1/2 -translate-y-1/2 max-w-xl"
          animate={{ opacity: opacityFor(0.7, 0.9), y: show(0.7, 0.9) ? 0 : 20 }}
          transition={{ duration: 0.4 }}
          style={{ pointerEvents: show(0.7, 0.9) ? "auto" : "none" }}
        >
          <span className="text-accent-2 text-sm font-mono">SPECS</span>
          <h2 className="font-display text-3xl md:text-5xl font-bold mt-2">
            Titanium. Glass. Precision.
          </h2>
          <ul className="mt-4 space-y-2 text-muted text-lg">
            <li>40mm beryllium drivers</li>
            <li>Aerospace-grade titanium frame</li>
            <li>IPX5 water resistance</li>
            <li>Bluetooth 5.4 + LDAC</li>
          </ul>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center text-center px-6"
          animate={{ opacity: opacityFor(0.9, 1.0), scale: show(0.9, 1.0) ? 1 : 0.95 }}
          transition={{ duration: 0.4 }}
          style={{ pointerEvents: show(0.9, 1.0) ? "auto" : "none" }}
        >
          <h2 className="font-display text-4xl md:text-6xl font-bold">
            Reassembled. Ready.
          </h2>
          <p className="mt-4 text-muted text-lg max-w-xl">
            Reserve yours today and be first in line when Aether One ships.
          </p>
          <a
            href="#pricing"
            className="mt-8 inline-flex items-center justify-center h-12 px-8 rounded-full bg-accent text-white font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none"
          >
            Get Early Access
          </a>
        </motion.div>
      </div>
    </div>
  );
}
