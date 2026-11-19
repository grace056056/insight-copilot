/**
 * hooks/useCoach.ts
 *
 * State for the Coach conversation: the message list, the open/closed
 * drawer, the insight it was opened from, and the ask() round trip.
 *
 * The conversation lives only in the browser. Each question is sent with
 * the recent turns so the backend can stay stateless.
 */

import { useCallback, useRef, useState } from "react";
import type { ChatTurn, CoachFocus, CoachReply } from "../types";
import { askCoach, getCoachBriefing } from "../api/client";

export type CoachMessage =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "coach"; reply: CoachReply }
  | { id: number; role: "error"; text: string };

const HISTORY_TURNS = 6;

function toHistory(messages: CoachMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of messages) {
    if (m.role === "user") turns.push({ role: "user", content: m.text });
    if (m.role === "coach") {
      const next = m.reply.next_step ? `\nNext step: ${m.reply.next_step}` : "";
      turns.push({ role: "assistant", content: m.reply.answer + next });
    }
  }
  return turns.slice(-HISTORY_TURNS);
}

export function useCoach() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [focus, setFocus] = useState<CoachFocus | null>(null);
  const [starters, setStarters] = useState<string[]>([]);
  const [mode, setMode] = useState<"claude" | "mock" | null>(null);

  const nextId = useRef(1);
  // Bumped by clear(): a reply that arrives for an old dataset is dropped.
  const generation = useRef(0);
  const messagesRef = useRef<CoachMessage[]>([]);
  messagesRef.current = messages;

  const loadBriefing = useCallback(async () => {
    const gen = generation.current;
    try {
      const briefing = await getCoachBriefing();
      if (generation.current !== gen) return;
      setStarters(briefing.suggestions);
      setMode(briefing.mode);
    } catch {
      // The Coach still works without starter questions.
    }
  }, []);

  const openCoach = useCallback((withFocus?: CoachFocus) => {
    if (withFocus) setFocus(withFocus);
    setOpen(true);
  }, []);

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text || pending) return;

      const gen = generation.current;
      const history = toHistory(messagesRef.current);
      setMessages((m) => [...m, { id: nextId.current++, role: "user", text }]);
      setPending(true);

      try {
        const reply = await askCoach(text, history, focus);
        if (generation.current !== gen) return;
        setMode(reply.mode);
        setMessages((m) => [...m, { id: nextId.current++, role: "coach", reply }]);
      } catch (err) {
        if (generation.current !== gen) return;
        setMessages((m) => [
          ...m,
          {
            id: nextId.current++,
            role: "error",
            text: err instanceof Error ? err.message : "Pip could not answer that.",
          },
        ]);
      } finally {
        if (generation.current === gen) setPending(false);
      }
    },
    [focus, pending]
  );

  /** Forget the conversation — called whenever the dataset or its roles change. */
  const clear = useCallback(() => {
    generation.current += 1;
    setMessages([]);
    setFocus(null);
    setStarters([]);
    setPending(false);
  }, []);

  return {
    open,
    messages,
    pending,
    focus,
    starters,
    mode,
    openCoach,
    close: useCallback(() => setOpen(false), []),
    clearFocus: useCallback(() => setFocus(null), []),
    ask,
    clear,
    loadBriefing,
  };
}
