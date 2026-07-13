/**
 * LandingPage — "the meeting point between human decision-making and
 * machine intelligence."
 *
 * Visual direction (from the approved reference): a dark, minimal,
 * futuristic surface built on a wireframe + thermal visual language.
 * The hero recreates the reference image — a wireframe machine hand
 * reaching toward a thermal-imaged human hand, fingertips almost
 * touching, a spark of light at the gap. The same duality carries
 * through the page: wireframe geometry, mono telemetry and glowing
 * connections stand for the machine; thermal color and serif italics
 * stand for the human.
 *
 * The page is a spatial, cinematic experience built from CSS 3D
 * transforms and SVG (no WebGL): the hands glide toward each other on
 * load, separate as you scroll, and tilt in depth with the cursor;
 * energy particles travel the connection arcs; sections rise and unfold
 * from depth as they enter the viewport; cards lean toward the cursor;
 * pipeline connectors carry traveling light pulses. Motion stays
 * restrained and honors prefers-reduced-motion throughout.
 *
 * All product functionality is preserved: primary buttons load the
 * sample dataset (onLoadSample); ghost buttons open the file picker;
 * and the whole page accepts drag-and-drop uploads (onUpload) for
 * .csv, .tsv and .xlsx files.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { LogoMark } from "../shared";

const GITHUB_URL = "https://github.com/grace056056/insight-copilot";

const ACCEPTED_EXTENSIONS = [".csv", ".tsv", ".xlsx"];

/* Grain texture — SVG fractal noise as a self-contained data URI. */
const GRAIN_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/* ─── Interactive evidence claim datasets ─── */

type Claim = {
  text: React.ReactNode;
  evidence: [string, string, string, boolean][]; // metric, value, unit, highlighted
  srcCols: [string, string, string];
  source: [string, string, string, boolean][]; // a, b, c, highlighted
  srcFile: string;
  matchRows: string;
  code: string;
};

const claims: Claim[] = [
  {
    text: (
      <>
        Repeat buyers generate <b>81.9%</b> of total revenue — they spend{" "}
        <b>4.0×</b> more than one-time buyers.
      </>
    ),
    evidence: [
      ["repeat_rev_share", "81.9", "%", true],
      ["spend_multiplier", "4.02", "×", false],
      ["repeat_customers", "731", "n", false],
      ["onetime_customers", "641", "n", false],
    ],
    srcCols: ["segment", "customers", "revenue"],
    source: [
      ["Repeat", "731", "$1.97M", true],
      ["One-time", "641", "$0.44M", false],
      ["— total —", "1,372", "$2.41M", false],
    ],
    srcFile: "orders.csv",
    matchRows: "1,372",
    code: "df.groupby('is_repeat')['revenue'].sum()",
  },
  {
    text: (
      <>
        <b>Clothing</b> leads at <b>43.2%</b> revenue share while Beauty trails
        at <b>13.7%</b>.
      </>
    ),
    evidence: [
      ["clothing_share", "43.2", "%", true],
      ["electronics_share", "28.6", "%", false],
      ["home_share", "14.5", "%", false],
      ["beauty_share", "13.7", "%", false],
    ],
    srcCols: ["category", "orders", "revenue"],
    source: [
      ["Clothing", "9,842", "$1.04M", true],
      ["Electronics", "5,110", "$689K", false],
      ["Beauty", "3,704", "$330K", false],
    ],
    srcFile: "orders.csv",
    matchRows: "22,410",
    code: "df.groupby('category')['revenue'].sum()",
  },
  {
    text: (
      <>
        Revenue peaked at <b>$28.1k</b> in March, then declined <b>12.4%</b> in
        April.
      </>
    ),
    evidence: [
      ["march_revenue", "28.1", "$k", true],
      ["april_revenue", "24.6", "$k", false],
      ["mom_change", "-12.4", "%", true],
      ["months", "4", "n", false],
    ],
    srcCols: ["month", "orders", "revenue"],
    source: [
      ["March", "1,204", "$28.1K", true],
      ["April", "1,058", "$24.6K", true],
      ["May", "1,142", "$26.9K", false],
    ],
    srcFile: "orders.csv",
    matchRows: "3,404",
    code: "df.resample('M')['revenue'].sum().pct_change()",
  },
];

/* ─── Pipeline nodes & feature cards ─── */

const pipelineNodes = [
  { idx: "01", label: "Upload", caption: "csv · tsv · xlsx", glyph: "↑", color: "#818cf8", rgb: "129,140,248" },
  { idx: "02", label: "Profile", caption: "column statistics", glyph: "▤", color: "#38bdf8", rgb: "56,189,248" },
  { idx: "03", label: "Classify", caption: "semantic roles", glyph: "◈", color: "#a78bfa", rgb: "167,139,250" },
  { idx: "04", label: "Compute", caption: "pandas evidence", glyph: "∑", color: "#34d399", rgb: "52,211,153" },
  { idx: "05", label: "Narrate", caption: "AI insights", glyph: "sparkle", color: "#fbbf24", rgb: "251,191,36" },
];

const featureCards = [
  { glyph: "▦", title: "Semantic Profiling", body: "Detects column types and assigns business roles — revenue, customer_id, category, date.", color: "#818cf8", rgb: "129,140,248" },
  { glyph: "▤", title: "Deterministic Evidence", body: "Five analysis templates compute exact numbers with pandas — never hallucinated.", color: "#34d399", rgb: "52,211,153" },
  { glyph: "⚡", title: "AI-Powered Narratives", body: "An AI narrator reads the computed evidence and writes the story — it can't invent the numbers.", color: "#fbbf24", rgb: "251,191,36" },
  { glyph: "◆", title: "Evidence-Linked Trust", body: "Every insight links to the exact computation, source table, and pandas-verified numbers.", color: "#22d3ee", rgb: "34,211,238" },
];

/* ─── Inline icons ─── */

const I = {
  lightning: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  upload: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
  link: "M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244",
  shield: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  check: "M9 12.75L11.25 15 15 9.75",
  sparkle: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
  rows: "M3.75 9h16.5m-16.5 6.75h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75zM5.625 15.75h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z",
  arrow: "M4 12h15m0 0l-5.5-5.5M19 12l-5.5 5.5",
};

function Ico({ d, size = 16, stroke = "currentColor", sw = 1.6, fill = "none", cls }: {
  d: string; size?: number; stroke?: string; sw?: number; fill?: string; cls?: string;
}) {
  return (
    <svg className={cls} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function GithubGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.72-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 015.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.68.8.56A11.51 11.51 0 0023.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}

/* ─── The hands scene ───
   A stylized recreation of the reference: on the left, a machine hand
   drawn as a wireframe mesh; on the right, a human hand rendered in
   thermal-imaging color; between them, the spark where they nearly
   touch. Parallax offsets are passed in from the hero's mouse tracker. */

const MACHINE_HAND =
  "M10 178 C80 162, 170 152, 238 158 C310 166, 380 184, 424 196 C436 200, 436 211, 423 213 C372 210, 306 206, 256 210 C312 218, 362 226, 392 236 C401 241, 398 251, 386 250 C344 244, 296 236, 254 232 C296 242, 330 252, 350 262 C357 268, 352 277, 341 274 C306 264, 270 254, 244 250 C272 262, 292 272, 302 282 C307 289, 299 296, 289 292 C254 278, 216 270, 182 268 C130 268, 66 268, 10 262 Z";

const HUMAN_HAND =
  "M880 118 C806 128, 734 148, 678 174 C616 190, 532 200, 474 205 C463 207, 463 219, 475 220 C532 219, 606 215, 656 217 C625 234, 604 247, 597 259 C595 268, 604 272, 613 266 C636 250, 659 237, 680 230 C657 251, 644 266, 642 277 C642 285, 652 287, 659 281 C678 262, 699 247, 718 238 C703 259, 696 272, 699 280 C702 288, 712 288, 718 280 C732 259, 751 242, 772 231 C806 214, 846 202, 880 198 Z";

const ARC_TOP = "M300 130 C400 96, 520 100, 630 132";
const ARC_BOTTOM = "M290 300 C400 336, 520 332, 640 296";

function HandsScene({
  px = 0,
  py = 0,
  spread = 0,
  energy = 1,
  slow = false,
  compact = false,
}: {
  px?: number;
  py?: number;
  /** 0 = fingertips nearly touching, 1 = hands pulled apart */
  spread?: number;
  /** 0..1 — intensity of the spark and connection arcs */
  energy?: number;
  /** true during the opening approach — hands glide, not snap */
  slow?: boolean;
  compact?: boolean;
}) {
  const handTransition = slow
    ? "transform 3s cubic-bezier(0.22, 1, 0.36, 1)"
    : "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)";
  return (
    <div
      className="hands-scene"
      style={compact ? { maxWidth: 460, margin: "0 auto" } : undefined}
    >
      <svg
        viewBox="0 0 900 400"
        fill="none"
        style={{ width: "100%", height: "auto", overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          {/* Wireframe mesh pattern for the machine hand */}
          <pattern id="hs-mesh" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(6)">
            <path d="M15 0H0V15" fill="none" stroke="rgba(165,196,253,0.55)" strokeWidth="0.7" />
          </pattern>
          {/* Thermal body gradient for the human hand */}
          <linearGradient id="hs-thermal-base" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="42%" stopColor="#6d28d9" />
            <stop offset="100%" stopColor="#a21caf" />
          </linearGradient>
          <clipPath id="hs-human-clip">
            <path d={HUMAN_HAND} />
          </clipPath>
          <radialGradient id="hs-spark" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="30%" stopColor="#fef3c7" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#818cf8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Connection arcs between the two hands — data flowing both ways.
            Brightness follows energy: as the fingertips close, the link wakes. */}
        <g className="hs-arcs" style={{ opacity: 0.25 + energy * 0.55, transition: "opacity 0.8s ease" }}>
          <path
            d={ARC_TOP}
            stroke="rgba(99,102,241,0.35)"
            strokeWidth="1"
            strokeDasharray="3 9"
            className="animate-dash"
          />
          <path
            d={ARC_BOTTOM}
            stroke="rgba(34,211,238,0.28)"
            strokeWidth="1"
            strokeDasharray="3 9"
            className="animate-dash"
          />
          {/* Energy particles traveling the arcs */}
          <circle r="2" fill="#a5b4fc" style={{ filter: "drop-shadow(0 0 4px #818cf8)" }}>
            <animateMotion dur="3.6s" repeatCount="indefinite" path={ARC_TOP} />
          </circle>
          <circle r="1.6" fill="#67e8f9" style={{ filter: "drop-shadow(0 0 4px #22d3ee)" }}>
            <animateMotion dur="4.4s" repeatCount="indefinite" path={ARC_BOTTOM} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
          </circle>
          <circle r="1.3" fill="#fbbf24" style={{ filter: "drop-shadow(0 0 4px #fbbf24)" }}>
            <animateMotion dur="5.2s" repeatCount="indefinite" begin="1.4s" path={ARC_TOP} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
          </circle>
        </g>

        {/* ── Machine hand (wireframe) — reaches from the left ── */}
        <g
          style={{
            transform: `translate(${px * -7 - spread * 52}px, ${py * -5}px)`,
            transition: handTransition,
          }}
        >
          <path d={MACHINE_HAND} fill="rgba(23,37,84,0.35)" />
          <path d={MACHINE_HAND} fill="url(#hs-mesh)" />
          {/* Inner contour lines — pseudo 3D mesh depth */}
          <path
            d={MACHINE_HAND}
            fill="none"
            stroke="rgba(147,197,253,0.35)"
            strokeWidth="0.8"
            transform="translate(218 214) scale(0.92) translate(-218 -214)"
          />
          <path
            d={MACHINE_HAND}
            fill="none"
            stroke="rgba(147,197,253,0.22)"
            strokeWidth="0.8"
            transform="translate(218 214) scale(0.8) translate(-218 -214)"
          />
          {/* Outline glow */}
          <path
            d={MACHINE_HAND}
            fill="none"
            stroke="#bfdbfe"
            strokeWidth="1.4"
            style={{ filter: "drop-shadow(0 0 6px rgba(147,197,253,0.65))" }}
          />
        </g>

        {/* ── Human hand (thermal) — reaches from the right ── */}
        <g
          style={{
            transform: `translate(${px * 7 + spread * 52}px, ${py * 5}px)`,
            transition: handTransition,
          }}
        >
          <path
            d={HUMAN_HAND}
            fill="url(#hs-thermal-base)"
            style={{ filter: "drop-shadow(0 0 10px rgba(124,58,237,0.5))" }}
          />
          {/* Thermal hotspots, clipped to the hand silhouette */}
          <g clipPath="url(#hs-human-clip)">
            <ellipse cx="700" cy="205" rx="150" ry="52" fill="rgba(249,115,22,0.75)" style={{ filter: "blur(26px)" }} />
            <ellipse cx="760" cy="195" rx="80" ry="30" fill="rgba(250,204,21,0.85)" style={{ filter: "blur(18px)" }} />
            <ellipse cx="545" cy="212" rx="70" ry="16" fill="rgba(244,114,182,0.55)" style={{ filter: "blur(14px)" }} />
            <ellipse cx="655" cy="255" rx="60" ry="24" fill="rgba(217,70,239,0.5)" style={{ filter: "blur(16px)" }} />
          </g>
          {/* Cold edge highlight */}
          <path
            d={HUMAN_HAND}
            fill="none"
            stroke="rgba(96,165,250,0.9)"
            strokeWidth="1.3"
            style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.6))" }}
          />
        </g>

        {/* ── The spark — where machine meets human.
              It surges as the fingertips close and dims as they part. ── */}
        <g
          className="animate-pulse-glow"
          style={{
            transform: `translate(${px * 2}px, ${py * 2}px)`,
            transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <g
            style={{
              opacity: 0.25 + energy * 0.75,
              transform: `scale(${0.7 + energy * 0.4})`,
              transformOrigin: "452px 211px",
              transition: "opacity 1.2s ease, transform 1.2s ease",
            }}
          >
            <circle cx="452" cy="211" r="34" fill="url(#hs-spark)" />
            <circle cx="452" cy="211" r="2.4" fill="#ffffff" />
            <path d="M452 195v-9M452 227v9M436 211h-9M468 211h9" stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeLinecap="round" />
            {/* Expanding contact ripple */}
            <circle cx="452" cy="211" fill="none" stroke="rgba(165,180,252,0.5)" strokeWidth="1">
              <animate attributeName="r" values="4;30" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="2.6s" repeatCount="indefinite" />
            </circle>
          </g>
        </g>
      </svg>
    </div>
  );
}

/* ─── Component ─── */

export function LandingPage({
  onLoadSample,
  onUpload,
}: {
  onLoadSample: () => void;
  onUpload: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const openFilePicker = () => fileRef.current?.click();

  const pageRef = useRef<HTMLDivElement>(null);
  const secRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [claim, setClaim] = useState(0);

  /* Scroll tracking: right-rail dots + hero scroll progress (0..1).
     heroT drives the hands' separation and the hero's depth recession,
     so scrolling physically pulls the meeting point apart. */
  const [heroT, setHeroT] = useState(0);
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const onScroll = () => {
      const mid = page.scrollTop + page.clientHeight / 2;
      let idx = 0;
      secRefs.current.forEach((el, i) => {
        if (el && el.offsetTop <= mid) idx = i;
      });
      setActive(idx);
      setHeroT(Math.min(page.scrollTop / (page.clientHeight * 0.85), 1));
    };
    onScroll();
    page.addEventListener("scroll", onScroll, { passive: true });
    return () => page.removeEventListener("scroll", onScroll);
  }, []);

  /* Reveal-on-scroll: elements marked .rv rise and unfold from depth
     the first time they enter the viewport. */
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const els = Array.from(page.querySelectorAll<HTMLElement>(".rv"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.18 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  /* Opening shot: the hands start apart and glide toward each other over
     ~3s, then motion control hands off to cursor + scroll. */
  const [arrived, setArrived] = useState(false);
  const [approachDone, setApproachDone] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setArrived(true);
      setApproachDone(true);
      return;
    }
    const t1 = window.setTimeout(() => setArrived(true), 350);
    const t2 = window.setTimeout(() => setApproachDone(true), 3600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const goTo = useCallback((i: number) => {
    const el = secRefs.current[i];
    const page = pageRef.current;
    if (el && page) page.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  }, []);

  /* ── Restrained mouse parallax on the hero scene ── */
  const [par, setPar] = useState({ x: 0, y: 0 });
  const reducedMotion = useRef(false);
  useEffect(() => {
    reducedMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);
  const onHeroMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (reducedMotion.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPar({
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
    });
  }, []);
  const onHeroLeave = useCallback(() => setPar({ x: 0, y: 0 }), []);

  /* 3D hover tilt for landing cards/panels — leans toward the cursor. */
  const tiltMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (reducedMotion.current) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${(x * 5).toFixed(2)}deg) rotateX(${(-y * 4).toFixed(2)}deg) translateZ(10px)`;
  }, []);
  const tiltLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = "";
  }, []);

  /* ── Page-level drag & drop upload ── */
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const isAccepted = (name: string) =>
    ACCEPTED_EXTENSIONS.some((ext) => name.toLowerCase().endsWith(ext));

  const onDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  }, []);
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f && isAccepted(f.name)) onUpload(f);
    },
    [onUpload]
  );

  const c = claims[claim];

  return (
    <div
      className="flp"
      ref={pageRef}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <style>{CSS}</style>

      {/* Ambient background layers */}
      <div className="bg-glows">
        <div className="orb o1 animate-drift" />
        <div className="orb o2 animate-drift" style={{ animationDelay: "-5s" }} />
      </div>
      <div className="bg-gridfloor" />
      <div className="grain" style={{ backgroundImage: `url("${GRAIN_URI}")` }} />

      {/* Shared file input for every Upload Data File button */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv,.xlsx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }}
        className="hidden"
      />

      {/* Drag & drop overlay */}
      {dragging && (
        <div className="dropzone">
          <div className="drop-frame">
            <i className="dc tl" /><i className="dc tr" /><i className="dc bl" /><i className="dc br" />
            <Ico d={I.upload} size={30} stroke="#22d3ee" sw={1.4} />
            <p className="drop-title">Release to analyze</p>
            <p className="drop-sub mono">.csv · .tsv · .xlsx</p>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="brand">
          <span className="logo">
            <LogoMark size={23} variant="full" />
          </span>
          <span className="wordmark">
            <b>Insight</b>
            <span className="sec2">Copilot</span>
          </span>
        </div>
        <div className="navlinks">
          <span className="navlink">Product</span>
          <span className="navlink" onClick={() => goTo(1)}>Pipeline</span>
          <span className="navlink" onClick={() => goTo(2)}>Evidence</span>
          <span className="navlink">Docs</span>
          <span className="navlink">Pricing</span>
        </div>
        <div className="navright">
          <span className="signin">Sign in</span>
          <a className="navlink githublink" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
            <GithubGlyph />
            GitHub
          </a>
          <button className="btn btn-pri btn-sm" onClick={onLoadSample}>Try Sample Dataset</button>
        </div>
      </nav>

      {/* ── Scroll dots ── */}
      <div className="dots">
        {[0, 1, 2, 3].map((i) => (
          <button
            key={i}
            className={`dot ${active === i ? "on" : ""}`}
            onClick={() => goTo(i)}
            aria-label={`Go to section ${i + 1}`}
          />
        ))}
      </div>

      {/* ══════════ SECTION 1 · HERO ══════════ */}
      <section
        className="sec hero"
        ref={(el) => { secRefs.current[0] = el; }}
        onMouseMove={onHeroMove}
        onMouseLeave={onHeroLeave}
      >
        <div className="wrap hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">
              <span className="dotp" />
              where human decision meets machine intelligence
            </span>
            <h1 className="h1">
              Business insights<br />you can <span className="grad">verify</span>
            </h1>
            <p className="sub">
              Upload a sales file. The machine computes exact evidence with
              pandas; the AI only writes the story. You make the call.
            </p>
            <div className="cta-row">
              <button className="btn btn-pri btn-lg icon-btn" onClick={onLoadSample}>
                <Ico d={I.lightning} sw={2} /> Try Sample Dataset
              </button>
              <button className="btn btn-ghost btn-lg icon-btn" onClick={openFilePicker}>
                <Ico d={I.upload} /> Upload Data File
              </button>
            </div>
            <p className="drop-hint mono">
              or drop a <b>.csv</b> / <b>.tsv</b> / <b>.xlsx</b> anywhere on this page
            </p>
            <div className="trust">
              <div className="trust-i"><Ico d={I.lightning} size={12} /> Deterministic computations</div>
              <div className="trust-i"><Ico d={I.link} size={12} /> Source-backed evidence</div>
              <div className="trust-i"><Ico d={I.shield} size={12} /> AI-written narrative</div>
            </div>
          </div>

          {/* The meeting point — a layered 3D stage. The whole scene tilts
              toward the cursor; scrolling pulls the hands apart and recedes
              the stage into depth. */}
          <div
            className="hero-scene"
            style={{
              transform: `translateY(${heroT * 60}px) scale(${1 - heroT * 0.08})`,
              opacity: 1 - heroT * 0.45,
            }}
          >
            {/* Floating wireframe satellites at different parallax depths */}
            <div className="fl-el fl-ring" style={{ transform: `translate(${par.x * -16}px, ${par.y * -12}px)` }}>
              <svg viewBox="0 0 64 64" fill="none" className="animate-spin-slower" style={{ width: "100%", height: "100%" }}>
                <ellipse cx="32" cy="32" rx="28" ry="10" stroke="rgba(129,140,248,0.4)" strokeWidth="1" strokeDasharray="3 4" />
                <ellipse cx="32" cy="32" rx="10" ry="28" stroke="rgba(34,211,238,0.3)" strokeWidth="1" strokeDasharray="3 4" />
              </svg>
            </div>
            <div className="fl-el fl-hex animate-drift" style={{ transform: `translate(${par.x * 12}px, ${par.y * 10}px)` }}>
              <svg viewBox="0 0 40 40" fill="none" className="animate-spin-slow" style={{ width: "100%", height: "100%" }}>
                <path d="M20 3l14 8v18l-14 8-14-8V11z" stroke="rgba(251,191,36,0.4)" strokeWidth="1" />
                <path d="M20 11l7 4v10l-7 4-7-4V15z" stroke="rgba(251,113,133,0.35)" strokeWidth="0.8" />
              </svg>
            </div>
            <div className="fl-el fl-orb animate-drift" style={{ animationDelay: "-4s" }} />

            <div
              style={{
                transform: `perspective(1100px) rotateY(${(par.x * 5).toFixed(2)}deg) rotateX(${(-par.y * 4).toFixed(2)}deg)`,
                transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)",
                transformStyle: "preserve-3d",
              }}
            >
              <HandsScene
                px={par.x}
                py={par.y}
                spread={arrived ? heroT : 1}
                energy={arrived ? 1 - heroT : 0}
                slow={!approachDone}
              />
            </div>
            <div className="scene-labels mono">
              <span className="sl sl-machine">machine · wireframe</span>
              <span className="sl sl-human">human · thermal</span>
            </div>
          </div>
        </div>

        {/* Dust field — slow drifting particles at varied depths */}
        <div className="dust" aria-hidden="true">
          {Array.from({ length: 26 }, (_, i) => (
            <span
              key={i}
              className="dp"
              style={{
                left: `${(i * 37 + 11) % 100}%`,
                top: `${(i * 53 + 7) % 100}%`,
                width: 1 + (i % 3),
                height: 1 + (i % 3),
                opacity: 0.12 + ((i * 17) % 40) / 100,
                animationDelay: `${-((i * 29) % 110) / 10}s`,
                animationDuration: `${9 + ((i * 13) % 70) / 10}s`,
                transform: `translate(${par.x * (4 + (i % 5) * 3)}px, ${par.y * (3 + (i % 4) * 3)}px)`,
              }}
            />
          ))}
        </div>
      </section>

      {/* ══════════ SECTION 2 · PIPELINE ══════════ */}
      <section className="sec" ref={(el) => { secRefs.current[1] = el; }}>
        <div className="wrap">
          <div className="sec-head rv">
            <div className="kicker">Pipeline</div>
            <h2 className="sec-title">From raw data to verified insight</h2>
            <p className="sec-sub">A deterministic pipeline computes every number before AI writes the story.</p>
          </div>
          <div className="pipe rv">
            {pipelineNodes.map((n) => (
              <div className="pnode" key={n.idx}>
                <div className="idx mono">{n.idx}</div>
                <div
                  className="pico"
                  style={{
                    borderColor: `rgba(${n.rgb},.35)`,
                    color: n.color,
                    background: `rgba(${n.rgb},.07)`,
                    boxShadow: `0 0 18px -6px rgba(${n.rgb},.45)`,
                  }}
                >
                  {n.glyph === "sparkle" ? <Ico d={I.sparkle} size={18} sw={1.5} /> : n.glyph}
                </div>
                <h3>{n.label}</h3>
                <p>{n.caption}</p>
              </div>
            ))}
          </div>
          <div className="cards">
            {featureCards.map((f) => (
              <div className="card rv" key={f.title} onMouseMove={tiltMove} onMouseLeave={tiltLeave}>
                <i className="cc tl" /><i className="cc tr" /><i className="cc bl" /><i className="cc br" />
                <div
                  className="ic"
                  style={{ borderColor: `rgba(${f.rgb},.25)`, color: f.color, background: `rgba(${f.rgb},.08)` }}
                >
                  {f.glyph}
                </div>
                <h4>{f.title}</h4>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 3 · EVIDENCE ══════════ */}
      <section className="sec" ref={(el) => { secRefs.current[2] = el; }}>
        <div className="wrap">
          <div className="sec-head rv">
            <div className="kicker">Evidence-first</div>
            <h2 className="sec-title">Click any claim, see the proof</h2>
            <p className="sec-sub">The AI writes the narrative. Pandas computes the numbers. Every insight traces back to source data.</p>
          </div>
          <div className="ev-loop">
            {/* AI-written insight */}
            <div className="panel ev-insight rv" onMouseMove={tiltMove} onMouseLeave={tiltLeave}>
              <div className="panel-h" style={{ color: "#818cf8" }}>
                <Ico d={I.sparkle} size={13} /> AI-written insight
              </div>
              {claims.map((cl, i) => (
                <div className={`claim ${claim === i ? "on" : ""}`} key={i} onClick={() => setClaim(i)}>
                  <p>{cl.text}</p>
                </div>
              ))}
            </div>

            {/* Verify connector */}
            <div className="harrow">
              <span className="hline" />
              <span className="hpill"><Ico d={I.check} size={12} stroke="#34d399" sw={2.5} /> Verify</span>
              <svg className="harw" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d={I.arrow} />
              </svg>
            </div>

            {/* pandas evidence */}
            <div className="panel ev-evidence rv">
              <div className="panel-h" style={{ color: "#10b981" }}>pandas evidence</div>
              <div className="etable">
                <div className="ehd"><div>metric</div><div>value</div><div>unit</div></div>
                {c.evidence.map((e, i) => (
                  <div className={`erow ${e[3] ? "on" : ""}`} key={i}>
                    <div>{e[0]}</div><div>{e[1]}</div><div>{e[2]}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Arrow connector */}
            <div className="harrow">
              <span className="hline hline2" />
              <svg className="harw" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d={I.arrow} />
              </svg>
            </div>

            {/* source rows */}
            <div className="panel ev-source rv" onMouseMove={tiltMove} onMouseLeave={tiltLeave}>
              <div className="panel-h" style={{ color: "#7b8ba2" }}>
                <Ico d={I.rows} size={13} /> source rows · {c.srcFile}
              </div>
              <div className="stable">
                <div className="shd"><div>{c.srcCols[0]}</div><div>{c.srcCols[1]}</div><div>{c.srcCols[2]}</div></div>
                {c.source.map((r, i) => (
                  <div className={`srow ${r[3] ? "on" : ""}`} key={i}>
                    <div>{r[0]}</div><div>{r[1]}</div><div>{r[2]}</div>
                  </div>
                ))}
              </div>
              <div className="src-foot mono">
                <Ico d={I.link} size={12} /> <span><b>{c.matchRows}</b> matching rows</span>
              </div>
            </div>
          </div>

          {/* Lineage */}
          <div className="lineage rv">
            <div className="ln-node"><span className="ln-dot" style={{ background: "#818cf8" }} />Insight</div>
            <span className="ln-conn" />
            <div className="ln-node code mono">{c.code}</div>
            <span className="ln-conn" />
            <div className="ln-node"><span className="ln-dot" style={{ background: "#7b8ba2" }} />{c.srcFile}</div>
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 4 · FINAL CTA ══════════ */}
      <section className="sec cta-sec" ref={(el) => { secRefs.current[3] = el; }}>
        <div className="wrap cta-card rv">
          <div className="cta-scene">
            <HandsScene compact />
          </div>
          <h2 className="cta-h">Insights you can<br />defend in the room</h2>
          <p className="cta-sub">Try the sample dataset, then inspect the evidence behind every insight.</p>
          <div className="cta-row" style={{ justifyContent: "center", marginTop: 36 }}>
            <button className="btn btn-pri btn-lg icon-btn" onClick={onLoadSample}>
              <Ico d={I.lightning} sw={2} /> Try Sample Dataset
            </button>
            <button className="btn btn-ghost btn-lg icon-btn" onClick={openFilePicker}>
              <Ico d={I.upload} /> Upload Data File
            </button>
            <a className="btn btn-ghost btn-lg icon-btn" href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
              <GithubGlyph size={16} /> View GitHub
            </a>
          </div>
        </div>
        <div className="footer">
          {/* Full brand lockup — the mark at a size where its detail reads */}
          <div className="footer-brand">
            <LogoMark size={34} variant="full" />
            <span className="fb-word">
              <b>Insight</b> <span>Copilot</span>
            </span>
            <span className="fb-tag serif-it">where human decision meets machine intelligence</span>
          </div>
          <div className="footer-links">
            <a href="#">Privacy</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="#">Docs</a>
          </div>
          <div>Built by Tongyu Wu · Data Science @ UC Irvine · 2026</div>
        </div>
      </section>
    </div>
  );
}

/* ─── Scoped design CSS ─── */

const CSS = `
.flp{position:relative;height:100%;overflow-y:auto;overflow-x:hidden;background:#04070d;scroll-behavior:smooth;scroll-snap-type:y proximity}
.flp::-webkit-scrollbar{width:0}
.flp *{box-sizing:border-box}
.flp .hidden{display:none}
.flp .mono{font-family:'JetBrains Mono',monospace}
.flp a{color:#818cf8;text-decoration:none}
.flp a:hover{color:#a5b4fc}

/* ── Ambient layers ── */
.flp .grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.035;mix-blend-mode:screen;background-size:180px 180px;background-repeat:repeat;filter:grayscale(1) contrast(1.8) brightness(1.1)}
.flp .bg-glows{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.flp .orb{position:absolute;border-radius:50%;filter:blur(130px)}
.flp .orb.o1{width:600px;height:500px;background:rgba(67,56,202,.22);top:-180px;left:-140px}
.flp .orb.o2{width:540px;height:480px;background:rgba(124,58,237,.16);top:22%;right:-160px}
.flp .bg-gridfloor{position:fixed;left:-10%;right:-10%;bottom:-8%;height:46%;z-index:0;pointer-events:none;background-image:linear-gradient(rgba(99,102,241,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.10) 1px,transparent 1px);background-size:52px 52px;transform:perspective(620px) rotateX(63deg);transform-origin:50% 100%;-webkit-mask-image:linear-gradient(180deg,transparent,rgba(0,0,0,.8) 55%,#000);mask-image:linear-gradient(180deg,transparent,rgba(0,0,0,.8) 55%,#000);opacity:.5}

/* ── Drag & drop overlay ── */
.flp .dropzone{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:rgba(4,7,13,.82);backdrop-filter:blur(6px)}
.flp .drop-frame{position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;padding:56px 88px;border:1px dashed rgba(34,211,238,.45);border-radius:18px;background:rgba(34,211,238,.04);box-shadow:0 0 60px -18px rgba(34,211,238,.5)}
.flp .dc{position:absolute;width:14px;height:14px;border:0 solid rgba(34,211,238,.9)}
.flp .dc.tl{top:-1px;left:-1px;border-top-width:2px;border-left-width:2px}
.flp .dc.tr{top:-1px;right:-1px;border-top-width:2px;border-right-width:2px}
.flp .dc.bl{bottom:-1px;left:-1px;border-bottom-width:2px;border-left-width:2px}
.flp .dc.br{bottom:-1px;right:-1px;border-bottom-width:2px;border-right-width:2px}
.flp .drop-title{margin:4px 0 0;font-family:'Bricolage Grotesque',sans-serif;font-size:22px;font-weight:600;color:#dce5f5;letter-spacing:-.01em}
.flp .drop-sub{font-size:11px;color:#22d3ee;letter-spacing:.18em}

/* ── Nav ── */
.flp .nav{position:sticky;top:0;height:56px;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:rgba(4,7,13,.8);backdrop-filter:blur(14px);border-bottom:1px solid #1a2440;gap:16px}
.flp .brand{display:flex;align-items:center;gap:12px;white-space:nowrap;font-family:'Bricolage Grotesque',sans-serif}
.flp .brand .wordmark{display:flex;align-items:baseline;font-size:15.5px;letter-spacing:-.015em}
.flp .brand .wordmark b{font-weight:700;color:#f2f5fb}
.flp .brand .sec2{font-weight:500;color:#8195b3;margin-left:5px}
.flp .logo{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#141b33,#0c1223);border:1px solid #263455;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 0 16px rgba(99,102,241,.14),inset 0 1px 0 rgba(255,255,255,.05)}
.flp .navlinks{display:flex;gap:2px;font-size:13px;color:#8195b3;font-weight:500;align-items:center}
.flp .navlink{cursor:pointer;transition:color .15s,background .15s;padding:6px 10px;border-radius:8px;white-space:nowrap;color:#8195b3;display:inline-flex;align-items:center;gap:5px}
.flp .navlink:hover{color:#dce5f5;background:rgba(255,255,255,.04)}
.flp .githublink{margin-right:4px}
.flp .navright{display:flex;align-items:center;gap:4px}
.flp .signin{font-size:13px;color:#8195b3;font-weight:500;cursor:pointer;padding:6px 10px;border-radius:8px;transition:color .15s;white-space:nowrap}
.flp .signin:hover{color:#dce5f5}

/* ── Buttons ── */
.flp .btn{border:0;cursor:pointer;font-family:inherit;font-weight:600;border-radius:10px;transition:transform .12s,box-shadow .2s,background .2s,border-color .2s;white-space:nowrap}
.flp .btn.icon-btn{display:inline-flex;align-items:center;gap:9px}
.flp .btn-pri{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 6px 22px -8px rgba(99,102,241,.55)}
.flp .btn-pri:hover{transform:translateY(-1px);box-shadow:0 10px 30px -8px rgba(99,102,241,.75)}
.flp .btn-ghost{background:#0a1020;color:#dce5f5;border:1px solid #1a2440}
.flp .btn-ghost:hover{background:#101830;border-color:#263455;box-shadow:0 0 18px -8px rgba(34,211,238,.4)}
.flp .btn-sm{padding:7px 16px;font-size:13px}
.flp .btn-lg{padding:13px 28px;font-size:14.5px}

/* ── Scroll dots ── */
.flp .dots{position:fixed;right:22px;top:50%;transform:translateY(-50%);z-index:50;display:flex;flex-direction:column;gap:12px}
.flp .dot{width:7px;height:7px;border-radius:50%;background:#1e2a48;cursor:pointer;transition:all .2s;border:1px solid #263455;padding:0}
.flp .dot.on{background:#6366f1;border-color:#818cf8;box-shadow:0 0 0 4px rgba(99,102,241,.18),0 0 10px rgba(99,102,241,.6);transform:scale(1.15)}

/* ── Sections ── */
.flp .sec{position:relative;z-index:1;min-height:calc(100vh - 56px);scroll-snap-align:start;display:flex;flex-direction:column;justify-content:center;padding:56px;overflow:hidden}
.flp .wrap{width:100%;max-width:1240px;margin:0 auto}

/* ── Hero ── */
.flp .hero-inner{display:flex;gap:48px;align-items:center;justify-content:center}
.flp .hero-copy{flex:1;min-width:0;max-width:560px}
.flp .hero-scene{flex:1.1;min-width:0;position:relative}
.flp .scene-labels{position:absolute;inset:auto 0 -6px 0;display:flex;justify-content:space-between;padding:0 6%}
.flp .sl{font-size:9px;letter-spacing:.22em;text-transform:uppercase}
.flp .sl-machine{color:rgba(147,197,253,.65)}
.flp .sl-human{color:rgba(251,146,60,.7)}
.flp .eyebrow{display:inline-flex;align-items:center;gap:9px;padding:6px 14px;border-radius:100px;border:1px solid #1a2440;background:rgba(10,16,32,.7);font-size:13.5px;font-style:italic;font-family:'Instrument Serif',Georgia,serif;font-weight:400;color:#a8b0c4;letter-spacing:.01em}
.flp .eyebrow .dotp{width:6px;height:6px;border-radius:50%;background:#22d3ee;box-shadow:0 0 8px #22d3ee}
.flp .h1{font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(44px,4.6vw,68px);line-height:1.03;font-weight:600;letter-spacing:-.03em;margin:22px 0 0;font-variation-settings:'opsz' 72;color:#dce5f5}
.flp .h1 .grad{background:linear-gradient(100deg,#60a5fa,#a78bfa 40%,#fb7185 75%,#fbbf24);-webkit-background-clip:text;background-clip:text;color:transparent}
.flp .sub{font-size:17px;line-height:1.65;color:#8195b3;margin:22px 0 0;max-width:470px}
.flp .cta-row{display:flex;gap:12px;margin-top:30px;flex-wrap:wrap}
.flp .drop-hint{font-size:10px;color:#56688a;letter-spacing:.08em;margin-top:14px}
.flp .drop-hint b{color:#8195b3;font-weight:500}
.flp .trust{display:flex;flex-wrap:wrap;align-items:center;gap:20px;margin-top:26px}
.flp .trust-i{display:flex;align-items:center;gap:6px;font-size:11px;color:#56688a}
.flp .hands-scene{position:relative;width:100%}
.flp .hero-scene{transition:transform .25s linear,opacity .25s linear}

/* ── Floating wireframe satellites (hero) ── */
.flp .fl-el{position:absolute;pointer-events:none;z-index:2;transition:transform .5s cubic-bezier(.22,1,.36,1)}
.flp .fl-ring{width:84px;height:84px;top:-8%;left:4%}
.flp .fl-hex{width:44px;height:44px;bottom:2%;right:6%}
.flp .fl-orb{width:10px;height:10px;top:14%;right:14%;border-radius:50%;background:radial-gradient(circle at 35% 35%,#fbbf24,#fb7185 60%,transparent);box-shadow:0 0 14px rgba(251,146,60,.65);filter:blur(.4px)}

/* ── Dust field ── */
.flp .dust{position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.flp .dp{position:absolute;border-radius:50%;background:#8ea6d8;animation:flpDust 10s ease-in-out infinite}
@keyframes flpDust{0%,100%{margin-top:0;margin-left:0}33%{margin-top:-22px;margin-left:8px}66%{margin-top:-8px;margin-left:-10px}}

/* ── Reveal from depth on scroll ── */
.flp .rv{opacity:0;transform:perspective(900px) translateY(34px) rotateX(6deg);transition:opacity .7s ease,transform .9s cubic-bezier(.16,1,.3,1)}
.flp .rv.in{opacity:1;transform:none}
.flp .cards .rv:nth-child(2){transition-delay:.07s}
.flp .cards .rv:nth-child(3){transition-delay:.14s}
.flp .cards .rv:nth-child(4){transition-delay:.21s}
.flp .ev-loop .rv:nth-child(3){transition-delay:.1s}
.flp .ev-loop .rv:nth-child(5){transition-delay:.2s}

/* ── Section heads ── */
.flp .sec-head{text-align:center;max-width:640px;margin:0 auto 44px}
.flp .kicker{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:15px;font-weight:400;letter-spacing:.01em;color:#a5b4fc}
.flp .sec-title{font-family:'Bricolage Grotesque',sans-serif;font-size:36px;font-weight:600;letter-spacing:-.02em;line-height:1.15;margin:14px 0 0;font-variation-settings:'opsz' 40;color:#dce5f5}
.flp .sec-sub{font-size:15.5px;color:#8195b3;line-height:1.6;margin:14px 0 0}

/* ── Pipeline ── */
.flp .pipe{display:flex;justify-content:space-between;margin-bottom:44px;position:relative}
.flp .pnode{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;padding:0 6px}
.flp .pnode:not(:last-child)::after{content:"";position:absolute;top:26px;left:58%;right:-42%;height:1px;background:repeating-linear-gradient(90deg,rgba(99,102,241,.55) 0 5px,transparent 5px 11px);animation:flpConn 1.2s linear infinite;box-shadow:0 0 8px rgba(99,102,241,.25)}
@keyframes flpConn{to{background-position:11px 0}}
/* Traveling light pulse along each pipeline connector */
.flp .pnode:not(:last-child)::before{content:"";position:absolute;top:24px;left:58%;width:5px;height:5px;border-radius:50%;background:#c7d2fe;box-shadow:0 0 10px #818cf8;z-index:2;animation:flpPulseDot 2.8s ease-in-out infinite}
.flp .pnode:nth-child(2):not(:last-child)::before{animation-delay:.55s}
.flp .pnode:nth-child(3):not(:last-child)::before{animation-delay:1.1s}
.flp .pnode:nth-child(4):not(:last-child)::before{animation-delay:1.65s}
@keyframes flpPulseDot{0%{left:58%;opacity:0}10%{opacity:1}45%{left:135%;opacity:1}55%,100%{left:135%;opacity:0}}
/* Pipeline nodes hover: rise in depth */
.flp .pico{transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s}
.flp .pnode:hover .pico{transform:translateY(-4px) scale(1.06)}
.flp .pico{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid;position:relative;z-index:1;background:#04070d}
.flp .pnode h3{font-family:'Bricolage Grotesque',sans-serif;font-size:15.5px;font-weight:600;margin:12px 0 3px;color:#dce5f5;letter-spacing:-.01em}
.flp .pnode p{font-size:11px;color:#56688a;margin:0;font-family:'JetBrains Mono',monospace}
.flp .pnode .idx{font-size:9px;color:#56688a;margin-bottom:8px;letter-spacing:.14em}

/* ── Feature cards ── */
.flp .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.flp .card{position:relative;border-radius:12px;border:1px solid #1a2440;background:rgba(255,255,255,.014);padding:18px 16px;transition:transform .2s,border-color .2s,box-shadow .25s}
.flp .card:hover{transform:translateY(-3px);border-color:#263455;box-shadow:0 14px 34px -18px rgba(0,0,0,.7),0 0 24px -12px rgba(99,102,241,.35)}
.flp .cc{position:absolute;width:9px;height:9px;border:0 solid rgba(99,102,241,.45);pointer-events:none}
.flp .cc.tl{top:-1px;left:-1px;border-top-width:1px;border-left-width:1px}
.flp .cc.tr{top:-1px;right:-1px;border-top-width:1px;border-right-width:1px}
.flp .cc.bl{bottom:-1px;left:-1px;border-bottom-width:1px;border-left-width:1px}
.flp .cc.br{bottom:-1px;right:-1px;border-bottom-width:1px;border-right-width:1px}
.flp .card .ic{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;margin-bottom:10px;border:1px solid}
.flp .card h4{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;font-weight:600;margin:0 0 6px;color:#dce5f5;letter-spacing:-.005em}
.flp .card p{font-size:11.5px;color:#8195b3;line-height:1.5;margin:0}

/* ── Evidence loop ── */
.flp .ev-loop{display:flex;gap:2px;align-items:flex-start;max-width:1080px;margin:0 auto}
.flp .panel{border-radius:14px;border:1px solid #1a2440;background:#090e1a;padding:22px;box-shadow:0 24px 46px -22px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.03)}
.flp .ev-insight{flex:1.15;min-width:0;transform:translateY(-4px)}
.flp .ev-evidence{flex:1;min-width:0;background:#0b1424;border-color:rgba(52,211,153,.18);box-shadow:0 30px 56px -22px rgba(0,0,0,.7),0 0 34px -16px rgba(16,185,129,.35),inset 0 1px 0 rgba(255,255,255,.04);transform:translateY(-9px)}
.flp .ev-source{flex:1;min-width:0;background:#070c16;transform:translateY(3px)}
.flp .panel-h{display:flex;align-items:center;gap:8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;margin-bottom:16px;color:#56688a;font-family:'JetBrains Mono',monospace}
.flp .claim{border-radius:10px;padding:14px;margin-bottom:8px;cursor:pointer;transition:background .15s,border-color .15s,box-shadow .2s;border:1px solid transparent}
.flp .claim:last-child{margin-bottom:0}
.flp .claim:hover{background:rgba(255,255,255,.03)}
.flp .claim.on{border-color:rgba(99,102,241,.4);background:rgba(99,102,241,.07);box-shadow:0 0 20px -10px rgba(99,102,241,.5),inset 2px 0 0 #6366f1}
.flp .claim p{font-size:13px;line-height:1.55;color:#8b96aa;margin:0}
.flp .claim.on p{color:#dce5f5}
.flp .claim b{color:#dce5f5;font-weight:700}
.flp .harrow{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:64px;flex-shrink:0;position:relative;align-self:center;margin-top:6px}
.flp .hline{position:absolute;top:50%;left:0;right:0;height:1px;background:repeating-linear-gradient(90deg,rgba(16,185,129,.7) 0 4px,transparent 4px 9px);animation:flpConn 1s linear infinite;box-shadow:0 0 10px rgba(16,185,129,.4)}
.flp .hline2{background:repeating-linear-gradient(90deg,rgba(99,102,241,.7) 0 4px,transparent 4px 9px);box-shadow:0 0 10px rgba(99,102,241,.4)}
.flp .hpill{display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:100px;border:1px solid rgba(16,185,129,.5);background:rgba(16,185,129,.1);font-size:9.5px;font-weight:600;color:#34d399;white-space:nowrap;position:relative;z-index:1;box-shadow:0 0 16px rgba(16,185,129,.3);font-family:'JetBrains Mono',monospace;letter-spacing:.06em}
.flp .harw{position:relative;z-index:1;background:#04070d;border-radius:4px;padding:2px;filter:drop-shadow(0 0 5px rgba(16,185,129,.5))}
.flp .etable,.flp .stable{border-radius:9px;border:1px solid #1a2440;overflow:hidden;font-size:11px}
.flp .ehd,.flp .erow{display:grid;grid-template-columns:1.5fr 1fr .7fr}
.flp .shd,.flp .srow{display:grid;grid-template-columns:1.3fr .9fr 1fr}
.flp .ehd,.flp .shd{background:#0f1626}
.flp .ehd div,.flp .shd div{padding:7px 10px;font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;color:#56688a;font-weight:600;font-family:'JetBrains Mono',monospace}
.flp .erow,.flp .srow{border-top:1px solid #1a2440}
.flp .erow div,.flp .srow div{padding:7px 10px;font-family:'JetBrains Mono',monospace;color:#8b96aa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.flp .erow.on{background:rgba(16,185,129,.09);box-shadow:inset 2px 0 0 #10b981}
.flp .erow.on div{color:#dce5f5}
.flp .erow.on div:nth-child(2){color:#34d399;font-weight:600}
.flp .srow.on{background:rgba(99,102,241,.09);box-shadow:inset 2px 0 0 #6366f1}
.flp .srow.on div{color:#dce5f5}
.flp .src-foot{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:10.5px;color:#56688a}
.flp .src-foot b{color:#818cf8;font-weight:600}
.flp .lineage{display:flex;align-items:center;justify-content:center;gap:14px;max-width:1080px;margin:26px auto 0;padding-top:22px;border-top:1px solid rgba(26,36,64,.6)}
.flp .ln-node{display:flex;align-items:center;gap:7px;font-size:11.5px;color:#8b96aa;font-weight:500}
.flp .ln-node.code{font-size:10.5px;color:#818cf8;background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.2);padding:6px 12px;border-radius:8px}
.flp .ln-dot{width:7px;height:7px;border-radius:50%}
.flp .ln-conn{width:34px;height:1px;background:repeating-linear-gradient(90deg,rgba(99,102,241,.5) 0 4px,transparent 4px 8px)}

/* ── CTA ── */
.flp .cta-sec{justify-content:center}
.flp .cta-card{max-width:760px;margin:0 auto;text-align:center;position:relative;z-index:1}
.flp .cta-scene{margin:0 auto 8px;opacity:.9}
.flp .cta-h{font-family:'Bricolage Grotesque',sans-serif;font-size:46px;font-weight:600;letter-spacing:-.03em;line-height:1.12;font-variation-settings:'opsz' 48;color:#dce5f5;margin:10px 0 0}
.flp .cta-sub{font-size:16px;color:#8195b3;margin:18px auto 0;max-width:440px;line-height:1.65}
.flp .footer{position:relative;z-index:1;border-top:1px solid rgba(26,36,64,.6);padding:22px 0 18px;margin-top:40px;text-align:center;font-size:11px;color:#56688a}
.flp .footer-brand{display:flex;flex-direction:column;align-items:center;gap:8px;margin-bottom:16px}
.flp .fb-word{font-family:'Bricolage Grotesque',sans-serif;font-size:17px;letter-spacing:-.015em}
.flp .fb-word b{font-weight:700;color:#f2f5fb}
.flp .fb-word span{font-weight:500;color:#8195b3}
.flp .fb-tag{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:12px;color:#6b7da0}
.flp .footer-links{display:flex;justify-content:center;gap:22px;margin-bottom:10px;font-size:12px}
.flp .footer-links a{color:#8195b3}
.flp .footer-links a:hover{color:#dce5f5}

/* ── Responsive ── */
@media (max-width:1024px){
  .flp .hero-inner{flex-direction:column;gap:36px}
  .flp .hero-scene{max-width:560px;margin:0 auto}
  .flp .dots{display:none}
}
@media (max-width:820px){
  .flp .sec{padding:40px 22px}
  .flp .navlinks{display:none}
  .flp .pipe{flex-wrap:wrap;gap:20px 0}
  .flp .pnode{flex:0 0 33.33%}
  .flp .pnode:not(:last-child)::after{display:none}
  .flp .cards{grid-template-columns:repeat(2,1fr)}
  .flp .ev-loop{flex-direction:column;gap:14px}
  .flp .harrow{width:100%;flex-direction:row;margin:0}
  .flp .hline{display:none}
  .flp .cta-h{font-size:36px}
  .flp .lineage{flex-wrap:wrap}
}
@media (prefers-reduced-motion:reduce){
  .flp .pnode:not(:last-child)::after,.flp .pnode:not(:last-child)::before,.flp .hline{animation:none}
  .flp .orb,.flp .dp{animation:none}
  .flp .rv{opacity:1;transform:none;transition:none}
  .flp .hero-scene{transition:none}
}
`;
