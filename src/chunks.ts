import type { ChunkSummary, Finding, NetworkResource } from "./types.js";

export function analyzeChunks(resources: NetworkResource[]): ChunkSummary {
  const scripts = resources.filter((resource) => resource.type === "script" || /\.m?js(?:\?|$)/i.test(resource.url));
  const totalTransferSize = scripts.reduce((sum, script) => sum + (script.transferSize ?? script.encodedBodySize ?? 0), 0);
  const largeScripts = scripts.filter((script) => (script.transferSize ?? script.encodedBodySize ?? 0) > 250_000);
  const uncachedScripts = scripts.filter((script) => script.cacheControl && !/(max-age|immutable|s-maxage)/i.test(script.cacheControl));
  const findings: Finding[] = [];

  if (totalTransferSize > 1_000_000) {
    findings.push({
      category: "chunks",
      priority: totalTransferSize > 2_000_000 ? "P0" : "P1",
      title: "JavaScript transfer size is high",
      evidence: `${scripts.length} scripts transferred about ${formatBytes(totalTransferSize)} before cache effects.`,
      recommendation: "Audit route-level bundles, remove unused dependencies, defer third-party scripts, and lazy-load below-the-fold features.",
      metric: "js-transfer-size",
    });
  }

  if (largeScripts.length > 0) {
    findings.push({
      category: "chunks",
      priority: "P1",
      title: "Large JavaScript chunks detected",
      evidence: largeScripts.slice(0, 5).map((script) => `${shortUrl(script.url)} (${formatBytes(script.transferSize ?? script.encodedBodySize ?? 0)})`).join("\n"),
      recommendation: "Split large chunks by route or feature and verify tree-shaking removes unused exports.",
      metric: "large-chunks",
    });
  }

  if (scripts.length > 30) {
    findings.push({
      category: "chunks",
      priority: "P2",
      title: "Many JavaScript chunks are requested",
      evidence: `${scripts.length} script requests were observed.`,
      recommendation: "Balance code splitting with request overhead; merge tiny chunks and preload only critical chunks.",
      metric: "chunk-count",
    });
  }

  return { scripts, totalTransferSize, largeScripts, uncachedScripts, findings };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function shortUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return url;
  }
}
