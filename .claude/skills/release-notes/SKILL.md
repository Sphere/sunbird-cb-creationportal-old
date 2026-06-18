---
name: release-notes
description: Generate a production release note for a deploy candidate by diffing the current branch against the last v* tag, bucketing conventional-commit history into sections, and filling RELEASE_NOTES/TEMPLATE.md. Use right before deploying a branch to production. Triggers — "generate release notes", "release note for this deploy", "what's going to prod", "/release-notes".
---

# Release notes (production deploy) — conventional-commit aware

Generates a stakeholder-readable release note for the branch about to ship to prod.
Baseline is the **last `v*` release tag**. Output is `RELEASE_NOTES/release-<X.Y.Z>.md`.

**Deploy model:** production is deployed by a **manual Jenkins job** parameterized by a
release branch/ref (`github_release_tag`) — a human runs the build and selects the
branch; it does **not** auto-deploy on push. So a release is cut by creating a release
branch from the release commit and pushing it (this is **safe** — it just provides the
deploy source), after which the human triggers Jenkins. After writing the note this
skill prompts for the **release branch name** and creates/pushes it.

## Invocation

```
/release-notes                              # head = current branch, base = last v* tag, version inferred
/release-notes 4.1.0                        # explicit version label, base = last v* tag
/release-notes 4.1.0 v4.0.0                 # explicit version + explicit baseline tag
/release-notes 4.1.0 v4.0.0..HEAD           # explicit version + explicit git range
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
# Tags follow the vX.Y.Z convention (branch is release-<X.Y.Z>, tag is v<X.Y.Z>).
BASE=$(git tag --list 'v*' --sort=-version:refname | head -1)
```

- If the user passed a baseline tag or a `a..b` range, use that instead.
- If no `v*` tag exists, fall back to the highest `cbp-release-*` tag (legacy), then `prod-baseline`, then `main`. State which baseline you used in the output.
- Compute the range `BASE..HEAD_REF`.

### 2. Gather the history

```bash
git log --no-merges --pretty=format:'%h%x09%an%x09%s' <BASE>..<HEAD>
git diff --stat <BASE>..<HEAD>
```

Capture: short sha, author, subject line, and the set of changed paths.

### 3. Bucket by conventional-commit type

Parse each subject's `type(scope): summary` prefix and sort into:

| Section               | Commit types                                    |
| --------------------- | ----------------------------------------------- |
| ✨ Features           | `feat`                                          |
| 🐛 Fixes              | `fix`                                           |
| 🏗️ Build / CI / Infra | `ci`, `build`, `perf`, `chore(docker/deps/...)` |
| 📚 Docs / Chore       | `docs`, `chore`, `refactor`, `test`, `style`    |

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
- Version: the passed arg, else suggest the next semver after the baseline tag (e.g. baseline `v5.0.2` → suggest `5.0.3`) and confirm with the user if ambiguous.
- Write to `RELEASE_NOTES/release-<X.Y.Z>.md` (e.g. `RELEASE_NOTES/release-4.1.0.md`). Do **not** overwrite an existing file without confirming.
- Fill Branch / Baseline / Commit count / Author / date (today) in the header table.
- Write a real Summary — synthesize the buckets into 2–3 plain sentences, don't just restate commit count.

### 7. Bump the version in the docs

Before cutting the release, align the version metadata so it isn't stale:

- `package.json` `"version"`, `README.md` `**Version:**`, and `CLAUDE.md` `**Version:**`
  → set to the release version (e.g. `5.0.0`).
- The internal library/project `package.json`s (`@ws-widget/*`, `@ws/*`) are path-aliased
  and never published, so leave them unless the user asks.

### 8. Land the version bump + note on `main` via a PR (never push to `main` directly)

The bump + note from steps 6–7 are done on a **prep branch**, then merged to `main` through a PR — `main` is protected and we never push to it directly. `gh` is **not installed**; create + merge the PR via the GitHub REST API (auth with the token from `git credential fill`, never print it).

```bash
git push -u origin <prep-branch>
# POST /repos/Sphere/sunbird-cb-creationportal-old/pulls  (head=<prep-branch>, base=main)
# then PUT  /repos/Sphere/sunbird-cb-creationportal-old/pulls/<n>/merge
```

Then **sync `development`** to `main` (`git push origin main:development`); promote to `stage` when promoting.

### 9. Cut the build branch + tag, then publish the GitHub Release

From the merged `main` commit, create the two release artifacts. **The build branch and the tag MUST have different names** — a same-named branch+tag is an ambiguous git ref.

```bash
# Build branch — what Jenkins deploys from (deploy is from a BRANCH, not a tag).
# A NEW branch per release; never advance a previous/frozen release branch.
git branch release-<X.Y.Z> <release-commit>
git push origin refs/heads/release-<X.Y.Z>:refs/heads/release-<X.Y.Z>

# Tag — immutable marker for the GitHub Release. Note the `v` prefix (distinct from the branch).
git tag -a v<X.Y.Z> <release-commit> -m "Production release <X.Y.Z> (build branch: release-<X.Y.Z>)"
git push origin v<X.Y.Z>
```

Then publish the GitHub Release from the **`v<X.Y.Z>` tag**, body = the note (`gh` not installed → REST API with the `git credential fill` token):

```bash
CRED=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill)
TOKEN=$(printf '%s\n' "$CRED" | sed -n 's/^password=//p')
GITHUB_TOKEN="$TOKEN" node -e '
const fs=require("fs");
const body=fs.readFileSync("RELEASE_NOTES/release-<X.Y.Z>.md","utf8");
(async()=>{
  const r=await fetch("https://api.github.com/repos/Sphere/sunbird-cb-creationportal-old/releases",{
    method:"POST",
    headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:"application/vnd.github+json","User-Agent":"release-script","X-GitHub-Api-Version":"2022-11-28"},
    body:JSON.stringify({tag_name:"v<X.Y.Z>",name:"<X.Y.Z> — <title>",body,draft:false,prerelease:false})
  });
  const j=await r.json();
  console.log("HTTP",r.status, j.html_url||JSON.stringify(j.errors||j.message));
})();'
```

HTTP 201 = published. Report the release URL. **Deploy** = point the manual Jenkins job at the **build branch** `release-<X.Y.Z>`.

## Rules

- **Never invent changes.** Every bullet must trace to a real commit sha in the range. If the range is empty, say so and stop.
- **Never push to `main` directly** — the bump + note land via a PR (step 8). **Never advance a previous/frozen release branch** (`release-5.0.1` stays pinned); each release gets its **own new** `release-<X.Y.Z>` build branch.
- **Deploy is from the build BRANCH, not the tag.** Branch `release-<X.Y.Z>` (Jenkins deploy source) and tag `v<X.Y.Z>` (GitHub Release marker) **must have different names** — a same-named branch+tag is an ambiguous git ref.
- **Tag ⇒ Release, always together** (step 9): when asked only to "create the tag/release", still do the whole step — `v<X.Y.Z>` tag + GitHub Release from it.
- **Keep it readable by non-engineers** in Summary and Features; keep `Deploy notes & risk` honest for on-call.
- Match the repo's existing tone; reuse the gotcha framing from the `build-and-deploy` skill rather than re-explaining it.
