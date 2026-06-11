# Project Skills

Reusable, codebase-specific task workflows for AI assistants (Claude Code) and developers. They are **checked into the repo**, so every team member's Claude Code picks them up automatically — no per-machine setup.

Each skill is a folder with a `SKILL.md`. Claude Code reads the frontmatter (`name`, `description`) to decide when a skill applies, then follows the steps. You can also invoke one directly by typing `/<skill-name>`.

These encode the *real* conventions in this codebase (verified against actual files), so generated code matches what's already here instead of generic Angular boilerplate.

## Available skills

| Skill | Use it when |
| --- | --- |
| [`create-widget`](create-widget/SKILL.md) | Adding a config-driven widget to `@ws-widget/collection` and registering it with the resolver. |
| [`add-feature-module`](add-feature-module/SKILL.md) | Scaffolding a new lazy-loaded feature page/module in the correct tier with routing + guards. |
| [`style-form-input`](style-form-input/SKILL.md) | Building/restyling forms — input tokens, native-HTML-over-Material rule, validation/hints. |
| [`add-api-service`](add-api-service/SKILL.md) | Adding a backend API call with the service / endpoint-constant / auth-interceptor conventions. |
| [`build-and-deploy`](build-and-deploy/SKILL.md) | Building for prod or debugging a CI/deploy failure (ngcc trap, `dist/www/en`, forbidden flags). |
| [`release-notes`](release-notes/SKILL.md) | Generating a production release note for a deploy candidate (diffs vs last `cbp-release-*` tag, fills `RELEASE_NOTES/TEMPLATE.md`). |

## Relationship to the rules file

[`CLAUDE.md`](../../CLAUDE.md) (repo root) is the **rules file** — the always-on project constitution (architecture, design system, code-quality rules, migration notes). These skills are the **task playbooks** that apply those rules to specific, recurring jobs. When the two overlap, CLAUDE.md is the source of truth; skills cite it.

## Adding a new skill

1. Create `.claude/skills/<kebab-name>/SKILL.md`.
2. Add frontmatter: `name` (matches the folder) and a `description` that states *what it does* and *when to use it* (include trigger phrases — this drives auto-selection).
3. Ground every step in real file paths and patterns from this repo. Verify against actual files; don't write generic advice.
4. End with a checklist that maps to CLAUDE.md's Final Validation Checklist.
5. Add a row to the table above.
