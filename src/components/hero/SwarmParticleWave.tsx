"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  baseY: number;
  size: number;
  speed: number;
  phase: number;
  amplitude: number;
  alpha: number;
  color: string;
};

const colors = [
  "66, 133, 244", // brand blue
  "47, 184, 122", // fresh green
  "222, 122, 58", // warm orange
];

function createParticles(width: number, height: number) {
  const isMobile = width < 640;
  const isTablet = width < 1024;

  // Tuning: lower these counts first if performance ever feels too busy.
  const particleCount = isMobile ? 24 : isTablet ? 34 : 48;

  return Array.from({ length: particleCount }, (_, index) => {
    const lane = index / Math.max(1, particleCount - 1);
    const color = colors[index % colors.length];

    return {
      x: Math.random() * width,
      y: height * (0.18 + lane * 0.62),
      baseY: height * (0.18 + lane * 0.62),
      size: Math.random() * 1.7 + 0.9,
      // Tuning: increase speed very slightly for a more active wave.
      speed: (isMobile ? 8 : 12) + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
      amplitude: (isMobile ? 8 : 13) + Math.random() * 18,
      // Tuning: keep opacity low so the CTA remains the visual priority.
      alpha: 0.1 + Math.random() * 0.14,
      color,
    };
  });
}

export function SwarmParticleWave() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const visibleRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;

    if (!canvas || !parent) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });

    if (!context) {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      sizeRef.current = { width, height, dpr };
      particlesRef.current = createParticles(width, height);
    };

    const draw = (timestamp: number) => {
      if (!visibleRef.current || reducedMotionRef.current) {
        frameRef.current = null;
        lastFrameRef.current = null;
        context.clearRect(0, 0, sizeRef.current.width, sizeRef.current.height);
        return;
      }

      const { width, height } = sizeRef.current;
      const lastFrame = lastFrameRef.current ?? timestamp;
      const delta = Math.min(40, timestamp - lastFrame) / 1000;

      lastFrameRef.current = timestamp;
      context.clearRect(0, 0, width, height);

      context.lineWidth = 1;
      context.globalCompositeOperation = "source-over";

      const particles = particlesRef.current;

      for (const particle of particles) {
        particle.x += particle.speed * delta;
        particle.phase += delta * 0.7;
        particle.y = particle.baseY + Math.sin(particle.phase + particle.x * 0.01) * particle.amplitude;

        if (particle.x > width + 24) {
          particle.x = -24;
          particle.baseY = height * (0.18 + Math.random() * 0.62);
        }

        context.beginPath();
        context.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const nextParticle = particles[nextIndex];
          const xDistance = nextParticle.x - particle.x;

          if (xDistance < 0 || xDistance > 135) {
            continue;
          }

          const yDistance = Math.abs(nextParticle.y - particle.y);

          if (yDistance > 70) {
            continue;
          }

          const strength = (1 - xDistance / 135) * (1 - yDistance / 70) * 0.055;

          context.beginPath();
          context.strokeStyle = `rgba(${particle.color}, ${strength})`;
          context.moveTo(particle.x, particle.y);
          context.lineTo(nextParticle.x, nextParticle.y);
          context.stroke();
        }
      }

      frameRef.current = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (frameRef.current === null && visibleRef.current && !reducedMotionRef.current) {
        frameRef.current = window.requestAnimationFrame(draw);
      }
    };

    const stop = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      lastFrameRef.current = null;
    };

    const syncMotionPreference = () => {
      reducedMotionRef.current = motionQuery.matches;

      if (reducedMotionRef.current) {
        stop();
        context.clearRect(0, 0, sizeRef.current.width, sizeRef.current.height);
        return;
      }

      start();
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;

        if (entry.isIntersecting) {
          start();
        } else {
          stop();
        }
      },
      { rootMargin: "120px 0px", threshold: 0.01 },
    );

    const resizeObserver = new ResizeObserver(resize);

    resize();
    syncMotionPreference();
    observer.observe(parent);
    resizeObserver.observe(parent);
    motionQuery.addEventListener("change", syncMotionPreference);

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      motionQuery.removeEventListener("change", syncMotionPreference);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
