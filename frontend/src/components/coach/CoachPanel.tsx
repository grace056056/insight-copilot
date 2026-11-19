/**
 * CoachPanel — the conversational agent. While open it takes the place of
 * the evidence panel on the right side of the workspace.
 *
 * Every Coach reply carries the Evidence its tools computed. The reply
 * shows a verification line (did every number in the text appear in that
 * evidence?), the steps the agent took, and evidence chips that expand to
 * the same table the Evidence panel uses.
 *
 * All user-facing copy for the Coach lives in COPY below.
 */

import { useEffect, useRef, useState } from "react";
import type { CoachFocus, CoachReply, DataProfile } from "../../types";
import type { CoachMessage } from "../../hooks/useCoach";
import { EvidenceTable } from "../evidence/EvidenceTable";
import { HudCorners } from "../shared";

const COPY = {
  title: "Coach",
  demoBadge: "demo mode",
  demoHint: "No API key set, so a keyword router is planning instead of Claude. The computations are the same.",
  greeting: (p: DataProfile) =>
    `I've read ${p.filename}: ${p.row_count.toLocaleString()} rows` +
    (p.date_range ? `, ${p.date_range.start} to ${p.date_range.end}` : "") +
    ". Ask me about it. I plan the analysis, pandas does the math, and every number I give links to its evidence.",
  startersLabel: "Try asking",
  followUpsLabel: "Follow up",
  placeholder: "Ask about your data…",
  thinking: "planning · computing with pandas",
  verified: "every number verified against evidence",
  noNumbers: "no computed figures in this reply",
  unverified: (n: string[]) =>
    `${n.length} number${n.length === 1 ? "" : "s"} not found in evidence: ${n.join(", ")}`,
  nextStep: "Next step",
  focusLabel: "About",
};

const templateLabels: Record<string, string> = {
  revenue_trend: "Revenue Trend",
  category_comparison: "Category Mix",
  top_products: "Product Ranking",
  aov_analysis: "Order Value",
  repeat_purchase: "Customer Retention",
};

export function CoachPanel({
  profile,
  messages,
  pending,
  focus,
  starters,
  mode,
  onAsk,
  onClose,
  onClearFocus,
}: {
  profile: DataProfile;
  messages: CoachMessage[];
  pending: boolean;
  focus: CoachFocus | null;
  starters: string[];
  mode: "claude" | "mock" | null;
  onAsk: (question: string) => void;
  onClose: () => void;
  onClearFocus: () => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, pending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [focus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = () => {
    if (!draft.trim() || pending) return;
    onAsk(draft);
    setDraft("");
  };

  const lastCoach = [...messages].reverse().find((m) => m.role === "coach");
  const followUps =
    !pending && lastCoach?.role === "coach" && messages[messages.length - 1] === lastCoach
      ? lastCoach.reply.suggestions
      : [];

  return (
    <section aria-label={COPY.title} className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-2.5 px-5 h-12 border-b border-border flex-shrink-0">
        <span className="w-1.5 h-1.5 bg-wire rotate-45 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
        <h2 className="text-[13px] font-display font-semibold tracking-tight text-text">{COPY.title}</h2>
        {mode === "mock" && (
          <span
            title={COPY.demoHint}
            className="text-[8.5px] font-mono tracking-[0.12em] uppercase text-thermal-warm
              bg-thermal-warm/10 border border-thermal-warm/25 px-1.5 py-[1px] rounded"
          >
            {COPY.demoBadge}
          </span>
        )}
        <button
          onClick={onClose}
          aria-label="Close Coach"
          className="ml-auto w-7 h-7 flex items-center justify-center rounded-md text-text-muted
            hover:text-text hover:bg-bg-hover transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 wire-grid-fine">
        <p className="text-[12.5px] text-text-secondary leading-[1.7]">{COPY.greeting(profile)}</p>

        {messages.length === 0 && starters.length > 0 && (
          <Suggestions label={COPY.startersLabel} items={starters} onPick={onAsk} />
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] text-[12.5px] leading-[1.6] text-text bg-accent/15 border border-accent/25 rounded-lg rounded-br-sm px-3.5 py-2">
                {m.text}
              </p>
            </div>
          ) : m.role === "coach" ? (
            <CoachBubble key={m.id} reply={m.reply} />
          ) : (
            <p key={m.id} className="text-[12px] text-thermal-hot bg-thermal-hot/10 border border-thermal-hot/25 rounded-md px-3 py-2">
              {m.text}
            </p>
          )
        )}

        {pending && (
          <p className="flex items-center gap-2 text-[10px] font-mono tracking-[0.1em] text-text-muted">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-wire/50 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-wire/80" />
            </span>
            {COPY.thinking}
            <span className="animate-blink text-wire">▍</span>
          </p>
        )}

        {followUps.length > 0 && (
          <Suggestions label={COPY.followUpsLabel} items={followUps} onPick={onAsk} />
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-border px-4 py-3 flex-shrink-0 bg-bg-surface">
        {focus && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-wire bg-wire/10 border border-wire/25 rounded px-2 py-0.5">
              {COPY.focusLabel}: {templateLabels[focus.category] ?? focus.category}
              <button onClick={onClearFocus} aria-label="Remove insight context" className="hover:text-white">
                ×
              </button>
            </span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            rows={1}
            maxLength={500}
            placeholder={COPY.placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="flex-1 resize-none max-h-28 bg-bg-elevated border border-border rounded-lg px-3 py-2
              text-[12.5px] text-text placeholder:text-text-muted outline-none
              focus:border-accent/50 transition-colors"
          />
          <button
            onClick={submit}
            disabled={!draft.trim() || pending}
            aria-label="Send question"
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent text-white
              hover:bg-accent-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─── One Coach reply ─── */

function CoachBubble({ reply }: { reply: CoachReply }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);
  const active = reply.evidence.find((e) => e.id === openId);

  return (
    <div className="relative bg-bg-elevated border border-border rounded-lg p-4 shadow-card animate-fade-in-up">
      <HudCorners tone="wire" />

      <p className="text-[13px] text-text leading-[1.7] whitespace-pre-line">{reply.answer}</p>

      {reply.next_step && (
        <div className="mt-3 rounded-md bg-accent/[0.07] border border-accent/20 px-3 py-2.5">
          <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-indigo-300 mb-1">
            {COPY.nextStep}
          </p>
          <p className="text-[11.5px] text-text-secondary leading-[1.65]">{reply.next_step}</p>
        </div>
      )}

      {/* Verification line — the result of the grounding check */}
      <p
        className={`mt-3 flex items-start gap-1.5 text-[9.5px] font-mono tracking-[0.06em] ${
          !reply.grounded
            ? "text-thermal-warm"
            : reply.evidence.length
            ? "text-emerald-400/90"
            : "text-text-muted"
        }`}
      >
        <span className="mt-[1px]">{!reply.grounded ? "⚠" : reply.evidence.length ? "✓" : "·"}</span>
        {!reply.grounded
          ? COPY.unverified(reply.unverified_numbers)
          : reply.evidence.length
          ? COPY.verified
          : COPY.noNumbers}
      </p>

      {/* Evidence chips */}
      {reply.evidence.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {reply.evidence.map((e) => (
            <button
              key={e.id}
              onClick={() => setOpenId(openId === e.id ? null : e.id)}
              aria-expanded={openId === e.id}
              className={`max-w-full inline-flex items-center gap-1.5 text-[10px] font-mono rounded px-2 py-1 border transition-colors ${
                openId === e.id
                  ? "text-emerald-300 bg-emerald-400/15 border-emerald-400/40"
                  : "text-emerald-400/90 bg-emerald-400/[0.06] border-emerald-400/20 hover:border-emerald-400/40"
              }`}
            >
              <span className="font-semibold">{e.id}</span>
              <span className="truncate text-text-secondary">{e.title}</span>
            </button>
          ))}
          {reply.steps.length > 0 && (
            <button
              onClick={() => setShowSteps((s) => !s)}
              aria-expanded={showSteps}
              className="text-[10px] font-mono text-text-muted hover:text-text-secondary px-1.5 py-1 transition-colors"
            >
              {reply.steps.length} step{reply.steps.length === 1 ? "" : "s"} {showSteps ? "▴" : "▾"}
            </button>
          )}
        </div>
      )}

      {showSteps && (
        <ol className="mt-2 space-y-1 border-l border-border pl-3">
          {reply.steps.map((s, i) => (
            <li key={i} className="text-[10px] font-mono leading-[1.5] text-text-muted">
              <span className={s.ok ? "text-wire/80" : "text-thermal-hot"}>{s.tool}</span>{" "}
              {s.label}
            </li>
          ))}
        </ol>
      )}

      {active && (
        <div className="mt-3 pt-3 border-t border-border/60">
          <p className="text-[10.5px] text-text-secondary leading-[1.6] mb-2">
            {active.evidence.description}
          </p>
          <EvidenceTable data={active.evidence.data} />
        </div>
      )}
    </div>
  );
}

function Suggestions({
  label,
  items,
  onPick,
}: {
  label: string;
  items: string[];
  onPick: (q: string) => void;
}) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-[0.16em] text-text-muted mb-1.5">{label}</p>
      <div className="flex flex-col items-start gap-1.5">
        {items.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="text-left text-[11.5px] text-text-secondary bg-bg-elevated/70 border border-border
              hover:border-accent/40 hover:text-text rounded-md px-2.5 py-1.5 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
