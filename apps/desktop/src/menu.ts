import {
  app,
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  shell,
} from "electron";

export function buildAppMenu(_getMainWindow: () => BrowserWindow | null): Menu {
  const isMac = process.platform === "darwin";

  const editSubmenu: MenuItemConstructorOptions[] = [
    { role: "undo" },
    { role: "redo" },
    { type: "separator" },
    { role: "cut" },
    { role: "copy" },
    { role: "paste" },
  ];

  if (isMac) {
    editSubmenu.push(
      { role: "pasteAndMatchStyle" },
      { role: "delete" },
      { role: "selectAll" },
    );
  } else {
    editSubmenu.push({ role: "delete" }, { role: "selectAll" });
  }

  const windowSubmenu: MenuItemConstructorOptions[] = [
    { role: "minimize" },
    { role: "zoom" },
  ];
  if (isMac) {
    windowSubmenu.push({ type: "separator" }, { role: "front" });
  } else {
    windowSubmenu.push({ role: "close" });
  }

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" },
              { type: "separator" },
              { role: "services" },
              { type: "separator" },
              { role: "hide" },
              { role: "hideOthers" },
              { role: "unhide" },
              { type: "separator" },
              { role: "quit" },
            ] satisfies MenuItemConstructorOptions[],
          } satisfies MenuItemConstructorOptions,
        ]
      : []),
    {
      label: "Edit",
      submenu: editSubmenu,
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: windowSubmenu,
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Nines on the web",
          click: async () => {
            await shell.openExternal(
              "https://main.d8ggprtqz0fd0.amplifyapp.com",
            );
          },
        },
      ],
    },
  ];

  if (!isMac) {
    template.unshift({
      label: "File",
      submenu: [{ role: "quit" }],
    });
  }

  return Menu.buildFromTemplate(template);
}
