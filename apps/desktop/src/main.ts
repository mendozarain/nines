import path from "node:path";
import {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  shell,
} from "electron";
import { originOf, resolveAppUrl } from "./config";
import { buildAppMenu } from "./menu";
import { getSavedWindowState, saveWindowState } from "./window-state";

let mainWindow: BrowserWindow | null = null;
let appUrl = "";
let allowedOrigin = "";

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });
}

function assetPath(name: string): string {
  return path.join(__dirname, name);
}

function attachNavigationGuards(win: BrowserWindow): void {
  const wc = win.webContents;

  wc.setWindowOpenHandler(({ url }) => {
    try {
      if (new URL(url).origin === allowedOrigin) {
        return { action: "allow" };
      }
    } catch {
      // treat malformed URLs as external
    }
    void shell.openExternal(url);
    return { action: "deny" };
  });

  wc.on("will-navigate", (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  wc.on("will-redirect", (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
}

function isAllowedNavigation(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "file:") {
      return true;
    }
    return parsed.origin === allowedOrigin;
  } catch {
    return false;
  }
}

function showOffline(win: BrowserWindow): void {
  void win.loadFile(assetPath("offline.html"), {
    query: { url: appUrl },
  });
}

async function loadApp(win: BrowserWindow): Promise<void> {
  await win.loadFile(assetPath("loader.html"));

  const wc = win.webContents;
  let failed = false;

  const failHandler = (
    _event: Electron.Event,
    _errorCode: number,
    _errorDescription: string,
    validatedURL: string,
    isMainFrame: boolean,
  ) => {
    if (!isMainFrame || failed) {
      return;
    }
    if (validatedURL !== appUrl) {
      return;
    }
    failed = true;
    showOffline(win);
  };

  wc.on("did-fail-load", failHandler);

  try {
    await wc.loadURL(appUrl);
    const current = wc.getURL();
    if (new URL(current).origin === allowedOrigin) {
      wc.removeListener("did-fail-load", failHandler);
    }
  } catch {
    if (!failed) {
      showOffline(win);
    }
  }
}

function createMainWindow(): BrowserWindow {
  const saved = getSavedWindowState();
  const win = new BrowserWindow({
    width: saved.width,
    height: saved.height,
    x: saved.x,
    y: saved.y,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (saved.isMaximized) {
    win.maximize();
  }

  attachNavigationGuards(win);

  win.once("ready-to-show", () => {
    win.show();
  });

  const persist = () => {
    if (win.isDestroyed()) {
      return;
    }
    const bounds = win.getBounds();
    saveWindowState({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: win.isMaximized(),
    });
  };

  win.on("resize", persist);
  win.on("move", persist);
  win.on("close", persist);

  void loadApp(win);

  return win;
}

app.whenReady().then(() => {
  appUrl = resolveAppUrl();
  allowedOrigin = originOf(appUrl);

  Menu.setApplicationMenu(buildAppMenu(() => mainWindow));
  mainWindow = createMainWindow();

  ipcMain.handle("nines:printToPDF", async () => {
    const win = mainWindow;
    if (!win || win.isDestroyed()) {
      return null;
    }
    try {
      const data = await win.webContents.printToPDF({
        printBackground: true,
      });
      return data.toString("base64");
    } catch {
      return null;
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
