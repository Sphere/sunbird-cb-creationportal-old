# Release 5.1.1 — 2026-07-14

|                              |                                              |
| ---------------------------- | -------------------------------------------- |
| **Build branch deployed**    | `release-5.1.1` (Jenkins deploy source)      |
| **Tag**                      | `v5.1.1` (immutable marker + GitHub Release) |
| **Baseline (previous prod)** | `v5.1.0`                                     |
| **Commits**                  | `1` (CKEditor image-upload restoration)      |
| **Author**                   | Likhith Thammegowda                          |

## Summary

Restores the ability to **upload images (and files / blanks) directly into the question editor** of quizzes and assessments — a capability that was silently dropped during the Angular 8→21 migration. Content authors can again click **Upload Image** in the question rich-text toolbar, and the image now appears in the editor immediately and is saved with the question. Also fixes a background reload that could wipe an author's unsaved edits before they saved.

## ✨ Features

- _None — patch release (restoration + fix)._

## 🐛 Fixes

- **author / question editor** — **Restored the custom Upload Image / Upload File / Add Blank toolbar buttons** in the `plain-ckeditor` (used by the quiz/assessment question editor, edit-meta description, and web-page editor). The Angular migration replaced the declarative `<ckeditor>/<ckbutton>` integration with an imperative `CKEDITOR.replace()` and never re-added the buttons; they are now re-registered as a single global CKEditor 4 plugin (`wsuploads`) in the `insert` toolbar group, wired to the existing upload handlers (`c0ad2a0`).
- **author / question editor** — **Inserted images now render immediately.** The upload was inserting a proxied, percent-encoded `src` (`/apis/authContent/https%3A%2F%2F…`) that did not resolve, so a freshly inserted image stayed blank until a reload rewrote it. It now inserts the asset's plain URL; the stored value is unchanged (`c0ad2a0`).
- **author / question editor** — Fixed the toolbar button icons rendering blank (CKEditor 4's `getUrl()` mangles `data:` URI icon paths); icons are now applied via an injected stylesheet. Also restore the caret after the file dialog and guarantee a single live editor instance per host (`c0ad2a0`).
- **author / quiz loader** — A background quiz reload (`changeActiveCont` re-emitting) was overwriting the in-memory questions with stale backend data, wiping unsaved edits (e.g. a just-inserted image) out of the editor. The loader now preserves in-memory questions when there are unsaved changes (`c0ad2a0`).

## 🏗️ Build / CI / Infra

- _None._

## 📚 Docs / Chore

- _None._

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none.
- **Backend / API contract dependencies:** none changed. Image upload uses the existing `content/v3/create` + asset upload flow; images are served from their returned public asset URL.
- **Breaking changes:** none. Change is scoped to the authoring rich-text editor and the quiz loader; the stored question HTML format is unchanged.

## ✅ Pre-deploy checklist

- [ ] Build verified on a **fresh install** (`rm -rf node_modules && npm install --legacy-peer-deps && npm run build`)
- [ ] `npm run lint` clean
- [ ] `npm test -- --coverage` green
- [ ] Smoke-test: in a quiz/assessment question, click **Upload Image**, pick a file — it appears in the editor immediately; add a second image — both stay; Save, reopen — both persist
- [ ] Rollback ref confirmed: `v5.1.0` / branch `release-5.1.0`

## Release & rollback

**Deploy** — a human runs the manual Jenkins job (`Jenkinsfile-sun`) pointed at the **build branch** `release-5.1.1` (deploy is from a branch, not a tag). Each release gets its own new build branch + a `v<X.Y.Z>` tag; the previous `release-5.1.0` branch stays frozen.

**Rollback** — re-run the same manual Jenkins job against the previous release branch `release-5.1.0`.

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
