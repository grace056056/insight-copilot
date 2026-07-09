import type { DataProfile } from "../../types";
import { SemanticRoleBadge } from "./SemanticRoleBadge";
import { SectionLabel } from "../shared";

/** Compact legend mapping color groups to what they represent. */
const legendItems: { dot: string; label: string }[] = [
  { dot: "bg-violet-400",  label: "Identifier" },
  { dot: "bg-indigo-400",  label: "Date" },
  { dot: "bg-cyan-400",    label: "Dimension" },
  { dot: "bg-emerald-400", label: "Revenue" },
  { dot: "bg-amber-400",   label: "Measure" },
  { dot: "bg-slate-400",   label: "Other" },
];

export function DataProfilePanel({ profile }: { profile: DataProfile }) {
  const dimensions = profile.columns.filter((c) => c.is_dimension);
  const measures = profile.columns.filter((c) => c.is_measure);

  return (
    <div className="h-full overflow-y-auto p-5 space-y-6">
      {/* Dataset summary card */}
      <div>
        <SectionLabel>Dataset</SectionLabel>
        <div className="bg-bg-elevated rounded-xl border border-border p-4 space-y-3 shadow-card">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-text truncate">
              {profile.filename}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Rows" value={profile.row_count.toLocaleString()} />
            <Stat label="Columns" value={String(profile.column_count)} />
          </div>

          {profile.date_range && (
            <div className="pt-1 border-t border-border/60">
              <p className="text-[11px] text-text-secondary">
                <span className="font-mono text-text">{profile.date_range.start}</span>
                {" → "}
                <span className="font-mono text-text">{profile.date_range.end}</span>
              </p>
              <p className="text-[10px] text-text-muted mt-0.5">
                {profile.date_range.span_days} days of data
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Grain */}
      {profile.grain && (
        <div>
          <SectionLabel>Grain</SectionLabel>
          <p className="text-xs text-text-secondary leading-relaxed">
            {profile.grain}
          </p>
        </div>
      )}

      {/* Role legend */}
      <div>
        <SectionLabel>Role Legend</SectionLabel>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
              <span className="text-[10px] text-text-muted">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      {dimensions.length > 0 && (
        <div>
          <SectionLabel>Dimensions ({dimensions.length})</SectionLabel>
          <div className="space-y-1">
            {dimensions.map((col) => (
              <div
                key={col.name}
                className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-[11.5px] font-mono text-text truncate mr-3">
                  {col.name}
                </span>
                <SemanticRoleBadge role={col.semantic_role} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Measures */}
      {measures.length > 0 && (
        <div>
          <SectionLabel>Measures ({measures.length})</SectionLabel>
          <div className="space-y-1">
            {measures.map((col) => (
              <div
                key={col.name}
                className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-bg-hover transition-colors"
              >
                <span className="text-[11.5px] font-mono text-text truncate mr-3">
                  {col.name}
                </span>
                <SemanticRoleBadge role={col.semantic_role} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health flags */}
      {profile.health_flags.length > 0 && (
        <div>
          <SectionLabel>Data Quality</SectionLabel>
          <div className="space-y-2">
            {profile.health_flags.map((flag, i) => (
              <div
                key={i}
                className={`text-[11.5px] px-3 py-2.5 rounded-lg border ${
                  flag.severity === "warning"
                    ? "border-amber-500/20 bg-amber-500/5 text-amber-300/90"
                    : "border-border bg-bg-elevated text-text-secondary"
                }`}
              >
                <span className="font-mono font-medium">{flag.column}</span>
                <span className="text-text-muted"> — </span>
                {flag.detail}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      {profile.summary && (
        <div>
          <SectionLabel>AI Summary</SectionLabel>
          <p className="text-xs text-text-secondary leading-relaxed">
            {profile.summary}
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg/40 rounded-lg px-3 py-2">
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold font-mono text-text mt-0.5">{value}</p>
    </div>
  );
}