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
    <div className="h-full overflow-y-auto px-6 py-5">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <SectionLabel>
            Insights ({insights.length})
          </SectionLabel>
          {highCount > 0 && (
            <span className="text-[10px] font-semibold text-priority-high bg-priority-high/10 border border-priority-high/20 px-2.5 py-1 rounded-full tracking-wide">
              {highCount} high priority
            </span>
          )}
        </div>

        {/* Cards */}
        <div className="space-y-3.5 stagger-children">
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
          <p className="text-[10px] text-text-muted tracking-wide">
            Evidence computed by pandas · Narratives by AI · All numbers verified
          </p>
        </div>
      </div>
    </div>
  );
}