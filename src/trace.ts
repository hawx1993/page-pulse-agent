import type { Page } from "playwright";
import type { Finding, TraceSummary } from "./types.js";

export async function collectTraceSummary(page: Page, timeout: number): Promise<TraceSummary> {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
    if (message.type() === "warning") consoleWarnings.push(message.text());
  });

  await page.waitForLoadState("domcontentloaded", { timeout }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: Math.min(timeout, 15_000) }).catch(() => undefined);

  const data = (await page.evaluate(`(() => {
    const resources = performance.getEntriesByType("resource").map((entry) => {
      const resource = entry;
      return {
        url: resource.name,
        type: resource.initiatorType,
        transferSize: resource.transferSize,
        encodedBodySize: resource.encodedBodySize,
        decodedBodySize: resource.decodedBodySize,
        duration: resource.duration,
      };
    });
    const longTasks = performance.getEntriesByType("longtask").map((entry) => ({
      duration: entry.duration,
      startTime: entry.startTime,
    }));
    return { resources, longTasks };
  })()`)) as Pick<TraceSummary, "resources" | "longTasks">;

  const findings: Finding[] = [];
  const longTaskTotal = data.longTasks.reduce((sum, task) => sum + task.duration, 0);
  if (longTaskTotal > 300) {
    findings.push({
      category: "performance",
      priority: longTaskTotal > 1000 ? "P0" : "P1",
      title: "Main thread has expensive long tasks",
      evidence: `${data.longTasks.length} long tasks, ${Math.round(longTaskTotal)}ms total blocking work observed.`,
      recommendation: "Split expensive JavaScript work, lazy-load non-critical features, and move heavy computation off the main thread.",
      metric: "long-tasks",
    });
  }

  if (consoleErrors.length > 0) {
    findings.push({
      category: "best-practices",
      priority: "P1",
      title: "Console errors detected during page load",
      evidence: consoleErrors.slice(0, 5).join("\n"),
      recommendation: "Fix runtime errors because they can break rendering, analytics, hydration, or SEO-critical content.",
    });
  }

  return { resources: data.resources, longTasks: data.longTasks, consoleErrors, consoleWarnings, findings };
}
