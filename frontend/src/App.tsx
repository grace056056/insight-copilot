import { useInsights } from "./hooks/useInsights";
import { TopBar } from "./components/layout/TopBar";
import { LandingPage } from "./components/landing/LandingPage";
import { DataProfilePanel } from "./components/data/DataProfilePanel";
import { InsightFeed } from "./components/insights/InsightFeed";
import { EvidencePanel } from "./components/evidence/EvidencePanel";
import { EmptyState, LoadingState, PrimaryButton } from "./components/shared";

export default function App() {
  const {
    stage,
    profile,
    insights,
    selectedInsightId,
    selectedInsight,
    error,
    loadSample,
    upload,
    selectInsight,
    reset,
  } = useInsights();

  if (stage === "landing") {
    return (
      <div className="h-screen flex flex-col bg-bg text-text overflow-hidden">
        <TopBar stage={stage} />
        <div className="flex-1 overflow-hidden">
          <LandingPage onLoadSample={loadSample} onUpload={upload} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-bg text-text overflow-hidden">
      <TopBar stage={stage} onHome={reset} />

      <div className="flex-1 flex overflow-hidden">
        {stage === "error" && (
          <div className="flex-1">
            <EmptyState
              icon={
                <svg className="w-16 h-16 text-red-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              }
              title="Something went wrong"
              description={error ?? "An unexpected error occurred."}
              action={
                <PrimaryButton onClick={loadSample}>
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
            {/* Left panel */}
            <aside className="w-[258px] border-r border-border flex-shrink-0 bg-bg-surface">
              <DataProfilePanel profile={profile} />
            </aside>

            {/* Center panel */}
            <main className="flex-1 min-w-0 bg-bg">
              <InsightFeed
                insights={insights}
                selectedId={selectedInsightId}
                onSelect={selectInsight}
              />
            </main>

            {/* Right panel */}
            <aside className="w-[340px] border-l border-border flex-shrink-0 bg-bg-surface">
              {selectedInsight ? (
                <EvidencePanel insight={selectedInsight} />
              ) : (
                <div className="h-full flex items-center justify-center px-8">
                  <p className="text-xs text-text-muted text-center leading-relaxed">
                    Select an insight to view its evidence
                  </p>
                </div>
              )}
            </aside>
          </>
        )}
      </div>
    </div>
  );
}