# @nines/desktop

Electron shell for the hosted Nines web app.

## Configuration

Load URL (first match wins):

1. `NINES_APP_URL` environment variable
2. `nines-config.json` in the Electron user data directory, or `nines-desktop.config.json` in the current working directory (`{ "appUrl": "https://..." }`)
3. Default: `http://localhost:5173` when `NODE_ENV=development`, otherwise `https://main.d8ggprtqz0fd0.amplifyapp.com`

## Scripts

- `pnpm dev` — compile TypeScript and launch Electron in development
- `pnpm build` — compile to `dist/`
- `pnpm package` — build installers for the current platform (Windows NSIS, macOS dmg, Linux AppImage)
- `pnpm package:linux` — Linux AppImage only

## Signing and notarization (TODO)

- **Windows**: configure Authenticode signing in `electron-builder` (`win.certificateFile`, etc.) before shipping installers.
- **macOS**: enable Apple Developer ID signing and notarization (`mac.identity`, `afterSign` hook) before distributing `.dmg` files.
- Releases are **not** published from CI; package locally on a developer machine with the right certificates.
