import type { NinesDesktopApi } from "./nines-desktop-api";

declare global {
  interface Window {
    ninesDesktop?: NinesDesktopApi;
  }
}

export {};
