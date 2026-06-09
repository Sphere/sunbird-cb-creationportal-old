---
name: build-and-deploy
description: Build the Angular 21 app correctly and avoid the migration/deploy traps (ngcc stale artifacts, the dist/www/en output path, forbidden CLI flags). Use when building for production, debugging a CI/Docker build that passes locally but fails on a fresh install, or investigating a post-deploy root 404. Triggers — "build the app", "the build fails in CI", "404 after deploy", "production build", "why does it work locally but not on the server".
---

# Build & deploy (Angular 21) — gotcha-aware

This repo was migrated Angular 8 → 21. Three traps cause "works locally, breaks in CI/prod" failures. Respect all three.

## Build commands

```bash
npm run build           # production → dist/www/en  (postbuild gzips + brotli)
npm run build-dev       # dev configuration
npm run build-preprod   # preprod configuration
npm run build:local     # dev configuration, no base-href
```

Node 20+ is required. On some Windows shells Node isn't on PATH in non-interactive sessions — prepend your Node install dir to PATH before running `ng`/`npm`.

## Trap 1 — ngcc stale artifacts (a green local build is NOT proof CI passes)

Angular 21 removed `ngcc`. A library compiled for an older Angular can still "work" locally because of leftover ngcc-compiled artifacts in `node_modules`, then fail on a **fresh** install (CI / Docker `yarn install`) with `NG6002 … not compatible with Ivy`.

- `ckeditor4-angular` must stay **≥ 5.2.1** (Ivy-native). Do not downgrade to 4.0.0.
- After any dependency change, validate with a clean install (`rm -rf node_modules && npm install`) before trusting the build. A local pass alone is insufficient.

## Trap 2 — forbidden CLI flags

Build scripts use kebab-case `--base-href=/` only.

- **Do NOT** add `--output-path` on the CLI — it resets `browser:""` and breaks the deploy layout. Output path lives in `angular.json`.
- The old pre-21 flags `--outputPath` / `--baseHref` / `--i18nLocale` are invalid and were removed.

## Trap 3 — output path must be `dist/www/en` (the `/en` is required)

The deploy is an **Express** server (`dist/server.js`, via `npm run serve:prod`), **not nginx**. It serves only from `dist/www/en/index.html`. The Angular 21 builder nests output under a `browser/` subfolder by default → root `404`.

Correct `angular.json` setting:

```json
"outputPath": { "base": "dist/www/en", "browser": "" }
```

`browser:""` removes the nested subfolder; `base` keeps the `en` segment the server hardcodes. **Do not drop `/en`.** If you see a root 404 after deploy, this is the first thing to check.

## CI/CD

Jenkins (`Jenkinsfile`) → Docker build/push (prod base `node:22`). The build output `dist/www/en` is what gets served.

## Checklist before declaring a build "good"

- [ ] Validated against a fresh `node_modules` install (not just incremental)
- [ ] No `--output-path`/`--outputPath` added to any CLI invocation
- [ ] `angular.json` outputPath is `{ base: "dist/www/en", browser: "" }`
- [ ] `ckeditor4-angular` ≥ 5.2.1
- [ ] Output exists at `dist/www/en/index.html`
