# Release 6.1.6 — 2026-11-26

|                              |                                                                           |
| ---------------------------- | ------------------------------------------------------------------------- |
| **Build branch deployed**    | `release-6.1.6` (Jenkins deploy source)                                   |
| **Tag**                      | `v6.1.6` (immutable marker + GitHub Release)                              |
| **Baseline (previous prod)** | `v6.1.5`                                                                  |
| **Commits**                  | `1` (non-merge): the AI Studio package update, version bump and this note |
| **Author**                   | Likhith Thammegowda                                                       |

## Summary

This release moves AI Studio's `@aastrika/ai-elements` from 0.10.0 to 0.11.0. Most of the change is about voices: a new language menu, voices grouped by language, clearer warnings when a scene is silent or a backup voice was used, and a voice picker that fits a phone. Several of these stay off until the AI Studio service switches them on. The AI Studio tags, attributes and events are the same, so no portal code changes. Nothing else changes.

## ✨ Features

- **ai-studio** — **Language menu.** The create form's Language box is now a menu in the voice picker's style. Each language shows its own letter (अ, ಅ, A) and how many voices it has ("15 voices", "No voices of its own yet"). It works with the keyboard and fits a phone.
- **ai-studio** — **Voices by language** (off until the service turns on `VOICE_PICKER_V2`). A voice that speaks several languages is listed under each one, the video's language comes first, groups are headed by language name, and each voice is described in plain words ("Woman · warm · middle-aged"). Each roleplay person's card shows their voice, to hear and change.
- **ai-studio** — **A note when a language has no voice of its own** (off until the service turns on `VOICE_LANGUAGE_NOTE`), for example "No Assamese voice is available yet; Sharad, a Hindi voice, will read it."
- **ai-studio** — **A video says when a backup voice spoke** (off until the service turns on `VOICE_BACKUP_NOTICE`), and how to fix it by updating the video.
- **ai-studio** — **Why a scene is silent.** "1 scene has no narration" now gives the reason when every silent scene failed for the same reason. An edit that could not keep the video's original music says so.
- **ai-studio** — **A voice picked for a roleplay person stays theirs.** When the service keeps people on different voices, it moves the other person instead.

## 🐛 Fixes

- **ai-studio** — The voice picker list fits a 375 px phone (it was at least 380 px wide).
- **ai-studio** — An open voice or music menu is drawn above the Video summary card and is no longer see-through. On a phone each menu is its picker's width, so the play buttons stay visible.
- **ai-studio** — Picking another voice no longer keeps the old voice's "Why this voice" reason or its preview.
- **ai-studio** — A voice with no sample in the video's language says so, instead of "Try again".
- **ai-studio** — Warnings read correctly for several scenes ("2 scenes have no narration"; it said "has").

## 🏗️ Build / CI / Infra

- Dependency: `@aastrika/ai-elements` `0.10.0` → `0.11.0` (`package.json`). Same four elements, an identical `aastrika-elements.d.ts` and the same peer dependencies. The bundle grows by about 12 KB (about 1.5 MB, in the lazy AI Studio chunk).

## 📚 Docs / Chore

- Version bump to 6.1.6 and this release note.

## ⚠️ Deploy notes & risk

- **Migration/deploy gotchas touched?**
  - [ ] `outputPath` / `dist/www/en` layout — unchanged.
  - [ ] `ckeditor4-angular` ≥ 5.2.1 — unchanged.
  - [ ] Build flags — unchanged.
- **Config / env / secret changes:** none in the portal. The new voice features are switched on in the **AI Studio service** (`VOICE_PICKER_V2`, `VOICE_LANGUAGE_NOTE`, `VOICE_BACKUP_NOTICE`), not here.
- **Backend / API contract dependencies:** **deploy the AI Studio service `backend/v1.7.0` first** (branch `bugfix/voice-library-phase-0-1`). With an older service, the page works as in 0.10.0: no voice counts, no `voicePicked` handling and no new voices. uiproxy already forwards every `aiStudio/studio/*` path, so **no uiproxy change** is needed.
- **Breaking changes:** none for the portal.
- **Risk:** low. Dependency only, AI Studio screens only.

## ✅ Pre-deploy checklist

- [x] Lint: no portal source changed, so no new lint errors
- [x] `@aastrika/ai-elements` 0.11.0 installs fresh from the npm registry
- [ ] Unit tests and production build: not run before this release (dependency-only change; Jenkins builds the image)
- [ ] AI Studio service `backend/v1.7.0` deployed
- [ ] Smoke test after deploy: AI Studio → Content Creation shows the new Language menu with voice counts; the voice picker opens and plays a sample; on a phone-width window the voice menu fits the screen; Assessment Creation and Reports open
- [ ] Rollback ref confirmed (re-runnable in Jenkins): `release-6.1.5`

## Release & rollback

**Deploy** — this release ships as the **`release-6.1.6`** branch; a human runs the
manual Jenkins job (`Jenkinsfile-sun`) with `github_release_tag = release-6.1.6`.
Pushing the branch only provides the deploy source — it does not deploy on its own.

**Rollback** — re-run the same manual Jenkins job against the previous release ref:

```text
github_release_tag = release-6.1.5
```

(Jenkins → Docker → Helm pipeline, namespace `dev`.)
