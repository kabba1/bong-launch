"use client";

import { useEffect, useRef, useState } from "react";

type Bubble = {
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
  life?: number;
  isTrail?: boolean;
  velocity?: { x: number; y: number };
};

/** Decorative, bounded animation. Stops off screen, in background tabs and on reduced motion. */
export function BubbleField({ burstKey }: { burstKey?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const burst = useRef<(() => void) | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const surface = canvas.current;
    const host = surface?.parentElement;
    const context = surface?.getContext("2d");
    if (!surface || !host || !context) return;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const contrast = matchMedia("(forced-colors: active)");
    let frame = 0;
    let visible = true;
    let width = 0;
    let height = 0;
    let previous = 0;
    let lastTrail = 0;
    let cursor: { x: number; y: number } | null = null;
    let bubbles: Bubble[] = [];
    const make = (
      x: number,
      y: number,
      radius: number,
      life?: number,
    ): Bubble => ({
      x,
      y,
      radius,
      life,
      speed: 10 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
    });
    const fit = () => {
      cursor = null;
      width = host.clientWidth;
      height = host.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      surface.width = Math.round(width * dpr);
      surface.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      bubbles = Array.from({ length: width < 700 ? 5 : 8 }, () =>
        make(
          Math.random() * width,
          Math.random() * height,
          18 + Math.random() * 14,
        ),
      );
    };
    const enabled = () =>
      !paused &&
      visible &&
      !document.hidden &&
      !motion.matches &&
      !contrast.matches;
    const draw = (now: number) => {
      frame = 0;
      if (!enabled()) return;
      const elapsed = previous ? Math.min((now - previous) / 1000, 0.04) : 0;
      previous = now;
      context.clearRect(0, 0, width, height);
      bubbles = bubbles.filter(
        (bubble) => bubble.life === undefined || bubble.life > 0,
      );
      for (const bubble of bubbles) {
        if (bubble.velocity) {
          bubble.x += bubble.velocity.x * elapsed;
          bubble.y += bubble.velocity.y * elapsed;
          const drag = Math.pow(0.92, elapsed * 60);
          bubble.velocity.x *= drag;
          bubble.velocity.y *= drag;
        } else {
          bubble.phase += elapsed;
          bubble.y -= bubble.speed * elapsed;
          bubble.x += Math.sin(bubble.phase) * elapsed * 5;
          if (cursor && !bubble.isTrail) {
            const dx = bubble.x - cursor.x;
            const dy = bubble.y - cursor.y;
            const distance = Math.hypot(dx, dy);
            if (distance < bubble.radius + 70) {
              // Match the reference's gentle shove at any display refresh rate.
              bubble.x += (distance ? dx / distance : 1) * 132 * elapsed;
              bubble.y += (distance ? dy / distance : 0) * 72 * elapsed;
            }
          }
        }
        if (bubble.life !== undefined) bubble.life -= elapsed;
        else if (bubble.y < -bubble.radius) {
          bubble.y = height + bubble.radius;
          bubble.x = Math.random() * width;
        }
        context.globalAlpha =
          bubble.life === undefined
            ? 1
            : Math.max(
                0,
                Math.min(1, bubble.life / (bubble.velocity ? 0.42 : 1)),
              );
        context.beginPath();
        context.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(241,251,253,0.2)";
        context.fill();
        context.strokeStyle = "rgba(6,42,58,0.27)";
        context.lineWidth = 1.7;
        context.stroke();
        if (bubble.radius > 9) {
          context.beginPath();
          context.arc(
            bubble.x - bubble.radius * 0.32,
            bubble.y - bubble.radius * 0.32,
            bubble.radius * 0.17,
            0,
            Math.PI * 2,
          );
          context.fillStyle = "rgba(255,255,255,.8)";
          context.fill();
        }
      }
      context.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!enabled()) cursor = null;
      frame = enabled() ? requestAnimationFrame(draw) : 0;
      if (motion.matches || contrast.matches)
        context.clearRect(0, 0, width, height);
    };
    const pointer = (event: PointerEvent) => {
      if (!enabled() || event.pointerType !== "mouse") return;
      const bounds = host.getBoundingClientRect();
      cursor = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      if (event.timeStamp - lastTrail < 100) return;
      lastTrail = event.timeStamp;
      if (bubbles.length < 48)
        bubbles.push({
          ...make(
            event.clientX - bounds.left,
            event.clientY - bounds.top,
            3 + Math.random() * 2,
            2,
          ),
          isTrail: true,
        });
    };
    const clearCursor = () => {
      cursor = null;
    };
    const pop = (event: PointerEvent) => {
      if (!enabled() || event.button !== 0) return;
      const bounds = host.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      for (const bubble of bubbles) {
        if (
          bubble.life !== undefined ||
          Math.hypot(bubble.x - x, bubble.y - y) >= bubble.radius + 6
        )
          continue;
        for (let i = 0; i < 8 && bubbles.length < 48; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (2 + Math.random() * 5) * 60;
          bubbles.push({
            ...make(
              bubble.x,
              bubble.y,
              3 + Math.random() * bubble.radius * 0.5,
              0.42,
            ),
            velocity: {
              x: Math.cos(angle) * speed,
              y: Math.sin(angle) * speed - 60,
            },
          });
        }
        // Re-enter from below so popping never empties the ambient field.
        bubble.x = Math.random() * width;
        bubble.y = height + bubble.radius * 2;
      }
    };
    burst.current = () => {
      if (!enabled()) return;
      const art = host.querySelector(".art-button")?.getBoundingClientRect();
      const bounds = host.getBoundingClientRect();
      if (!art) return;
      for (let i = 0; i < 4 && bubbles.length < 48; i++) {
        bubbles.push(
          make(
            art.left -
              bounds.left +
              art.width * 0.58 +
              (Math.random() - 0.5) * 70,
            art.top - bounds.top + art.height * 0.08,
            10 + Math.random() * 8,
            2.5,
          ),
        );
      }
    };
    const resize = new ResizeObserver(fit);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    fit();
    resize.observe(host);
    intersection.observe(host);
    host.addEventListener("pointermove", pointer, { passive: true });
    host.addEventListener("pointerleave", clearCursor);
    host.addEventListener("pointerdown", pop, { passive: true });
    window.addEventListener("blur", clearCursor);
    window.addEventListener("scroll", clearCursor, {
      passive: true,
      capture: true,
    });
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    contrast.addEventListener("change", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      host.removeEventListener("pointermove", pointer);
      host.removeEventListener("pointerleave", clearCursor);
      host.removeEventListener("pointerdown", pop);
      window.removeEventListener("blur", clearCursor);
      window.removeEventListener("scroll", clearCursor, true);
      document.removeEventListener("visibilitychange", sync);
      motion.removeEventListener("change", sync);
      contrast.removeEventListener("change", sync);
      burst.current = null;
    };
  }, [paused]);

  useEffect(() => {
    if (burstKey) burst.current?.();
  }, [burstKey]);

  return (
    <>
      <canvas ref={canvas} className="bubble-field" aria-hidden="true" />
      <button
        type="button"
        className="bubble-toggle"
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
      >
        {paused ? "Resume bubbles" : "Pause bubbles"}
      </button>
    </>
  );
}
