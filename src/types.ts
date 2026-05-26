export type Priority = "P0" | "P1" | "P2";
export type FindingCategory =
  | "performance"
  | "web-vitals"
  | "hydration"
  | "ssr"
  | "chunks"
  | "seo"
  | "accessibility"
  | "best-practices";

export interface Finding {
  category: FindingCategory;
  priority: Priority;
  title: string;
  evidence: string;
  recommendation: string;
  metric?: string;
}

export interface LighthouseMetric {
  id: string;
  title: string;
  displayValue?: string;
  numericValue?: number;
  score?: number | null;
}

export interface LighthouseResultSummary {
  scores: Record<string, number | null>;
  metrics: LighthouseMetric[];
  findings: Finding[];
  artifacts: {
    jsonPath?: string;
    htmlPath?: string;
  };
}

export interface NetworkResource {
  url: string;
  type: string;
  status?: number;
  transferSize?: number;
  encodedBodySize?: number;
  decodedBodySize?: number;
  duration?: number;
  cacheControl?: string;
  contentType?: string;
}

export interface TraceSummary {
  resources: NetworkResource[];
  longTasks: Array<{ duration: number; startTime: number }>;
  consoleErrors: string[];
  consoleWarnings: string[];
  findings: Finding[];
}

export interface WebVitalsSummary {
  navigation: Record<string, number | undefined>;
  paint: Record<string, number | undefined>;
  lcp?: number;
  cls?: number;
  inp?: number;
  ttfb?: number;
  findings: Finding[];
}

export interface SeoSummary {
  title?: string;
  titleLength: number;
  metaDescription?: string;
  metaDescriptionLength: number;
  canonical?: string;
  robots?: string;
  h1: string[];
  h2Count: number;
  imageCount: number;
  imagesMissingAlt: number;
  structuredDataCount: number;
  hreflangCount: number;
  internalLinks: number;
  externalLinks: number;
  findings: Finding[];
}

export interface RenderingSummary {
  initialHtmlLength: number;
  renderedTextLength: number;
  frameworkMarkers: string[];
  probableSsr: boolean;
  hydrationWarnings: string[];
  findings: Finding[];
}

export interface ChunkSummary {
  scripts: NetworkResource[];
  totalTransferSize: number;
  largeScripts: NetworkResource[];
  uncachedScripts: NetworkResource[];
  findings: Finding[];
}

export interface AnalysisResult {
  url: string;
  analyzedAt: string;
  durationMs: number;
  lighthouse?: LighthouseResultSummary;
  trace: TraceSummary;
  webVitals: WebVitalsSummary;
  seo: SeoSummary;
  rendering: RenderingSummary;
  chunks: ChunkSummary;
  findings: Finding[];
  aiSummary?: string;
  reportDir: string;
}

export interface CliOptions {
  output: string;
  format: "markdown" | "json" | "both";
  timeout: number;
  ai: boolean;
  headed: boolean;
}
