import type { AppStage } from "../../hooks/useInsights";
import { LogoMark } from "../shared";

const stageLabels: Record<AppStage, string> = {
  landing: "",
  empty: "",
  loading: "profiling dataset",
  profiled: "profile complete",
  analyzing: "generating insights",
  ready: "analysis complete",
  error: "error",
};

export function TopBar({
  stage,
  onHome,
}: {
  stage: AppStage;
  onHome?: () => void;
}) {
  const showNav = stage !== "landing";

  return (
    <header className="h-[52px] border-b border-border flex items-center justify-between px-5 flex-shrink-0 bg-bg-surface/80 backdrop-blur-sm relative">
      {/* Glowing baseline seam under the bar */}
      <div
        className="absolute bottom-[-1px] left-0 right-0 h-px pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(99,102,241,0.4) 30%, rgba(34,211,238,0.35) 70%, transparent)",
        }}
      />

      <div className="flex items-center gap-4">
        {/* ── Brand: logo mark + wordmark as one clickable unit ── */}
        <button
          onClick={onHome}
          className="flex items-center gap-2.5 group -ml-1 px-1 py-1 rounded-lg
            hover:bg-bg-elevated/60 transition-colors"
          aria-label="Return to home"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
              bg-gradient-to-br from-[#141b33] to-[#0c1223]
              border border-[#263455]
              shadow-[0_0_12px_rgba(99,102,241,0.1)]
              group-hover:border-accent/40
              group-hover:shadow-[0_0_16px_rgba(99,102,241,0.2)]
              transition-all duration-200"
          >
            <LogoMark size={18} />
          </div>

          <div className="flex items-baseline gap-0">
            <span className="text-[14px] font-semibold font-display tracking-tight text-text
              group-hover:text-white transition-colors">
              Insight
            </span>
            <span className="text-[14px] font-semibold font-display tracking-tight text-text-secondary
              group-hover:text-text transition-colors ml-[3px]">
              Copilot
            </span>
          </div>

          <span className="text-[8.5px] text-text-muted/70 bg-bg-elevated/80 border border-border/60
            px-1.5 py-[1px] rounded font-mono tracking-wider ml-0.5">
            v0.2
          </span>
        </button>

        {/* ── Navigation: Home button ── */}
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

      {/* ── Right: telemetry-style pipeline status ── */}
      {showNav && (
        <div className="flex items-center gap-2.5 font-mono">
          {(stage === "loading" || stage === "analyzing") && (
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-wire/50 animate-ping" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-wire/80" />
            </span>
          )}
          {stage === "ready" && (
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
          )}
          {stage === "error" && (
            <div className="w-2 h-2 rounded-full bg-thermal-core shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
          )}
          <span className="text-[10px] tracking-[0.14em] uppercase text-text-secondary">
            {stageLabels[stage]}
            {(stage === "loading" || stage === "analyzing") && (
              <span className="animate-blink text-wire ml-0.5">▍</span>
            )}
          </span>
        </div>
      )}
    </header>
  );
}
