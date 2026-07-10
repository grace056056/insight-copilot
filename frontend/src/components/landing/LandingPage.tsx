/**
 * LandingPage
 *
 * Section-based, one-story-per-viewport SaaS homepage for Insight Copilot.
 * Rhythm modelled on Mode / Hex / Amplitude: a minimal nav, then four
 * full-height sections — Hero, Workflow, Evidence, and Final CTA.
 *
 * Rendered inside App's scroll area (below the 52px TopBar). Sections use
 * min-h-[calc(100vh-108px)] so exactly one story fills the desktop viewport,
 * with soft (proximity) scroll snapping on md+ and natural stacking on mobile.
 */

import { useRef } from "react";

const GITHUB_URL = "https://github.com/grace056056/insight-copilot";

/* ─── Icon components ─── */

function IconShield() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function IconCpu() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 004.5 8.25v9a2.25 2.25 0 002.25 2.25z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}

function IconLightning() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

/* Small pipeline-step glyphs */
function StepIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    upload:
      "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5",
    profile:
      "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6",
    classify:
      "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z M6 6h.008v.008H6V6z",
    compute:
      "M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 004.5 8.25v9a2.25 2.25 0 002.25 2.25z",
    narrate:
      "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
  };
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name]} />
    </svg>
  );
}

/* ─── Data ─── */

const features = [
  {
    icon: <IconCpu />,
    title: "Semantic Profiling",
    description:
      "Detects column types and assigns business roles — revenue, customer_id, category, date.",
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    border: "border-indigo-400/20",
  },
  {
    icon: <IconChart />,
    title: "Deterministic Evidence",
    description:
      "Five analysis templates compute exact numbers with pandas — never hallucinated.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    icon: <IconLightning />,
    title: "AI-Powered Narratives",
    description:
      "An AI narrator reads the computed evidence and writes the story — it can't invent the numbers.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    icon: <IconShield />,
    title: "Evidence-Linked Trust",
    description:
      "Every insight links to the exact computation, source table, and pandas-verified numbers.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
  },
];

const pipelineSteps = [
  {
    icon: "upload",
    label: "Upload",
    caption: "CSV or sample",
    color: "text-indigo-400",
    ring: "border-indigo-400/30",
    fill: "bg-indigo-400/10",
    glow: "shadow-[0_0_20px_-4px_rgba(129,140,248,0.5)]",
  },
  {
    icon: "profile",
    label: "Profile",
    caption: "column statistics",
    color: "text-sky-400",
    ring: "border-sky-400/30",
    fill: "bg-sky-400/10",
    glow: "shadow-[0_0_20px_-4px_rgba(56,189,248,0.5)]",
  },
  {
    icon: "classify",
    label: "Classify",
    caption: "semantic roles",
    color: "text-violet-400",
    ring: "border-violet-400/30",
    fill: "bg-violet-400/10",
    glow: "shadow-[0_0_20px_-4px_rgba(167,139,250,0.5)]",
  },
  {
    icon: "compute",
    label: "Compute",
    caption: "pandas evidence",
    color: "text-emerald-400",
    ring: "border-emerald-400/30",
    fill: "bg-emerald-400/10",
    glow: "shadow-[0_0_20px_-4px_rgba(52,211,153,0.5)]",
  },
  {
    icon: "narrate",
    label: "Narrate",
    caption: "AI insights",
    color: "text-amber-400",
    ring: "border-amber-400/30",
    fill: "bg-amber-400/10",
    glow: "shadow-[0_0_20px_-4px_rgba(251,191,36,0.5)]",
  },
];

const trustItems = [
  { icon: "⚡", text: "Deterministic computations" },
  { icon: "🔗", text: "Source-backed evidence" },
  { icon: "✍️", text: "AI-written narrative" },
];

const navLinks = [
  { label: "Workflow", href: "#workflow" },
  { label: "Evidence", href: "#evidence" },
];

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

  return (
    <div className="h-full overflow-y-auto relative md:snap-y md:snap-proximity scroll-smooth">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[600px]"
          style={{
            background:
              "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 62%)",
          }}
        />
      </div>

      {/* Shared file input for every Upload CSV button */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.tsv"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }}
        className="hidden"
      />

      {/* ── Minimal landing nav ── */}
      <nav className="sticky top-0 z-40 h-14 border-b border-border/70 bg-bg/80 backdrop-blur-md">
        <div className="max-w-[1200px] mx-auto h-full px-6 flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-2.5 group">
            <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
              bg-gradient-to-br from-[#1e2440] to-[#161b2e] border border-[#2a3350]
              shadow-[0_0_12px_rgba(99,102,241,0.10)] group-hover:border-accent/30 transition-colors">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="8" width="2.5" height="5" rx="0.75" fill="rgba(255,255,255,0.5)" />
                <rect x="5.25" y="4" width="2.5" height="9" rx="0.75" fill="rgba(255,255,255,0.8)" />
                <rect x="9.5" y="1" width="2.5" height="12" rx="0.75" fill="white" />
              </svg>
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-text">
              Insight <span className="text-text-secondary">Copilot</span>
            </span>
          </a>

          <div className="flex items-center gap-1 sm:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hidden sm:inline-flex px-3 py-1.5 rounded-lg text-[13px] text-text-secondary
                  hover:text-text hover:bg-bg-elevated/60 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px]
                text-text-secondary hover:text-text hover:bg-bg-elevated/60 transition-colors"
            >
              <GithubGlyph />
              GitHub
            </a>
            <button
              onClick={onLoadSample}
              className="ml-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg
                bg-gradient-to-r from-accent to-purple-500 text-white text-[13px] font-semibold
                shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30
                hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            >
              Try Sample Dataset
            </button>
          </div>
        </div>
      </nav>

      <div className="relative">

        {/* ══════════ SECTION 1 · HERO ══════════ */}
        <section
          id="hero"
          className="scroll-mt-14 md:snap-start min-h-[calc(100vh-108px)] flex items-center
            max-w-[1200px] mx-auto px-6 py-10"
        >
          <div className="w-full flex flex-col lg:flex-row items-center gap-10 lg:gap-14">

            {/* Left: text */}
            <div className="flex-shrink-0 lg:max-w-[430px] text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-bg-surface text-[11px] text-text-secondary mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI analytics that shows its work
              </div>

              <h1 className="text-4xl lg:text-[46px] font-bold tracking-tight leading-[1.1] mb-5">
                Business insights{" "}
                <br className="hidden sm:block" />
                you can{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(135deg, #818cf8, #a78bfa, #67e8f9)",
                  }}
                >
                  verify
                </span>
              </h1>

              <p className="text-[16px] text-text-secondary leading-relaxed mb-8 max-w-md mx-auto lg:mx-0">
                Upload a sales CSV. Get insights backed by exact computations,
                not AI&nbsp;guesses.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 mb-7">
                <button
                  onClick={onLoadSample}
                  className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-xl
                    bg-gradient-to-r from-accent to-purple-500 text-white text-sm font-semibold
                    shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30
                    hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  Try Sample Dataset
                </button>
                <button
                  onClick={openFilePicker}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                    bg-bg-surface border border-border text-sm font-medium text-text-secondary
                    hover:bg-bg-elevated hover:text-text hover:border-border-light transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload CSV
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2">
                {trustItems.map((item) => (
                  <div key={item.text} className="flex items-center gap-1.5">
                    <span className="text-[11px] opacity-70">{item.icon}</span>
                    <span className="text-[11px] text-text-muted">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: product mockup */}
            <div className="flex-1 min-w-0 w-full lg:w-auto relative">
              {/* Floating chips */}
              <div className="hidden lg:block absolute -left-4 top-10 z-10">
                <FloatingChip color="emerald">pandas verified</FloatingChip>
              </div>
              <div className="hidden lg:block absolute -right-2 top-36 z-10">
                <FloatingChip color="indigo">Evidence linked</FloatingChip>
              </div>
              <div className="hidden lg:block absolute -left-2 bottom-14 z-10">
                <FloatingChip color="amber">5 insights generated</FloatingChip>
              </div>

              <ProductMockup />
            </div>
          </div>
        </section>

        {/* ══════════ SECTION 2 · WORKFLOW ══════════ */}
        <section
          id="workflow"
          className="scroll-mt-14 md:snap-start min-h-[calc(100vh-108px)] flex items-center
            max-w-[1200px] mx-auto px-6 py-14"
        >
          <div className="w-full">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-[11px] uppercase tracking-[0.22em] text-accent/80 font-semibold mb-3">
                Pipeline
              </p>
              <h2 className="text-3xl lg:text-[38px] font-bold tracking-tight leading-tight mb-4">
                From raw CSV to verified insight
              </h2>
              <p className="text-[15px] text-text-secondary leading-relaxed">
                A deterministic pipeline computes every number before AI writes
                the story.
              </p>
            </div>

            {/* Connected pipeline — a workflow rail, not five equal cards */}
            {/* Desktop: horizontal node rail with a flowing connective track */}
            <div className="hidden md:flex items-start justify-between mb-14 px-2">
              <style>{`
                @keyframes ic-flow { to { background-position: -200% 0; } }
                .ic-pipe-flow {
                  background-image: linear-gradient(90deg, transparent 0%, rgba(139,148,255,0.55) 45%, rgba(139,148,255,0.55) 55%, transparent 100%);
                  background-size: 200% 100%;
                  animation: ic-flow 2.6s linear infinite;
                }
                @media (prefers-reduced-motion: reduce) { .ic-pipe-flow { animation: none; } }
              `}</style>
              {pipelineSteps.map((step, i) => (
                <StepRailNode key={step.label} step={step} index={i} last={i === pipelineSteps.length - 1} />
              ))}
            </div>

            {/* Mobile: vertical connected timeline */}
            <div className="md:hidden mb-10 pl-1">
              {pipelineSteps.map((step, i) => (
                <div key={step.label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`relative z-10 flex items-center justify-center w-11 h-11 rounded-xl
                      border ${step.ring} ${step.fill} ${step.color} bg-bg`}>
                      <StepIcon name={step.icon} />
                    </div>
                    {i < pipelineSteps.length - 1 && (
                      <div className="w-px flex-1 my-1 bg-gradient-to-b from-border-light to-border-light/20" />
                    )}
                  </div>
                  <div className="pb-6 pt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[9px] font-mono text-text-muted">0{i + 1}</span>
                      <h3 className="text-[15px] font-semibold text-text">{step.label}</h3>
                    </div>
                    <p className="text-[12px] text-text-secondary mt-0.5">{step.caption}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Supporting compact cards (folded How It Works) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-border bg-bg-surface/60 p-4
                    hover:bg-bg-elevated/50 transition-colors duration-200"
                >
                  <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${f.bg} border ${f.border} ${f.color} mb-3`}>
                    {f.icon}
                  </div>
                  <h4 className="text-[13px] font-semibold text-text mb-1">{f.title}</h4>
                  <p className="text-[12px] text-text-secondary leading-relaxed">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ SECTION 3 · EVIDENCE ══════════ */}
        <section
          id="evidence"
          className="scroll-mt-14 md:snap-start min-h-[calc(100vh-108px)] flex items-center
            max-w-[1200px] mx-auto px-6 py-14"
        >
          <div className="w-full">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <p className="text-[11px] uppercase tracking-[0.22em] text-accent/80 font-semibold mb-3">
                Evidence-first
              </p>
              <h2 className="text-3xl lg:text-[38px] font-bold tracking-tight leading-tight mb-4">
                Click any claim, see the proof
              </h2>
              <p className="text-[15px] text-text-secondary leading-relaxed">
                The AI writes the narrative. Pandas computes the numbers. Every
                insight traces back to source data.
              </p>
            </div>

            {/* Trust loop */}
            <div className="flex flex-col lg:flex-row items-stretch gap-4 lg:gap-3">

              {/* AI-written insight card */}
              <div className="flex-1 rounded-2xl border border-accent/25 bg-accent/[0.05] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-accent font-semibold">
                    <IconLightning />
                    AI-written insight
                  </span>
                </div>
                <p className="text-[14px] text-text leading-relaxed mb-4">
                  Repeat buyers generate <span className="font-semibold text-white">81.9%</span> of
                  total revenue — they spend <span className="font-semibold text-white">4.0×</span> more
                  than one-time buyers.
                </p>
                <div className="flex items-center gap-1 text-[11px] text-priority-high">
                  <span className="w-1.5 h-1.5 rounded-full bg-priority-high" />
                  High priority
                </div>
              </div>

              {/* Verify connector */}
              <div className="flex lg:flex-col items-center justify-center gap-2 py-2 lg:py-0 lg:px-1">
                <div className="hidden lg:block flex-1 w-px bg-gradient-to-b from-transparent via-border-light to-transparent" />
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/[0.06] whitespace-nowrap">
                  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
                  </svg>
                  <span className="text-[10.5px] font-medium text-emerald-400">Verify computation</span>
                </div>
                <div className="hidden lg:block flex-1 w-px bg-gradient-to-b from-transparent via-border-light to-transparent" />
                {/* mobile arrow */}
                <svg className="lg:hidden w-4 h-4 text-border-light rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>

              {/* pandas evidence table */}
              <div className="flex-1 rounded-2xl border border-border bg-bg-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-wide text-emerald-400 font-semibold">
                    pandas evidence
                  </span>
                  <span className="text-[9px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-bg-elevated border border-border">
                    computed
                  </span>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-3 bg-bg-elevated">
                    {["metric", "value", "unit"].map((h) => (
                      <div key={h} className="text-[9px] px-2 py-1.5 text-text-muted font-medium uppercase tracking-wide">{h}</div>
                    ))}
                  </div>
                  {[
                    ["repeat_rev_share", "81.9", "%"],
                    ["spend_multiplier", "4.0", "×"],
                    ["repeat_customers", "731", "count"],
                  ].map(([a, b, c]) => (
                    <div key={a} className="grid grid-cols-3 border-t border-border/60">
                      <div className="text-[10px] font-mono text-text-secondary px-2 py-1.5 truncate">{a}</div>
                      <div className="text-[10px] font-mono font-semibold text-text px-2 py-1.5">{b}</div>
                      <div className="text-[10px] font-mono text-text-muted px-2 py-1.5">{c}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* source table */}
              <div className="flex-1 rounded-2xl border border-border bg-bg-surface p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase tracking-wide text-text-secondary font-semibold">
                    source rows
                  </span>
                  <span className="text-[9px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-bg-elevated border border-border">
                    orders.csv
                  </span>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-3 bg-bg-elevated">
                    {["segment", "cust.", "revenue"].map((h) => (
                      <div key={h} className="text-[9px] px-2 py-1.5 text-text-muted font-medium uppercase tracking-wide">{h}</div>
                    ))}
                  </div>
                  {[
                    ["One-time", "641", "$28k"],
                    ["Repeat", "731", "$127k"],
                  ].map(([a, b, c]) => (
                    <div key={a} className="grid grid-cols-3 border-t border-border/60">
                      <div className="text-[10px] font-mono text-text-secondary px-2 py-1.5">{a}</div>
                      <div className="text-[10px] font-mono text-text-secondary px-2 py-1.5">{b}</div>
                      <div className="text-[10px] font-mono text-text px-2 py-1.5">{c}</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-text-muted mt-3 leading-relaxed">
                  Trace every claim back to the exact rows it was computed from.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ SECTION 4 · FINAL CTA ══════════ */}
        <section
          id="cta"
          className="scroll-mt-14 md:snap-start min-h-[calc(100vh-108px)] flex flex-col
            max-w-[1200px] mx-auto px-6"
        >
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-7
                bg-gradient-to-br from-accent/20 to-purple-500/10 border border-accent/25"
            >
              <svg className="w-7 h-7 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>

            <h2 className="text-3xl lg:text-[40px] font-bold tracking-tight leading-[1.15] max-w-3xl mb-4">
              Try the sample dataset, then inspect the evidence behind every
              insight.
            </h2>
            <p className="text-[15px] text-text-secondary max-w-lg mb-9 leading-relaxed">
              Deterministic computations, source-backed evidence, and an
              AI-written narrative — end to end.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={onLoadSample}
                className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-xl
                  bg-gradient-to-r from-accent to-purple-500 text-white text-sm font-semibold
                  shadow-lg shadow-accent/20 hover:shadow-xl hover:shadow-accent/30
                  hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Try Sample Dataset
              </button>
              <button
                onClick={openFilePicker}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                  bg-bg-surface border border-border text-sm font-medium text-text-secondary
                  hover:bg-bg-elevated hover:text-text hover:border-border-light transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload CSV
              </button>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                  bg-transparent border border-border text-sm font-medium text-text-secondary
                  hover:bg-bg-elevated hover:text-text hover:border-border-light transition-all duration-200"
              >
                <GithubGlyph />
                View GitHub
              </a>
            </div>
          </div>

          {/* Slim footer */}
          <footer className="border-t border-border/60 py-5">
            <p className="text-center text-[11px] text-text-muted">
              Built by Tongyu Wu · Data Science @ UC Irvine · 2026
            </p>
          </footer>
        </section>

      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function GithubGlyph() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.72-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 015.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.68.8.56A11.51 11.51 0 0023.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  );
}

type PipelineStep = {
  icon: string;
  label: string;
  caption: string;
  color: string;
  ring: string;
  fill: string;
  glow: string;
};

function StepRailNode({
  step,
  index,
  last,
}: {
  step: PipelineStep;
  index: number;
  last: boolean;
}) {
  return (
    <div className="relative flex-1 flex flex-col items-center">
      {/* Connective track to the next node (sits behind the icon tiles) */}
      {!last && (
        <div className="absolute top-7 left-1/2 w-full h-px z-0" aria-hidden="true">
          {/* base line */}
          <div className="absolute inset-0 bg-gradient-to-r from-border-light/70 via-border-light/40 to-border-light/70" />
          {/* animated flow shimmer */}
          <div className="ic-pipe-flow absolute inset-0" />
          {/* direction chevron in the gap */}
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 text-border-light"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      )}

      {/* Node */}
      <div
        className={`relative z-10 flex items-center justify-center w-14 h-14 rounded-2xl
          border ${step.ring} ${step.fill} ${step.color} bg-bg ${step.glow}`}
      >
        <StepIcon name={step.icon} />
      </div>

      {/* Labels */}
      <div className="mt-4 text-center px-1">
        <span className="text-[10px] font-mono text-text-muted">0{index + 1}</span>
        <h3 className="text-[15px] font-semibold text-text leading-tight mt-0.5">{step.label}</h3>
        <p className="text-[11.5px] text-text-muted mt-1">{step.caption}</p>
      </div>
    </div>
  );
}

function ProductMockup() {
  return (
    <div
      className="rounded-xl border border-border overflow-hidden bg-bg-surface"
      style={{
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.02)",
      }}
    >
      {/* Title bar */}
      <div className="h-7 bg-bg-elevated border-b border-border flex items-center gap-1.5 px-3">
        <span className="w-2 h-2 rounded-full bg-[#ff5f57]" />
        <span className="w-2 h-2 rounded-full bg-[#febc2e]" />
        <span className="w-2 h-2 rounded-full bg-[#28c840]" />
        <span className="ml-3 text-[9px] text-text-muted font-mono">Insight Copilot</span>
      </div>

      {/* Three panels */}
      <div className="flex" style={{ height: 320 }}>
        {/* Left panel */}
        <div className="w-[155px] border-r border-border p-2.5 space-y-1.5 flex-shrink-0">
          <div className="text-[8px] uppercase tracking-wider text-text-muted font-medium mb-1">Dataset</div>
          <div className="h-2 w-3/4 rounded bg-bg-elevated" />
          <div className="h-1.5 w-1/2 rounded bg-bg-elevated" />
          <div className="pt-2 text-[8px] uppercase tracking-wider text-text-muted font-medium mb-1">Columns</div>
          {[
            { name: "order_date", role: "Date", c: "indigo" },
            { name: "total_amount", role: "Revenue", c: "emerald" },
            { name: "category", role: "Category", c: "cyan" },
            { name: "customer_id", role: "ID", c: "violet" },
            { name: "product_name", role: "Product", c: "cyan" },
            { name: "region", role: "Region", c: "cyan" },
          ].map((col) => (
            <div key={col.name} className="flex items-center justify-between gap-1 py-0.5">
              <span className="text-[8px] font-mono text-text-secondary truncate">{col.name}</span>
              <MockBadge color={col.c}>{col.role}</MockBadge>
            </div>
          ))}
        </div>

        {/* Center panel */}
        <div className="flex-1 p-2.5 space-y-2 min-w-0">
          <div className="text-[8px] uppercase tracking-wider text-text-muted font-medium mb-0.5">Insights</div>
          {[
            { pri: "high", color: "bg-rose-500", text: "Repeat buyers generate 81.9% of total revenue. They spend 4.0x more than one-time buyers." },
            { pri: "high", color: "bg-rose-500", text: "Clothing leads at 43.2% revenue share while Beauty trails at 13.7%." },
            { pri: "med", color: "bg-amber-500", text: "Revenue peaked at $28.1k in March, then declined 12.4% in April." },
            { pri: "med", color: "bg-amber-500", text: "Winter Jacket is the top product at 16.8% of total revenue." },
          ].map((card, i) => (
            <div
              key={i}
              className={`rounded-md border p-2 ${
                i === 0
                  ? "border-accent/25 bg-accent/[0.06]"
                  : "border-border bg-bg-elevated/40"
              }`}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <span className={`w-1 h-1 rounded-full ${card.color}`} />
                <span className="text-[7.5px] text-text-muted uppercase tracking-wide">{card.pri}</span>
              </div>
              <p className="text-[9.5px] text-text leading-[1.5]">{card.text}</p>
            </div>
          ))}
        </div>

        {/* Right panel */}
        <div className="w-[170px] border-l border-border p-2.5 space-y-2 flex-shrink-0">
          <div className="text-[8px] uppercase tracking-wider text-text-muted font-medium">Evidence</div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ["Repeat Rate", "53.3%"],
              ["Rev. Share", "81.9%"],
              ["Multiplier", "4.0x"],
              ["Customers", "1,372"],
            ].map(([label, val]) => (
              <div key={label} className="bg-bg-elevated rounded border border-border p-1.5">
                <div className="text-[7px] text-text-muted uppercase tracking-wide">{label}</div>
                <div className="text-[10px] font-mono font-semibold text-text">{val}</div>
              </div>
            ))}
          </div>
          <div className="pt-0.5 text-[8px] uppercase tracking-wider text-text-muted font-medium">Data</div>
          <div className="rounded border border-border overflow-hidden">
            <div className="grid grid-cols-3 bg-bg-elevated">
              {["segment", "cust.", "revenue"].map((h) => (
                <div key={h} className="text-[7px] px-1.5 py-1 text-text-muted font-medium uppercase">{h}</div>
              ))}
            </div>
            {[
              ["One-time", "641", "$28k"],
              ["Repeat", "731", "$127k"],
            ].map(([a, b, c]) => (
              <div key={a} className="grid grid-cols-3 border-t border-border/50">
                {[a, b, c].map((v, j) => (
                  <div key={j} className="text-[8px] font-mono text-text-secondary px-1.5 py-0.5">{v}</div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1 pt-0.5">
            <svg className="w-2.5 h-2.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
            </svg>
            <span className="text-[7.5px] text-emerald-500/80">pandas-verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FloatingChip({
  children,
  color,
}: {
  children: string;
  color: "emerald" | "indigo" | "amber";
}) {
  const styles: Record<string, string> = {
    emerald: "text-emerald-400 bg-emerald-400/8 border-emerald-400/15",
    indigo: "text-indigo-400 bg-indigo-400/8 border-indigo-400/15",
    amber: "text-amber-400 bg-amber-400/8 border-amber-400/15",
  };
  const dot: Record<string, string> = {
    emerald: "bg-emerald-400",
    indigo: "bg-indigo-400",
    amber: "bg-amber-400",
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium backdrop-blur-sm shadow-card ${styles[color]}`}
    >
      <span className={`w-1 h-1 rounded-full ${dot[color]}`} />
      {children}
    </div>
  );
}

function MockBadge({
  children,
  color,
}: {
  children: string;
  color: string;
}) {
  // Explicit map so Tailwind's JIT keeps these color utilities.
  const styles: Record<string, string> = {
    indigo: "border-indigo-400/20 bg-indigo-400/10 text-indigo-400",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-400",
    cyan: "border-cyan-400/20 bg-cyan-400/10 text-cyan-400",
    violet: "border-violet-400/20 bg-violet-400/10 text-violet-400",
  };
  return (
    <span
      className={`text-[7px] px-1 py-0.5 rounded border flex-shrink-0 ${styles[color] ?? styles.cyan}`}
    >
      {children}
    </span>
  );
}
