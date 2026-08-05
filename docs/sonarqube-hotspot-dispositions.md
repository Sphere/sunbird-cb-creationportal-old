# Security Hotspot Dispositions

**47 hotspots**, every one reviewed and marked **Safe**, with the reasoning below.

## Why this file exists

A Sonar _hotspot_ is not a defect. It means "a human should look at this once". The
**Security Review** rating is driven by the _percentage reviewed_, not by the count - so
47 reviewed hotspots is an **A**, and 47 unreviewed is an **E**, for identical code.

Review state lives in each SonarQube server's own database and **does not travel with the
code**. A fresh scan on another machine therefore reports:

```
security_hotspots            47
security_hotspots_reviewed   0 %
security_review_rating       E
```

That is expected and is not a regression. To reach A there, the same dispositions must be
applied on that server - either by reviewing them in the UI, or by replaying them with
`scripts/sonar-apply-hotspot-dispositions.mjs`.

## Summary

| Rule                                                                   | Count | Disposition |
| ---------------------------------------------------------------------- | ----- | ----------- |
| `typescript:S6268` — Angular sanitizer bypass (`bypassSecurityTrust*`) | 28    | SAFE        |
| `typescript:S2245` — Pseudorandom number generator (`Math.random`)     | 14    | SAFE        |
| `typescript:S5852` — Regex vulnerable to super-linear runtime (ReDoS)  | 5     | SAFE        |

## Rationale by rule

### `typescript:S6268` — Angular sanitizer bypass (`bypassSecurityTrust*`)

**28 hotspots · disposition: SAFE**

Every remaining call is load-bearing. Angular **throws** `RuntimeError 5201` if a raw string is bound in a RESOURCE_URL context, so the content-player iframes cannot avoid a bypass at all. The `[innerHTML]` calls render content that passed the author -> review -> publish workflow, whose roles are enforced by Keycloak.

**Caveat, stated explicitly:** the `[innerHTML]` dispositions rest on the authoring pipeline being trusted. If untrusted end users ever gain authoring rights, these must be re-reviewed and routed through Angular's sanitizer instead.

13 bypasses that were _not_ load-bearing have already been deleted in code (see `def2e62e`): 7 `bypassSecurityTrustStyle` calls, which are inert because Angular has not sanitized the STYLE context since v10, and 6 `bypassSecurityTrustResourceUrl` calls on `<img [src]>`, where the URL sanitizer already permits the value - those were actively suppressing protection.

<details><summary>Affected sites</summary>

| File                                                                                                                   | Line |
| ---------------------------------------------------------------------------------------------------------------------- | ---- |
| `library/ws-widget/collection/src/lib/image-map-responsive/image-map-responsive.component.ts`                          | 77   |
| `library/ws-widget/utils/src/lib/pipes/pipe-safe-sanitizer/pipe-safe-sanitizer.pipe.ts`                                | 19   |
| `library/ws-widget/utils/src/lib/pipes/pipe-safe-sanitizer/pipe-safe-sanitizer.pipe.ts`                                | 21   |
| `library/ws-widget/utils/src/lib/pipes/pipe-safe-sanitizer/pipe-safe-sanitizer.pipe.ts`                                | 23   |
| `library/ws-widget/utils/src/lib/pipes/pipe-safe-sanitizer/pipe-safe-sanitizer.pipe.ts`                                | 25   |
| `library/ws-widget/utils/src/lib/pipes/pipe-safe-sanitizer/pipe-safe-sanitizer.pipe.ts`                                | 27   |
| `project/ws/app/src/lib/routes/app-toc/components/app-toc-home/app-toc-home.component.ts`                              | 359  |
| `project/ws/app/src/lib/routes/app-toc/components/app-toc-overview/app-toc-overview.component.ts`                      | 98   |
| `project/ws/app/src/lib/routes/app-toc/components/app-toc-single-page/app-toc-single-page.component.ts`                | 133  |
| `project/ws/app/src/lib/routes/search/components/learning-card/learning-card.component.ts`                             | 43   |
| `project/ws/author/src/lib/components/auth-navigation/auth-navigation.component.ts`                                    | 35   |
| `project/ws/author/src/lib/components/root/root.component.ts`                                                          | 62   |
| `project/ws/author/src/lib/modules/shared/components/certificate-upload-dialog/certificate-upload-dialog.component.ts` | 53   |
| `project/ws/author/src/lib/modules/shared/components/certificate-upload-dialog/certificate-upload-dialog.component.ts` | 231  |
| `project/ws/viewer/src/lib/components/viewer-toc/viewer-toc.component.ts`                                              | 126  |
| `project/ws/viewer/src/lib/plugins/html/html.component.ts`                                                             | 368  |
| `project/ws/viewer/src/lib/plugins/html/html.component.ts`                                                             | 532  |
| `project/ws/viewer/src/lib/plugins/iap/iap.component.ts`                                                               | 48   |
| `project/ws/viewer/src/lib/plugins/quiz/components/question/question.component.ts`                                     | 83   |
| `project/ws/viewer/src/lib/plugins/web-module/web-module.component.ts`                                                 | 171  |
| `project/ws/viewer/src/lib/plugins/web-module/web-module.component.ts`                                                 | 176  |
| `project/ws/viewer/src/lib/plugins/web-module/web-module.component.ts`                                                 | 203  |
| `project/ws/viewer/src/lib/plugins/web-module/web-module.component.ts`                                                 | 223  |
| `project/ws/viewer/src/lib/route-view-container/html/html.component.ts`                                                | 90   |
| `project/ws/viewer/src/lib/route-view-container/html/html.component.ts`                                                | 96   |
| `src/app/component/login/login.component.ts`                                                                           | 45   |
| `src/app/routes/public/mobile-app/components/mobile-app-home.component.ts`                                             | 74   |
| `src/app/routes/public/public-about/public-about.component.ts`                                                         | 46   |

</details>

### `typescript:S2245` — Pseudorandom number generator (`Math.random`)

**14 hotspots · disposition: SAFE**

Each remaining use is non-security: a Sunbird content `code` field, a quiz option id, or an option-shuffle index. The content `code` is a client-supplied identifier, not a secret - the authoritative `identifier` is generated server-side and access is governed by Keycloak tokens and role checks. No token, credential, session id or password derives from any of these, so a CSPRNG would add cost for no security benefit.

7 DOM-element ids that used `Math.random()` have been converted in code to a shared `nextWidgetId()` counter, which is collision-_free_ rather than collision-unlikely.

<details><summary>Affected sites</summary>

| File                                                                                                                                             | Line |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| `library/ws-widget/collection/src/lib/_common/content-progress/content-progress.component.ts`                                                    | 37   |
| `project/ws/author/src/lib/routing/modules/create/components/create-course/create-course.component.ts`                                           | 535  |
| `project/ws/author/src/lib/routing/modules/create/components/create/create.service.ts`                                                           | 89   |
| `project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/collection/module-creation/module-creation.component.ts` | 886  |
| `project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/collection/module-creation/module-creation.component.ts` | 2971 |
| `project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/collection/module-creation/module-creation.component.ts` | 3983 |
| `project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/services/store.service.ts`                                          | 468  |
| `project/ws/author/src/lib/routing/modules/editor/routing/modules/quiz/components/quiz/quiz.component.ts`                                        | 1146 |
| `project/ws/author/src/lib/routing/modules/editor/services/editor.service.ts`                                                                    | 121  |
| `project/ws/author/src/lib/routing/modules/editor/services/editor.service.ts`                                                                    | 160  |
| `project/ws/author/src/lib/routing/modules/editor/shared/components/course-settings/course-settings.component.ts`                                | 1556 |
| `project/ws/author/src/lib/routing/modules/editor/shared/components/edit-meta/edit-meta.component.ts`                                            | 1532 |
| `project/ws/author/src/lib/routing/modules/editor/shared/components/plain-ckeditor/plain-ckeditor.component.ts`                                  | 508  |
| `project/ws/viewer/src/lib/plugins/quiz/components/question/question.component.ts`                                                               | 263  |

</details>

### `typescript:S5852` — Regex vulnerable to super-linear runtime (ReDoS)

**5 hotspots · disposition: SAFE**

Four of these are the form `<[^>]*>`: the negated class cannot match the terminating `>`, so there is exactly one way to match any prefix - no ambiguity, no backtracking, linear runtime. SonarJS flags the shape conservatively.

The remaining one parses a `<map>` body, which legitimately contains `>` (its `<area>` tags), so a negated class cannot be used there. Accepted because it runs client-side over content the viewer has already loaded: pathological input can only slow that one user's own tab. There is no server-side execution and no cross-user impact.

Three genuinely ambiguous regexes were made linear in code rather than dispositioned.

<details><summary>Affected sites</summary>

| File                                                                                                                                             | Line |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ---- |
| `library/ws-widget/collection/src/lib/image-map-responsive/image-map-responsive.component.ts`                                                    | 76   |
| `library/ws-widget/utils/src/lib/pipes/pipe-html-tag-removal/pipe-html-tag-removal.pipe.ts`                                                      | 11   |
| `library/ws-widget/utils/src/lib/services/resource-download.service.ts`                                                                          | 196  |
| `project/ws/author/src/lib/routing/modules/editor/routing/modules/collection/components/collection/module-creation/module-creation.component.ts` | 2726 |
| `project/ws/author/src/lib/routing/modules/editor/routing/modules/quiz/components/quiz/quiz.component.ts`                                        | 693  |

</details>

## Applying these on another server

```bash
node scripts/sonar-apply-hotspot-dispositions.mjs \
  --host https://sonarcloud.io \
  --project <projectKey> \
  --token <token with Administer Security Hotspots>
```

The script is idempotent: it only touches hotspots still in `TO_REVIEW`, and it writes the
rationale above into each hotspot's comment so the justification is auditable in the UI
rather than buried in a script.
