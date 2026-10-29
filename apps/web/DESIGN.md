# Nines web design

Direction: **Apple-calm product UI** — soft canvas, white surfaces, large type, almost no chrome.

## Inspiration

Mobbin MCP was unavailable (paid plan on the connected account). The redesign follows
finance/product patterns Mobbin typically surfaces for Apple-like tools:

- Soft gray page canvas with white content tiles (Apple Music / Settings web feel)
- Large tracking-tight titles, quiet secondary copy
- Sidebar owns brand + nav; content owns one job
- System-blue primary actions; ink text; hairline separators only when needed
- Linear Cmd/Ctrl-K for jumps; Stripe-style metrics without heavy borders

## Rules in this codebase

- One sans: `Plus Jakarta Sans`
- Soft `--background`, white `--card` tiles (`rounded-2xl`)
- Primary is blue (actions), not decorative teal gradients
- Prefer `nines-row` / `nines-panel` over bordered shadow cards
- No page gradients, glassmorphism stacks, or serif display fonts
- Dark mode supported; light is the product default

Avoid: purple themes, cream + terracotta serif, broadsheet layouts, multi-layer shadows, emoji.
