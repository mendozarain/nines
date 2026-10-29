# Nines design system

Reference: Ofacc+/LYNK-style SaaS (user inspo). Product books UI — calm, airy, one accent blue.

**Figma:** [Nines Design System](https://www.figma.com/design/Mt4SWTPaVSKfjeaZEP4Wjs) (`Mt4SWTPaVSKfjeaZEP4Wjs`)  
**Showcase:** `design-system/showcase/index.html` · inspo frames in `design-system/inspo/`

## Foundations

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#F3F5F7` | Page behind the app frame |
| Surface | `#FFFFFF` | App frame, cards, tables |
| Surface subtle | `#FAFAFA` | Sidebar / table header wash |
| Ink | `#111827` | Titles, primary data |
| Muted | `#6B7280` | Labels, emails, dates |
| Line | `#E5E7EB` | Hairline dividers only |
| Accent | `#0066FF` | Primary CTA, active tab, links |
| Accent soft | `#EFF6FF` | SKU chips, icon wells |
| Radius frame | `24px` | Outer app shell |
| Radius panel | `12px` | Nested panels / tables |
| Radius control | `10px` | Buttons, inputs |
| Radius pill | `999px` | Status badges, theme toggle |
| Type | Plus Jakarta Sans | All UI |
| Frame shadow | `0 1px 2px rgba(16,24,40,.04), 0 12px 32px rgba(16,24,40,.06)` | App shell lift |

Status pills (Ofacc + LYNK):

| Status | Background | Foreground |
| --- | --- | --- |
| **Paid** / **Active** / **Pre-flight** | `#ECFDF5` | `#065F46` |
| **Open** | `#FFF7ED` | `#C2410C` |
| **Awaiting** | `#F3F4F6` | `#374151` |
| **Not paid** | `#FFF1F2` | `#9F1239` |

SKU chip: accent-soft bg + accent text (`#EFF6FF` / `#0066FF`), pill radius.
## Layout

```
[ canvas ]
  [ white rounded app frame + soft shadow ]
    sidebar | main
              top: search · utilities · user
              page title · actions
              tabs (optional)
              content (table / form / metrics)
```

- Sidebar: workspace name, icon+label nav, soft gray pill for active, theme toggle at bottom.
- No heavy borders on cards — white on canvas + soft shadow is enough.
- Tables: uppercase muted headers, tall rows, hairline row dividers, no vertical rules.
- Customer/entity cells: avatar + **name** + muted subline.
- Line items may nest (bundle → parts) with an L-connector and `N ×` multiplier (LYNK kit pattern).
- Primary button filled accent; secondary outlined white.
- Global search uses a muted field + `⌘K` hint.

## Components (code)

| Primitive | File |
| --- | --- |
| Tokens | `app/app.css` |
| Shell | `app/routes/app-layout.tsx` |
| Page header / metrics | `app/components/page.tsx` |
| Status pill | `app/components/ui/badge.tsx` (`open`, `info`, `success`, …) |
| Avatar | `app/components/ui/avatar.tsx` |
| Underline tabs | `app/components/ui/tabs.tsx` |
| Buttons / inputs | `app/components/ui/*` |

## Figma pages (capture)

| Page | Node | Contents |
| --- | --- | --- |
| Foundations showcase | `1:2` | Tokens, type, atoms, shell composition |
| Inspo board | `2:2` | LYNK/Ofacc reference screens |

Proper Figma variables + component sets need a Professional MCP plan — see `design-system/FIGMA.md`.

## Do / don’t

- Do: whitespace, one accent, hairline dividers, soft status pills, SKU chips for scannable IDs.
- Don’t: page gradients, glass stacks, serif display, purple themes, cream+terracotta, broadsheet columns, automation-canvas chrome in books UI.
