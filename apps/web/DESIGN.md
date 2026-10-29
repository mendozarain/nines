# Nines design system

Reference: Ofacc+-style SaaS (user inspo). Product books UI — calm, airy, one accent blue.

## Foundations

| Token | Value | Use |
| --- | --- | --- |
| Canvas | `#F3F5F7` | Page behind the app frame |
| Surface | `#FFFFFF` | App frame, cards, tables |
| Ink | `#111827` | Titles, primary data |
| Muted | `#6B7280` | Labels, emails, dates |
| Line | `#E5E7EB` | Hairline dividers only |
| Accent | `#0066FF` | Primary CTA, active tab, badges |
| Radius frame | `24px` | Outer app shell |
| Radius control | `10px` | Buttons, inputs |
| Radius pill | `999px` | Status badges, theme toggle |
| Type | Plus Jakarta Sans | All UI |

Status pills:

- **Paid** — mint bg / green text
- **Awaiting** — gray bg / gray text
- **Not paid** — soft coral bg / red text

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
- Primary button filled accent; secondary outlined white.

## Components (code)

| Primitive | File |
| --- | --- |
| Tokens | `app/app.css` |
| Shell | `app/routes/app-layout.tsx` |
| Page header / metrics | `app/components/page.tsx` |
| Status pill | `app/components/ui/badge.tsx` |
| Avatar | `app/components/ui/avatar.tsx` |
| Underline tabs | `app/components/ui/tabs.tsx` |
| Buttons / inputs | `app/components/ui/*` |

## Do / don’t

- Do: whitespace, one accent, hairline dividers, soft status pills.
- Don’t: page gradients, glass stacks, serif display, purple themes, cream+terracotta, broadsheet columns.
