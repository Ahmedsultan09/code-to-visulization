export type TraceOutcome = 'included' | 'excluded' | 'override';

export type TraceTimelineEntry = {
  t?: string;
  action: string;
  source: string;
  condition: string | null;
  outcome: TraceOutcome | string;
  detail?: Record<string, unknown>;
  valuePreview?: Record<string, unknown>;
};

export type TraceFieldEntry = {
  included: boolean;
  timeline: TraceTimelineEntry[];
  finalValuePreview?: Record<string, unknown>;
};

export type TracePayload = {
  version: number;
  requestId: string;
  enabled: boolean;
  resource?: string | null;
  durationMs?: number;
  fields: Record<string, TraceFieldEntry>;
  events?: Array<{
    path: string;
    action: string;
    source: string;
    condition: string | null;
    outcome: string;
    detail?: Record<string, unknown>;
    t?: string;
  }>;
};

export type ApiEnvelope = {
  data?: unknown;
  _trace?: TracePayload;
  [key: string]: unknown;
};
