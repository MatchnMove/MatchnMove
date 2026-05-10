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
  lane: number;
  depth: number;
};

type LeadParticle = {
  progress: number;
  speed: number;
  lane: number;
  phase: number;
  size: number;
  color: string;
};

const streamColors = [
  "66, 133, 244", // brand blue
  "47, 184, 122", // fresh green
  "66, 133, 244",
  "47, 184, 122",
  "222, 122, 58", // warm orange accent
];

function createParticles(width: number, height: number) {
  const isMobile = width < 640;
  const isTablet = width < 1024;

  // Tuning: particle count controls density. Keep mobile lower for smooth scrolling.
  const particleCount = isMobile ? 18 : isTablet ? 28 : 38;
  const streamStart = width * (isMobile ? 0.12 : 0.34);

  return Array.from({ length: particleCount }, (_, index) => {
    const lane = index % 2;
    const depth = 0.72 + Math.random() * 0.48;
    const color = streamColors[index % streamColors.length];

    return {
      x: streamStart + Math.random() * (width - streamStart + 40),
      y: height * 0.5,
      baseY: height * 0.5,
      size: (Math.random() * 0.9 + 1.55) * depth,
      // Tuning: speed controls the left-to-right flow.
      speed: ((isMobile ? 16 : 26) + Math.random() * (isMobile ? 18 : 28)) * depth,
      phase: Math.random() * Math.PI * 2,
      amplitude: (isMobile ? 6 : 10) + Math.random() * (isMobile ? 8 : 12),
      // Tuning: opacity controls visual strength. Keep below 0.55 behind the CTA.
      alpha: (0.18 + Math.random() * 0.18) * depth,
      color,
      lane,
      depth,
    };
  });
}

function createLeadParticles(width: number) {
  const isMobile = width < 640;
  const leadCount = isMobile ? 2 : 4;

  return Array.from({ length: leadCount }, (_, index) => ({
    progress: 0.22 + index / leadCount * 0.66 + Math.random() * 0.04,
    // Tuning: lead speed makes the route-matching motion more/less obvious.
    speed: (isMobile ? 0.032 : 0.044) + Math.random() * 0.02,
    lane: index % 2,
    phase: Math.random() * Math.PI * 2,
    size: (isMobile ? 2.25 : 2.9) + Math.random() * 0.9,
    color: streamColors[index % streamColors.length],
  }));
}

function getRouteY(x: number, width: number, height: number, lane: number, offset: number) {
  const isMobile = width < 640;
  const progress = x / Math.max(1, width);
  const laneBase = height * (isMobile ? 0.72 + lane * 0.045 : 0.43 + lane * 0.085);
  const broadCurve =
    Math.sin((progress * Math.PI * 1.8) + lane * 0.55 + offset * 0.003) * height * (isMobile ? 0.018 : 0.026);
  const routeLift = Math.sin(progress * Math.PI) * height * (isMobile ? 0.035 : 0.052);

  return laneBase + broadCurve - routeLift;
}

function getStreamAlpha(x: number, width: number) {
  const isMobile = width < 640;
  const streamStart = width * (isMobile ? 0.08 : 0.32);
  const fadeIn = Math.min(1, Math.max(0, (x - streamStart) / (width * (isMobile ? 0.22 : 0.14))));
  const fadeOut = Math.min(1, Math.max(0, (width * 0.98 - x) / (width * 0.12)));

  return fadeIn * fadeOut;
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
  const leadParticlesRef = useRef<LeadParticle[]>([]);

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
      leadParticlesRef.current = createLeadParticles(width);
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
      waveOffsetRef.current += delta * 38; // Tuning: higher values move the dotted wave faster.

      const particles = particlesRef.current;

      for (let waveIndex = 0; waveIndex < 2; waveIndex += 1) {
        context.save();
        context.setLineDash([3, 22]);
        context.lineDashOffset = -waveOffsetRef.current - waveIndex * 28;
        context.lineWidth = waveIndex === 1 ? 1.15 : 1;
        context.strokeStyle = `rgba(${streamColors[waveIndex]}, ${0.13 - waveIndex * 0.02})`; // Tuning: route-line opacity.
        context.beginPath();

        for (let x = width * (width < 640 ? 0.08 : 0.3); x <= width + 28; x += 14) {
          const y = getRouteY(x, width, height, waveIndex, waveOffsetRef.current);

          if (x === width * 0.3) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        }

        context.stroke();
        context.restore();
      }

      for (const particle of particles) {
        particle.x += particle.speed * delta;
        particle.phase += delta * (0.8 + particle.depth * 0.4);
        particle.y =
          getRouteY(particle.x, width, height, particle.lane, waveOffsetRef.current) +
          Math.sin(particle.phase + particle.x * 0.012) * particle.amplitude;

        if (particle.x > width + 24) {
          particle.x = width * (width < 640 ? 0.44 : 0.32) - Math.random() * 28;
          particle.lane = Math.floor(Math.random() * 2);
          particle.depth = 0.72 + Math.random() * 0.48;
        }

        const streamAlpha = getStreamAlpha(particle.x, width);

        context.beginPath();
        context.fillStyle = `rgba(${particle.color}, ${particle.alpha * streamAlpha})`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.fillStyle = `rgba(${particle.color}, ${particle.alpha * streamAlpha * 0.1})`;
        context.arc(particle.x - particle.speed * 0.028, particle.y, particle.size * 2.1, 0, Math.PI * 2);
        context.fill();
      }

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const nextParticle = particles[nextIndex];
          const xDistance = nextParticle.x - particle.x;

          if (particle.x < width * 0.34 || xDistance < 0 || xDistance > 96) {
            continue;
          }

          const yDistance = Math.abs(nextParticle.y - particle.y);

          if (yDistance > 42) {
            continue;
          }

          const strength = (1 - xDistance / 96) * (1 - yDistance / 42) * 0.055 * getStreamAlpha(particle.x, width);

          context.beginPath();
          context.strokeStyle = `rgba(${particle.color}, ${strength})`;
          context.moveTo(particle.x, particle.y);
          context.lineTo(nextParticle.x, nextParticle.y);
          context.stroke();
        }
      }

      for (const lead of leadParticlesRef.current) {
        lead.progress += lead.speed * delta;
        lead.phase += delta;

        if (lead.progress > 1.08) {
          lead.progress = width < 640 ? 0.08 : 0.24;
          lead.lane = Math.floor(Math.random() * 2);
          lead.color = streamColors[Math.floor(Math.random() * streamColors.length)];
        }

        const x = lead.progress * width;
        const y = getRouteY(x, width, height, lead.lane, waveOffsetRef.current) + Math.sin(lead.phase * 1.4) * 4;
        const leadAlpha = getStreamAlpha(x, width);

        for (let trail = 4; trail >= 1; trail -= 1) {
          const trailX = x - trail * (width < 640 ? 10 : 15);
          const trailY = getRouteY(trailX, width, height, lead.lane, waveOffsetRef.current);
          const trailAlpha = (5 - trail) * 0.026 * leadAlpha;

          context.beginPath();
          context.fillStyle = `rgba(${lead.color}, ${trailAlpha})`;
          context.arc(trailX, trailY, lead.size * (1 - trail * 0.09), 0, Math.PI * 2);
          context.fill();
        }

        context.beginPath();
        context.fillStyle = `rgba(${lead.color}, ${(width < 640 ? 0.32 : 0.4) * leadAlpha})`;
        context.arc(x, y, lead.size, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.strokeStyle = `rgba(${lead.color}, ${(width < 640 ? 0.11 : 0.16) * leadAlpha})`;
        context.lineWidth = 1;
        context.moveTo(x - (width < 640 ? 28 : 40), y);
        context.lineTo(x + 10, y);
        context.stroke();
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
