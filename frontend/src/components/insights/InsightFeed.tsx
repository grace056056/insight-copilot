import type { Insight } from "../../types";
import { InsightCard } from "./InsightCard";
import { SectionLabel } from "../shared";

export function InsightFeed({
  insights,
  selectedId,
  onSelect,
}: {
  insights: Insight[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const highCount = insights.filter((i) => i.priority === "high").length;

  return (
    <div className="h-full overflow-y-auto px-6 py-5 wire-grid">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>
            Insights ({insights.length})
          </SectionLabel>
          {highCount > 0 && (
            <span
              className="text-[9.5px] font-mono font-semibold text-thermal-hot bg-thermal-hot/10
                border border-thermal-hot/25 px-2.5 py-1 rounded-full tracking-[0.1em]
                shadow-glow-hot"
            >
              {highCount} RUNNING HOT
            </span>
          )}
        </div>

        {/* Cards */}
        {/* A shallow 3D space so per-card hover tilt reads as depth */}
        <div className="space-y-3.5 stagger-children depth-space">
          {insights.map((insight) => (
            <div key={insight.id} className="animate-fade-in-up">
              <InsightCard
                insight={insight}
                isSelected={insight.id === selectedId}
                onClick={() => onSelect(insight.id)}
              />
            </div>
          ))}
        </div>

        {/* Attribution */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-text-muted tracking-[0.08em] font-mono">
            evidence computed by pandas · narratives by AI · all numbers verified
          </p>
        </div>
      </div>
    </div>
  );
}
