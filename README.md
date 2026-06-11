# Sunbird CB Creation Portal (cbp-Fusion)

An enterprise Angular SPA for **creating, authoring, managing, and publishing educational content** — courses, knowledge artifacts, assessments, and learning materials. It is the **content-authoring (CMS) side** of the Sunbird Competency-Based (CB) learning ecosystem; learners consume the published content through a separate portal.

Built by **Tarento** for the Sphere/Aastrika ecosystem on top of Sunbird (EkStep / DIKSHA).

- **Repo:** https://github.com/Sphere/sunbird-cb-creationportal-old
- **Version:** 5.0.0
- **Framework:** Angular **21** (migrated from Angular 8)

---

## Tech Stack

**Core:** Angular **21.2.x** (`@angular/build:application` builder, esbuild) · TypeScript **5.9** · RxJS **7.8** · Angular CLI **21.2.x** · zone.js 0.15. State is service-based (RxJS `BehaviorSubject`) — no NgRx/Redux.

**UI & styling:** Angular Material **21** + CDK (MDC components) · Tailwind CSS **3.4** · SCSS · lazy-loaded themes (`theme-orange` / `theme-igot`) · Roboto everywhere.

**Auth:** keycloak-angular **19** + keycloak-js **24** — OAuth2/OIDC SSO via `provideKeycloak()`; interceptor-based Bearer-token injection.

**Content/media:** ngx-extended-pdf-viewer 26 · video.js 7.6 · Quill 1.3 + ngx-quill 21 · ckeditor4-angular 5.2 · ace-builds · ngx-image-cropper · jsplumb · three.js · vis-network · D3 · Chart.js · xlsx · angularx-qrcode.

**Build/test:** ng-packagr 21 · Jest 29 · ESLint 9 / @angular-eslint 21 · gzipper (gzip + brotli) · Docker (prod base `node:22`) · Jenkins.

---

## Project Structure

A monorepo with three tiers — **place code in the correct tier; never mix cross-tier concerns:**

```
src/app/                    # Main app shell: component/ routes/ services/ guards/ constants/ models/
project/ws/                 # Workspace library projects
  ├── app/                  # @ws/app    — feature pages (home, dashboard, search, profile, toc, frac, events)
  ├── author/               # @ws/author — content authoring UI + shared components/services
  └── viewer/               # @ws/viewer — content consumption viewer
library/ws-widget/          # Reusable widget libraries
  ├── collection/           # @ws-widget/collection — 50+ widgets
  ├── resolver/             # @ws-widget/resolver  — runtime widget resolution from JSON config
  └── utils/                # @ws-widget/utils     — auth, config, logging, shared utils
proxy/                      # Dev proxy configs
angular.json / Dockerfile* / Jenkinsfile
```

**Path aliases** (defined in `tsconfig` — use these, never relative paths across library boundaries):

| Alias | Path |
| --- | --- |
| `@ws-widget/resolver` | `library/ws-widget/resolver` |
| `@ws-widget/collection` | `library/ws-widget/collection` |
| `@ws-widget/utils` | `library/ws-widget/utils` |
| `@ws/app` | `project/ws/app` |
| `@ws/author` | `project/ws/author` |
| `@ws/viewer` | `project/ws/viewer` |

**Key patterns:** lazy-loaded feature modules (`loadChildren`) · config-driven **widget system** (`@ws-widget/resolver` maps type strings → components at runtime) · interceptor chain (`AppInterceptorService` for Keycloak token + retry) · resolver-based data prefetch · guard chain (`GeneralGuard` → `LoginGuard` → `EmptyRouteGuard`) · `ws` selector prefix on all components.

---

## Getting Started

### Prerequisites

- **Node 20+** (Angular 21 requirement).
- On some Windows shells Node isn't on PATH in non-interactive sessions — prepend your Node install dir to PATH before running `ng`/`npm`.

### Install

```bash
npm install
```

> A fresh, clean install matters: a green *local* build is **not** proof CI passes. Angular 21 removed `ngcc`, so stale ngcc-compiled artifacts in `node_modules` can mask incompatibilities. Validate against a fresh install (see Migration Notes).

### Run locally

The dev server runs on **port 3000** (`prestart` runs `npm run tailwind` automatically). It proxies API calls to a backend gateway.

```bash
npm start                # ng serve, proxies to cbp-sphere.aastrika.org
npm run start:cbp-dev    # proxy to cbp-dev-ip
npm run start:hindi      # Hindi locale
```

### Build

`postbuild` runs gzip + brotli compression over `./dist/www`.

```bash
npm run build            # production  → dist/www/en
npm run build-dev        # dev configuration
npm run build-preprod    # preprod configuration
npm run build:local      # dev configuration, no base-href
```

> **Do not** add `--output-path` on the CLI — it resets `browser:""` and breaks the deploy layout. The output path lives in `angular.json`.

### Test & lint

```bash
npm test                 # Jest
npm run test-coverage    # Jest with coverage
npm run lint             # ESLint (ng lint)
npm run lint:fix         # ESLint autofix
```

---

## API & Backend Integration

**Dev proxy routes** (`proxy/localhost.proxy.json`):

| Route | Target |
| --- | --- |
| `/apis/*` | `https://cbp-sphere.aastrika.org/` (main gateway) |
| `/content-api/*` | `:3004` |
| `/content-store/*` | `:3005` |
| `/chat-bot/*` | `:3006` |
| `/mobile-apps/*` | `:3007` |
| `/LA/*` | `:3008` |
| `/assets/*` | CDN |

**Conventions:** Sunbird APIs are wrapped behind the `/apis/proxies/v8/` prefix (versions `/v1/ /v2/ /v8/`). New API calls should go through this prefix unless hitting a microservice directly. Content taxonomy uses `framework` + `channelId`.

**Auth flow:** Keycloak (OAuth2/OIDC SSO) → `AppInterceptorService` injects Bearer tokens → retry interceptor handles transient failures → role/group permissions drive feature visibility. Auth errors almost always trace to token expiry or a missing role.

---

## Deployment

CI/CD runs through **Jenkins** (`Jenkinsfile`) → Docker build/push.

The production bundle is served by an **Express** server (`dist/server.js`, via `npm run serve:prod`) — **not nginx**. It serves only from `dist/www/en/index.html`, so the deploy output path **must** be `dist/www/en` (the `/en` segment is required). The relevant `angular.json` setting:

```json
"outputPath": { "base": "dist/www/en", "browser": "" }
```

`browser:""` removes the builder's default nested `browser/` subfolder (which otherwise causes a root `404`); `base` keeps the `en` segment the server hardcodes.

---

## Migration Notes (Angular 8 → 21)

The repo was migrated from **Angular 8 (ViewEngine) → 21** across four milestones (8 → 12 → 15 → 17 → 21). Highlights:

- `@angular/build:application` builder (esbuild).
- `HttpClientModule` → `provideHttpClient(withInterceptorsFromDi(), withJsonpSupport())`.
- `KeycloakAngularModule` → `provideKeycloak()`.
- 503 declarations were explicitly marked `standalone: false` — **new shared declarations added to NgModules must also set `standalone: false`** to match.
- Modern APIs preferred: `inject()`, `provideHttpClient`, control-flow `@if` / `@for`.

**Three gotchas to respect:**

1. **`ckeditor4-angular` must stay ≥ 5.2.1.** v4.0.0 only "worked" locally via stale ngcc-compiled artifacts; a fresh install under Angular 21 fails with `NG6002 … not compatible with Ivy`. v5.2.1 is Ivy-native. *(CKEditor 4 is EOL; a full editor replacement is a separate task.)*
2. **Build script flags:** use kebab-case `--base-href=/` only. The old pre-21 flags `--outputPath` / `--baseHref` / `--i18nLocale` are invalid and were removed.
3. **Deploy output path = `dist/www/en`** (see Deployment above) — do not drop the `/en`.

---

## Contributing

Before making design or code changes, read **[CLAUDE.md](CLAUDE.md)** — the shared source of truth covering the project's design & development constitution, UI/Material conventions, and architecture rules. Core principle: **enhance, never remove** — every refactor must preserve all existing business functionality.
