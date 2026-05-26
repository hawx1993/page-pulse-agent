import type { Page } from "playwright";
import type { Finding, WebVitalsSummary } from "./types.js";

export async function installWebVitalsObservers(page: Page): Promise<void> {
  await page.addInitScript(`(() => {
    window.__vitals = { cls: 0 };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) window.__vitals.lcp = last.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__vitals.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const latency = entry.processingStart - entry.startTime;
          window.__vitals.inp = Math.max(window.__vitals.inp || 0, latency);
        }
      }).observe({ type: "event", buffered: true });
    } catch {}
  })()`);
}

export async function collectWebVitals(page: Page): Promise<WebVitalsSummary> {
  const result = (await page.evaluate(`(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const paintEntries = performance.getEntriesByType("paint");
    const paint = Object.fromEntries(paintEntries.map((entry) => [entry.name, entry.startTime]));
    const vitals = window.__vitals;

    return {
      navigation: navigation
        ? {
            domContentLoaded: navigation.domContentLoadedEventEnd,
            loadEventEnd: navigation.loadEventEnd,
            responseStart: navigation.responseStart,
            requestStart: navigation.requestStart,
            transferSize: navigation.transferSize,
          }
        : {},
      paint,
      lcp: vitals?.lcp,
      cls: vitals?.cls,
      inp: vitals?.inp,
      ttfb: navigation ? navigation.responseStart - navigation.requestStart : undefined,
    };
  })()`)) as Omit<WebVitalsSummary, "findings">;

  return { ...result, findings: webVitalsFindings(result) };
}

function webVitalsFindings(vitals: Omit<WebVitalsSummary, "findings">): Finding[] {
  const findings: Finding[] = [];

  if (vitals.lcp && vitals.lcp > 2500) {
    findings.push({
      category: "web-vitals",
      priority: vitals.lcp > 4000 ? "P0" : "P1",
      title: "LCP is slower than the recommended threshold",
      evidence: `Observed LCP: ${Math.round(vitals.lcp)}ms`,
      recommendation: "Identify the LCP element, preload critical assets, optimize images, and reduce render-blocking work before first paint.",
      metric: "LCP",
    });
  }

  if (typeof vitals.cls === "number" && vitals.cls > 0.1) {
    findings.push({
      category: "web-vitals",
      priority: vitals.cls > 0.25 ? "P0" : "P1",
      title: "CLS exceeds the recommended threshold",
      evidence: `Observed CLS: ${vitals.cls.toFixed(3)}`,
      recommendation: "Reserve layout space for late-loading assets and avoid inserting banners or personalized content above existing content.",
      metric: "CLS",
    });
  }

  if (vitals.ttfb && vitals.ttfb > 800) {
    findings.push({
      category: "web-vitals",
      priority: vitals.ttfb > 1800 ? "P0" : "P1",
      title: "TTFB is high",
      evidence: `Observed TTFB: ${Math.round(vitals.ttfb)}ms`,
      recommendation: "Cache SSR output, move static content to CDN edge, and reduce backend latency for the document request.",
      metric: "TTFB",
    });
  }

  return findings;
}
