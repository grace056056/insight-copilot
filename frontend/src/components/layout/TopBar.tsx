import type { AppStage } from "../../hooks/useInsights";

const stageLabels: Record<AppStage, string> = {
  landing: "",
  empty: "",
  loading: "Profiling dataset...",
  profiled: "Profile complete",
  analyzing: "Generating insights...",
  ready: "Analysis complete",
  error: "Error",
};

/**
 * Mini bar-chart icon for the logo mark.
 * Three bars at different heights suggest analytics/insight.
 */
function LogoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="8" width="2.5" height="5" rx="0.75" fill="rgba(255,255,255,0.5)" />
      <rect x="5.25" y="4" width="2.5" height="9" rx="0.75" fill="rgba(255,255,255,0.8)" />
      <rect x="9.5" y="1" width="2.5" height="12" rx="0.75" fill="white" />
    </svg>
  );
}

export function TopBar({
  stage,
  onHome,
}: {
  stage: AppStage;
  onHome?: () => void;
}) {
  const showNav = stage !== "landing";

  return (
    <header className="h-[52px] border-b border-border flex items-center justify-between px-5 flex-shrink-0 bg-bg-surface/80 backdrop-blur-sm">
      <div className="flex items-center gap-4">

        {/* ── Brand: logo mark + wordmark as one clickable unit ── */}
        <button
          onClick={onHome}
          className="flex items-center gap-2.5 group -ml-1 px-1 py-1 rounded-lg
            hover:bg-bg-elevated/60 transition-colors"
          aria-label="Return to home"
        >
          {/* Logo mark */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
              bg-gradient-to-br from-[#1e2440] to-[#161b2e]
              border border-[#2a3350]
              shadow-[0_0_12px_rgba(99,102,241,0.08)]
              group-hover:border-accent/30
              group-hover:shadow-[0_0_16px_rgba(99,102,241,0.15)]
              transition-all duration-200"
          >
            <LogoIcon />
          </div>

          {/* Wordmark */}
          <div className="flex items-baseline gap-0">
            <span className="text-[14px] font-semibold tracking-tight text-text
              group-hover:text-white transition-colors">
              Insight
            </span>
            <span className="text-[14px] font-semibold tracking-tight text-text-secondary
              group-hover:text-text transition-colors ml-[3px]">
              Copilot
            </span>
          </div>

          {/* Version */}
          <span className="text-[8.5px] text-text-muted/70 bg-bg-elevated/80 border border-border/60
            px-1.5 py-[1px] rounded font-mono tracking-wider ml-0.5">
            v0.1
          </span>
        </button>

        {/* ── Navigation: Home button (secondary, spaced from brand) ── */}
        {showNav && (
          <div className="flex items-center gap-2 ml-2 pl-3 border-l border-border/50">
            <button
              onClick={onHome}
              className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text
                hover:bg-bg-hover border border-transparent hover:border-border
                px-2 py-1 rounded-md transition-all"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Home
            </button>
          </div>
        )}
      </div>

      {/* ── Right: pipeline status ── */}
      {showNav && (
        <div className="flex items-center gap-2.5">
          {(stage === "loading" || stage === "analyzing") && (
            <div className="w-3.5 h-3.5 border-[1.5px] border-accent border-t-transparent rounded-full animate-spin" />
          )}
          {stage === "ready" && (
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
          )}
          {stage === "error" && (
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_rgba(244,63,94,0.4)]" />
          )}
          <span className="text-[11px] text-text-secondary">
            {stageLabels[stage]}
          </span>
        </div>
      )}
    </header>
  );
}