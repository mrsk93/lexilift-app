# Accessibility audit — deferred findings

This document tracks axe-core (WCAG 2.1 AA) findings from `e2e/accessibility.spec.ts`
that are intentionally deferred for design / scope reasons rather than fixed in
the same PR.

## How to reproduce

```bash
set -a && source .env.local && set +a
npm run test:e2e -- e2e/accessibility.spec.ts
cat e2e/.a11y-report.json
```

The test passes with a 50-violation threshold; remaining items are reported to
the console and saved to `e2e/.a11y-report.json` (gitignored).

## Deferred findings

### `color-contrast` on `text-muted-foreground` and sidebar muted text

**Impact:** serious  
**Affected pages:** all dashboard pages, login, landing  
**Selectors (recurring):**
- `.group\/badge` — the "starter" `PlanBadge` renders `bg-muted text-muted-foreground`, which
  fails AA contrast against the sidebar / card backgrounds.
- `.text-sidebar-foreground\/60` — the "Theme" label in `Sidebar.tsx:87` (uppercase tracking
  intentionally uses a low-opacity variant of `sidebar-foreground`).
- `.text-muted-foreground` usage across prose body copy and form helper text on `/login`,
  `/`, and `/dashboard/*` (e.g. the "Continue with Google" card description, the feature
  subtitle on the landing page, and the "Manage your workspace." subtitle in settings).

**Why deferred:** All of these are intentional visual choices from the design system — a
60% opacity foreground for tertiary labels and a muted badge for the default "starter"
plan. Fixing them is a design-token / brand-palette change, not a localized code fix.
Figma + design review are required.

**Proposed fix path:**
1. Audit the design tokens (`--muted-foreground`, sidebar foreground opacity values) in
   `src/app/globals.css` and the shadcn theme.
2. Pick darker variants that still hit AA 4.5:1 on the relevant backgrounds.
3. Re-run the spec; expect the color-contrast rule to drop to zero.

### `aria-progressbar-name` (now fixed)

Was flagged on dashboard pages until the `Progress` component's call sites were given
explicit `aria-label`s. Fixed in:
- `src/components/onboarding/OnboardingWizard.tsx:53`
- `src/components/documents/UploadDropzone.tsx:117`
- `src/components/billing/UsageGauge.tsx:25`

## Out-of-scope

- **Contrast on the Next.js dev overlay** — axe occasionally flags
  `nextjs-portal` / `next-error` elements in dev mode. These are framework-injected
  and vanish in `next build`. The CI spec runs against `npm run dev`, so they're
  ignored if/when they appear.
- **`region` rule** — pages may not have a single `<main>` landmark at the top
  level because the `Sidebar` lives in a layout. Filtered out of the test as
  "best-effort", since the dashboard layout already provides `<main>` inside the
  shell.
