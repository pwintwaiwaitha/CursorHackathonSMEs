# SME Mate AI – Cash-Flow Copilot for Myanmar SMEs

A React + Vite app that helps a small-shop owner see today’s cash, predict shortfalls, and get practical next steps.

## Run locally

```bash
npm install
npm run dev
```

## Build and lint

```bash
npm run build
npm run lint
```

Data is stored in the browser with `localStorage`. The storage layer is isolated so a Supabase adapter can be added later without rewriting pages.
