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

const colors = [
  "66, 133, 244", // brand blue
  "47, 184, 122", // fresh green
  "222, 122, 58", // warm orange
];

function createParticles(width: number, height: number) {
  const isMobile = width < 640;
  const isTablet = width < 1024;

  // Tuning: particle count controls density. Keep mobile lower for smooth scrolling.
  const particleCount = isMobile ? 36 : isTablet ? 58 : 86;

  return Array.from({ length: particleCount }, (_, index) => {
    const lane = index % 4;
    const laneOffset = (lane - 1.5) * height * 0.055;
    const depth = 0.65 + Math.random() * 0.75;
    const color = colors[index % colors.length];

    return {
      x: Math.random() * width,
      y: height * 0.48 + laneOffset,
      baseY: height * 0.48 + laneOffset,
      size: (Math.random() * 2.2 + 1.15) * depth,
      // Tuning: speed controls the left-to-right flow.
      speed: ((isMobile ? 22 : 40) + Math.random() * (isMobile ? 34 : 58)) * depth,
      phase: Math.random() * Math.PI * 2,
      amplitude: (isMobile ? 14 : 20) + Math.random() * (isMobile ? 18 : 28),
      // Tuning: opacity controls visual strength. Keep below 0.55 behind the CTA.
      alpha: (0.2 + Math.random() * 0.26) * depth,
      color,
      lane,
      depth,
    };
  });
}

function createLeadParticles(width: number) {
  const isMobile = width < 640;
  const leadCount = isMobile ? 3 : 6;

  return Array.from({ length: leadCount }, (_, index) => ({
    progress: index / leadCount + Math.random() * 0.08,
    // Tuning: lead speed makes the route-matching motion more/less obvious.
    speed: (isMobile ? 0.045 : 0.062) + Math.random() * 0.032,
    lane: index % 3,
    phase: Math.random() * Math.PI * 2,
    size: (isMobile ? 2.5 : 3.3) + Math.random() * 1.6,
    color: colors[index % colors.length],
  }));
}

function getRouteY(x: number, width: number, height: number, lane: number, offset: number) {
  const progress = x / Math.max(1, width);
  const laneBase = height * (0.36 + lane * 0.095);
  const broadCurve = Math.sin((progress * Math.PI * 2.1) + lane * 0.72 + offset * 0.005) * height * 0.035;
  const routeLift = Math.sin(progress * Math.PI) * height * 0.085;

  return laneBase + broadCurve - routeLift;
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
      waveOffsetRef.current += delta * 58; // Tuning: higher values move the dotted wave faster.

      const particles = particlesRef.current;

      for (let waveIndex = 0; waveIndex < 4; waveIndex += 1) {
        context.save();
        context.setLineDash([3.5, 18]);
        context.lineDashOffset = -waveOffsetRef.current - waveIndex * 34;
        context.lineWidth = waveIndex === 1 ? 1.45 : 1.1;
        context.strokeStyle = `rgba(${colors[waveIndex % colors.length]}, ${0.22 - waveIndex * 0.025})`; // Tuning: wave opacity.
        context.beginPath();

        for (let x = -40; x <= width + 40; x += 12) {
          const y = getRouteY(x, width, height, waveIndex % 4, waveOffsetRef.current);

          if (x === -40) {
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
          particle.x = -24;
          particle.lane = Math.floor(Math.random() * 4);
          particle.depth = 0.65 + Math.random() * 0.75;
        }

        context.beginPath();
        context.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.fillStyle = `rgba(${particle.color}, ${particle.alpha * 0.16})`;
        context.arc(particle.x - particle.speed * 0.035, particle.y, particle.size * 2.6, 0, Math.PI * 2);
        context.fill();
      }

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index];

        for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
          const nextParticle = particles[nextIndex];
          const xDistance = nextParticle.x - particle.x;

          if (xDistance < 0 || xDistance > 115) {
            continue;
          }

          const yDistance = Math.abs(nextParticle.y - particle.y);

          if (yDistance > 56) {
            continue;
          }

          const strength = (1 - xDistance / 115) * (1 - yDistance / 56) * 0.1;

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
          lead.progress = -0.08;
          lead.lane = Math.floor(Math.random() * 3);
          lead.color = colors[Math.floor(Math.random() * colors.length)];
        }

        const x = lead.progress * width;
        const y = getRouteY(x, width, height, lead.lane + 1, waveOffsetRef.current) + Math.sin(lead.phase * 1.8) * 7;

        for (let trail = 5; trail >= 1; trail -= 1) {
          const trailX = x - trail * (width < 640 ? 12 : 18);
          const trailY = getRouteY(trailX, width, height, lead.lane + 1, waveOffsetRef.current);
          const trailAlpha = (6 - trail) * 0.035;

          context.beginPath();
          context.fillStyle = `rgba(${lead.color}, ${trailAlpha})`;
          context.arc(trailX, trailY, lead.size * (1 - trail * 0.09), 0, Math.PI * 2);
          context.fill();
        }

        context.beginPath();
        context.fillStyle = `rgba(${lead.color}, ${width < 640 ? 0.36 : 0.46})`;
        context.arc(x, y, lead.size, 0, Math.PI * 2);
        context.fill();

        context.beginPath();
        context.strokeStyle = `rgba(${lead.color}, ${width < 640 ? 0.16 : 0.22})`;
        context.lineWidth = 1.2;
        context.moveTo(x - (width < 640 ? 34 : 48), y);
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
