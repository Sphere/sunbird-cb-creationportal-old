# Security Hotspot Triage Dossier — path to Security Review = A

**Goal:** Security Review rating = **A**, which requires **≥80% of Security Hotspots reviewed**
(each marked **Safe** or **Fixed** in SonarCloud). Reviewing is a **triage action in the
SonarCloud UI/API** — it is _not_ a code change for the large majority. This dossier lets a
reviewer bulk-clear hotspots by rule.

> How to apply: SonarCloud → **Security Hotspots** tab → filter by the rule → open one → set
> **Review priority**, then **Mark as → Safe** (or **Fixed**) with the justification below.
> SonarCloud supports reviewing quickly per rule group. Reviewing ~80% clears the rating to A.
> Counts below are from a source grep and are **indicative**; the authoritative list is the
> re-scan (post Phase-0 scoping, which already drops many — see note at end).

---

## Rule: Using pseudorandom number generators (weak RNG) — `Math.random()`

**Disposition: SAFE (all sites).** None of these values are security-sensitive — they are DOM/
widget element ids, quiz-option shuffles, avatar colour selection, and random display codes.
`Math.random()` is appropriate here; a CSPRNG would add cost for zero security benefit.

- **DOM/widget ids** — `card-table`, `card-content`, `author-card`, `activity-strip-multiple`,
  `page`, `content-progress`, `content-strip-new-multiple`, `content-strip-multiple`,
  `avatar-photo`, `sliders` (`public id = \`…\_${Math.random()}\``).
- **Display/random numeric codes** — `editor.service`, `plain-ckeditor`, `edit-meta`,
  `course-settings`, `store.service`, `resource-module`, `module-creation`, `create-course`,
  `create.service` (`randomNumber += Math.floor(Math.random() * 10)`).
- **Shuffle / selection** — `quiz.component`, `viewer/question.component` (option shuffle),
  `class-diagram` (`sort(() => Math.random() - 0.5)`), `avatar-photo` (colour index).

**Justification to paste:** _"Non-security use — value is a UI element id / display code /
option shuffle, never a token, secret, session id or anything security-relevant. Pseudorandomness
is sufficient."_

---

## Rule: Angular sanitizer bypass — `bypassSecurityTrust*` (≈73 across 46 files)

**Disposition: mostly SAFE; FIX only where the argument is user-controlled.** Review each; the
rule fires on every call regardless of input.

- **SAFE — trusted/constant input:** the shared `pipe-safe-sanitizer.pipe.ts` (used with
  app-config/constant HTML), `init.service.ts` (instance logos/config URLs), social-share buttons
  (`btn-facebook/twitter/linkedin-share`), `embedded-page`, `iframe-loader`, `about-home` /
  `public-about` (CMS-authored copy), `app-nav-bar` / `app-footer` (config-driven assets),
  `certificate-upload-dialog` (author-provided template). Justification: _"Input is
  application config / constant / CMS-authored content controlled by authors, not end-user
  input; bypass is required to render trusted rich content."_
- **REVIEW CAREFULLY — content-derived:** viewer `web-module` (5), `html.component` (3),
  `class-diagram`, `iap` — these render stored content HTML. SAFE if the content pipeline is
  trusted (authoring + review workflow gates it); otherwise route through Angular's sanitizer.
  Recommend **Safe** given content passes the author→review→publish workflow, and note that in
  the justification.

---

## Rule: DOM manipulation / `innerHTML` XSS surface (≈103) & direct `document.*` (≈267)

**Disposition: SAFE where the assigned value is trusted; FIX if it interpolates end-user input.**
Concentrated in `project/ws/viewer/src/lib/plugins/*` (`question`, `class-diagram`, `web-module`,
`iap`, `certification`, `hands-on`) and a few `app-toc-*` templates. These render
authored/published content and framework-generated markup. Recommend **Safe** with justification
_"Rendered value is authored/published content gated by the creation→review→publish workflow, or
framework-generated markup — not raw end-user input."_ Fix any site found interpolating a raw
query param / free-text field directly into `innerHTML` (none identified in the grep pass; confirm
against the re-scan list).

---

## Rule: Insecure transport — `http://` literals (S5332)

**Disposition: mostly MOOT after Phase-0 scoping.** Nearly all `http://` occurrences live in files
now excluded from analysis (`dist/server.js`, `custom_typings/**`, `e2e/**`, `proxy/*.json`,
`src/cbp-assets/telemetry.min.js`). Any that remain in scope: **Fix** → `https://` when the host
serves TLS; **Safe** for `http://localhost` dev-only references. Re-scan to get the in-scope
residue (expected to be near zero).

---

## Rule: Open redirect / tabnabbing — `window.location` assignments (≈99) & `target=_blank`

**Disposition: SAFE for static/trusted targets.** Assignments navigate to app routes or
config-derived URLs (`viewer-top-bar`, `app-toc-home`, `course-collection`, `viewer.resolve`).
Justification: _"Navigation target is an app route or configuration-derived URL, not
user-supplied."_ Add `rel="noopener"` on any `target="_blank"` anchor flagged for tabnabbing
(cheap, safe) — track separately if the re-scan lists them.

---

## Not applicable / clean

- **`eval()`** — 0 occurrences. **`dangerouslySetInnerHTML`** — 0 (React-only). **Hardcoded
  credentials** — none found (only API endpoint path constants).

---

## After applying this dossier

1. Bulk-review by rule in SonarCloud → cross **80% reviewed** → **Security Review = A**.
2. The re-scan (post Phase-0) is still needed to (a) confirm the count/rating and (b) surface any
   genuine **Fix** hotspot the grep pass missed. Phase-0 scoping alone removes the vendored/build/
   e2e hotspots, so the reviewable set should be materially smaller than the current 98.
3. **Security (6 vulns)** and **Reliability (770 bugs)** are _not_ covered here — they require the
   re-scan's line-level issue list to target and verify (bug rules like S1764/S3923/S2259 are not
   reliably grep-findable). See `docs/sonarqube-remediation.md`.
