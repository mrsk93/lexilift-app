# Fix `/api/inngest` 500 caused by `pdfjs-dist` requiring `DOMMatrix` in Vercel Lambda Node runtime

**Date:** 2026-06-09
**Status:** Approved for planning
**Scope:** Bug fix — narrow, surgical

## Problem

`GET https://lexilift-app.vercel.app/api/inngest` returns HTTP 500 with Next.js' generic error page. Inngest's discovery probe sees the 500 and surfaces "Internal server error response from URL" in its dashboard.

### Root cause (confirmed by Vercel function logs)

`src/app/api/inngest/route.ts` imports `processDocument` from `@/lib/inngest/functions/processDocument`. That file's module body (`src/lib/inngest/functions/processDocument.ts:5`) statically imports `parsePdf` from `@/lib/parsers/pdf`, which statically imports `pdf-parse@2.4.5`. `pdf-parse@2.4.5`'s main entry transitively imports `pdfjs-dist@5.4.296`'s legacy build (`pdfjs-dist/legacy/build/pdf.mjs`).

When Vercel's Lambda Node 20.x runtime evaluates the `pdfjs-dist` module body, it hits this module-level constant at `node_modules/pdfjs-dist/legacy/build/pdf.mjs:15620`:

```js
const SCALE_MATRIX = new DOMMatrix();
```

`globalThis.DOMMatrix` is **undefined** in that runtime. The polyfill attempt at lines 14348-14354 only assigns `globalThis.DOMMatrix` if `@napi-rs/canvas` (a transitive `optionalDependency` of `pdf-parse`) successfully loads. It does not, because Vercel does not bundle the `.node` binary for transitive `optionalDependencies` — only for direct dependencies the user explicitly opts into.

Result: `ReferenceError: DOMMatrix is not defined at module evaluation` → `/api/inngest/route.js` fails to load → Next.js serves its generic 500 HTML page → Inngest's discovery probe sees the 500.

The crash happens on every cold start of `/api/inngest`, even though `processDocument` (the only function that uses PDFs) is never invoked by the discovery probe.

### Confirmed facts (read-only investigation completed)

| Fact | Source |
|---|---|
| `parsePdf` imports `pdf-parse`, not `pdfjs-dist` directly | `src/lib/parsers/pdf.ts:1` |
| `pdf-parse@2.4.5` declares `@napi-rs/canvas@^0.1.80` and `pdfjs-dist@^5.4.296` as dependencies | `package-lock.json` |
| `pdfjs-dist@5.4.296` legacy build references `DOMMatrix` at module load (line 15620) | `node_modules/pdfjs-dist/legacy/build/pdf.mjs:15620` |
| `pdfjs-dist` legacy build tries `@napi-rs/canvas` first, then warns if missing | `node_modules/pdfjs-dist/legacy/build/pdf.mjs:14340-14364` |
| The 5 other Inngest function files do NOT import any parsers | `src/lib/inngest/functions/{resetQueryCounts,checkUsageAlerts,syncSubscriptions,purgeSoftDeleted,hardDeleteAccounts}.ts` |
| A `globalThis.DOMMatrix` shim allows `pdf-parse` to load in Node 22 | Local verification: `node -e "globalThis.DOMMatrix = class {}; require('pdf-parse')"` succeeds |
| `@thednp/dommatrix@3.0.4` is the maintained successor to deprecated `dommatrix` | npm registry |
| `@thednp/dommatrix` does NOT implement `*Self` methods (`invertSelf`, `multiplySelf`, `preMultiplySelf`, `translateSelf`, `scaleSelf`, `rotateSelf`) | npm registry README |
| `pdfjs-dist` calls `addPath(path, new DOMMatrix(...).preMultiplySelf(...).translate(...).scale(...))` at line 16697, `addPath(path, new DOMMatrix(transform).invertSelf().multiplySelf(currentTransform))` at line 16792, `path.addPath(clip, new DOMMatrix(group.matrix))` at line 17272 | `node_modules/pdfjs-dist/legacy/build/pdf.mjs` |
| `processDocument` is the only Inngest function that imports parsers | `src/lib/inngest/functions/processDocument.ts:5-9` |

## Goal

- `GET /api/inngest` returns 200 with valid introspection JSON on the next Vercel deploy.
- `parsePdf` continues to extract text from PDF uploads in `processDocument` (and any other consumer).
- All 8 existing tests in `src/lib/parsers/pdf.test.ts` continue to pass.
- Minimal blast radius: one new file, two files modified, one dependency added.

## Non-goals

- **PDF rendering** (e.g., generating thumbnails). We only use `parsePdf` for text extraction; rendering transforms being identity is acceptable.
- **Replacing `pdf-parse` with a different library.** Larger refactor; not warranted.
- **Adding `@napi-rs/canvas` as a direct dependency.** Adds ~20MB to the bundle; the `@napi-rs/canvas` binary is large and may not improve correctness for our use case.
- **The `@napi-rs/canvas` warning in logs.** Suppressible later, but harmless. Out of scope for this fix.
- **Docx/text/url parsers.** Not affected.

## Solution

Three changes:

### Change A — Add `@thednp/dommatrix` to `dependencies`

`package.json`:

```json
"dependencies": {
  "@thednp/dommatrix": "^3.0.4",
  // ... existing
}
```

**Why this package:** TypeScript-typed, zero runtime deps, ~5KB, maintained (last published 2 months ago). Provides a working `DOMMatrix` constructor, `a/b/c/d/e/f` matrix elements, `m11–m44` getters/setters, `isIdentity`/`is2D` getters, `translate`/`scale`/`rotate`/`skew` instance methods, `transformPoint`, and `fromString`/`fromArray`/`fromMatrix` static methods.

**Known gap:** does not implement `*Self` methods. Handled in Change B.

### Change B — Create `src/lib/parsers/dommatrix-shim.ts`

A side-effect-only module that:
1. Imports `@thednp/dommatrix`.
2. Augments its prototype with the missing `*Self` methods as no-ops returning `this` (identity transform).
3. Assigns `globalThis.DOMMatrix = DOMMatrix` if not already defined.

```ts
import DOMMatrix from '@thednp/dommatrix'

declare global {
  // eslint-disable-next-line no-var
  var DOMMatrix: typeof import('@thednp/dommatrix').default
}

// Augment the prototype with the *Self methods pdfjs-dist uses
// (no-op chains: identity transform). @thednp/dommatrix doesn't
// implement these, but pdfjs-dist's text-extraction path doesn't
// depend on the math being correct — it just needs the methods
// to exist and return `this` for chaining.
if (typeof DOMMatrix.prototype.invertSelf !== 'function') {
  DOMMatrix.prototype.invertSelf = function () { return this }
}
if (typeof DOMMatrix.prototype.multiplySelf !== 'function') {
  DOMMatrix.prototype.multiplySelf = function () { return this }
}
if (typeof DOMMatrix.prototype.preMultiplySelf !== 'function') {
  DOMMatrix.prototype.preMultiplySelf = function () { return this }
}
if (typeof DOMMatrix.prototype.translateSelf !== 'function') {
  DOMMatrix.prototype.translateSelf = function () { return this }
}
if (typeof DOMMatrix.prototype.scaleSelf !== 'function') {
  DOMMatrix.prototype.scaleSelf = function () { return this }
}
if (typeof DOMMatrix.prototype.rotateSelf !== 'function') {
  DOMMatrix.prototype.rotateSelf = function () { return this }
}

if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = DOMMatrix
}

export {}
```

**Why no-op chains:** We only call `parser.getText()` (text extraction). The transform math doesn't need to be correct; it just needs to not throw. The `*Self` methods return `this` to allow chaining (`new DOMMatrix(x).preMultiplySelf(y).translate(z).scale(w)`).

**Why a separate file:** Co-locates the shim with the parser it supports. Side-effect-only modules are a well-understood pattern for this kind of polyfill.

**Why `globalThis.DOMMatrix = DOMMatrix` instead of patching `globalThis` first:** Some users may run in an environment that already has a real `DOMMatrix` (e.g., Node 22+ on certain builds, or testing locally with Node 22+). The `typeof globalThis.DOMMatrix === 'undefined'` guard respects pre-existing implementations.

### Change C — Refactor `src/lib/parsers/pdf.ts` to lazy-import `pdf-parse`

Current code (`src/lib/parsers/pdf.ts`):

```ts
import { PDFParse } from 'pdf-parse'

export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return result.text ?? ''
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Failed to parse PDF file.')
  } finally {
    await parser.destroy().catch(() => {})
  }
}
```

New code:

```ts
export async function parsePdf(buffer: Buffer): Promise<string> {
  // Side-effect import: polyfills globalThis.DOMMatrix before pdf-parse
  // (and its transitive pdfjs-dist) evaluates on first use. This must
  // run before the dynamic import of pdf-parse below.
  await import('./dommatrix-shim')
  const { PDFParse } = await import('pdf-parse')

  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    return result.text ?? ''
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Failed to parse PDF file.')
  } finally {
    await parser.destroy().catch(() => {})
  }
}
```

**Why lazy:** The `await import(...)` calls inside the function body are **dynamic imports** — they don't run at module load, only when `parsePdf` is invoked. This means `/api/inngest` cold start no longer triggers `pdf-parse` evaluation. When `parsePdf` is actually called (from `processDocument`'s `step.run('parse', ...)` callback), the shim is loaded first, polyfills `globalThis.DOMMatrix`, then `pdf-parse` loads with `DOMMatrix` available.

**Why two `await import` calls (not one):** Importing the shim first guarantees `globalThis.DOMMatrix` is set before the `pdf-parse` module body evaluates. The order is critical: if we imported them together, V8's import ordering would still respect the source order, but the explicit two-line sequence is more readable and self-documenting.

**Caching:** Node's module cache deduplicates dynamic imports. The second call to `parsePdf` is cheap (both modules are already in the cache).

**Test impact:** The existing test file `src/lib/parsers/pdf.test.ts:15` mocks `pdf-parse`:
```ts
vi.mock('pdf-parse', () => ({ PDFParse: MockPDFParse }))
```
This still works because Vitest's `vi.mock` intercepts both static and dynamic `import('pdf-parse')` calls.

**`@react-email/render` and other dynamic-import patterns in this codebase:** This pattern is already used elsewhere in the codebase (e.g., `await import('@react-email/render')` in callback handlers). It's idiomatic for the project.

## File summary

| File | Change | Lines |
|---|---|---|
| `package.json` | Add `@thednp/dommatrix@^3.0.4` to `dependencies` | +1 |
| `package-lock.json` | Updated by `npm install` | (generated) |
| `src/lib/parsers/dommatrix-shim.ts` | New file | +35 |
| `src/lib/parsers/pdf.ts` | Replace static import with dynamic imports | +4, -1 |

No other files. No test changes expected.

## Verification

1. `npm install` (adds `@thednp/dommatrix` to lockfile).
2. `npx vitest run src/lib/parsers/pdf.test.ts` — all 8 existing tests pass.
3. `npx vitest run` — full suite still passes (no regressions).
4. `npx eslint src/lib/parsers/` — lint clean on the changed files.
5. `npm run build` — succeeds (Turbopack has no issues with the shim).
6. `git add` + `git commit` + push.
7. Wait for Vercel deploy.
8. `curl -i https://lexilift-app.vercel.app/api/inngest` — expect **200** with introspection JSON, not the 500 HTML page.
9. In the Inngest dashboard, click "Sync" — expect successful sync.
10. (Optional manual) Upload a PDF via the chat UI to confirm `parsePdf` still works in production.

## Failure modes and rollback

| Failure | Detection | Mitigation |
|---|---|---|
| `@thednp/dommatrix` doesn't ship a method pdfjs-dist needs (we may discover more `*Self` methods or other DOMMatrix APIs) | `TypeError: ... is not a function` thrown at runtime when `processDocument` processes a real PDF. Inngest sync still works. | Add the missing method to the shim, redeploy. Pattern is `DOMMatrix.prototype.methodName = function() { return this }`. |
| `parsePdf` test breaks | `npx vitest run src/lib/parsers/pdf.test.ts` fails | Likely a mock-pathing issue. Fix is a one-line change in the test. |
| `npm run build` fails | Build output shows error | Check Turbopack config; likely an export resolution issue. Add `@thednp/dommatrix` to `transpilePackages` in `next.config.ts` if needed. |
| Vercel deploy succeeds but `/api/inngest` still 500s | curl returns 500 | Check Vercel function logs for the actual error. May be unrelated to this fix. |

**Rollback:** `git revert <commit-sha>` + `git push`. Total: ~3 min.

## Open questions

None. The design is concrete; the failure modes are well-characterized; the rollback is fast.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| We miss a `*Self` method and `processDocument` fails at runtime | Low–Medium | PDF uploads break (Inngest sync still works) | Add the missing method to the shim; redeploy. |
| `@thednp/dommatrix` adds a non-trivial bundle size | Low | Slower cold start | Package is ~5KB gzipped. Acceptable. |
| Vercel bundles `@thednp/dommatrix` as a separate chunk, increasing TTFB on `/api/inngest` | Low | Slightly slower first request | Acceptable; the endpoint is admin-only. |

## Decision log

| Decision | Rationale |
|---|---|
| Use `@thednp/dommatrix` instead of writing a full inline stub | Maintained, typed, smaller code. User-selected. |
| Patch `*Self` methods onto the prototype instead of writing our own class | Reuses tested constructor + transform math from `@thednp/dommatrix`. ~15 lines vs ~50. |
| Lazy-import `pdf-parse` inside `parsePdf` instead of putting the shim at the route file | Decouples `/api/inngest` cold start from `pdf-parse` evaluation. Cleanest separation of concerns. |
| Place the shim in `src/lib/parsers/dommatrix-shim.ts` (not `src/lib/inngest/` or top-level) | Co-located with the only consumer (`pdf.ts`). The shim is parser-internal. |
| No-op `*Self` methods returning `this` (no real math) | Text extraction doesn't need correct transforms; rendering would, but we don't render. |
