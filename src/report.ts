import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AnalysisResult, Finding } from "./types.js";

export async function createReportDir(outputRoot: string, url: string): Promise<string> {
  const host = new URL(url).hostname.replace(/[^a-z0-9.-]/gi, "-");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportDir = join(outputRoot, `${stamp}-${host}`);
  await mkdir(reportDir, { recursive: true });
  return reportDir;
}

export async function writeReports(result: AnalysisResult, format: "markdown" | "json" | "both"): Promise<void> {
  if (format === "json" || format === "both") {
    await writeFile(join(result.reportDir, "report.json"), JSON.stringify(result, null, 2), "utf8");
  }
  if (format === "markdown" || format === "both") {
    await writeFile(join(result.reportDir, "report.md"), renderMarkdownReport(result), "utf8");
  }
}

export function renderMarkdownReport(result: AnalysisResult): string {
  const lines: string[] = [];
  lines.push(`# SEO 与性能分析报告`);
  lines.push("");
  lines.push(`- URL: ${result.url}`);
  lines.push(`- 分析时间: ${result.analyzedAt}`);
  lines.push(`- 耗时: ${Math.round(result.durationMs / 1000)}s`);
  lines.push(`- 报告目录: ${result.reportDir}`);
  lines.push("");

  lines.push("## AI 汇总");
  lines.push("");
  lines.push(result.aiSummary ?? "未配置 DEEPSEEK_API_KEY，已跳过 AI 汇总；以下为规则引擎分析结果。");
  lines.push("");

  lines.push("## 核心指标");
  lines.push("");
  if (result.lighthouse) {
    lines.push("### Lighthouse Scores");
    lines.push("");
    for (const [name, score] of Object.entries(result.lighthouse.scores)) {
      lines.push(`- ${name}: ${score === null ? "N/A" : Math.round(score * 100)}`);
    }
    lines.push("");
    lines.push("### Lighthouse Metrics");
    lines.push("");
    for (const metric of result.lighthouse.metrics) {
      lines.push(`- ${metric.title}: ${metric.displayValue ?? metric.numericValue ?? "N/A"}`);
    }
  } else {
    lines.push("Lighthouse 未成功运行。");
  }
  lines.push("");

  lines.push("### Web Vitals / Navigation");
  lines.push("");
  lines.push(`- LCP: ${formatMs(result.webVitals.lcp)}`);
  lines.push(`- CLS: ${typeof result.webVitals.cls === "number" ? result.webVitals.cls.toFixed(3) : "N/A"}`);
  lines.push(`- INP-like latency: ${formatMs(result.webVitals.inp)}`);
  lines.push(`- TTFB: ${formatMs(result.webVitals.ttfb)}`);
  lines.push("");

  lines.push("## 分析分区");
  lines.push("");
  lines.push("### SSR / Hydration");
  lines.push(`- Probable SSR: ${result.rendering.probableSsr ? "yes" : "no"}`);
  lines.push(`- Framework markers: ${result.rendering.frameworkMarkers.join(", ") || "N/A"}`);
  lines.push(`- Hydration warnings: ${result.rendering.hydrationWarnings.length}`);
  lines.push("");

  lines.push("### Chunk / Bundle");
  lines.push(`- Script count: ${result.chunks.scripts.length}`);
  lines.push(`- JS transfer size: ${formatBytes(result.chunks.totalTransferSize)}`);
  lines.push(`- Large scripts: ${result.chunks.largeScripts.length}`);
  lines.push("");

  lines.push("### SEO");
  lines.push(`- Title (${result.seo.titleLength}): ${result.seo.title ?? "N/A"}`);
  lines.push(`- Meta description length: ${result.seo.metaDescriptionLength}`);
  lines.push(`- Canonical: ${result.seo.canonical ?? "N/A"}`);
  lines.push(`- H1 count: ${result.seo.h1.length}`);
  lines.push(`- Structured data blocks: ${result.seo.structuredDataCount}`);
  lines.push(`- Images missing alt: ${result.seo.imagesMissingAlt}/${result.seo.imageCount}`);
  lines.push("");

  lines.push("## 优化优先级");
  lines.push("");
  for (const priority of ["P0", "P1", "P2"] as const) {
    const findings = result.findings.filter((finding) => finding.priority === priority);
    lines.push(`### ${priority}`);
    lines.push("");
    if (findings.length === 0) {
      lines.push("- 暂无");
    } else {
      for (const finding of findings) lines.push(formatFinding(finding));
    }
    lines.push("");
  }

  lines.push("## 原始产物");
  lines.push("");
  if (result.lighthouse?.artifacts.jsonPath) lines.push(`- Lighthouse JSON: ${result.lighthouse.artifacts.jsonPath}`);
  if (result.lighthouse?.artifacts.htmlPath) lines.push(`- Lighthouse HTML: ${result.lighthouse.artifacts.htmlPath}`);
  lines.push(`- JSON report: ${join(result.reportDir, "report.json")}`);

  return `${lines.join("\n")}\n`;
}

function formatFinding(finding: Finding): string {
  return [`- **${finding.title}** (${finding.category}${finding.metric ? ` / ${finding.metric}` : ""})`, `  - 证据: ${finding.evidence}`, `  - 建议: ${finding.recommendation}`].join("\n");
}

function formatMs(value?: number): string {
  return typeof value === "number" ? `${Math.round(value)}ms` : "N/A";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
