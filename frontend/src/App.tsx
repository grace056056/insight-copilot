import { useEffect } from "react";
import { useInsights } from "./hooks/useInsights";
import { useCoach } from "./hooks/useCoach";
import { TopBar } from "./components/layout/TopBar";
import { LandingPage } from "./components/landing/LandingPage";
import { DataProfilePanel } from "./components/data/DataProfilePanel";
import { InsightFeed } from "./components/insights/InsightFeed";
import { EvidencePanel } from "./components/evidence/EvidencePanel";
import { EmptyState, LoadingState, PrimaryButton } from "./components/shared";
import { ConnectionOverlay } from "./components/shared/ConnectionOverlay";
import { CoachPanel } from "./components/coach/CoachPanel";

export default function App() {
  const {
    stage,
    profile,
    insights,
    selectedInsightId,
    selectedInsight,
    error,
    hasManualOverrides,
    loadSample,
    upload,
    selectInsight,
    reset,
    applyRoleOverrides,
  } = useInsights();

  const coach = useCoach();
  const { clear: clearCoach, loadBriefing, close: closeCoach } = coach;

  // A new dataset, or corrected roles, makes the old conversation stale:
  // its evidence was computed from a profile that no longer exists.
  useEffect(() => {
    clearCoach();
    if (stage === "ready" && profile) loadBriefing();
    else closeCoach();
  }, [profile, stage, clearCoach, loadBriefing, closeCoach]);

  if (stage === "landing") {
    // The landing page supplies its own full-width nav (part of the approved
    // design), so the app TopBar is intentionally omitted here.
    return (
      <div className="h-screen flex flex-col bg-bg text-text overflow-hidden">
        <LandingPage onLoadSample={loadSample} onUpload={upload} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg text-text overflow-hidden">
      <TopBar
        stage={stage}
        onHome={reset}
        coachOpen={coach.open}
        onToggleCoach={() => (coach.open ? coach.close() : coach.openCoach())}
      />

      <div className="flex-1 flex overflow-hidden">
        {stage === "error" && (
          <div className="flex-1">
            <EmptyState
              icon={
                <svg className="w-16 h-16 text-thermal-hot/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              }
              title="Something went wrong"
              description={error ?? "An unexpected error occurred."}
              action={
                <PrimaryButton onClick={reset}>
                  Try Again
                </PrimaryButton>
              }
            />
          </div>
        )}

        {(stage === "loading" || stage === "analyzing") && (
          <div className="flex-1">
            <LoadingState
              message={
                stage === "loading"
                  ? "Profiling dataset and detecting semantic roles..."
                  : "Computing evidence and generating insights..."
              }
            />
          </div>
        )}

        {stage === "ready" && profile && (
          <>
            {/* Animated thread from the selected claim to its proof */}
            {/* Hidden while the Coach replaces the evidence panel */}
            <ConnectionOverlay selectedId={coach.open ? null : selectedInsightId} />

            {/* Left panel — data context (what the machine understood) */}
            <aside className="w-[262px] border-r border-border flex-shrink-0 bg-bg-surface glow-seam seam-right panel-enter-left">
              <DataProfilePanel
                profile={profile}
                hasManualOverrides={hasManualOverrides}
                onApplyOverrides={applyRoleOverrides}
              />
            </aside>

            {/* Center panel — insights (where human decisions are made) */}
            <main className="flex-1 min-w-0 bg-bg">
              <InsightFeed
                insights={insights}
                selectedId={selectedInsightId}
                onSelect={selectInsight}
                onAskCoach={(insight) =>
                  coach.openCoach({ category: insight.category, text: insight.text })
                }
              />
            </main>

            {/* Right side — the Coach while it is open, otherwise the evidence panel */}
            {coach.open ? (
              <aside className="w-[440px] border-l border-border flex-shrink-0 bg-bg-surface glow-seam seam-left panel-enter-right">
                <CoachPanel
                  profile={profile}
                  messages={coach.messages}
                  pending={coach.pending}
                  focus={coach.focus}
                  starters={coach.starters}
                  mode={coach.mode}
                  onAsk={coach.ask}
                  onClose={coach.close}
                  onClearFocus={coach.clearFocus}
                />
              </aside>
            ) : (
              <aside
                data-evidence-panel
                className="w-[344px] border-l border-border flex-shrink-0 bg-bg-surface glow-seam seam-left panel-enter-right"
              >
                {selectedInsight ? (
                  // Keyed by insight id: each selection unfolds the panel in depth
                  <div key={selectedInsight.id} className="h-full unfold-in">
                    <EvidencePanel insight={selectedInsight} />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center px-8 gap-3 wire-grid-fine">
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="opacity-50">
                      <circle cx="14" cy="14" r="11" stroke="#56688a" strokeWidth="1" strokeDasharray="3 4" />
                      <circle cx="14" cy="14" r="3" fill="none" stroke="#56688a" strokeWidth="1" />
                    </svg>
                    <p className="text-xs text-text-muted text-center leading-relaxed font-mono tracking-wide">
                      select an insight to trace its evidence
                    </p>
                  </div>
                )}
              </aside>
            )}
          </>
        )}
      </div>
    </div>
  );
}
