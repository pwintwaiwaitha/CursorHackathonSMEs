# SME Mate AI – Cash-Flow Copilot for Myanmar SMEs

A React + Vite + TypeScript app that helps a small-shop owner see today’s cash, predict shortfalls, and get practical next steps. Amounts are whole kyat (integer MMK). Books stay in the browser.

This is a planning tool, not financial advice.

## Run locally

```bash
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`).

AI advice is optional. Without a server API key the app uses rule-based fallback text. The forecast engine still runs either way.

```bash
cp .env.example .env
```

Put keys only in server / Netlify environment variables. Never use `VITE_*` for secrets.

## Demo Mode

Use this for judges and walkthroughs. Loading a demo **replaces** saved shop data in this browser.

1. On first launch, pick **Try Demo Mode** on onboarding, or open **Settings**.
2. Switch shops from the header (phone) or sidebar (desktop) **Demo shops** list.
3. Use **Reset Demo Data** in Settings to reload the current sample and drop typed check-ins.
4. Use **Reset all data** to clear the browser store and return to onboarding.

Six demonstration businesses (seeded through the real cash and forecast engines):

| Shop | Days of books | Unlocks | Story |
| --- | --- | --- | --- |
| New café | 1 | 3-day Scheduled Forecast | Healthy short-horizon cash |
| Online shop | 7 | 14-day forecast + 1-month Early Projection | Upcoming shortage (stock bill before collections) |
| Mini-mart | 30 | 6-month scenario | Too much money tied up in stock |
| Bakery | 180 | 1-year projection | Overdue customer payments |
| Clothing shop | 365 | 3-year growth projection | A full year of books |
| Wholesaler | 1,095 | 10-year and 30-year strategic scenarios | Established books for planning stories |

Screens show a **Demonstration data** banner and a **Demo** badge. What-if (`/simulator`) works on the same books: try a stock buy or hire, then **Apply as Plan** only if you want those assumptions saved.

## Architecture

- **Forecast engine** (`src/lib/forecastEngine.ts`) is deterministic. It uses Daily Cash Check-ins, receivables, payables, and scenario assumptions. Credit sales are not cash until collected.
- **What-if simulator** (`src/lib/whatIf.ts`, `/simulator`) compares a trial change against the saved plan without editing check-ins until you apply it.
- **AI advice** explains engine numbers only. The browser calls `/api/ai-advice`. The Netlify function (`server/aiAdviceHandler.ts`, `netlify/functions/ai-advice.ts`) reads `GEMINI_API_KEY` (or legacy `AI_API_KEY`) on the server. Gemini keys use Google `generateContent`. If the key is missing or the model fails, `requestAiAdvice` and the handler return the same rule-based fallback.
- **Storage** (`src/storage/localStorageAdapter.ts`) saves the shop under `sme-mate-ai:v1`. Demo selection is a separate key (`sme-mate-ai:demo`). A later Supabase adapter can replace the factory without rewriting pages.

## Forecasting limitations

Views unlock only when enough Daily Cash Check-in days exist:

- 1 day → 3-day Scheduled Forecast
- 7 days → 14-day forecast and 1-month Early Projection
- 30 days → 6-month scenario
- 180 days → 1-year projection
- 365 days → 3-year growth projection
- 1,095 days → 10-year and 30-year **strategic scenarios**

Longer views are estimates. **10-year and 30-year figures are planning stories, never guaranteed predictions.** Confidence labels (High / Medium / Low / Very low) are shown on the dashboard, forecast, and simulator.

## Privacy

Shop books live in **localStorage** on this device. They are not uploaded unless you later add a cloud adapter. Demo Mode overwrites that local store. Do not enter secrets. This app does not give financial, tax, or lending advice.

## Environment (server only)

Copy `.env.example`. These variables are read by the Netlify function, not by Vite frontend code:

| Variable | Purpose |
| --- | --- |
| `GEMINI_API_KEY` | Gemini key. Leave empty to use fallback advice. Never use `VITE_*`. |
| `GEMINI_TEXT_MODEL` | Chat / advice model (default `gemini-3.7-flash`) |
| `GEMINI_TRANSCRIBE_MODEL` | Server-only voice/transcribe model (`gemini-3.5-transcribe`) |
| `AI_API_KEY` | Legacy alias. Used only if `GEMINI_API_KEY` is empty. |
| `AI_MODEL` | Legacy alias. Used only if `GEMINI_TEXT_MODEL` is empty. |
| `AI_API_BASE_URL` | OpenAI-compatible base, only when not using a Gemini key |
| `AI_TIMEOUT_MS` | Server timeout in milliseconds |

Never prefix these with `VITE_`.

## Netlify

`netlify.toml` builds with `npm run build`, publishes `dist`, bundles `netlify/functions`, and redirects `/api/ai-advice` to the function. Local AI proxy during `npm run dev` is in `viteAiAdvicePlugin.ts`.

```bash
npx netlify dev
```

## Checks

```bash
npm run test
npm run lint
npm run build
```
