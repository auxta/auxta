import puppeteer = require("puppeteer");

export type UserConsoleEntry = {
  level: puppeteer.ConsoleMessageType; // 'debug' | 'log' | 'info' | 'warning' | 'error' | ...
  text: string;
  args: string[];
  location?: { url?: string; lineNumber?: number; columnNumber?: number };
  pageUrl: string;
  ts: number; // epoch ms
};

function safeStringify(v: any): string {
  if (typeof v === "string") return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

export function attachUserConsoleCapture(
  page: puppeteer.Page,
  push: (e: UserConsoleEntry) => void
) {
  page.on("console", async (msg) => {
    const level = msg.type(); // 'debug' | 'log' | 'info' | 'warning' | 'error' | ...
    if (!["debug", "log", "info", "warning", "error"].includes(level)) return;

    const loc = typeof (msg as any).location === "function" ? (msg as any).location() : undefined;

    const args: string[] = [];
    try {
      const handles = msg.args();
      for (let i = 0; i < Math.min(handles.length, 5); i++) {
        try {
          const val = await handles[i].jsonValue();
          args.push(safeStringify(val));
        } catch {
          try {
            const s = await handles[i].evaluate((x) => Object.prototype.toString.call(x));
            args.push(String(s));
          } catch {
            args.push(String(handles[i]));
          }
        }
      }
    } catch { /* noop */ }

    push({
      level: level as puppeteer.ConsoleMessageType,
      text: msg.text(),
      args,
      location: loc,
      pageUrl: page.url(),
      ts: Date.now(),
    });
  });
}
