"use client";

import { useEffect, useRef } from "react";

type Particle = {
  progress: number;
  x: number;
  y: number;
  lane: number;
  size: number;
  speed: number;
  phase: number;
  drift: number;
  alpha: number;
  color: string;
  lead: boolean;
};

const streamColors = [
  "66, 133, 244", // brand blue
  "47, 184, 122", // fresh green
  "66, 133, 244",
  "47, 184, 122",
  "222, 122, 58", // warm orange accent
];

function createParticles(width: number) {
  const isMobile = width < 640;
  const isTablet = width < 1024;

  // Tuning: count controls energy. Keep mobile lighter for smooth scrolling.
  const particleCount = isMobile ? 28 : isTablet ? 48 : 68;

  return Array.from({ length: particleCount }, (_, index) => {
    const lead = index % 13 === 0;

    return {
      progress: Math.random() * 1.22 - 0.12,
      x: 0,
      y: 0,
      lane: index % (isMobile ? 3 : 4),
      size: lead ? (isMobile ? 2.8 : 3.5) : (isMobile ? 1.45 : 1.75) + Math.random() * 1.05,
      // Tuning: speed controls the left-to-right wave flow.
      speed: (isMobile ? 0.032 : 0.044) + Math.random() * (isMobile ? 0.022 : 0.032),
      phase: Math.random() * Math.PI * 2,
      drift: Math.random() * 0.9 + 0.45,
      // Tuning: opacity controls visibility. Blue/green carry the effect; orange is rare.
      alpha: lead ? (isMobile ? 0.48 : 0.62) : (isMobile ? 0.28 : 0.36) + Math.random() * 0.22,
      color: streamColors[index % streamColors.length],
      lead,
    };
  });
}

function easeInOutSine(value: number) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function getFlowPosition(particle: Particle, width: number, height: number, offset: number) {
  const isMobile = width < 640;
  const progress = particle.progress;
  const x = progress * width;
  const bandCenter = height * (isMobile ? 0.72 : 0.5);
  const laneSpread = height * (isMobile ? 0.038 : 0.055);
  const laneOffset = (particle.lane - (isMobile ? 1 : 1.5)) * laneSpread;
  const broadWave = Math.sin(progress * Math.PI * 2.35 + offset * 0.004 + particle.phase) * height * (isMobile ? 0.03 : 0.052);
  const secondaryWave = Math.sin(progress * Math.PI * 5.1 + particle.phase * 0.7) * height * (isMobile ? 0.012 : 0.018);
  const liftedArc = Math.sin(easeInOutSine(Math.max(0, Math.min(1, progress))) * Math.PI) * height * (isMobile ? 0.035 : 0.055);
  const y = bandCenter + laneOffset + broadWave + secondaryWave - liftedArc * particle.drift;

  return { x, y };
}

function getVisibility(x: number, y: number, width: number, height: number) {
  const isMobile = width < 640;
  const horizontalFadeIn = Math.min(1, Math.max(0, (x + width * 0.06) / (width * 0.18)));
  const horizontalFadeOut = Math.min(1, Math.max(0, (width * 1.02 - x) / (width * 0.16)));
  const topBoundary = height * (isMobile ? 0.61 : 0.32);
  const bottomBoundary = height * (isMobile ? 0.92 : 0.72);
  const verticalFadeIn = Math.min(1, Math.max(0, (y - topBoundary) / (height * 0.08)));
  const verticalFadeOut = Math.min(1, Math.max(0, (bottomBoundary - y) / (height * 0.08)));

  // Keep the heading/form zone calm while allowing the wave to pass through the hero.
  const contentCalm =
    !isMobile && x > width * 0.1 && x < width * 0.5 && y > height * 0.2 && y < height * 0.43 ? 0.2 : 1;

  return horizontalFadeIn * horizontalFadeOut * verticalFadeIn * verticalFadeOut * contentCalm;
}

export function SwarmParticleWave() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const visibleRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const frameRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number | null>(null);
  const waveOffsetRef = useRef(0);

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
      particlesRef.current = createParticles(width);
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
      context.globalCompositeOperation = "source-over";
      waveOffsetRef.current += delta * 34; // Tuning: increase for a faster travelling wave.

      const particles = particlesRef.current;

      for (const particle of particles) {
        particle.progress += particle.speed * delta;
        particle.phase += delta * 0.36;

        if (particle.progress > 1.1) {
          particle.progress = -0.12 - Math.random() * 0.08;
          particle.lane = Math.floor(Math.random() * (width < 640 ? 3 : 4));
          particle.drift = Math.random() * 0.9 + 0.45;
        }

        const position = getFlowPosition(particle, width, height, waveOffsetRef.current);
        particle.x = position.x;
        particle.y = position.y;
      }

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const nextParticle = particles[nextIndex];
          const xDistance = nextParticle.x - particle.x;

          if ((index + nextIndex) % 2 !== 0 || xDistance < -14 || xDistance > (width < 640 ? 68 : 108)) {
            continue;
          }

          const yDistance = Math.abs(nextParticle.y - particle.y);
          const maxYDistance = width < 640 ? 40 : 60;

          if (yDistance > maxYDistance) {
            continue;
          }

          const particleVisibility = getVisibility(particle.x, particle.y, width, height);
          const nextVisibility = getVisibility(nextParticle.x, nextParticle.y, width, height);
          const strength =
            (1 - Math.max(0, xDistance) / (width < 640 ? 68 : 108)) *
            (1 - yDistance / maxYDistance) *
            Math.min(particleVisibility, nextVisibility) *
            (width < 640 ? 0.09 : 0.16);

          if (strength <= 0.006) {
            continue;
          }

          context.beginPath();
          context.strokeStyle = `rgba(${particle.color}, ${strength})`;
          context.lineWidth = 1;
          context.moveTo(particle.x, particle.y);
          context.lineTo(nextParticle.x, nextParticle.y);
          context.stroke();
        }
      }

      for (const particle of particles) {
        const visibility = getVisibility(particle.x, particle.y, width, height);

        if (visibility <= 0.01) {
          continue;
        }

        const alpha = particle.alpha * visibility;

        context.beginPath();
        context.fillStyle = `rgba(${particle.color}, ${alpha * 0.1})`;
        context.arc(particle.x, particle.y, particle.size * (particle.lead ? 4.5 : 2.8), 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.fillStyle = `rgba(${particle.color}, ${alpha})`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
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
