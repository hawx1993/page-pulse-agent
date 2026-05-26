import type { Page } from "playwright";
import type { Finding, RenderingSummary } from "./types.js";

export async function analyzeRendering(page: Page, initialHtml: string, consoleMessages: string[]): Promise<RenderingSummary> {
  const rendered = (await page.evaluate(`(() => {
    const html = document.documentElement.outerHTML;
    const text = document.body?.innerText ?? "";
    const markers = [];
    if (document.querySelector("#__next") || html.includes("__NEXT_DATA__")) markers.push("Next.js");
    if (document.querySelector("#root") || document.querySelector("#app")) markers.push("SPA root");
    if (html.includes("data-reactroot") || html.includes("data-react-helmet")) markers.push("React");
    if (html.includes("ng-version")) markers.push("Angular");
    if (html.includes("data-v-") || html.includes("__NUXT__")) markers.push("Vue/Nuxt");
    if (html.includes("astro-island")) markers.push("Astro");
    return { htmlLength: html.length, textLength: text.trim().length, markers };
  })()`)) as { htmlLength: number; textLength: number; markers: string[] };

  const hydrationWarnings = consoleMessages.filter((message) =>
    /hydration|hydrate|did not match|server html|text content does not match|recoverable error/i.test(message),
  );
  const initialTextSignal = initialHtml.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "").trim().length;
  const probableSsr = initialTextSignal > 500 || initialHtml.includes("__NEXT_DATA__") || initialHtml.includes("__NUXT__");

  const summary: RenderingSummary = {
    initialHtmlLength: initialHtml.length,
    renderedTextLength: rendered.textLength,
    frameworkMarkers: rendered.markers,
    probableSsr,
    hydrationWarnings,
    findings: [],
  };
  summary.findings = renderingFindings(summary, initialTextSignal);
  return summary;
}

function renderingFindings(summary: RenderingSummary, initialTextSignal: number): Finding[] {
  const findings: Finding[] = [];

  if (!summary.probableSsr && summary.renderedTextLength > 500) {
    findings.push({
      category: "ssr",
      priority: "P1",
      title: "Page appears to rely heavily on client-side rendering",
      evidence: `Initial HTML text signal: ${initialTextSignal} chars, rendered text: ${summary.renderedTextLength} chars.`,
      recommendation: "Use SSR/SSG for indexable above-the-fold content and hydrate only interactive islands where possible.",
      metric: "ssr",
    });
  }

  if (summary.hydrationWarnings.length > 0) {
    findings.push({
      category: "hydration",
      priority: "P0",
      title: "Hydration warnings or mismatches detected",
      evidence: summary.hydrationWarnings.slice(0, 5).join("\n"),
      recommendation: "Fix server/client markup mismatches, unstable time/random values, and client-only branches rendered during SSR.",
      metric: "hydration",
    });
  }

  return findings;
}
