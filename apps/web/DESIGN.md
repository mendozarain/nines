# Nines design system

**Source of truth:** [Nines Design System (Figma)](https://www.figma.com/design/Mt4SWTPaVSKfjeaZEP4Wjs)  
Frames: **Nines Design System — Ofacc+** foundations + **LYNK / Ofacc inspo board**.

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
| Warning | coral / rose | Not paid / cash short / alerts |
| Radius frame | `24px` | Outer app shell |
| Radius control | `10px` | Buttons, inputs |
| Radius pill | `999px` | Chips, search, status badges |
| Type | Plus Jakarta Sans | UI |

## Layout (LYNK shell)

```
[ canvas ]
  [ white rounded app frame ]
    sidebar                     | main
      logo                      | slim header (Today date · refresh)
      pill search (⌘K)          | page content
      workspace switcher
      nav (Dashboard → Today / Metrics)
      user + theme
```

## Dashboard · Today (LYNK)

Centered hero: greeting + subtitle + large pill search (opens command palette) + action chips.  
Quick summary: narrative sentence + **borderless** metric strip (sales, expenses, cash, receivables, payables).  
Critical alerts: rose card from real books signals (cash short, receivables, payables).  
Bottom: 14-day sales chart + month sales-vs-expenses donut.

No AI backend — search is ⌘K; alerts/metrics are `/api/dashboard` only.

## Code map

| Piece | File |
| --- | --- |
| Tokens | `app/app.css` |
| Shell + `openPalette` context | `app/routes/app-layout.tsx` |
| Today dashboard | `app/routes/dashboard.tsx` |
| Page helpers | `app/components/page.tsx` |

## Do / don’t

- Do: whitespace, one accent blue, hairline dividers, soft pills, card-on-canvas.
- Don’t: page gradients, glass stacks, serif display, purple themes, cream+terracotta, broadsheet columns.
