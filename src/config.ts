import { config as loadEnv } from "dotenv";
import { z } from "zod";
import type { CliOptions } from "./types.js";

loadEnv();

const formatSchema = z.enum(["markdown", "json", "both"]);

export function normalizeOptions(raw: Record<string, unknown>): CliOptions {
  return {
    output: String(raw.output ?? "reports"),
    format: formatSchema.parse(raw.format ?? "both"),
    timeout: Number(raw.timeout ?? 45_000),
    ai: raw.ai !== false,
    headed: raw.headed === true,
  };
}

export function getAiApiKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY;
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const explicitUrl = trimmed.match(/https?:\/\/[^\s"'<>]+/i)?.[0];
  const domain = explicitUrl ?? trimmed.match(/(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s"'<>]*)?/i)?.[0];

  if (!domain) {
    throw new Error("No URL or domain found in input.");
  }

  const withProtocol = /^https?:\/\//i.test(domain) ? domain : `https://${domain}`;
  const url = new URL(withProtocol);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  return url.toString();
}
