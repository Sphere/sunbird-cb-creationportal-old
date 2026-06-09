# Bundle Audit — Findings (initial hypothesis NOT confirmed)

**Date:** 2026-06-08 · **Branch:** `migration/angular-21` (Angular 21, `@angular/build:application` / esbuild)

## TL;DR

The initial bundle is **healthy** — bundle size is **not** the portal's biggest problem. A measured production build disproved the original hypothesis. See the runner-up recommendation: **test coverage** (below).

## What I measured (production build, exit 0)

- **Initial JS (referenced by `index.html`): ~2.1 MB raw → ~393 KB gzip (~330 KB brotli).** Normal for an enterprise Angular authoring app.
- Largest eager piece: `chunk-JE6P4MRV.js` (1.4 MB raw) = framework + Material + app shell + lightweight widgets. Contains **no** video.js / pdfjs / quill / d3.
- **Heavy libraries are already lazy-loaded** (in chunks NOT referenced by `index.html`):
  - `video.js` → `chunk-PKRBZKR3.js` (2.5 MB, lazy)
  - `pdfjs` → `chunk-7UCNJHH6 / N3LMBENF / 6YOLET3A` (lazy)
  - `quill` → `chunk-MKIM4BOV`, `chunk-PKRBZKR3` (lazy)

## Why the original hypothesis was wrong

The widget-resolver registration ([`registration.config.ts`](../library/ws-widget/collection/src/lib/registration.config.ts), spread into the root [`app.module.ts:96`](../src/app/app.module.ts#L96)) *looks* like it forces every media player into the eager bundle. Under the **old Angular 8 ViewEngine + webpack** that was likely true. But the **Angular 21 esbuild application builder code-splits these dynamically-resolved components into lazy chunks anyway**, so the heavy deps no longer ship on the login critical path. The migration already captured this win.

## Remaining (minor, optional) bundle items — low priority

- `chunk-JE6P4MRV.js` (1.4 MB raw / ~250 KB gzip) is the only sizeable eager chunk; could be trimmed by auditing which lightweight widgets truly need eager registration, but the payoff is small.
- `video.js@7.6` triggers ~14 CommonJS "optimization bailout" warnings (non-ESM deps). Cosmetic; only matters if/when video.js is modernized.
- Budgets in [`angular.json`](../angular.json) (4mb warn / 15mb error) are loose; tightening to ~1mb/2mb would catch future eager-bundle regressions cheaply. **This is the one worthwhile follow-up here.**

## Revised recommendation for "best improvement"

Bundle is fine. The highest-leverage improvement is **automated test coverage to lock in the just-completed 8→21 migration**: ~12 `.spec.ts` files across ~1,160 TS files (~1%), on an app where 503 components were just migrated with no runtime safety net. Smoke/e2e coverage of the core authoring flows (login → create course → add content → publish) would de-risk the migration that just shipped. (Cypress 13 is already a dev dependency.)
