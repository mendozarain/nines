import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

type WindowState = {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized?: boolean;
};

const defaults: WindowState = {
  width: 1280,
  height: 800,
};

function statePath(): string {
  return path.join(app.getPath("userData"), "window-state.json");
}

export function getSavedWindowState(): WindowState {
  try {
    const raw = fs.readFileSync(statePath(), "utf8");
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveWindowState(state: WindowState): void {
  try {
    fs.mkdirSync(path.dirname(statePath()), { recursive: true });
    fs.writeFileSync(statePath(), JSON.stringify(state, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save window state", err);
  }
}
