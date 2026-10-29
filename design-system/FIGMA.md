# Nines Design System — Figma

**File:** https://www.figma.com/design/Mt4SWTPaVSKfjeaZEP4Wjs  
**Key:** `Mt4SWTPaVSKfjeaZEP4Wjs`  
**Source of truth (code):** `apps/web/DESIGN.md` + `apps/web/app/app.css`  
**Inspo:** `design-system/inspo/` (LYNK / Ofacc screens)  
**HTML foundations capture:** `design-system/showcase/index.html` → Figma node `1:2`

## Status (2026-10-29)

| Layer | State |
| --- | --- |
| Figma file created | Done |
| Foundations showcase captured into Figma | Done (`node-id=1-2`) |
| LYNK / Ofacc inspo board captured | Done (`node-id=2-2`) |
| Variable collections / text / effect styles | Blocked — Figma **Starter** MCP quota (`use_figma`) |
| Proper components + variants | Blocked — same |

Upgrade **Rhainne Mendoza's Team** to **Professional** (Full/Dev seat) to unlock ~200 `use_figma` calls/day, then resume Phase 1–3 below.

Starter also allows **1 variable mode only** — keep Color as Light-only in Figma; Dark stays in CSS.

## Locked v1 scope

**Tokens:** primitives (blue/gray/green/amber/coral), semantic color (light), spacing, radius, text styles, frame shadow effect style.

**Components:** Badge, Button, Input, Search (⌘K), NavItem, SkuChip, Card/Panel, Table, Avatar, Tabs.

**Out of v1:** automation workflow canvas nodes (LYNK-only).

## Resume prompt

> Continuing Nines Design System. File key `Mt4SWTPaVSKfjeaZEP4Wjs`. Load `figma-use` + `figma-generate-library`. State: `/tmp/design-system-state-nines-2026.json` or `design-system/FIGMA.md`. Capture reference is node `1:2`. Start Phase 1 variables (single Light mode), then Phase 2 page skeleton, then Phase 3 components one-at-a-time bound to variables.

## Capture again

```bash
cd design-system/showcase && python3 -m http.server 8765 --bind 127.0.0.1
# Then call generate_figma_design for a new captureId and open:
# http://127.0.0.1:8765/#figmacapture=<id>&figmaendpoint=...
```

Leave the capture script tag in `showcase/index.html` until Figma components replace the capture.
