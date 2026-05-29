# AGENTS.md — Workflow Management Telegram App

## Setup & Commands

- **Package manager**: `npm` (not `pnpm`). The `pnpm-workspace.yaml` is vestigial from the Figma Make template; CI uses `npm ci`, lockfile is `package-lock.json`.
- **Dev server**: `npm run dev` (Vite)
- **Build**: `npm run build` (Vite)
- **No typecheck, lint, or test scripts exist** — do not try to run `tsc`, `eslint`, `prettier`, or a test runner. There is no `tsconfig.json`.

## Build & Deploy

- **Base path**: `/workflow-managment/` (note the intentional typo — `managment` not `management`). This is set in `vite.config.ts` and matters for asset URLs and routing.
- **CI** (`.github/workflows/deploy.yml`): deploys to GitHub Pages on push to `main` using Node 20, `npm ci`, and `npm run build`.
- The React and Tailwind plugins in `vite.config.ts` are both required — do not remove either.
- Do not add `.css`, `.tsx`, or `.ts` files to `assetsInclude` in the Vite config.

## Architecture

- **No backend**. All data lives in `localStorage`. Seed/mock data bootstraps empty keys on first load and merges with existing records on subsequent loads.
- **HashRouter** (not BrowserRouter) — required for Telegram WebView compatibility.
- **Telegram integration** is optional: `window.Telegram.WebApp` is accessed via `src/app/hooks/useTelegram.ts`. The app works in a regular browser without it.
- **Entry**: `src/main.tsx` → `src/app/App.tsx`
- **`@/` alias** resolves to `./src` (configured in `vite.config.ts`).

## Project Structure

```
src/
  main.tsx              — entry point
  app/
    App.tsx             — router, role-based route guards, Telegram init
    components/
      Layout.tsx        — shell with sidebar/badges
      figma/            — Figma-generated components
      ui/               — shadcn/ui primitives (button, dialog, etc.)
    contexts/
      AuthContext.tsx    — auth state (mock login, localStorage)
    data/
      mockData.ts        — seed data for all localStorage keys
      quantitySurveyorWorkflow.ts
    hooks/
      useTelegram.ts     — Telegram WebApp bridge
    pages/               — flat directory, one file per page
    types/
      index.ts           — all TypeScript interfaces
  styles/
    index.css            — imports fonts → tailwind → theme
```

## Key Conventions

- **Page-local state**: each major page owns its seed data, `localStorage` reads/writes, and notification badge logic. No shared state library (Redux, Zustand, etc.).
- **Notification system**: pages publish badge counts via `window.dispatchEvent(new CustomEvent(...))`. `Layout.tsx` listens and updates the sidebar. See system guide events list in `SYSTEM_GUIDE.md` §10.1.
- **localStorage keys**: `user`, `customer-requests`, `paid-customers`, `workflow-tasks`, `designer-tasks`, `designer-task-applications`, `designer-submission-progress`, `designer-task-reviews`, `quantity-surveyor-review-tasks`, `quantity-surveyor-evaluations`, `quantity-surveyor-notifications`.
- **Role-based routing**: enforced at the React level via `ProtectedRoute` in `App.tsx`. Roles: `ceo`, `general_manager`, `marketing_lead`, `finance_officer`, `data_collector`, `quantity_surveyor`, `designer`, `site_engineer`.
- **Tailwind v4** using `@tailwindcss/vite` plugin (not PostCSS-based). The shadcn theme is CSS-variable-driven via `src/styles/theme.css`.
- **UI libraries in use**: Radix UI primitives + MUI (Material UI) for some components. shadcn-style wrappers are in `src/app/components/ui/`.

## Reference Docs

- `SYSTEM_GUIDE.md` — full walkthrough of every page, workflow, storage keys, notification events, and state machines.
- `SYSTEM_OVERVIEW.md` — shorter summary with entity ID prefixes.
- `backend-requirements.md` — spec for a future backend (not implemented).
- `docs/backend-api.md` — auto-generated API endpoint reference (not implemented).
