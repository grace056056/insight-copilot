/**
 * types/index.ts
 *
 * TypeScript types mirroring the backend Pydantic schemas.
 * These ensure type safety across the API boundary.
 */

// --- Enums ---

export type DType =
  | "numeric"
  | "categorical"
  | "datetime"
  | "text"
  | "identifier";

export type SemanticRole =
  | "revenue"
  | "quantity"
  | "customer_id"
  | "order_id"
  | "product"
  | "category"
  | "date"
  | "discount"
  | "region"
  | "channel"
  | "status"
  | "other";

export type Priority = "high" | "medium" | "low";
export type ChartType = "bar" | "line" | "pie" | "metric" | "horizontal_bar";
export type FeedbackType = "useful" | "not_useful" | "wrong";

// --- Column Profile ---

export interface TopValue {
  value: string;
  count: number;
  percentage: number;
}

export interface ColumnStats {
  nullable_pct: number;
  unique_count: number;
  total_count: number;
  min?: number | null;
  max?: number | null;
  mean?: number | null;
  median?: number | null;
  std?: number | null;
  top_values?: TopValue[] | null;
}

export interface ColumnProfile {
  name: string;
  dtype: DType;
  semantic_role: SemanticRole;
  stats: ColumnStats;
  is_dimension: boolean;
  is_measure: boolean;
}

// --- Dataset Profile ---

export interface DateRange {
  start: string;
  end: string;
  span_days: number;
}

export interface HealthFlag {
  column: string;
  issue: string;
  detail: string;
  severity: "info" | "warning";
}

export interface DataProfile {
  filename: string;
  row_count: number;
  column_count: number;
  date_range: DateRange | null;
  grain: string | null;
  summary: string | null;
  columns: ColumnProfile[];
  health_flags: HealthFlag[];
}

// --- Evidence ---

export interface Evidence {
  template_used: string;
  description: string;
  data: Record<string, unknown>[];
  chart_type: ChartType;
  x_key: string;
  y_key: string;
  group_key?: string | null;
  highlight?: string | null;
}

// --- Insight ---

export interface Insight {
  id: string;
  text: string;
  priority: Priority;
  confidence: number;
  category: string;
  recommendation: string;
  evidence: Evidence;
  feedback: FeedbackType | null;
}

// --- API Responses ---

export interface UploadResponse {
  profile: DataProfile;
}

export interface InsightsResponse {
  insight_count: number;
  insights: Insight[];
}
