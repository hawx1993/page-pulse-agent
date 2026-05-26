import OpenAI from "openai";
import type { AnalysisResult } from "./types.js";

export async function generateAiSummary(result: Omit<AnalysisResult, "aiSummary">, apiKey?: string): Promise<string | undefined> {
  if (!apiKey) return undefined;

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
  });
  const evidence = JSON.stringify(
    {
      url: result.url,
      lighthouse: result.lighthouse,
      webVitals: result.webVitals,
      seo: result.seo,
      rendering: result.rendering,
      chunks: {
        totalTransferSize: result.chunks.totalTransferSize,
        scriptCount: result.chunks.scripts.length,
        largeScripts: result.chunks.largeScripts.slice(0, 10),
      },
      trace: {
        longTaskCount: result.trace.longTasks.length,
        consoleErrors: result.trace.consoleErrors.slice(0, 10),
        consoleWarnings: result.trace.consoleWarnings.slice(0, 10),
      },
      findings: result.findings,
    },
    null,
    2,
  );

  const completion = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro",
    temperature: 0.2,
    max_tokens: 1800,
    messages: [
      {
        role: "system",
        content: "You are a senior frontend performance and technical SEO auditor. Produce concise, evidence-grounded Chinese reports. Do not invent facts beyond provided JSON.",
      },
      {
        role: "user",
        content: `请基于以下自动采集数据输出中文 AI 总结：\n\n${evidence}\n\n要求：\n1. 先给 3-5 条关键结论。\n2. 按 P0/P1/P2 给优化优先级。\n3. 每条建议必须引用证据或指标。\n4. 覆盖性能、Web Vitals、hydration、SSR、chunk、SEO。`,
      },
    ],
  });

  return completion.choices[0]?.message.content?.trim();
}
