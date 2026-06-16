---
name: release-notes
description: Generate a production release note for a deploy candidate by diffing the current branch against the last cbp-release-* tag, bucketing conventional-commit history into sections, and filling RELEASE_NOTES/TEMPLATE.md. Use right before deploying a branch to production. Triggers — "generate release notes", "release note for this deploy", "what's going to prod", "/release-notes".
---

# Release notes (production deploy) — conventional-commit aware

Generates a stakeholder-readable release note for the branch about to ship to prod.
Baseline is the **last `cbp-release-*` tag**. Output is a versioned file in `RELEASE_NOTES/`.

**Deploy model:** production is deployed by a **manual Jenkins job** parameterized by a
release branch/ref (`github_release_tag`) — a human runs the build and selects the
branch; it does **not** auto-deploy on push. So a release is cut by creating a release
branch from the release commit and pushing it (this is **safe** — it just provides the
deploy source), after which the human triggers Jenkins. After writing the note this
skill prompts for the **release branch name** and creates/pushes it.

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
- Version: the passed arg, else suggest the next semver after the baseline tag (e.g. baseline `cbp-release-4.0` → suggest `4.1`) and confirm with the user if ambiguous.
- Write to `RELEASE_NOTES/<version>.md` (e.g. `RELEASE_NOTES/4.1.md`). Do **not** overwrite an existing file without confirming.
- Fill Branch / Baseline / Commit count / Author / date (today) in the header table.
- Write a real Summary — synthesize the buckets into 2–3 plain sentences, don't just restate commit count.

### 7. Bump the version in the docs

Before cutting the release, align the version metadata so it isn't stale:

- `package.json` `"version"`, `README.md` `**Version:**`, and `CLAUDE.md` `**Version:**`
  → set to the release version (e.g. `5.0.0`).
- The internal library/project `package.json`s (`@ws-widget/*`, `@ws/*`) are path-aliased
  and never published, so leave them unless the user asks.

### 8. Report, then create the release branch

Print the note path and a one-line recap. Then create the **release branch** — the
deploy source the manual Jenkins job points at. Pushing it is **safe** (it does not
auto-deploy), so just confirm the branch name with the user (don't invent it):

- **Branch name** — e.g. `cbp-release-<version>` or `release/<version>`.

```bash
git switch -c <branch-name>     # from the release commit
git push origin <branch-name>   # safe: provides the deploy source, does NOT ship
```

Remind the user the actual deploy is the separate **manual Jenkins build** against that branch.

### 9. Tag the release **and** publish the GitHub Release (do both together)

A release isn't finished at the branch — once the build is deployed, tagging **always** also publishes the GitHub Release in the same flow (don't stop at the tag). Confirm the exact **deployed commit** if it's ambiguous (the Jenkins build ref), then tag that commit.

```bash
# Annotated tag at the deployed commit. Use the .Z patch form (cbp-release-X.Y.Z) —
# a branch named cbp-release-X.Y already exists, so a bare cbp-release-X.Y tag would
# create an ambiguous ref.
git tag -a cbp-release-<X.Y.Z> <deployed-commit> -m "Production release <X.Y.Z>"
git push origin cbp-release-<X.Y.Z>
```

Then publish the GitHub Release from that tag, using the note as the body. **`gh` is NOT installed** in this environment — authenticate the REST call with the token from `git credential fill` (never print it):

```bash
CRED=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill)
TOKEN=$(printf '%s\n' "$CRED" | sed -n 's/^password=//p')
GITHUB_TOKEN="$TOKEN" node -e '
const fs=require("fs");
const body=fs.readFileSync("RELEASE_NOTES/<version>.md","utf8");
(async()=>{
  const r=await fetch("https://api.github.com/repos/Sphere/sunbird-cb-creationportal-old/releases",{
    method:"POST",
    headers:{Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,Accept:"application/vnd.github+json","User-Agent":"release-script","X-GitHub-Api-Version":"2022-11-28"},
    body:JSON.stringify({tag_name:"cbp-release-<X.Y.Z>",name:"<X.Y.Z> — <title>",body,draft:false,prerelease:false})
  });
  const j=await r.json();
  console.log("HTTP",r.status, j.html_url||JSON.stringify(j.errors||j.message));
})();'
```

HTTP 201 = published. Report the release URL. (Proven for 5.0.0.)

## Rules

- **Never invent changes.** Every bullet must trace to a real commit sha in the range. If the range is empty, say so and stop.
- **Confirm the release branch name before creating it** (don't invent it). Pushing the branch is safe — it's the deploy _source_, not the deploy itself; the actual ship is a separate manual Jenkins build (see step 8).
- **Keep it readable by non-engineers** in Summary and Features; keep `Deploy notes & risk` honest for on-call.
- Match the repo's existing tone; reuse the gotcha framing from the `build-and-deploy` skill rather than re-explaining it.
- **Tag ⇒ Release, always together** (step 9). When asked only to "create the tag", still publish the GitHub Release in the same flow. Tag the **deployed** commit, and use the `cbp-release-X.Y.Z` form (not the bare `cbp-release-X.Y`, which collides with the branch name).
