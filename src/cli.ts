#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { Command } from "commander";
import { analyzeChunks } from "./chunks.js";
import { getAiApiKey, normalizeOptions, normalizeUrl } from "./config.js";
import { generateAiSummary } from "./ai.js";
import { launchBrowser } from "./browser.js";
import { runLighthouse } from "./lighthouse.js";
import { createReportDir, writeReports } from "./report.js";
import { analyzeRendering } from "./rendering.js";
import { analyzeSeo } from "./seo.js";
import { collectTraceSummary } from "./trace.js";
import { collectWebVitals, installWebVitalsObservers } from "./webVitals.js";
import type { AnalysisResult, Finding } from "./types.js";

const program = new Command();

program
  .name("frontend-audit-agent")
  .description("AI agent for SEO, Lighthouse, Web Vitals, SSR/hydration, and chunk analysis.")
  .argument("<input>", "URL, domain, or natural language containing a URL/domain")
  .option("-o, --output <dir>", "output directory", "reports")
  .option("-f, --format <format>", "markdown, json, or both", "both")
  .option("--timeout <ms>", "navigation timeout in milliseconds", "45000")
  .option("--no-ai", "skip Anthropic AI summary")
  .option("--headed", "show browser window")
  .action(async (input, rawOptions) => {
    const started = performance.now();
    const options = normalizeOptions(rawOptions);
    const url = normalizeUrl(input);
    const reportDir = await createReportDir(options.output, url);

    console.log(`Analyzing ${url}`);
    console.log(`Report directory: ${reportDir}`);

    let session: Awaited<ReturnType<typeof launchBrowser>> | undefined;
    try {
      session = await launchBrowser(options.headed);
      await installWebVitalsObservers(session.page);

      const response = await session.page.goto(url, { waitUntil: "commit", timeout: options.timeout });
      if (!response) throw new Error("Navigation produced no response.");
      await session.page.waitForLoadState("domcontentloaded", { timeout: Math.min(options.timeout, 20_000) }).catch(() => undefined);
      const initialHtml = await response.text().catch(() => "");

      const [trace, seo, webVitals, lighthouse] = await Promise.all([
        collectTraceSummary(session.page, options.timeout),
        analyzeSeo(session.page),
        collectWebVitals(session.page),
        runLighthouse(url, reportDir).catch((error: unknown) => {
          console.warn(`Lighthouse failed: ${error instanceof Error ? error.message : String(error)}`);
          return undefined;
        }),
      ]);

      const rendering = await analyzeRendering(session.page, initialHtml, [...trace.consoleErrors, ...trace.consoleWarnings]);
      const chunks = analyzeChunks(trace.resources);
      const findings = sortFindings([
        ...(lighthouse?.findings ?? []),
        ...trace.findings,
        ...webVitals.findings,
        ...seo.findings,
        ...rendering.findings,
        ...chunks.findings,
      ]);

      const baseResult: Omit<AnalysisResult, "aiSummary"> = {
        url,
        analyzedAt: new Date().toISOString(),
        durationMs: performance.now() - started,
        lighthouse,
        trace,
        webVitals,
        seo,
        rendering,
        chunks,
        findings,
        reportDir,
      };
      const aiSummary = options.ai ? await generateAiSummary(baseResult, getAiApiKey()) : undefined;
      const result: AnalysisResult = { ...baseResult, aiSummary };

      await writeReports(result, options.format);
      console.log(`Done. Open ${reportDir}/report.md`);
    } finally {
      await session?.browser.close();
    }
  });

program.parseAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

function sortFindings(findings: Finding[]): Finding[] {
  const order: Record<Finding["priority"], number> = { P0: 0, P1: 1, P2: 2 };
  return findings.sort((a, b) => order[a.priority] - order[b.priority] || a.category.localeCompare(b.category));
}
