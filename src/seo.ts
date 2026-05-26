import type { Page } from "playwright";
import type { Finding, SeoSummary } from "./types.js";

export async function analyzeSeo(page: Page): Promise<SeoSummary> {
  const summary = (await page.evaluate(`(() => {
    const text = (selector) => document.querySelector(selector)?.textContent?.trim();
    const attr = (selector, name) => document.querySelector(selector)?.getAttribute(name)?.trim();
    const links = Array.from(document.querySelectorAll("a[href]"));
    const origin = location.origin;
    const images = Array.from(document.images);
    const metaDescription = attr('meta[name="description"]', "content");

    return {
      title: document.title || undefined,
      titleLength: document.title?.length ?? 0,
      metaDescription,
      metaDescriptionLength: metaDescription?.length ?? 0,
      canonical: attr('link[rel="canonical"]', "href"),
      robots: attr('meta[name="robots"]', "content"),
      h1: Array.from(document.querySelectorAll("h1")).map((node) => node.textContent?.trim() ?? "").filter(Boolean),
      h2Count: document.querySelectorAll("h2").length,
      imageCount: images.length,
      imagesMissingAlt: images.filter((image) => !image.getAttribute("alt")?.trim()).length,
      structuredDataCount: document.querySelectorAll('script[type="application/ld+json"]').length,
      hreflangCount: document.querySelectorAll('link[rel="alternate"][hreflang]').length,
      internalLinks: links.filter((link) => new URL(link.href, location.href).origin === origin).length,
      externalLinks: links.filter((link) => new URL(link.href, location.href).origin !== origin).length,
      visibleTextLength: document.body?.innerText?.trim().length ?? 0,
      firstH1: text("h1"),
    };
  })()`)) as Omit<SeoSummary, "findings"> & { visibleTextLength?: number };

  return { ...summary, findings: seoFindings(summary) };
}

function seoFindings(summary: Omit<SeoSummary, "findings"> & { visibleTextLength?: number }): Finding[] {
  const findings: Finding[] = [];

  if (!summary.title || summary.titleLength < 10 || summary.titleLength > 65) {
    findings.push({
      category: "seo",
      priority: "P1",
      title: "Title tag is missing or poorly sized",
      evidence: `Title length: ${summary.titleLength}`,
      recommendation: "Write a unique title around 30-60 characters that includes the primary query and brand intent.",
      metric: "title",
    });
  }

  if (!summary.metaDescription || summary.metaDescriptionLength < 50 || summary.metaDescriptionLength > 170) {
    findings.push({
      category: "seo",
      priority: "P1",
      title: "Meta description is missing or poorly sized",
      evidence: `Description length: ${summary.metaDescriptionLength}`,
      recommendation: "Add a compelling 120-160 character description aligned with the page search intent.",
      metric: "meta-description",
    });
  }

  if (summary.h1.length !== 1) {
    findings.push({
      category: "seo",
      priority: "P1",
      title: "Page should have exactly one clear H1",
      evidence: `H1 count: ${summary.h1.length}`,
      recommendation: "Use one descriptive H1 and structure secondary topics with H2/H3 headings.",
      metric: "headings",
    });
  }

  if (!summary.canonical) {
    findings.push({
      category: "seo",
      priority: "P2",
      title: "Canonical URL is missing",
      evidence: "No link[rel=canonical] was found.",
      recommendation: "Add a canonical URL to avoid duplicate indexing issues.",
      metric: "canonical",
    });
  }

  if (summary.imageCount > 0 && summary.imagesMissingAlt / summary.imageCount > 0.2) {
    findings.push({
      category: "seo",
      priority: "P2",
      title: "Many images are missing alt text",
      evidence: `${summary.imagesMissingAlt}/${summary.imageCount} images missing alt text.`,
      recommendation: "Add descriptive alt text for meaningful images and empty alt text for decorative images.",
      metric: "image-alt",
    });
  }

  if (summary.structuredDataCount === 0) {
    findings.push({
      category: "seo",
      priority: "P2",
      title: "Structured data was not detected",
      evidence: "No application/ld+json scripts were found.",
      recommendation: "Add relevant JSON-LD schema such as Organization, WebSite, BreadcrumbList, Product, FAQ, or Article where appropriate.",
      metric: "structured-data",
    });
  }

  return findings;
}
