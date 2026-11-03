# Nines web design

Visual and interaction direction for the product UI. Updated after owner feedback that the v2 mint/serif look felt unprofessional.

## Research (Nov 2026 redesign)

Studied public screens and write-ups for **Xero** (new homepage widgets + tasks), **QuickBooks Online** (homepage hierarchy cleanup), **FreshBooks / Wave / Zoho Books** (SMB bookkeeping density), **Mercury** (calm banking chrome), **Ramp / Brex** (attention exceptions), and **Stripe Dashboard** (job-based nav, opinionated KPI row, tabular figures).

### Patterns adopted

| Pattern | Source | Why |
| --- | --- | --- |
| Job-based left nav, quiet chrome | Stripe, Xero | Owners look for jobs (“Sales”, “Customers”), not data-model names |
| Opinionated KPI strip first | Stripe, Mercury | One glance answers “am I okay?” before charts |
| Tasks / needs-attention panel | Xero homepage, Brex | Overdue invoices, bills due, credit-limit risk beat pretty cards |
| One primary chart (sales vs expenses) | QuickBooks cash-flow, Stripe | Dual series beats a sales-only sparkline |
| Neutral base + one accent; colour = status | Mercury, Stripe | Mint gradients and decorative colour read as “toy”, not books |
| Tabular figures, right-aligned money | Stripe tables | Accounting trust lives in numeral craft |
| Dense but calm tables / forms | Mercury, Zoho Books | Everyday Filipino SME owners need speed, not sparse marketing layouts |
| Cmd/Ctrl-K command palette | Linear (kept) | Fast jumps for power users and Electron |

### What we replaced

- Soft **mint/teal page gradients** and translucent frosted cards → flat **zinc/slate** surfaces with hairline borders.
- **Source Serif display** titles → single professional sans (**IBM Plex Sans**) with **IBM Plex Mono** for money.
- Equal-weight KPI + sidebar card collage → **greeting → KPIs → chart + attention → activity**.
- Decorative primary green everywhere → restrained **ink primary** with **blue accent** for interactive affordances; green/red only for over/short and risk.

### Non-goals

- Customizable drag-and-drop widgets (Xero) — too heavy for v1.
- Purple-on-white, cream+terracotta serif, or broadsheet newspaper layouts.
- Feature/API changes beyond small dashboard payload fields needed for the new hierarchy.
