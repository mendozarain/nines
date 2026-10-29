# Nines design system

**Source of truth:** [Nines Design System (Figma)](https://www.figma.com/design/Mt4SWTPaVSKfjeaZEP4Wjs)  
Frames: **Nines Design System — Ofacc+** foundations + **LYNK / Ofacc inspo board**.

> Note: Figma MCP on the Starter plan hit its tool-call limit while reading this file,
> so tokens below are taken from the foundations overview (screenshots + color sampling).
> Re-sync with `get_design_context` / variables once MCP quota is available.

## Foundations (Ofacc+)

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#F3F5F7` | Page behind the app frame |
| Surface | `#FFFFFF` | App frame, cards, tables |
| Ink | `#111111` | Titles, primary data |
| Muted | `#6B7280` | Labels, emails, dates |
| Line | `#E5E5E5` | Hairline dividers |
| Accent | `#0094FF` | Primary CTA, active tab, brand mark |
| Accent soft | `#D3E3FD` | Soft selected / chip fills |
| Success | mint `#ECFDF5` / `#065F46` | Paid / balanced |
| Warning | coral `#FFF1F2` / `#9F1239` | Not paid / short |
| Accent 2 | forest green | Positive charts / fulfilled |
| Accent 3 | burnt orange | Caution / category |
| Radius frame | `24px` | Outer app shell |
| Radius control | `10px` | Buttons, inputs |
| Radius pill | `999px` | Status badges, theme toggle |
| Type | Plus Jakarta Sans | UI (SF Pro–like geometry) |

## Layout

```
[ canvas #F3F5F7 ]
  [ white rounded app frame + soft shadow ]
    sidebar | main
              top: search · user
              page title · actions  (dashboard: greeting + quick actions)
              underline tabs (optional)
              content cards / tables
```

- Sidebar: N mark, workspace label, soft gray pill for active, sun/moon toggle at bottom.
- Tables: uppercase muted headers, tall rows, hairline dividers, avatar + name/subline.
- Primary button filled accent; secondary outlined white.

## Code map

| Primitive | File |
| --- | --- |
| Tokens | `app/app.css` |
| Shell | `app/routes/app-layout.tsx` |
| Page header / metrics | `app/components/page.tsx` |
| Status pill | `app/components/ui/badge.tsx` |
| Avatar | `app/components/ui/avatar.tsx` |
| Underline tabs | `app/components/ui/tabs.tsx` |

## Do / don’t

- Do: whitespace, one accent blue, hairline dividers, soft status pills, card-on-canvas.
- Don’t: page gradients, glass stacks, serif display, purple themes, cream+terracotta, broadsheet columns.
