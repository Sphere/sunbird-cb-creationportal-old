# SonarQube / SonarCloud Remediation — Runbook

Project: **`Sphere_sunbird-cb-creationportal-old`** (org `sphere`, SonarCloud).

Goal: bring **Security**, **Reliability**, and **Security Review (Hotspots)** to **A** on Overall
Code, lift **line coverage to 60%**, and reduce duplication — **without removing any feature
or changing behavior**. This is a phased program; this doc is the operational runbook. Phase 0
(scan scoping) is implemented by `sonar-project.properties` and `.github/workflows/sonarcloud.yml`.

## How Sonar ratings work (so we fix the right things)

| Rating          | A means                    | Implication here                                                                                       |
| --------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Reliability     | **0 Bugs**                 | Every Bug must be fixed or dispositioned (Won't-fix / false-positive).                                 |
| Security        | **0 Vulnerabilities**      | Fix/disposition all 6.                                                                                 |
| Security Review | **≥80% Hotspots reviewed** | Mark each Hotspot **Safe** or **Fixed** — a triage action, not always code.                            |
| Maintainability | debt-ratio (not count)     | Already **A**. `console.*` and `as any` are _smells_ here, **not** Bugs — low priority for the rating. |

## Phase 0 — scan scope + coverage wiring (done in this change)

`sonar-project.properties` now:

- Scopes analysis to the real source tiers: `sonar.sources=src/app,project/ws,library/ws-widget`
  (this excludes vendored bundles `ckeditor.js` / `telemetry.min.js` / `zip.js`, the committed
  `dist/` server, legacy `e2e/`, and root configs by omission).
- Registers `*.spec.ts` as tests, not sources.
- Excludes `**/*.min.js`, `**/karma.conf.js`, `**/*.d.ts`, `**/assets/**`, `**/environments/**`.
- Wires coverage: `sonar.javascript.lcov.reportPaths=coverage/lcov.info`.
- Keeps NgModules/routing/models/barrels out of the **coverage** denominator
  (`sonar.coverage.exclusions`), mirroring `jest.config.js` `collectCoverageFrom`.

> Note: `project/ws/author/src/lib/constants/init.ts` (4,649 lines, ~1,591 `as any`) is **not**
> excluded. It's hand-maintained static config (a single `const`, zero functions), so its casts
> are Maintainability _smells_ (already grade A) — irrelevant to the target ratings — and as pure
> data it contributes ~1 executable statement, so it barely affects coverage. Excluding a real
> source file would be gaming for no benefit.

## Running a scan

### Preferred (CI, once the token exists)

1. Repo → Settings → Secrets and variables → Actions → add **`SONAR_TOKEN`** (SonarCloud → My
   Account → Security → generate token).
2. In `.github/workflows/sonarcloud.yml`, uncomment the `push` / `pull_request` triggers.
3. Trigger via **Actions → SonarCloud → Run workflow** (or open a PR). The job installs deps,
   runs `npm test -- --coverage --ci` to produce `coverage/lcov.info`, then scans.

### Local / manual (token-later)

```bash
# 1) generate coverage (Node 20; deps via --legacy-peer-deps)
npm install --legacy-peer-deps
npm test -- --coverage        # writes coverage/lcov.info

# 2) run the scanner (needs a token in the env; does NOT touch the app)
export SONAR_TOKEN=<your-sonarcloud-token>
npx sonar-scanner            # or: docker run --rm -e SONAR_TOKEN -v "$PWD:/usr/src" sonarsource/sonar-scanner-cli
```

The scanner reads `sonar-project.properties`, so no extra flags are needed.

## Exporting the issue list (the input to Phases 2–3)

After a scoped re-scan, export the residual findings — this sizes and sequences the fix work:

- **UI:** Issues tab → filter _Type = Bug_ and _Type = Vulnerability_; Security Hotspots tab →
  review queue. Export from the UI where available.
- **API:** `GET api/issues/search?componentKeys=Sphere_sunbird-cb-creationportal-old&types=BUG&ps=500`
  (and `types=VULNERABILITY`), `GET api/hotspots/search?projectKey=Sphere_sunbird-cb-creationportal-old`.

## Phases 1–4 (summary)

1. **Hotspots E→A** — review the queue by rule; mark **Safe** (with justification) for non-security
   uses (e.g. `Math.random` DOM ids, trusted `innerHTML`/`bypassSecurityTrust`/`window.location`),
   **fix** genuinely unsafe ones. Cross 80% reviewed → rating A.
2. **Vulns D→A** — fix/disposition the 6.
3. **Reliability E→A** — fix Bugs in tested batches by rule (mechanical `==`→`===` and
   identical-branch first; then empty catches, timing, unsubscribed observables). Iterate to 0.
4. **Coverage 8.3%→60%** — ratcheted milestones (services/pipes → small components → big author
   components via direct-instantiation `build()` pattern → viewer tier), bumping the
   `jest.config.js` `coverageThreshold` after each milestone. Extract the duplicated stepper arrays
   into a tested factory (cuts duplication + adds coverage).

## Guardrails (every code PR)

Branch from `main`; one issue-category per PR; ship tests; keep `npm run lint`, `npm test -- --coverage`
and `npm run build` all green; re-scan and confirm the target count dropped with **no new** issues.
