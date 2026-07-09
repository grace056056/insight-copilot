import { useState } from "react";
import type { DataProfile, SemanticRole } from "../../types";
import { SemanticRoleBadge } from "./SemanticRoleBadge";
import { SectionLabel } from "../shared";

const ALL_ROLES: SemanticRole[] = [
  "order_id", "date", "customer_id", "product", "category",
  "quantity", "discount", "revenue", "region", "channel", "status", "other",
];

/** Compact legend mapping color groups to what they represent. */
const legendItems: { dot: string; label: string }[] = [
  { dot: "bg-violet-400",  label: "Identifier" },
  { dot: "bg-indigo-400",  label: "Date" },
  { dot: "bg-cyan-400",    label: "Dimension" },
  { dot: "bg-emerald-400", label: "Revenue" },
  { dot: "bg-amber-400",   label: "Measure" },
  { dot: "bg-slate-400",   label: "Other" },
];

export function DataProfilePanel({
  profile,
  hasManualOverrides,
  onApplyOverrides,
}: {
  profile: DataProfile;
  hasManualOverrides: boolean;
  onApplyOverrides: (overrides: { name: string; semantic_role: SemanticRole }[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, SemanticRole>>({});

  const dimensions = profile.columns.filter((c) => c.is_dimension);
  const measures = profile.columns.filter((c) => c.is_measure);

  /** Enter edit mode — snapshot current roles into draft. */
  function startEditing() {
    const snapshot: Record<string, SemanticRole> = {};
    profile.columns.forEach((c) => {
      snapshot[c.name] = c.semantic_role;
    });
    setDraft(snapshot);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft({});
    setEditing(false);
  }

  function applyEdits() {
    // Build list of columns that actually changed
    const overrides: { name: string; semantic_role: SemanticRole }[] = [];
    profile.columns.forEach((col) => {
      const newRole = draft[col.name];
      if (newRole && newRole !== col.semantic_role) {
        overrides.push({ name: col.name, semantic_role: newRole });
      }
    });

    setEditing(false);
    setDraft({});

    if (overrides.length > 0) {
      onApplyOverrides(overrides);
    }
  }

  function updateDraft(colName: string, role: SemanticRole) {
    setDraft((prev) => ({ ...prev, [colName]: role }));
  }

  /** Count how many columns differ from the current profile in the draft. */
  const changedCount = editing
    ? profile.columns.filter((c) => draft[c.name] && draft[c.name] !== c.semantic_role).length
    : 0;

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

      {/* Manual override indicator + edit toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>
            Columns ({profile.columns.length})
          </SectionLabel>
          {!editing ? (
            <button
              onClick={startEditing}
              className="text-[10px] text-accent hover:text-accent/80 transition-colors font-medium"
            >
              Edit roles
            </button>
          ) : (
            <span className="text-[10px] text-amber-400 font-medium">
              Editing{changedCount > 0 ? ` · ${changedCount} changed` : ""}
            </span>
          )}
        </div>

        {hasManualOverrides && !editing && (
          <div className="flex items-center gap-1.5 mb-3 px-1">
            <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
            <span className="text-[10px] text-amber-400/80">Manual overrides applied</span>
          </div>
        )}

        {/* Column list — shows all columns in one flat list */}
        <div className="space-y-0.5">
          {profile.columns.map((col) => (
            <div
              key={col.name}
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg hover:bg-bg-hover transition-colors"
            >
              <span className="text-[11px] font-mono text-text truncate flex-1 min-w-0">
                {col.name}
              </span>
              {editing ? (
                <RoleSelect
                  value={draft[col.name] ?? col.semantic_role}
                  onChange={(role) => updateDraft(col.name, role)}
                  isChanged={(draft[col.name] ?? col.semantic_role) !== col.semantic_role}
                />
              ) : (
                <SemanticRoleBadge role={col.semantic_role} />
              )}
            </div>
          ))}
        </div>

        {/* Edit mode action buttons */}
        {editing && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
            <button
              onClick={applyEdits}
              className="flex-1 text-[11px] font-medium text-white bg-accent hover:bg-accent-muted
                px-3 py-1.5 rounded-lg transition-colors"
            >
              Apply{changedCount > 0 ? ` (${changedCount})` : ""}
            </button>
            <button
              onClick={cancelEditing}
              className="flex-1 text-[11px] font-medium text-text-secondary hover:text-text
                bg-bg-elevated hover:bg-bg-hover border border-border
                px-3 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

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

/** Compact dropdown for selecting a semantic role in edit mode. */
function RoleSelect({
  value,
  onChange,
  isChanged,
}: {
  value: SemanticRole;
  onChange: (role: SemanticRole) => void;
  isChanged: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as SemanticRole)}
      className={`text-[10px] font-mono px-1.5 py-1 rounded-md border
        bg-bg-elevated appearance-none cursor-pointer outline-none
        transition-colors flex-shrink-0
        ${
          isChanged
            ? "border-amber-400/40 text-amber-400 bg-amber-400/5"
            : "border-border text-text-secondary hover:border-border-light"
        }`}
      style={{ minWidth: 80 }}
    >
      {ALL_ROLES.map((role) => (
        <option key={role} value={role}>
          {role}
        </option>
      ))}
    </select>
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
