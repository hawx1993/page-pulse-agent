# PagePulse Agent 中文文档

PagePulse Agent 是一个基于 Node.js 的前端性能与技术 SEO 自动化分析 CLI Agent。你只需要输入 URL、域名，或包含域名的自然语言指令，它会自动打开页面、运行 Lighthouse、采集浏览器性能信号、分析渲染与 SEO 问题，并输出带优化优先级的结构化 Markdown/JSON 报告。

## 功能特性

- 使用 Playwright 自动打开并检查页面
- 运行 Lighthouse，分析 Performance、SEO、Accessibility、Best Practices
- 采集 Web Vitals 相关信号：LCP、CLS、INP-like 延迟、TTFB
- 分析主线程 Long Task、Resource Timing、Console Error
- 基于初始 HTML、渲染后 DOM、控制台警告推断 SSR 与 hydration 问题
- 分析 JavaScript chunk 数量、传输体积、大 chunk
- 检查技术 SEO 基础项：
  - title 与 meta description
  - canonical URL
  - robots meta
  - H1/H2 结构
  - 图片 alt 文本
  - structured data
  - hreflang
  - 内链/外链
- 支持通过 DeepSeek 兼容 API 生成中文 AI 总结
- 支持导出 Markdown 与 JSON 报告

## 环境要求

- Node.js 20+
- npm
- 如果需要 AI 总结，需要准备 DeepSeek API Key

## 安装

```bash
npm install
npx playwright install chromium
```

## 配置

在项目根目录创建 `.env` 文件：

```env
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-v4-pro
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

如果 `DEEPSEEK_API_KEY` 为空或不存在，PagePulse Agent 仍然会运行所有规则分析，只会跳过 AI 总结部分。

## 使用方法

分析一个域名：

```bash
npm run analyze -- "bydfi.com"
```

使用自然语言输入：

```bash
npm run analyze -- "分析 bydfi.com 的 SEO 与性能问题"
```

跳过 AI 总结：

```bash
npm run analyze -- "bydfi.com" --no-ai
```

只输出 JSON：

```bash
npm run analyze -- "bydfi.com" --format json
```

设置更长的超时时间：

```bash
npm run analyze -- "bydfi.com" --timeout 60000
```

显示浏览器窗口：

```bash
npm run analyze -- "bydfi.com" --headed
```

## CLI 参数

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `--output <dir>` | `reports` | 报告输出目录 |
| `--format <format>` | `both` | 输出格式，可选 `markdown`、`json`、`both` |
| `--timeout <ms>` | `45000` | 页面导航超时时间，单位毫秒 |
| `--no-ai` | `false` | 跳过 DeepSeek AI 总结 |
| `--headed` | `false` | 使用可见浏览器窗口运行 Playwright |

## 输出结果

每次运行都会在 `reports/` 下创建一个带时间戳的目录：

```text
reports/
  2026-05-26T11-43-56-617Z-bydfi.com/
    report.md
    report.json
    lighthouse.html
    lighthouse.json
```

Markdown 报告包含：

- AI 总结，或规则分析 fallback 提示
- Lighthouse 分数与关键指标
- Web Vitals 与导航性能指标
- SSR 与 hydration 信号
- JavaScript chunk 分析
- SEO 检查详情
- P0/P1/P2 优化优先级
- 原始分析产物路径

## 开发命令

类型检查：

```bash
npm run typecheck
```

构建 TypeScript 输出：

```bash
npm run build
```

不调用 AI 的 smoke test：

```bash
npm run analyze -- "example.com" --no-ai --format both --timeout 30000
```

## 项目结构

```text
src/
  ai.ts            # DeepSeek 兼容的 AI 总结生成
  browser.ts       # Playwright 浏览器启动
  chunks.ts        # JavaScript chunk 分析
  cli.ts           # CLI 入口与流程编排
  config.ts        # 环境变量与 URL 解析
  lighthouse.ts    # Lighthouse 运行与审计结果提取
  rendering.ts     # SSR 与 hydration 分析
  report.ts        # Markdown/JSON 报告渲染
  seo.ts           # 技术 SEO 检查
  trace.ts         # Resource Timing 与 Long Task 分析
  types.ts         # 共享类型定义
  webVitals.ts     # Web Vitals 观察器与问题生成
```

## 注意事项

- PagePulse Agent 每次只分析一个 URL，不会爬取整站。
- Lighthouse 结果会受到网络、CPU、地理位置、目标站点状态等因素影响。
- hydration 与 SSR 检查是基于浏览器运行时信号的启发式分析，不等同于框架源码级静态分析。
- `reports/` 与 `.env` 已加入 Git 忽略列表。

## License

MIT
