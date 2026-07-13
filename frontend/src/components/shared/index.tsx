import { useId } from "react";
import type { ReactNode } from "react";

/* ─── Logo mark ───
   Two tapered beams — abstracted fingertips — converge on one focal
   point: the machine side is a wireframe outline, the human side a
   thermal fill that runs hottest at the contact tip. The bright
   vertical spark in the gap is the moment of insight, and reads as a
   subtle "I".

   Two responsive variants:
   - "full"    — for the landing page and larger brand areas. Carries
                 the wireframe mesh detail and a soft halo behind the
                 spark; drawn with finer strokes.
   - "compact" — for the workspace top bar, favicon, and anything at or
                 below ~20px. Chunkier beams, thicker stroke, wider
                 spark, no fine detail — geometry that survives being
                 rasterized small. */
export function LogoMark({
  size = 16,
  variant = "full",
}: {
  size?: number;
  variant?: "full" | "compact";
}) {
  const id = useId();
  const thermal = (
    <linearGradient id={`${id}-thermal`} x1="0" y1="0.5" x2="1" y2="0.5">
      <stop offset="0" stopColor="#fbbf24" />
      <stop offset="0.5" stopColor="#fb7185" />
      <stop offset="1" stopColor="#7c3aed" />
    </linearGradient>
  );

  if (variant === "compact") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>{thermal}</defs>
        {/* machine beam — bold wireframe outline, no inner detail */}
        <path
          d="M3.2 7.9 Q8 7.1 10.5 11.2 Q11 12 10.5 12.8 Q8 16.9 3.2 16.1 Q2.1 12 3.2 7.9 Z"
          stroke="#93c5fd"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        {/* human beam — thermal fill */}
        <path
          d="M20.8 7.9 Q16 7.1 13.5 11.2 Q13 12 13.5 12.8 Q16 16.9 20.8 16.1 Q21.9 12 20.8 7.9 Z"
          fill={`url(#${id}-thermal)`}
        />
        {/* the spark — wider so it survives tiny rasterization */}
        <path d="M12 6.9 Q13.8 12 12 17.1 Q10.2 12 12 6.9 Z" fill="#ffffff" />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        {thermal}
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="0.55" stopColor="#a5b4fc" stopOpacity="0.18" />
          <stop offset="1" stopColor="#a5b4fc" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* soft halo behind the meeting point */}
      <circle cx="12" cy="12" r="6.5" fill={`url(#${id}-halo)`} />
      {/* machine beam — wireframe outline */}
      <path
        d="M3 8.8 Q7.5 8.1 10.2 11.35 Q10.7 12 10.2 12.65 Q7.5 15.9 3 15.2 Q2.1 12 3 8.8 Z"
        stroke="#93c5fd"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* wireframe mesh inside the machine beam */}
      <path d="M4.2 10.4 Q7 10.1 9.2 11.6" stroke="#93c5fd" strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
      <path d="M4.2 13.6 Q7 13.9 9.2 12.4" stroke="#93c5fd" strokeWidth="0.7" strokeLinecap="round" opacity="0.5" />
      <path d="M6.2 9.1 Q6.7 12 6.2 14.9" stroke="#93c5fd" strokeWidth="0.7" strokeLinecap="round" opacity="0.4" />
      {/* human beam — thermal fill, hottest at the meeting tip */}
      <path
        d="M21 8.8 Q16.5 8.1 13.8 11.35 Q13.3 12 13.8 12.65 Q16.5 15.9 21 15.2 Q21.9 12 21 8.8 Z"
        fill={`url(#${id}-thermal)`}
      />
      {/* the spark — focal point and subtle "I" */}
      <path d="M12 7.6 Q13.45 12 12 16.4 Q10.55 12 12 7.6 Z" fill="#ffffff" />
    </svg>
  );
}

/* ─── HUD corner ticks ───
   Drop inside any relatively-positioned panel to give it the
   heads-up-display wireframe framing used across the workspace. */
export function HudCorners({ tone = "accent" }: { tone?: "accent" | "wire" | "hot" }) {
  const color =
    tone === "wire"
      ? "rgba(34,211,238,0.5)"
      : tone === "hot"
      ? "rgba(251,113,133,0.5)"
      : "rgba(99,102,241,0.45)";
  return (
    <>
      <i className="hud-tick tl" style={{ borderColor: color }} />
      <i className="hud-tick tr" style={{ borderColor: color }} />
      <i className="hud-tick bl" style={{ borderColor: color }} />
      <i className="hud-tick br" style={{ borderColor: color }} />
    </>
  );
}

/* ─── Empty State ─── */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-20 wire-grid">
      <div className="text-text-muted mb-5 opacity-60">{icon}</div>
      <h3 className="text-xl font-semibold font-display text-text mb-2.5 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-text-secondary max-w-md leading-relaxed mb-8">
        {description}
      </p>
      {action}
    </div>
  );
}

/* ─── Loading State ───
   The machine at work: counter-rotating wireframe rings around a thermal
   core, particles orbiting the scanner, a scan beam sweeping the grid,
   rising data bits, and mono telemetry underneath. */

// Deterministic pseudo-random layout for the rising data bits.
const BITS = Array.from({ length: 14 }, (_, i) => ({
  left: `${(i * 41 + 13) % 100}%`,
  delay: `${((i * 53) % 34) / 10}s`,
  char: i % 3 === 0 ? "1" : i % 3 === 1 ? "0" : "·",
}));

export function LoadingState({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center h-full gap-8 wire-grid overflow-hidden">
      {/* Sweeping scan beam */}
      <div className="absolute inset-x-0 top-0 h-1/3 animate-scan pointer-events-none">
        <div
          className="h-24 w-full"
          style={{
            background:
              "linear-gradient(180deg, transparent, rgba(34,211,238,0.06) 45%, rgba(34,211,238,0.14) 50%, rgba(34,211,238,0.06) 55%, transparent)",
          }}
        />
      </div>

      {/* Rising data bits */}
      <div className="absolute inset-x-0 bottom-0 h-40 pointer-events-none" aria-hidden="true">
        {BITS.map((b, i) => (
          <span
            key={i}
            className="absolute bottom-0 font-mono text-[9px] text-wire/50 animate-bit-rise"
            style={{ left: b.left, animationDelay: b.delay }}
          >
            {b.char}
          </span>
        ))}
      </div>

      {/* Wireframe scanner: rings + orbiting particles + thermal core */}
      <div className="relative w-28 h-28">
        <svg
          className="absolute inset-0 animate-spin-slow"
          viewBox="0 0 112 112"
          fill="none"
        >
          <circle
            cx="56"
            cy="56"
            r="52"
            stroke="rgba(99,102,241,0.35)"
            strokeWidth="1"
            strokeDasharray="4 7"
          />
          <circle cx="56" cy="4" r="2.5" fill="#818cf8" />
        </svg>
        <svg
          className="absolute inset-2 animate-spin-slower"
          viewBox="0 0 96 96"
          fill="none"
        >
          <circle
            cx="48"
            cy="48"
            r="44"
            stroke="rgba(34,211,238,0.35)"
            strokeWidth="1"
            strokeDasharray="14 10"
          />
          <circle cx="92" cy="48" r="2" fill="#22d3ee" />
        </svg>
        {/* Free particles orbiting on elliptical paths */}
        <svg className="absolute -inset-6" viewBox="0 0 160 160" fill="none" aria-hidden="true">
          <circle r="1.6" fill="#fbbf24" opacity="0.9">
            <animateMotion
              dur="5.2s"
              repeatCount="indefinite"
              path="M80 20 A60 44 0 1 1 79.9 20"
            />
          </circle>
          <circle r="1.3" fill="#a5b4fc" opacity="0.8">
            <animateMotion
              dur="7.4s"
              repeatCount="indefinite"
              path="M80 148 A52 64 0 1 0 79.9 148"
            />
          </circle>
        </svg>
        {/* Thermal core */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="w-8 h-8 rounded-full animate-pulse-glow"
            style={{
              background:
                "radial-gradient(circle, #fbbf24 0%, #fb7185 40%, rgba(99,102,241,0.5) 75%, transparent 100%)",
              filter: "blur(2px)",
            }}
          />
        </div>
      </div>

      {/* Telemetry readout */}
      <div className="flex flex-col items-center gap-2 relative z-10">
        <p className="text-sm text-text-secondary">{message}</p>
        <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-text-muted">
          machine at work
          <span className="animate-blink text-wire ml-1">▍</span>
        </p>
      </div>
    </div>
  );
}

/* ─── Metric Card ─── */
export function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="relative bg-bg-elevated rounded-lg border border-border p-3.5 shadow-card">
      <HudCorners tone="wire" />
      <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1.5 font-mono">
        {label}
      </p>
      <p className="text-lg font-bold font-mono text-text tracking-tight">
        {value}
      </p>
      {sub && (
        <p className="text-[10.5px] text-text-secondary mt-1">{sub}</p>
      )}
    </div>
  );
}

/* ─── Primary Button ─── */
export function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
        bg-gradient-to-r from-accent to-purple-500
        text-white text-sm font-semibold
        shadow-lg shadow-accent/25
        hover:shadow-xl hover:shadow-accent/35
        hover:-translate-y-px active:translate-y-0
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0
        transition-all duration-200"
    >
      {children}
    </button>
  );
}

/* ─── Section Label ─── */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-text-muted mb-3 font-mono font-medium">
      <span className="w-1 h-1 bg-wire/60 rotate-45 flex-shrink-0" />
      {children}
    </h3>
  );
}
