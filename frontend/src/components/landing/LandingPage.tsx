/**
 * LandingPage
 *
 * Premium SaaS-style landing page for Insight Copilot.
 * Split hero layout: text left, product mockup right.
 * Compact pipeline strip sits directly beneath the hero.
 */

import { useRef } from "react";

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

/* ─── Data ─── */

const features = [
  {
    icon: <IconCpu />,
    title: "Semantic Profiling",
    description:
      "Automatically detects column types and assigns business roles — revenue, customer_id, category, date — so the system understands your data like an analyst would.",
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    border: "border-indigo-400/20",
  },
  {
    icon: <IconChart />,
    title: "Deterministic Evidence",
    description:
      "Five analysis templates compute exact numbers with pandas. Revenue trends, category mix, product rankings, AOV, and repeat purchase metrics — all verified, never hallucinated.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    icon: <IconLightning />,
    title: "AI-Powered Narratives",
    description:
      "An AI narrator reads the computed evidence and writes actionable insights. It can tell a story — but it can't make up the numbers.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    icon: <IconShield />,
    title: "Evidence-Linked Trust",
    description:
      "Every insight links to the exact computation. Click any recommendation to see the underlying data table, chart metadata, and pandas-verified numbers.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
  },
];

const pipelineSteps = [
  { label: "Upload", sub: "CSV / sample" },
  { label: "Profile", sub: "statistics" },
  { label: "Classify", sub: "semantic roles" },
  { label: "Compute", sub: "evidence" },
  { label: "Narrate", sub: "AI insights" },
];

const trustItems = [
  { icon: "⚡", text: "Deterministic computations" },
  { icon: "🔗", text: "Source-backed evidence" },
  { icon: "✍️", text: "AI-written narrative" },
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

  return (
    <div className="h-full overflow-y-auto relative">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px]"
          style={{
            background:
              "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(99,102,241,0.05) 0%, transparent 60%)",
          }}
        />
      </div>

      <div className="relative">

        {/* ── HERO: split text + mockup ── */}
        <section className="max-w-[1200px] mx-auto px-6 pt-10 pb-6">
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12">

            {/* Left: text */}
            <div className="flex-shrink-0 lg:max-w-[400px] text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-bg-surface text-[11px] text-text-secondary mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                AI analytics that shows its work
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight leading-[1.12] mb-4">
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
              </h2>

              <p className="text-[15px] text-text-secondary leading-relaxed mb-7 max-w-sm mx-auto lg:mx-0">
                Upload a sales CSV. Get insights backed by exact
                computations, not AI&nbsp;guesses.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 mb-6">
                <button
                  onClick={onLoadSample}
                  className="group inline-flex items-center gap-2.5 px-7 py-3 rounded-xl
                    bg-gradient-to-r from-accent to-purple-500
                    text-white text-sm font-semibold
                    shadow-lg shadow-accent/20
                    hover:shadow-xl hover:shadow-accent/30
                    hover:scale-[1.02] active:scale-[0.98]
                    transition-all duration-200"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  Try Sample Dataset
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl
                    bg-bg-surface border border-border text-sm font-medium text-text-secondary
                    hover:bg-bg-elevated hover:text-text hover:border-border-light
                    transition-all duration-200"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload CSV
                </button>
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
                <FloatingChip color="emerald">Verified by pandas</FloatingChip>
              </div>
              <div className="hidden lg:block absolute -right-2 top-36 z-10">
                <FloatingChip color="indigo">Evidence linked</FloatingChip>
              </div>
              <div className="hidden lg:block absolute -left-2 bottom-14 z-10">
                <FloatingChip color="amber">5 insights generated</FloatingChip>
              </div>

              {/* Mockup frame */}
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
                <div className="flex" style={{ height: 310 }}>
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
            </div>
          </div>
        </section>

        {/* ── PIPELINE: compact workflow strip ── */}
        <section className="max-w-[1200px] mx-auto px-6 pt-2 pb-12">
          <div className="rounded-xl border border-border/60 bg-bg-surface/50 backdrop-blur-sm px-6 py-5">
            <p className="text-center text-[10px] uppercase tracking-[0.2em] text-text-muted font-medium mb-4">
              Pipeline
            </p>
            <div className="flex items-start justify-center gap-0">
              {pipelineSteps.map((step, i) => (
                <div key={step.label} className="flex items-start">
                  {/* Node + labels */}
                  <div className="flex flex-col items-center w-[72px] sm:w-[88px]">
                    <div className="w-2.5 h-2.5 rounded-full bg-border-light border-[2.5px] border-bg-surface mb-2" />
                    <span className="text-[11.5px] font-semibold text-text whitespace-nowrap">
                      {step.label}
                    </span>
                    <span className="text-[10px] text-text-secondary whitespace-nowrap mt-0.5">
                      {step.sub}
                    </span>
                  </div>

                  {/* Connector */}
                  {i < pipelineSteps.length - 1 && (
                    <div className="flex items-center mt-[5px] w-8 sm:w-14">
                      <div className="flex-1 h-px bg-border-light/70" />
                      <svg className="w-2.5 h-2.5 text-border-light flex-shrink-0 -mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      <div className="flex-1 h-px bg-border-light/70" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <h3 className="text-center text-[10.5px] uppercase tracking-[0.2em] text-text-muted mb-8 font-medium">
            How it works
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border border-border bg-bg-surface p-5
                  hover:bg-bg-elevated hover:border-border-light
                  transition-all duration-200"
              >
                <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg ${f.bg} border ${f.border} ${f.color} mb-3.5`}>
                  {f.icon}
                </div>
                <h4 className="text-sm font-semibold text-text mb-1.5">{f.title}</h4>
                <p className="text-[13px] text-text-secondary leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── DIFFERENTIATOR ── */}
        <section className="max-w-4xl mx-auto px-6 pb-16">
          <div className="rounded-xl border border-border bg-bg-surface p-6 sm:p-8 text-center">
            <p className="text-text-muted text-xs uppercase tracking-widest mb-4">
              What makes this different
            </p>
            <p className="text-lg sm:text-xl text-text font-medium leading-relaxed max-w-2xl mx-auto">
              Most AI analytics tools let the model compute your numbers.{" "}
              <span className="text-text-secondary">
                Insight Copilot computes everything with pandas first, then lets
                the AI explain what the numbers mean.
              </span>{" "}
              The AI writes the story. The code writes the math.
            </p>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="text-center pb-12">
          <button
            onClick={onLoadSample}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl
              bg-gradient-to-r from-accent to-purple-500
              text-white text-sm font-semibold
              shadow-lg shadow-accent/20
              hover:shadow-xl hover:shadow-accent/30
              hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-200"
          >
            Try Sample Dataset
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
          <p className="text-[11px] text-text-muted mt-3">
            3,500 Shopify-style orders · No signup required
          </p>
        </section>

      </div>
    </div>
  );
}

/* ─── Helpers ─── */

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

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-medium backdrop-blur-sm shadow-card ${styles[color]}`}
    >
      <span
        className={`w-1 h-1 rounded-full ${
          color === "emerald"
            ? "bg-emerald-400"
            : color === "indigo"
            ? "bg-indigo-400"
            : "bg-amber-400"
        }`}
      />
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
  return (
    <span
      className={`text-[7px] px-1 py-0.5 rounded border flex-shrink-0
        border-${color}-400/20 bg-${color}-400/10 text-${color}-400`}
    >
      {children}
    </span>
  );
}