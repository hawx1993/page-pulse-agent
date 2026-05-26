import { chromium, type Browser, type Page } from "playwright";

export interface BrowserSession {
  browser: Browser;
  page: Page;
}

export async function launchBrowser(headed: boolean): Promise<BrowserSession> {
  const browser = await chromium.launch({
    headless: !headed,
    args: ["--remote-debugging-port=9222", "--disable-dev-shm-usage", "--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1365, height: 768 } });
  return { browser, page };
}
