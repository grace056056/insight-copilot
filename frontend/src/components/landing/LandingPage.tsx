/**
 * LandingPage
 *
 * Faithful implementation of the approved "Insight Copilot" landing design
 * (see docs/design-reference). Four full-viewport, scroll-snapped stories —
 * Hero, Pipeline (Workflow), Evidence, and Final CTA — rendered inside App's
 * scroll area. The visual system (Bricolage Grotesque display type, Instrument
 * Serif italic kickers, layered card mockup, grain + deep radial gradients,
 * floating badges, right-rail scroll dots) is ported verbatim from the design.
 *
 * All product functionality is preserved: the primary buttons load the sample
 * dataset (onLoadSample) and the ghost buttons open the CSV file picker
 * (onUpload). Only presentation changed.
 */

import { useCallback, useEffect, useRef, useState } from "react";

const GITHUB_URL = "https://github.com/grace056056/insight-copilot";

/* Grain texture — SVG fractal noise as a self-contained data URI (no asset
   download), tiled at 180px to match the design's grain density. */
const GRAIN_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E";

/* ─── Interactive evidence claim datasets (from the design reference) ─── */

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

/* ─── Pipeline nodes & feature cards (from the design reference) ─── */

const pipelineNodes = [
  { idx: "01", label: "Upload", caption: "CSV or sample", glyph: "↑", color: "#818cf8", rgb: "129,140,248" },
  { idx: "02", label: "Profile", caption: "column statistics", glyph: "▤", color: "#38bdf8", rgb: "56,189,248" },
  { idx: "03", label: "Classify", caption: "semantic roles", glyph: "◈", color: "#a78bfa", rgb: "167,139,250" },
  { idx: "04", label: "Compute", caption: "pandas evidence", glyph: "∑", color: "#34d399", rgb: "52,211,153" },
  { idx: "05", label: "Narrate", caption: "AI insights", glyph: "sparkle", color: "#fbbf24", rgb: "251,191,36" },
];

const featureCards = [
  { glyph: "▦", title: "Semantic Profiling", body: "Detects column types and assigns business roles — revenue, customer_id, category, date.", color: "#818cf8", rgb: "129,140,248" },
  { glyph: "▤", title: "Deterministic Evidence", body: "Five analysis templates compute exact numbers with pandas — never hallucinated.", color: "#34d399", rgb: "52,211,153" },
  { glyph: "⚡", title: "AI-Powered Narratives", body: "An AI narrator reads the computed evidence and writes the story — it can't invent the numbers.", color: "#fbbf24", rgb: "251,191,36" },
  { glyph: "◆", title: "Evidence-Linked Trust", body: "Every insight links to the exact computation, source table, and pandas-verified numbers.", color: "#22d3ee", rgb: "6,182,212" },
];

/* ─── Inline icons (paths from the design reference) ─── */

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
    };
    onScroll();
    page.addEventListener("scroll", onScroll, { passive: true });
    return () => page.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = useCallback((i: number) => {
    const el = secRefs.current[i];
    const page = pageRef.current;
    if (el && page) page.scrollTo({ top: el.offsetTop, behavior: "smooth" });
  }, []);

  const c = claims[claim];

  return (
    <div className="iclp" ref={pageRef}>
      <style>{CSS}</style>

      {/* Ambient background layers */}
      <div className="grain-deep" />
      <div className="grain" style={{ backgroundImage: `url("${GRAIN_URI}")` }} />
      <div className="seam-blend" />

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

      {/* ── Nav ── */}
      <nav className="nav">
        <div className="brand">
          <span className="logo">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="8" width="2.5" height="5" rx="0.75" fill="rgba(255,255,255,0.5)" />
              <rect x="5.25" y="4" width="2.5" height="9" rx="0.75" fill="rgba(255,255,255,0.8)" />
              <rect x="9.5" y="1" width="2.5" height="12" rx="0.75" fill="white" />
            </svg>
          </span>
          Insight <span className="sec2">Copilot</span>
        </div>
        <div className="navlinks">
          <span className="navlink">Product</span>
          <span className="navlink" onClick={() => goTo(1)}>Workflow</span>
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
      <section className="sec" ref={(el) => { secRefs.current[0] = el; }}>
        <div className="glow" style={{ width: 560, height: 480, background: "#4338ca", top: -160, left: -120, opacity: 0.4 }} />
        <div className="glow" style={{ width: 520, height: 460, background: "#7c3aed", top: "10%", right: -140, opacity: 0.32 }} />
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow"><span className="dotp" />AI analytics that shows its work</span>
            <h1 className="h1">Business insights<br />you can <span className="grad">verify</span></h1>
            <p className="sub">Upload a sales CSV. Get insights backed by exact computations, not AI guesses.</p>
            <div className="cta-row">
              <button className="btn btn-pri btn-lg icon-btn" onClick={onLoadSample}>
                <Ico d={I.lightning} sw={2} /> Try Sample Dataset
              </button>
              <button className="btn btn-ghost btn-lg icon-btn" onClick={openFilePicker}>
                <Ico d={I.upload} /> Upload Data File
              </button>
            </div>
            <div className="trust">
              <div className="trust-i"><Ico d={I.lightning} size={12} /> Deterministic computations</div>
              <div className="trust-i"><Ico d={I.link} size={12} /> Source-backed evidence</div>
              <div className="trust-i"><Ico d={I.shield} size={12} /> AI-written narrative</div>
            </div>
          </div>

          {/* Product mockup */}
          <div className="mock">
            <div className="float f1"><Ico d={I.check} size={13} stroke="#34d399" sw={2} /> pandas verified</div>
            <div className="float f2"><Ico d={I.shield} size={13} stroke="#818cf8" /> Evidence linked</div>
            <div className="float f3"><span className="fd" style={{ background: "#fbbf24" }} /> 5 insights generated</div>
            <div className="mock-win">
              <div className="mock-bar">
                <span className="tdot" style={{ background: "#ff5f57" }} />
                <span className="tdot" style={{ background: "#febc2e" }} />
                <span className="tdot" style={{ background: "#28c840" }} />
                <span className="mono" style={{ marginLeft: 8, fontSize: 9, color: "#586b82" }}>q3_sales.csv</span>
                <span className="mock-livepill"><span className="mock-livedot" />Live</span>
              </div>
              <div className="mock-body">
                <div className="mock-rail">
                  <span className="ri active" /><span className="ri" /><span className="ri" /><span className="ri" />
                </div>
                <div className="mock-content">
                  <div className="mock-crumb">
                    <span>Workspace<span className="sep">/</span><b>q3_sales.csv</b></span>
                    <span className="mock-search">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="M21 21l-4.3-4.3" />
                      </svg>
                      Ask a question…
                    </span>
                  </div>
                  <div className="mock-simple">
                    <div className="msrow">
                      <Ico d={I.upload} size={14} stroke="#818cf8" sw={2} /> Uploaded q3_sales.csv · 48,210 rows
                    </div>
                    <div className="mscards">
                      <div className="mscard"><div className="msl">Total revenue</div><div className="msv">$2.41M</div></div>
                      <div className="mscard"><div className="msl">Customers analyzed</div><div className="msv">1,372</div></div>
                    </div>
                    <div className="msnar">Revenue insights backed by exact pandas computation. Every claim traces back to source data.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 2 · WORKFLOW / PIPELINE ══════════ */}
      <section className="sec" ref={(el) => { secRefs.current[1] = el; }}>
        <div className="wrap">
          <div className="sec-head">
            <div className="kicker">Pipeline</div>
            <h2 className="sec-title">From raw CSV to verified insight</h2>
            <p className="sec-sub">A deterministic pipeline computes every number before AI writes the story.</p>
          </div>
          <div className="pipe">
            {pipelineNodes.map((n) => (
              <div className="pnode" key={n.idx}>
                <div className="idx">{n.idx}</div>
                <div
                  className="pico"
                  style={{ borderColor: `rgba(${n.rgb},.3)`, color: n.color, background: `rgba(${n.rgb},.08)` }}
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
              <div className="card" key={f.title}>
                <span className="bar" style={{ background: f.color }} />
                <div className="ic" style={{ borderColor: `rgba(${f.rgb},.2)`, color: f.color, background: `rgba(${f.rgb},.1)` }}>
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
          <div className="sec-head">
            <div className="kicker">Evidence-first</div>
            <h2 className="sec-title">Click any claim, see the proof</h2>
            <p className="sec-sub">The AI writes the narrative. Pandas computes the numbers. Every insight traces back to source data.</p>
          </div>
          <div className="ev-loop">
            {/* AI-written insight */}
            <div className="panel ev-insight">
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
            <div className="panel ev-evidence">
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
              <span className="hline" />
              <svg className="harw" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2.25}>
                <path strokeLinecap="round" strokeLinejoin="round" d={I.arrow} />
              </svg>
            </div>

            {/* source rows */}
            <div className="panel ev-source">
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
              <div className="src-foot">
                <Ico d={I.link} size={12} /> <span><b>{c.matchRows}</b> matching rows</span>
              </div>
            </div>
          </div>

          {/* Lineage */}
          <div className="lineage">
            <div className="ln-node"><span className="ln-dot" style={{ background: "#818cf8" }} />Insight</div>
            <span className="ln-conn" />
            <div className="ln-node code">{c.code}</div>
            <span className="ln-conn" />
            <div className="ln-node"><span className="ln-dot" style={{ background: "#7b8ba2" }} />{c.srcFile}</div>
          </div>
        </div>
      </section>

      {/* ══════════ SECTION 4 · FINAL CTA ══════════ */}
      <section className="sec" ref={(el) => { secRefs.current[3] = el; }}>
        <div className="glow" style={{ width: 760, height: 520, background: "#6366f1", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.2 }} />
        <div className="glow" style={{ width: 520, height: 360, background: "#7c3aed", top: "38%", left: "32%", transform: "translate(-50%,-50%)", opacity: 0.14 }} />
        <div className="wrap cta-card">
          <div className="cta-icon"><Ico d={I.shield} size={24} stroke="#818cf8" sw={1.5} /></div>
          <h2 className="cta-h">Insights you can<br />defend in the room</h2>
          <p className="cta-sub">Try the sample dataset, then inspect the evidence behind every insight.</p>
          <div className="cta-row" style={{ justifyContent: "center", marginTop: 38 }}>
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

/* ─── Scoped design CSS (ported from docs/design-reference) ─── */

const CSS = `
.iclp{position:relative;height:100%;overflow-y:auto;overflow-x:hidden;background:#0a0d14;scroll-behavior:smooth;scroll-snap-type:y proximity}
.iclp::-webkit-scrollbar{width:0}
.iclp *{box-sizing:border-box}
.iclp .hidden{display:none}
.iclp .mono{font-family:'JetBrains Mono',monospace}
.iclp .serif{font-family:'Instrument Serif',Georgia,serif}
.iclp a{color:#818cf8;text-decoration:none}
.iclp a:hover{color:#a5b4fc}

.iclp .grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.04;mix-blend-mode:screen;background-size:180px 180px;background-repeat:repeat;filter:grayscale(1) contrast(1.8) brightness(1.1)}
.iclp .grain-deep{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse 900px 700px at 10% 6%,rgba(99,102,241,.14),transparent 60%),radial-gradient(ellipse 800px 900px at 90% 28%,rgba(124,58,237,.13),transparent 60%),radial-gradient(ellipse 1100px 800px at 50% 102%,rgba(20,14,42,.5),transparent 65%)}

/* Soft ambient blend spanning the Evidence → CTA seam. Lives outside both
   sections (siblings clip their own glows via overflow:hidden), positioned at
   the exact section-4 boundary, so the background reads as one continuous
   surface instead of a hard cut between a flat panel and a glow. */
.iclp .seam-blend{position:absolute;left:0;right:0;height:320px;top:calc(56px + 3 * (100vh - 56px) - 160px);pointer-events:none;z-index:0;background:radial-gradient(ellipse 70% 100% at 50% 50%,rgba(99,102,241,.14),rgba(124,58,237,.08) 55%,transparent 78%);filter:blur(50px)}

.iclp .sec{position:relative;z-index:1;min-height:calc(100vh - 56px);scroll-snap-align:start;display:flex;flex-direction:column;justify-content:center;padding:56px;overflow:hidden}
.iclp .wrap{width:100%;max-width:1240px;margin:0 auto}

.iclp .nav{position:sticky;top:0;height:56px;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:rgba(10,13,20,.82);backdrop-filter:blur(14px);border-bottom:1px solid #1c2535;gap:16px}
.iclp .brand{display:flex;align-items:center;gap:10px;font-weight:600;font-size:14px;letter-spacing:-.01em;white-space:nowrap;color:#e4e8ef}
.iclp .brand .sec2{color:#7b8ba2}
.iclp .logo{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#1e2440,#161b2e);border:1px solid #2a3350;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.iclp .navlinks{display:flex;gap:2px;font-size:13px;color:#7b8ba2;font-weight:500;align-items:center}
.iclp .navlink{cursor:pointer;transition:color .15s,background .15s;padding:6px 10px;border-radius:8px;white-space:nowrap;color:#7b8ba2;display:inline-flex;align-items:center;gap:5px}
.iclp .navlink:hover{color:#e4e8ef;background:rgba(255,255,255,.04)}
.iclp .githublink{margin-right:4px}
.iclp .navright{display:flex;align-items:center;gap:4px}
.iclp .signin{font-size:13px;color:#7b8ba2;font-weight:500;cursor:pointer;padding:6px 10px;border-radius:8px;transition:color .15s;white-space:nowrap}
.iclp .signin:hover{color:#e4e8ef}

.iclp .btn{border:0;cursor:pointer;font-family:inherit;font-weight:600;border-radius:10px;transition:transform .12s,box-shadow .2s,background .2s;white-space:nowrap}
.iclp .btn.icon-btn{display:inline-flex;align-items:center;gap:9px}
.iclp .btn-pri{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 6px 22px -8px rgba(99,102,241,.5)}
.iclp .btn-pri:hover{transform:translateY(-1px);box-shadow:0 10px 30px -8px rgba(99,102,241,.7)}
.iclp .btn-ghost{background:#10141e;color:#e4e8ef;border:1px solid #1c2535}
.iclp .btn-ghost:hover{background:#161c2b;border-color:#283248}
.iclp .btn-sm{padding:7px 16px;font-size:13px}
.iclp .btn-lg{padding:13px 28px;font-size:14.5px}

.iclp .dots{position:fixed;right:22px;top:50%;transform:translateY(-50%);z-index:50;display:flex;flex-direction:column;gap:12px}
.iclp .dot{width:8px;height:8px;border-radius:50%;background:#283248;cursor:pointer;transition:all .2s;border:0;padding:0}
.iclp .dot.on{background:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.18);transform:scale(1.2)}

.iclp .glow{position:absolute;border-radius:50%;filter:blur(120px);opacity:.5;pointer-events:none;z-index:0}

.iclp .eyebrow{display:inline-flex;align-items:center;gap:9px;padding:6px 14px;border-radius:100px;border:1px solid #1c2535;background:#10141e;font-size:14px;font-style:italic;font-family:'Instrument Serif',Georgia,serif;font-weight:400;color:#a8b0c4;letter-spacing:.01em}
.iclp .eyebrow .dotp{width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981}
.iclp .kicker{font-family:'Instrument Serif',Georgia,serif;font-style:italic;font-size:15px;font-weight:400;letter-spacing:.01em;text-transform:none;color:#a5b4fc}

.iclp .hero-grid{display:flex;gap:72px;align-items:center;justify-content:center}
.iclp .hero-grid>div:first-child{flex:1.1;min-width:0;max-width:600px}
.iclp .hero-grid .mock{flex-shrink:0}
.iclp .h1{font-family:'Bricolage Grotesque',sans-serif;font-size:clamp(46px,4.9vw,72px);line-height:1.02;font-weight:600;letter-spacing:-.03em;margin:22px 0 0;font-variation-settings:'opsz' 72;color:#e4e8ef}
.iclp .h1 .grad{background:linear-gradient(135deg,#818cf8,#a78bfa,#67e8f9);-webkit-background-clip:text;background-clip:text;color:transparent}
.iclp .sub{font-size:18px;line-height:1.6;color:#7b8ba2;margin:24px 0 0;max-width:480px}
.iclp .cta-row{display:flex;gap:12px;margin-top:30px;flex-wrap:wrap}
.iclp .trust{display:flex;flex-wrap:wrap;align-items:center;gap:20px;margin-top:32px}
.iclp .trust-i{display:flex;align-items:center;gap:6px;font-size:11px;color:#586b82}

.iclp .mock{position:relative;width:100%;max-width:390px;margin-right:56px;padding-bottom:14px}
.iclp .mock::before{content:"";position:absolute;top:20px;right:-22px;bottom:-22px;left:22px;background:linear-gradient(165deg,#171d30,#0c0f1a);border:1px solid #1c2535;border-radius:18px;z-index:0;box-shadow:0 40px 90px -32px rgba(0,0,0,.65)}
.iclp .mock-win{position:relative;z-index:1;background:linear-gradient(180deg,#10141e,#0b0e17);border:1px solid #1c2535;border-radius:16px;overflow:visible;box-shadow:0 30px 80px rgba(0,0,0,.55),0 4px 16px rgba(0,0,0,.35),0 0 70px -22px rgba(99,102,241,.3),inset 0 1px 0 rgba(255,255,255,.04)}
.iclp .mock-bar{height:28px;display:flex;align-items:center;gap:6px;padding:0 12px;border-bottom:1px solid #1c2535;background:#0d111a;border-radius:16px 16px 0 0}
.iclp .mock-body{display:flex}
.iclp .mock-rail{width:42px;flex-shrink:0;background:#080a10;border-right:1px solid #1c2535;display:flex;flex-direction:column;align-items:center;padding:16px 0;gap:12px}
.iclp .mock-rail .ri{width:18px;height:18px;border-radius:6px;background:rgba(255,255,255,.045)}
.iclp .mock-rail .ri.active{background:rgba(99,102,241,.3);box-shadow:0 0 0 1px rgba(99,102,241,.45),0 0 10px -2px rgba(99,102,241,.6)}
.iclp .mock-content{flex:1;min-width:0}
.iclp .mock-crumb{font-size:10px;color:#586b82;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 30px 0}
.iclp .mock-crumb b{color:#9aa3b5;font-weight:600}
.iclp .mock-crumb .sep{color:#3a4560;margin:0 6px}
.iclp .mock-search{display:flex;align-items:center;gap:6px;font-size:10px;color:#4b5872;background:rgba(255,255,255,.025);border:1px solid #1c2535;border-radius:7px;padding:5px 10px;white-space:nowrap}
.iclp .mock-livepill{margin-left:auto;display:flex;align-items:center;gap:5px;font-size:8.5px;color:#34d399;font-weight:600;letter-spacing:.03em}
.iclp .mock-livedot{width:5px;height:5px;border-radius:50%;background:#34d399;box-shadow:0 0 6px #34d399}
.iclp .tdot{width:8px;height:8px;border-radius:50%}
.iclp .mock-simple{padding:20px 30px 40px;position:relative}
.iclp .msrow{display:flex;align-items:center;gap:9px;font-size:12px;color:#7b8ba2;margin-bottom:22px}
.iclp .mscards{display:grid;grid-template-columns:1fr 1fr;gap:16px;position:relative;z-index:2}
.iclp .mscard{background:linear-gradient(160deg,#212a48,#181f36);border:1px solid #3a4770;border-radius:14px;padding:20px 18px;box-shadow:0 34px 64px -16px rgba(0,0,0,.7),0 0 0 1px rgba(99,102,241,.12),0 0 42px -12px rgba(99,102,241,.35),inset 0 1px 0 rgba(255,255,255,.07)}
.iclp .mscard:first-child{transform:translateY(-16px)}
.iclp .mscard:last-child{transform:translateY(6px)}
.iclp .mscard .msl{font-size:12.5px;color:#7b8ba2;margin-bottom:12px}
.iclp .mscard .msv{font-size:30px;font-weight:700;color:#e4e8ef;letter-spacing:-.02em}
.iclp .msnar{font-size:13px;line-height:1.6;color:#9aa3b5;background:#141a2a;border:1px solid #242f4a;border-left:2px solid #6366f1;padding:14px 18px;border-radius:10px;margin:-16px 6px 0;position:relative;z-index:1;box-shadow:0 28px 50px -18px rgba(0,0,0,.7);transform:translateY(20px)}
.iclp .float{position:absolute;background:#161c2b;border:1px solid #2a3350;border-radius:10px;padding:9px 12px;box-shadow:0 22px 48px -16px rgba(0,0,0,.75),0 0 22px -6px rgba(99,102,241,.35);display:flex;align-items:center;gap:8px;font-size:10.5px;font-weight:500;white-space:nowrap;z-index:4;color:#e4e8ef}
.iclp .float .fd{width:5px;height:5px;border-radius:50%}
.iclp .f1{top:-20px;left:26px}
.iclp .f2{top:-20px;right:20px}
.iclp .f3{bottom:-26px;right:30px}

.iclp .sec-head{text-align:center;max-width:640px;margin:0 auto 44px}
.iclp .sec-title{font-family:'Bricolage Grotesque',sans-serif;font-size:36px;font-weight:600;letter-spacing:-.02em;line-height:1.15;margin:14px 0 0;font-variation-settings:'opsz' 40;color:#e4e8ef}
.iclp .sec-sub{font-size:15.5px;color:#7b8ba2;line-height:1.6;margin:14px 0 0}

.iclp .pipe{display:flex;justify-content:space-between;margin-bottom:44px;position:relative}
.iclp .pnode{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center;position:relative;padding:0 6px}
.iclp .pnode:not(:last-child)::after{content:"";position:absolute;top:26px;left:56%;right:-44%;height:1px;background:linear-gradient(90deg,#283248,#283248)}
.iclp .pico{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:20px;border:1px solid;position:relative;z-index:1;background:#0a0d14}
.iclp .pnode h3{font-family:'Bricolage Grotesque',sans-serif;font-size:15.5px;font-weight:600;margin:12px 0 3px;color:#e4e8ef;letter-spacing:-.01em}
.iclp .pnode p{font-size:11px;color:#586b82;margin:0}
.iclp .pnode .idx{font-size:9px;font-family:'JetBrains Mono',monospace;color:#586b82;margin-bottom:8px}

.iclp .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.iclp .card{position:relative;border-radius:12px;border:1px solid #1c2535;background:rgba(255,255,255,.015);padding:16px 14px;overflow:hidden}
.iclp .card .bar{position:absolute;top:0;left:0;right:0;height:2px;opacity:.7}
.iclp .card .ic{width:30px;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;margin-bottom:10px;border:1px solid}
.iclp .card h4{font-family:'Bricolage Grotesque',sans-serif;font-size:14px;font-weight:600;margin:0 0 6px;color:#e4e8ef;letter-spacing:-.005em}
.iclp .card p{font-size:11.5px;color:#7b8ba2;line-height:1.5;margin:0}

.iclp .ev-loop{display:flex;gap:2px;align-items:flex-start;max-width:1080px;margin:0 auto}
.iclp .panel{border-radius:16px;border:1px solid #1c2535;background:#10141e;padding:22px;box-shadow:0 24px 46px -22px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.03)}
.iclp .ev-insight{flex:1.15;min-width:0;transform:translateY(-4px)}
.iclp .ev-evidence{flex:1;min-width:0;background:#121a2c;border-color:rgba(52,211,153,.16);box-shadow:0 30px 56px -22px rgba(0,0,0,.65),0 0 34px -18px rgba(16,185,129,.3),inset 0 1px 0 rgba(255,255,255,.04);transform:translateY(-9px)}
.iclp .ev-source{flex:1;min-width:0;background:#0d111b;transform:translateY(3px)}
.iclp .panel-h{display:flex;align-items:center;gap:8px;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;margin-bottom:16px;color:#586b82}
.iclp .claim{border-radius:11px;padding:14px;margin-bottom:8px;cursor:pointer;transition:background .15s,border-color .15s;border:1px solid transparent}
.iclp .claim:last-child{margin-bottom:0}
.iclp .claim:hover{background:rgba(255,255,255,.03)}
.iclp .claim.on{border-color:rgba(99,102,241,.35);background:rgba(99,102,241,.07)}
.iclp .claim p{font-size:13px;line-height:1.55;color:#8b96aa;margin:0}
.iclp .claim.on p{color:#e4e8ef}
.iclp .claim b{color:#e4e8ef;font-weight:700}
.iclp .claim.on b{color:#e4e8ef}
.iclp .harrow{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:64px;flex-shrink:0;position:relative;align-self:center;margin-top:6px}
.iclp .hline{position:absolute;top:50%;left:0;right:0;height:2px;background:linear-gradient(90deg,rgba(99,102,241,.5),rgba(16,185,129,.6));box-shadow:0 0 10px rgba(16,185,129,.35);border-radius:2px}
.iclp .hpill{display:flex;align-items:center;gap:5px;padding:6px 11px;border-radius:100px;border:1px solid rgba(16,185,129,.5);background:rgba(16,185,129,.12);font-size:9.5px;font-weight:600;color:#34d399;white-space:nowrap;position:relative;z-index:1;box-shadow:0 0 16px rgba(16,185,129,.28)}
.iclp .harw{position:relative;z-index:1;background:#0a0d14;border-radius:4px;padding:2px;filter:drop-shadow(0 0 5px rgba(16,185,129,.5))}
.iclp .etable,.iclp .stable{border-radius:9px;border:1px solid #1c2535;overflow:hidden;font-size:11px}
.iclp .ehd,.iclp .erow{display:grid;grid-template-columns:1.5fr 1fr .7fr}
.iclp .shd,.iclp .srow{display:grid;grid-template-columns:1.3fr .9fr 1fr}
.iclp .ehd,.iclp .shd{background:#161c2b}
.iclp .ehd div,.iclp .shd div{padding:7px 10px;font-size:8.5px;text-transform:uppercase;letter-spacing:.04em;color:#586b82;font-weight:600}
.iclp .erow,.iclp .srow{border-top:1px solid #1c2535}
.iclp .erow div,.iclp .srow div{padding:7px 10px;font-family:'JetBrains Mono',monospace;color:#8b96aa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.iclp .erow.on{background:rgba(16,185,129,.09);box-shadow:inset 2px 0 0 #10b981}
.iclp .erow.on div{color:#e4e8ef}
.iclp .erow.on div:nth-child(2){color:#34d399;font-weight:600}
.iclp .srow.on{background:rgba(99,102,241,.09);box-shadow:inset 2px 0 0 #6366f1}
.iclp .srow.on div{color:#e4e8ef}
.iclp .src-foot{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:10.5px;color:#586b82;font-family:'JetBrains Mono',monospace}
.iclp .src-foot b{color:#818cf8;font-weight:600}
.iclp .lineage{display:flex;align-items:center;justify-content:center;gap:14px;max-width:1080px;margin:26px auto 0;padding-top:22px;border-top:1px solid rgba(28,37,53,.6)}
.iclp .ln-node{display:flex;align-items:center;gap:7px;font-size:11.5px;color:#8b96aa;font-weight:500}
.iclp .ln-node.code{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#818cf8;background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.18);padding:6px 12px;border-radius:8px}
.iclp .ln-dot{width:7px;height:7px;border-radius:50%}
.iclp .ln-conn{width:34px;height:1px;background:linear-gradient(90deg,#283248,#3a4560)}

.iclp .cta-card{max-width:720px;margin:0 auto;text-align:center;position:relative;z-index:1}
.iclp .cta-icon{width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,rgba(99,102,241,.22),rgba(139,92,246,.1));border:1px solid rgba(99,102,241,.28);display:flex;align-items:center;justify-content:center;margin:0 auto 34px;box-shadow:0 0 40px -12px rgba(99,102,241,.4)}
.iclp .cta-h{font-family:'Bricolage Grotesque',sans-serif;font-size:48px;font-weight:600;letter-spacing:-.03em;line-height:1.12;font-variation-settings:'opsz' 48;color:#e4e8ef}
.iclp .cta-sub{font-size:16px;color:#7b8ba2;margin:20px auto 0;max-width:440px;line-height:1.65}
.iclp .footer{position:relative;z-index:1;border-top:1px solid rgba(28,37,53,.6);padding:18px 0;margin-top:36px;text-align:center;font-size:11px;color:#586b82}
.iclp .footer-links{display:flex;justify-content:center;gap:22px;margin-bottom:10px;font-size:12px}
.iclp .footer-links a{color:#7b8ba2}
.iclp .footer-links a:hover{color:#e4e8ef}

@media (max-width:1024px){
  .iclp .hero-grid{flex-direction:column;gap:40px}
  .iclp .mock{margin:0 auto;max-width:420px}
  .iclp .dots{display:none}
}
@media (max-width:820px){
  .iclp .sec{padding:40px 22px}
  .iclp .navlinks{display:none}
  .iclp .pipe{flex-wrap:wrap;gap:20px 0}
  .iclp .pnode{flex:0 0 33.33%}
  .iclp .pnode:not(:last-child)::after{display:none}
  .iclp .cards{grid-template-columns:repeat(2,1fr)}
  .iclp .ev-loop{flex-direction:column;gap:14px}
  .iclp .harrow{width:100%;flex-direction:row;margin:0}
  .iclp .hline{display:none}
  .iclp .cta-h{font-size:36px}
  .iclp .lineage{flex-wrap:wrap}
}
@media (prefers-reduced-motion:reduce){
  .iclp{scroll-behavior:smooth}
}
`;
