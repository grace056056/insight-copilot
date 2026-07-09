/**
 * hooks/useInsights.ts
 *
 * Custom hook that manages the complete pipeline flow:
 *   load data → profile → generate insights → select insight
 *   + manual role overrides → re-run insights
 */

import { useState, useCallback } from "react";
import type { DataProfile, Insight, SemanticRole } from "../types";
import {
  loadSampleDataset,
  uploadFile,
  generateInsights,
  updateRoles,
} from "../api/client";

export type AppStage = "landing" | "empty" | "loading" | "profiled" | "analyzing" | "ready" | "error";

interface AppState {
  stage: AppStage;
  profile: DataProfile | null;
  insights: Insight[];
  selectedInsightId: string | null;
  error: string | null;
  hasManualOverrides: boolean;
}

export function useInsights() {
  const [state, setState] = useState<AppState>({
    stage: "landing",
    profile: null,
    insights: [],
    selectedInsightId: null,
    error: null,
    hasManualOverrides: false,
  });

  const selectedInsight =
    state.insights.find((i) => i.id === state.selectedInsightId) ?? null;

  /** Load sample dataset and generate insights. */
  const loadSample = useCallback(async () => {
    try {
      setState((s) => ({ ...s, stage: "loading", error: null, hasManualOverrides: false }));

      const { profile } = await loadSampleDataset();
      setState((s) => ({ ...s, stage: "analyzing", profile }));

      const { insights } = await generateInsights();
      setState((s) => ({
        ...s,
        stage: "ready",
        insights,
        selectedInsightId: insights[0]?.id ?? null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        stage: "error",
        error: err instanceof Error ? err.message : "Something went wrong",
      }));
    }
  }, []);

  /** Upload a CSV file and generate insights. */
  const upload = useCallback(async (file: File) => {
    try {
      setState((s) => ({ ...s, stage: "loading", error: null, hasManualOverrides: false }));

      const { profile } = await uploadFile(file);
      setState((s) => ({ ...s, stage: "analyzing", profile }));

      const { insights } = await generateInsights();
      setState((s) => ({
        ...s,
        stage: "ready",
        insights,
        selectedInsightId: insights[0]?.id ?? null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        stage: "error",
        error: err instanceof Error ? err.message : "Upload failed",
      }));
    }
  }, []);

  /** Apply manual role overrides, update backend profile, re-run insights. */
  const applyRoleOverrides = useCallback(
    async (overrides: { name: string; semantic_role: SemanticRole }[]) => {
      try {
        setState((s) => ({ ...s, stage: "analyzing", error: null }));

        const { profile } = await updateRoles(overrides);
        setState((s) => ({ ...s, profile, hasManualOverrides: true }));

        const { insights } = await generateInsights();
        setState((s) => ({
          ...s,
          stage: "ready",
          insights,
          selectedInsightId: insights[0]?.id ?? null,
        }));
      } catch (err) {
        setState((s) => ({
          ...s,
          stage: "ready",
          error: err instanceof Error ? err.message : "Failed to update roles",
        }));
      }
    },
    []
  );

  /** Select an insight to show its evidence. */
  const selectInsight = useCallback((id: string) => {
    setState((s) => ({ ...s, selectedInsightId: id }));
  }, []);

  /** Return to landing page, clearing all state. */
  const reset = useCallback(() => {
    setState({
      stage: "landing",
      profile: null,
      insights: [],
      selectedInsightId: null,
      error: null,
      hasManualOverrides: false,
    });
  }, []);

  return {
    ...state,
    selectedInsight,
    loadSample,
    upload,
    selectInsight,
    reset,
    applyRoleOverrides,
  };
}
