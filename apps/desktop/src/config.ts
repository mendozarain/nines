import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

const PRODUCTION_URL = "https://main.d8ggprtqz0fd0.amplifyapp.com";
const DEV_URL = "http://localhost:5173";

export type AppConfig = {
  appUrl: string;
};

function readConfigFile(): Partial<AppConfig> | null {
  const candidates = [
    path.join(app.getPath("userData"), "nines-config.json"),
    path.join(process.cwd(), "nines-desktop.config.json"),
  ];

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf8");
        return JSON.parse(raw) as Partial<AppConfig>;
      }
    } catch {
      // ignore invalid config
    }
  }
  return null;
}

export function resolveAppUrl(): string {
  const fromEnv = process.env.NINES_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const fromFile = readConfigFile()?.appUrl?.trim();
  if (fromFile) {
    return fromFile;
  }

  if (process.env.NODE_ENV === "development") {
    return DEV_URL;
  }

  return PRODUCTION_URL;
}

export function originOf(url: string): string {
  return new URL(url).origin;
}
