# Promoting the Angular 21 line to `main` + Angular 8 feature-gap audit

> Status: backups done; promotion is a **coordinated manual step you run** (force-push to a protected default branch). The Angular-8 history is fully preserved — nothing is destroyed.

## Why this exists

`main` (commit `128e9499`) is the **Angular 8** line and still received feature work in parallel with the migration (~1118 commits). The shipped **Angular 21** product lives on `migration/angular-21` → `cbp-release-5.0` (~1230 commits, released to prod as `5.0.0`). **The two branches share no git history** (empty merge-base), so a normal merge is impossible. Decision: **promote the Angular 21 line to be `main`**, keeping the Angular 8 line as a recoverable legacy reference.

## Backups already in place (durable on origin)

- Branch **`legacy/angular-8-main`** → `128e9499` (all 1118 A8 commits).
- Tag **`angular-8-final`** → `128e9499`.

Recovery is always possible: `git reset --hard legacy/angular-8-main` (or restore `main` from the tag).

## New `main` target

The hardened Angular 21 tip = **`chore/flow-hardening`** (= `cbp-release-5.0` @ `3f6153a5` + the flow-hardening commit: CI test gate, skill/CLAUDE.md test rules, release-notes tag→release, refreshed Dockerfiles). This carries the prod-released code **plus** the green test suite, coverage ratchet, and enforced pipeline.

## Promotion runbook (run when ready)

```bash
git fetch origin --quiet

# 1. Fold the flow-hardening commit into the canonical A21 release line (clean fast-forward).
git checkout cbp-release-5.0
git merge --ff-only chore/flow-hardening
git push origin cbp-release-5.0

# 2. Repoint main at the A21 line. Histories are unrelated, so this REWRITES main.
#    The legacy/angular-8-main branch + angular-8-final tag preserve the old main.
git checkout main
git reset --hard cbp-release-5.0

# 3. Force-push the new main. The default branch is protected, so either:
#    (a) temporarily disable branch protection in GitHub settings, push, re-enable; or
#    (b) push via an admin override.
git push --force-with-lease origin main
```

Verify after:

```bash
git log --oneline -1 main                     # == cbp-release-5.0 tip
git rev-list --count legacy/angular-8-main     # still 1118 (A8 preserved)
git log --oneline -1 angular-8-final           # 128e9499 (A8 tip preserved)
```

Post-promotion housekeeping (GitHub):

- Re-enable branch protection on `main`; require the **Quality** workflow (now includes the test+coverage job) as a status check.
- Open PRs targeting the old `main` will show massive diffs — close/retarget them against the new `main` (or against `legacy/angular-8-main` if they're A8 fixes).
- Update any Jenkins job defaults that point at `main` if they assumed the A8 tree.

> Risk: rewriting the repo's default branch is disruptive (forks, open PRs, local clones must `git fetch && git reset --hard origin/main`). Fully reversible via the backups above.

---

## Angular 8 → Angular 21 feature-gap audit

The 1118 Angular-8-only commits are **not** cherry-pick candidates (unrelated history + already-migrated code). Instead, verify each A8 feature area is present in the A21 product before treating `legacy/angular-8-main` as dead. Many were re-implemented during the migration and appear in the `5.0` release note — those are ✅ likely-covered; confirm, don't assume.

| A8 feature area (from A8-only commits)                                                                                         | Likely status in A21                                                 | Verify                                                      |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| In-video popup questions / video resource flow ("Question for video resource flow", "Player changes", "show answer in player") | Likely present (5.0 note: in-video timestamp validation, quiz fixes) | Author a video resource, add a popup question, play it back |
| Certificates ("Added certificate")                                                                                             | Likely present                                                       | Configure a certificate in Course Settings; verify issuance |
| Self-assessment settings + player ("Self assessment settings page changes", "Changes in self assessment player")               | Likely present (5.0 note: self-assessment form)                      | Create a self-assessment, complete it in the player         |
| Reviewer checklist with comments                                                                                               | Likely present (5.0 note: reviewer/publisher tabs)                   | Send for review; confirm checklist + comments               |
| Create-forum API integration                                                                                                   | Likely present (used in create-course `contentClicked`)              | Create a course; confirm forum created                      |
| Competency (mandatory, fixes)                                                                                                  | Likely present                                                       | Create competency course; check mandatory validation        |
| CBP publish changes                                                                                                            | Likely present                                                       | Publish flow end-to-end                                     |
| Add/edit resource UI, left-nav click actions, TOC page                                                                         | Likely present (5.0 note: design-system rebuild)                     | Spot-check resource add/edit + TOC                          |

**How to confirm a specific feature exists in A21** (example):

```bash
# Search the A21 tree for a feature's hallmark identifiers
git grep -il "certificate" cbp-release-5.0 -- 'project/**' 'library/**' | head
# Compare against where it lived on A8
git grep -il "certificate" legacy/angular-8-main -- 'project/**' 'src/**' | head
```

Anything found on `legacy/angular-8-main` but **absent** in the A21 tree is a real gap → schedule a port as a normal feature (re-implemented on the A21 stack, not git-merged). Track gaps as issues; this audit is the starting checklist, not an exhaustive line-by-line diff.
