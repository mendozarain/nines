import { contextBridge, ipcRenderer } from "electron";
import type { NinesDesktopApi } from "./nines-desktop-api";

const api: NinesDesktopApi = {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
  printToPDF: () => ipcRenderer.invoke("nines:printToPDF"),
};

contextBridge.exposeInMainWorld("ninesDesktop", api);
