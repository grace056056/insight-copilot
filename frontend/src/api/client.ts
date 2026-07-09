/**
 * api/client.ts
 *
 * Typed API client for the Insight Copilot backend.
 * All backend calls go through this file — no fetch() elsewhere.
 */

import type { UploadResponse, InsightsResponse, SemanticRole } from "../types";

const BASE = "/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || "Request failed");
  }

  return res.json();
}

/** Load the built-in sample e-commerce dataset. */
export async function loadSampleDataset(): Promise<UploadResponse> {
  return request<UploadResponse>("/sample-dataset");
}

/** Upload a CSV file. */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail || "Upload failed");
  }
  return res.json();
}

/** Generate insights from the currently loaded dataset. */
export async function generateInsights(): Promise<InsightsResponse> {
  return request<InsightsResponse>("/insights", { method: "POST" });
}

/** Apply manual semantic role overrides and get the updated profile. */
export async function updateRoles(
  overrides: { name: string; semantic_role: SemanticRole }[]
): Promise<UploadResponse> {
  return request<UploadResponse>("/update-roles", {
    method: "POST",
    body: JSON.stringify({ overrides }),
  });
}
