---
name: release-notes
description: Generate a production release note for a deploy candidate by diffing the current branch against the last cbp-release-* tag, bucketing conventional-commit history into sections, and filling RELEASE_NOTES/TEMPLATE.md. Use right before deploying a branch to production. Triggers — "generate release notes", "release note for this deploy", "what's going to prod", "/release-notes".
---

# Release notes (production deploy) — conventional-commit aware

Generates a stakeholder-readable release note for the branch about to ship to prod.
Baseline is the **last `cbp-release-*` tag**. Output is a versioned file in `RELEASE_NOTES/`.
This skill **does not** create or push git tags — that stays a human action.

## Invocation

```
/release-notes                              # head = current branch, base = last cbp-release-* tag, version inferred
/release-notes 4.1                          # explicit version label, base = last cbp-release-* tag
/release-notes 4.1 cbp-release-4.0          # explicit version + explicit baseline tag
/release-notes 4.1 cbp-release-4.0..HEAD    # explicit version + explicit git range
```

Parse the args as: optional `<version>`, then an optional `<baseline-tag>` **or** `<git-range>`.

## Steps

### 1. Resolve baseline and head
```bash
git fetch --tags --quiet
HEAD_REF=$(git rev-parse --abbrev-ref HEAD)
# Baseline = highest-versioned prod tag, unless the user passed one.
# Use version-sorted tag listing, NOT `git describe` — the deploy branch may have
# diverged from the release tags (they aren't ancestors), and `git describe` only
# finds *reachable* tags, so it returns empty here. Tag listing is divergence-proof.
BASE=$(git tag --list 'cbp-release-*' --sort=-version:refname | head -1)
```
- If the user passed a baseline tag or a `a..b` range, use that instead.
- If no `cbp-release-*` tag exists, fall back to `prod-baseline`, then to `main`. State which baseline you used in the output.
- Compute the range `BASE..HEAD_REF`.

### 2. Gather the history
```bash
git log --no-merges --pretty=format:'%h%x09%an%x09%s' <BASE>..<HEAD>
git diff --stat <BASE>..<HEAD>
```
Capture: short sha, author, subject line, and the set of changed paths.

### 3. Bucket by conventional-commit type
Parse each subject's `type(scope): summary` prefix and sort into:

| Section | Commit types |
|---|---|
| ✨ Features | `feat` |
| 🐛 Fixes | `fix` |
| 🏗️ Build / CI / Infra | `ci`, `build`, `perf`, `chore(docker/deps/...)` |
| 📚 Docs / Chore | `docs`, `chore`, `refactor`, `test`, `style` |

- Keep the **scope** (e.g. `author`, `create`, `docker`) as the bold lead-in of each bullet.
- If a commit has no conventional prefix, infer the bucket from the changed paths and note it.
- Rewrite terse subjects into user-facing language for the bullet, but **keep the `short-sha`** so each line is traceable.

### 4. Map scope → affected area (for the Summary)
Infer impact from the monorepo tier of the changed files:
`project/ws/author` → authoring UI · `project/ws/viewer` → content viewer ·
`project/ws/app` → app shell/pages · `library/ws-widget/*` → widgets ·
`Dockerfile*` / `Jenkinsfile` / `.github` → build & deploy · `src/styles`,`*.scss` → design system.

### 5. Flag deploy gotchas (only if relevant files changed)
Tick the relevant boxes in the **Deploy notes & risk** section when the diff touches:
- `angular.json` outputPath / build scripts / `package.json` build flags → output-path & build-flag traps.
- `package.json` dependency on `ckeditor4-angular` or any Angular lib → ngcc/Ivy fresh-install trap (must stay ≥ 5.2.1).
- `Dockerfile*`, `Jenkinsfile`, Helm/env files → infra/config risk.
Leave them unticked (not deleted) otherwise so the reviewer still sees the checklist.

### 6. Fill the template and write the file
- Start from `RELEASE_NOTES/TEMPLATE.md`.
- Version: the passed arg, else suggest the next semver after the baseline tag (e.g. baseline `cbp-release-4.0` → suggest `4.1`) and confirm with the user if ambiguous.
- Write to `RELEASE_NOTES/<version>.md` (e.g. `RELEASE_NOTES/4.1.md`). Do **not** overwrite an existing file without confirming.
- Fill Branch / Baseline / Commit count / Author / date (today) in the header table.
- Write a real Summary — synthesize the buckets into 2–3 plain sentences, don't just restate commit count.

### 7. Report
Print the path written and a one-line recap. Remind the user this did **not** tag anything:
> Wrote `RELEASE_NOTES/<version>.md`. When you're ready to ship, tag with
> `git tag cbp-release-<version> && git push origin cbp-release-<version>`.

## Rules

- **Never invent changes.** Every bullet must trace to a real commit sha in the range. If the range is empty, say so and stop.
- **Don't tag or push.** Tagging is a deliberate human step (see report).
- **Keep it readable by non-engineers** in Summary and Features; keep `Deploy notes & risk` honest for on-call.
- Match the repo's existing tone; reuse the gotcha framing from the `build-and-deploy` skill rather than re-explaining it.
