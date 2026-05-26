import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import type { Finding, LighthouseMetric, LighthouseResultSummary } from "./types.js";

const metricIds = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "total-blocking-time",
  "cumulative-layout-shift",
  "speed-index",
  "interactive",
  "server-response-time",
  "render-blocking-resources",
  "unused-javascript",
  "legacy-javascript",
  "uses-long-cache-ttl",
  "uses-text-compression",
];

export async function runLighthouse(url: string, reportDir: string): Promise<LighthouseResultSummary> {
  const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });

  try {
    const runnerResult = await lighthouse(url, {
      port: chrome.port,
      output: ["json", "html"],
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      formFactor: "desktop",
      screenEmulation: { mobile: false, width: 1365, height: 768, deviceScaleFactor: 1, disabled: false },
    });

    if (!runnerResult) {
      throw new Error("Lighthouse returned no result.");
    }

    const jsonReport = Array.isArray(runnerResult.report) ? runnerResult.report[0] : runnerResult.report;
    const htmlReport = Array.isArray(runnerResult.report) ? runnerResult.report[1] : undefined;
    const jsonPath = join(reportDir, "lighthouse.json");
    const htmlPath = htmlReport ? join(reportDir, "lighthouse.html") : undefined;
    await writeFile(jsonPath, jsonReport, "utf8");
    if (htmlPath && htmlReport) {
      await writeFile(htmlPath, htmlReport, "utf8");
    }

    const lhr = runnerResult.lhr;
    const scores = Object.fromEntries(
      Object.entries(lhr.categories).map(([key, category]) => [key, category.score]),
    );
    const metrics = metricIds
      .map((id): LighthouseMetric | undefined => {
        const audit = lhr.audits[id];
        if (!audit) return undefined;
        return {
          id,
          title: audit.title,
          displayValue: audit.displayValue,
          numericValue: typeof audit.numericValue === "number" ? audit.numericValue : undefined,
          score: audit.score,
        };
      })
      .filter((metric): metric is LighthouseMetric => Boolean(metric));

    return { scores, metrics, findings: lighthouseFindings(scores, metrics), artifacts: { jsonPath, htmlPath } };
  } finally {
    await chrome.kill();
  }
}

function lighthouseFindings(scores: Record<string, number | null>, metrics: LighthouseMetric[]): Finding[] {
  const findings: Finding[] = [];

  for (const [category, score] of Object.entries(scores)) {
    if (score !== null && score < 0.8) {
      findings.push({
        category: category === "seo" ? "seo" : category === "accessibility" ? "accessibility" : category === "best-practices" ? "best-practices" : "performance",
        priority: score < 0.5 ? "P0" : "P1",
        title: `Lighthouse ${category} score is ${Math.round(score * 100)}`,
        evidence: `Category score: ${score}`,
        recommendation: `Review failed Lighthouse ${category} audits and address the highest-byte or highest-latency opportunities first.`,
        metric: category,
      });
    }
  }

  for (const metric of metrics) {
    if (metric.score !== null && metric.score !== undefined && metric.score < 0.8) {
      findings.push({
        category: "performance",
        priority: metric.score < 0.5 ? "P0" : "P1",
        title: metric.title,
        evidence: metric.displayValue ?? String(metric.numericValue ?? metric.score),
        recommendation: recommendationForAudit(metric.id),
        metric: metric.id,
      });
    }
  }

  return findings;
}

function recommendationForAudit(id: string): string {
  const recommendations: Record<string, string> = {
    "largest-contentful-paint": "Optimize the LCP element with faster server response, preload, right-sized images, and less render-blocking JavaScript.",
    "total-blocking-time": "Reduce long main-thread tasks by splitting bundles, deferring non-critical scripts, and trimming third-party JavaScript.",
    "cumulative-layout-shift": "Reserve dimensions for media/ad slots and avoid injecting content above existing content after first paint.",
    "render-blocking-resources": "Inline critical CSS and defer non-critical CSS/JS.",
    "unused-javascript": "Remove unused code and ship route-level chunks instead of global bundles.",
    "server-response-time": "Improve TTFB via SSR caching, CDN edge cache, and backend response optimization.",
  };
  return recommendations[id] ?? "Investigate this Lighthouse audit and apply the linked remediation.";
}
