# Release 6.1.0 — 2026-11-02

|                              |                                              |
| ---------------------------- | -------------------------------------------- |
| **Build branch deployed**    | `release-6.1.0` (Jenkins deploy source)      |
| **Tag**                      | `v6.1.0` (immutable marker + GitHub Release) |
| **Baseline (previous prod)** | `v6.0.1`                                     |
| **Commits**                  | `5` (non-merge), plus this note              |
| **Author**                   | Likhith Thammegowda                          |

## Summary

Video questions are rebuilt: they now pop up reliably at any playback speed, and reviewers get an answer-key view of every question point in a video. Quiz and assessment authors can bulk-upload hints and the quiz settings (duration, random count, pass percentage) from Excel, and the template is generated in the browser. Course Settings no longer fails with "Please Save Parent first" on a new course. Players, My Courses and many screens are tidied up, with about 200 accessibility fixes. The HTML learning format is built but stays hidden until it is approved for production.

## ✨ Features

- **player (video questions)** — **Reliable in-video questions.** The popup is rebuilt with plain radio buttons. Submit stays off until an option is picked, Retry clears the choice and Next starts fresh. A question now fires when playback crosses its time, so it no longer gets skipped at 2× or 3×. It fires once per pass and again after seeking back. Timeline markers show each question's time and text (`68c31ed8`).
- **player (reviewer answer key)** — Reviewers get a button over the video that lists every question point, with its time, options, the correct option marked, hints, a warning when no correct option is set, and **Jump to** just before the point (`68c31ed8`).
- **quiz preview** — Multiple choice is shown as a read-only answer key, like single choice: correct options badged and every option's hint visible without submitting (`68c31ed8`).
- **quiz / assessment (Excel upload)** — Optional **Hint 1–6** columns, and optional **Duration (Minutes)**, **Random Count** and **Pass Percentage** columns, applied as if typed. Invalid values are reported after upload instead of being saved. Sheets in the old template import exactly as before. **Download template** is now generated in the browser from the same columns the upload reads, with examples and a "How to fill" sheet. **Download questions** includes hints and settings, so the file uploads back unchanged (`d2afae7e`).
- **players** — One consistent player frame for PDF, video and audio, a shared "File not uploaded" state, and Course Builder **Preview** opens the resource you are on (`182df0e9`).
- **My Courses** — Page heading with a count, language picker, clearable search, grid/list toggle, empty and error states, fuller card details, and a "My Workspace" sidebar showing the user's roles (`182df0e9`).
- **HTML learning format (hidden)** — Support for HTML zip resources is built (player, progress, debug view) but **switched off in Course Builder**: it is not approved for production, so every zip is still treated as SCORM (`182df0e9`, `68c31ed8`).

## 🐛 Fixes

- **course settings** — **"Please Save Parent first" on a new course is fixed.** Form-only fields with no configured default made the save fail on a fresh course, and Next then failed until a page reload. Fields without a default are now left out instead of breaking the save. Status messages and delete checks also cope with a parent that has not loaded yet (`d2afae7e`).
- **quiz (hints)** — Saved hints are kept when a question is opened in the editor. Before, the Hint dialog opened empty and the next edit erased the saved hints, while the preview still showed them. Applies to multiple choice, fill-in-the-blank and match-the-following (`fc610c1c`).
- **quiz (settings)** — Every setting was capped at 100 when typed, and the cap overwrote the pass percentage; now only the pass percentage is capped (`d2afae7e`).
- **video questions (indexing)** — `videoQuestions` is saved as a JSON string again, as on the legacy platform. Saved as a list, it hit a text field in the search index and the indexer job failed on it at every restart, which stopped all indexing (`68c31ed8`).
- **dialogs** — A global popup style that leaked into every dialog is removed (`68c31ed8`). The IPR dialog's **I Agree** button no longer turns blue-on-blue on hover, and the quiz side-menu icon buttons have the right hover size again; both were broken by Angular Material 21 renaming its style variables (`68cef567`).
- **viewer** — "Loading content..." no longer reappears after content has loaded (`182df0e9`).
- **accessibility & code health** — About 200 template accessibility issues fixed: clickable `span`/`div` elements are now real buttons, and inputs have labels. The HTML picker uses `srcdoc` instead of a `javascript:` URL. Duplicate ids are removed (`182df0e9`).

## 🏗️ Build / CI / Infra

- None. No dependency, build-flag or deploy-layout change.

## 📚 Docs / Chore

- Version bump to 6.1.0 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none.
- **Backend / API contract dependencies:**
  - `videoQuestions` is **written** as a JSON string (it was a list in 6.0.x). The portal reads both forms. **The learner portal (eagle-fusion) must read the string form too**; its `parseVideoQuestions` handles both on `fix/learner-quiz-hint-video-questions`. Confirm that is live before or with this release, or learners may not see video questions on videos saved after this deploy.
  - The bulk-upload template no longer comes from S3; the S3 file is simply unused.
- **Breaking changes:** none for authors. Old Excel sheets import unchanged.
- **Rollback safety:** a rollback to 6.0.1 can read videos saved by 6.1.0, because 6.0.1 reads `videoQuestions` as either a string or a list.
- **Risk:** medium. This is a larger release (199 files), most of it UI. The video-question and settings changes are covered by unit tests, and the HTML format is switched off.

## ✅ Pre-deploy checklist

- [x] Unit tests: 457 suites, 8,843 tests pass; coverage threshold met (statements 95.6%, branches 85.47%, functions 92.45%, lines 95.72%; threshold 85%)
- [x] Production build passes (`dist/www/en`)
- [ ] Lint: this release adds **9 errors** in 7 of the 175 files it touches (518 were already in those files at `v6.0.1`). Lint is not a CI gate. They are 5 template `==`/`!=` comparisons (comments dialog, content card, HTML viewer), 2 `console` calls (video.js helper, HTML player debug log) and 2 `require()` calls in a quiz spec. They are left as they are in this release, because changing `==` to `===` can change behaviour; to be fixed separately.
- [ ] Learner portal reads `videoQuestions` as a string (eagle-fusion `fix/learner-quiz-hint-video-questions`) is deployed
- [ ] Smoke test after deploy: a video with questions pops each question at 1× and 2×; the reviewer answer key lists them; an Excel upload with hints and settings applies them; Course Settings saves on a brand-new course and Next works without a reload
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-6.0.1`

## Release & rollback

**Deploy** — this release ships as the **`release-6.1.0`** branch; a human runs the
manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-6.1.0`.
Pushing the branch only provides the deploy source — it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-6.0.1
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
