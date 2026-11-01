"use client";

import { useEffect, useRef } from "react";

type Pointer = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  active: boolean;
};

export default function AmbientLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer: Pointer = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      active: false,
    };
    let width = 0;
    let height = 0;
    let frame = 0;
    let elapsed = 0;
    let previousTime = 0;
    let themeObserver: MutationObserver | null = null;

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw(elapsed);
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);

      const isLight = document.documentElement.dataset.theme === "light";
      const lineColor = isLight ? "0, 119, 111" : "0, 229, 183";
      const lineCount = Math.max(4, Math.min(7, Math.ceil(height / 190)));
      const spacing = height / (lineCount + 1);
      const influenceRadius = Math.min(width, height) * 0.34;

      for (let line = 0; line < lineCount; line += 1) {
        const baseY = spacing * (line + 1);
        const phase = line * 0.72;
        const points: { x: number; y: number; influence: number }[] = [];

        for (let x = -32; x <= width + 32; x += 14) {
          const progress = x / Math.max(width, 1);
          const wave = Math.sin(progress * Math.PI * 2.25 + time * 0.00011 + phase);
          const broadWave = Math.sin(progress * Math.PI * 1.08 - time * 0.000075 + phase * 0.6);
          const pointerDistanceX = x - pointer.x;
          const pointerDistanceY = baseY - pointer.y;
          const distance = Math.hypot(pointerDistanceX, pointerDistanceY);
          const influence = pointer.active
            ? Math.exp(-((distance / influenceRadius) ** 2))
            : 0;
          const pointerBend = Math.sin(pointerDistanceX / 70) * influence * 17;
          const y = baseY + wave * 24 + broadWave * 12 + pointerBend;

          points.push({ x, y, influence });
        }

        const pointerStrength = Math.max(...points.map((point) => point.influence));
        const baseOpacity = isLight ? 0.045 : 0.055;
        context.beginPath();
        points.forEach((point, index) => {
          if (index === 0) {
            context.moveTo(point.x, point.y);
            return;
          }

          const previous = points[index - 1];
          const midX = (previous.x + point.x) / 2;
          const midY = (previous.y + point.y) / 2;
          context.quadraticCurveTo(previous.x, previous.y, midX, midY);
        });

        context.strokeStyle = `rgba(${lineColor}, ${baseOpacity + pointerStrength * 0.025})`;
        context.lineWidth = line % 3 === 0 ? 1.1 : 0.75;
        context.stroke();
      }
    };

    const animate = (timestamp: number) => {
      if (previousTime) elapsed += Math.min(timestamp - previousTime, 40);
      previousTime = timestamp;
      pointer.x += (pointer.targetX - pointer.x) * 0.075;
      pointer.y += (pointer.targetY - pointer.y) * 0.075;
      draw(elapsed);

      if (!reduceMotion.matches) frame = window.requestAnimationFrame(animate);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer.targetX = event.clientX;
      pointer.targetY = event.clientY;
      pointer.active = event.pointerType === "mouse" || event.pointerType === "pen";
      if (reduceMotion.matches) draw(elapsed);
    };

    const onPointerLeave = (event: PointerEvent) => {
      if (event.relatedTarget !== null) return;
      pointer.active = false;
      pointer.targetX = -1000;
      pointer.targetY = -1000;
    };

    const onMotionPreferenceChange = () => {
      window.cancelAnimationFrame(frame);
      previousTime = 0;
      if (reduceMotion.matches) draw(elapsed);
      else frame = window.requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerLeave, { passive: true });
    reduceMotion.addEventListener("change", onMotionPreferenceChange);
    themeObserver = new MutationObserver(() => draw(elapsed));
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    if (reduceMotion.matches) draw(elapsed);
    else frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerLeave);
      reduceMotion.removeEventListener("change", onMotionPreferenceChange);
      themeObserver?.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="ambient-lines" />;
}
