# Nines web design

Visual and interaction direction for the product UI.

## Navigation redesign (Nov 2026)

Owner feedback: the left sidebar had **too many tabs** and felt busy. Research for a sleeker shell:

| Source | Pattern | Takeaway |
| --- | --- | --- |
| **Xero** | Top bar with a few primary groups + dropdowns (Sales, Purchases, Accounting, Reporting, Contacts) | Non-accountants find top categories faster than a long sidebar |
| **Linear** | Low-weight chrome; compact icon tabs; content takes precedence | Nav should recede; fewer visible destinations |
| **Notion / Vercel** | Shallow header (~56–64px), 4–6 primary links, utilities on the right | Don’t pack every sub-route into the permanent chrome |
| **Stripe / Mercury** | Job labels, quiet surfaces, Cmd-K for power jumps | Keep command palette; avoid decorative colour |

### What we ship now

- **No permanent left sidebar.** Full-width content under a single sticky header.
- **Top navbar stays one row** (never wraps). Mid-width desktops fold Expenses + Books into **More**; full labels return at wide screens.
- Primaries: Home · Sales · Customers · Inventory/Fuel · Cash · (Expenses · Books at 2xl+) · More
- **Dropdown menus** hold secondary routes (e.g. Sales → Invoices / New sale; Books → COA, journal, statements…).
- **Fuel** routes appear only when the fuel module is on; the Inventory group renames to **Fuel** and includes tanks, deliveries, dips, pumps, shifts.
- Below `xl` (~1280px): hamburger sheet instead of crowded top links.
- Gear icon + **Cmd/Ctrl-K** remain for quick jumps.

### Visual system (unchanged core)

- Neutral zinc/slate surfaces, ink primary, blue accent for actions.
- IBM Plex Sans + IBM Plex Mono for money.
- Colour = status only (over/short, risk).
- Dashboard hierarchy: greeting → KPIs → chart + attention → activity.

### Non-goals

- Icon-only rail with no labels (too cryptic for SME owners).
- Fully customizable nav / pinned apps (QuickBooks) — later if needed.
- Feature or API changes for this pass.
