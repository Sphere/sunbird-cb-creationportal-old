# Release <version> — <YYYY-MM-DD>

| | |
|---|---|
| **Branch deployed** | `<branch>` |
| **Baseline (previous prod)** | `<previous cbp-release tag>` |
| **Commits** | `<n>` |
| **Author** | `<name>` |

## Summary

<2–3 line, plain-language overview a non-engineer stakeholder can read. What does this
release change for users / content authors, and why does it matter?>

## ✨ Features

- **<scope>** — <user-facing description of the change> (`<short-sha>`)

## 🐛 Fixes

- **<scope>** — <what was broken, now fixed> (`<short-sha>`)

## 🏗️ Build / CI / Infra

- <change> (`<short-sha>`)

## 📚 Docs / Chore

- <change> (`<short-sha>`)

## ⚠️ Deploy notes & risk

> Delete the lines that don't apply; keep this section honest — it's the part on-call reads.

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout (Express prod server, not nginx)
  - [ ] `ckeditor4-angular` must stay ≥ 5.2.1 (ngcc/Ivy trap)
  - [ ] Build flags (kebab-case `--base-href=/` only; no `--output-path`)
- **Config / env / secret changes:** <none | describe>
- **Backend / API contract dependencies:** <none | describe + which service version>
- **Breaking changes:** <none | describe + migration step>

## ✅ Pre-deploy checklist

- [ ] Build verified on a **fresh install** (`rm -rf node_modules && npm install --legacy-peer-deps && npm run build`) — a green *local* build is not proof CI passes
- [ ] `npm run lint` clean
- [ ] Smoke-tested on preprod (login, author a course, publish)
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `<previous release ref>`

## Release & rollback

**Deploy** — this release ships as the **`<release-branch>`** branch; a human runs the
manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = <release-branch>`.
Pushing the branch only provides the deploy source — it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = <previous release ref>
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
