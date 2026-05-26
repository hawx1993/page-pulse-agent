# PagePulse Agent

[中文文档](README.zh-CN.md)

PagePulse Agent is a Node.js CLI agent for automated frontend performance and technical SEO audits. Given a URL or natural-language prompt containing a domain, it opens the page with Playwright, runs Lighthouse, collects browser performance signals, analyzes rendering and SEO issues, and outputs structured Markdown/JSON reports with optimization priorities.

## Features

- Open and inspect pages with Playwright
- Run Lighthouse for Performance, SEO, Accessibility, and Best Practices
- Collect Web Vitals signals including LCP, CLS, INP-like latency, and TTFB
- Analyze main-thread long tasks, resource timing, and console errors
- Detect SSR and hydration signals from initial HTML, rendered DOM, and console warnings
- Analyze JavaScript chunk count, transfer size, and large scripts
- Audit technical SEO basics:
  - title and meta description
  - canonical URL
  - robots meta
  - H1/H2 structure
  - image alt text
  - structured data
  - hreflang
  - internal/external links
- Generate Chinese AI summaries with DeepSeek-compatible API configuration
- Export reports as Markdown and JSON

## Requirements

- Node.js 20+
- npm
- A DeepSeek API key if you want AI-generated summaries

## Installation

```bash
npm install
npx playwright install chromium
```

## Configuration

Create a `.env` file in the project root:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

If `DEEPSEEK_API_KEY` is empty or missing, PagePulse Agent still runs all rule-based analysis and skips only the AI summary.

## Usage

Analyze a domain:

```bash
npm run analyze -- "bydfi.com"
```

Analyze from a natural-language prompt:

```bash
npm run analyze -- "分析 bydfi.com 的 SEO 与性能问题"
```

Skip AI summary:

```bash
npm run analyze -- "bydfi.com" --no-ai
```

Write JSON only:

```bash
npm run analyze -- "bydfi.com" --format json
```

Use a longer timeout:

```bash
npm run analyze -- "bydfi.com" --timeout 60000
```

Show the browser window:

```bash
npm run analyze -- "bydfi.com" --headed
```

## CLI Options

| Option | Default | Description |
| --- | --- | --- |
| `--output <dir>` | `reports` | Directory where reports are written |
| `--format <format>` | `both` | `markdown`, `json`, or `both` |
| `--timeout <ms>` | `45000` | Navigation timeout in milliseconds |
| `--no-ai` | `false` | Skip DeepSeek AI summary |
| `--headed` | `false` | Run Playwright with a visible browser window |

## Output

Each run creates a timestamped folder under `reports/`:

```text
reports/
  2026-05-26T11-43-56-617Z-bydfi.com/
    report.md
    report.json
    lighthouse.html
    lighthouse.json
```

The Markdown report includes:

- AI summary or rule-based fallback notice
- Lighthouse scores and metrics
- Web Vitals and navigation metrics
- SSR and hydration signals
- JavaScript chunk analysis
- SEO audit details
- P0/P1/P2 optimization priorities
- Paths to raw artifacts

## Development

Run type checking:

```bash
npm run typecheck
```

Build TypeScript output:

```bash
npm run build
```

Run a smoke test without AI:

```bash
npm run analyze -- "example.com" --no-ai --format both --timeout 30000
```

## Project Structure

```text
src/
  ai.ts            # DeepSeek-compatible AI summary generation
  browser.ts       # Playwright browser launch
  chunks.ts        # JavaScript chunk analysis
  cli.ts           # CLI entrypoint and orchestration
  config.ts        # environment and URL parsing
  lighthouse.ts    # Lighthouse runner and audit extraction
  rendering.ts     # SSR and hydration analysis
  report.ts        # Markdown/JSON report rendering
  seo.ts           # technical SEO checks
  trace.ts         # resource timing and long-task analysis
  types.ts         # shared types
  webVitals.ts     # Web Vitals observers and findings
```

## Notes

- PagePulse Agent analyzes one URL per run and does not crawl a full website.
- Lighthouse results can vary based on network, CPU, region, and target-site behavior.
- The hydration and SSR checks are heuristic signals, not framework-specific source-code analysis.
- `reports/` and `.env` are ignored by Git.

## License

MIT
