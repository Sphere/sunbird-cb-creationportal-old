---
name: style-form-input
description: Apply the project's standard form/input styling and the native-HTML-over-Material rule when building or restyling forms. Use when adding text inputs, checkboxes, selects, validation messages, hints, or character counters; or when a mat-form-field/mat-checkbox has height/spacing/alignment problems that CSS won't fix. Triggers — "style this input/form", "add a field", "fix the input spacing", "the Material field looks off".
---

# Style a form / input field

This project has a fixed input design language. Reuse the existing classes and tokens — do not invent new field styles. The canonical reference is `create-course.component.scss` and `course-settings.component.scss`.

## The golden rule: replace Material with native HTML

Angular Material 17+ MDC components (`mat-form-field`, `mat-checkbox`, …) have internal touch-targets, pseudo-elements, and infix padding that **cannot be reliably overridden via CSS** — even with `::ng-deep` / `!important`. When a Material component causes height/spacing/alignment issues, **replace it with native HTML**, don't patch it.

- `mat-form-field appearance="outline"` → `<input class="module-input">`
- `mat-checkbox` → `<label class="rd-checkbox-item"><input type="checkbox"></label>`
- `formControlName` and `[(ngModel)]` work identically on native elements.

## Design tokens (the one true input style)

| Token | Value |
| --- | --- |
| Font | `Roboto, sans-serif` |
| Border (default) | `#b8c9d9` |
| Border (hover) | `#8aaac8` |
| Border (focus) | `#1C5D95`, width `2px` |
| Border radius | `8px` |
| Padding | `8px 12px` |
| Text color | `#0F172A` / `#1a2d45` |
| Placeholder | `#94A3B8` |
| Hint text | `#808080` / `#64748B`, 11–12px |
| Error | `#EF4444` |
| Accent (checkbox/primary) | `#1C5D95` |
| Required asterisk | `#EF4444` (`.cc-req`) |

## Text input

```html
<label class="field-label">Course Name <span class="cc-req">*</span></label>
<input
  class="module-input"
  type="text"
  [formControlName]="'courseName'"
  placeholder="Enter the course name"
  autocomplete="off"
  maxlength="250" />
<div class="mc-field-footer">
  <span *ngIf="form.get('courseName')?.invalid && form.get('courseName')?.touched"
        class="invalid-text">This field is required</span>
  <span class="mt-hint">{{ form.get('courseName')?.value?.length || 0 }}/250</span>
</div>
```

```scss
.module-input {
  font-family: Roboto, sans-serif;
  font-size: 14px;
  color: #1a2d45;
  line-height: 1.5;
  width: 100%;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #b8c9d9;
  padding: 8px 12px;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &:hover  { border-color: #8aaac8; }
  &:focus  { outline: none; border-color: #1C5D95; border-width: 2px; }
  &::placeholder { color: #94A3B8; }
}

.module-input.ng-invalid.ng-touched,
.module-input.ng-invalid.ng-dirty {
  border-color: #EF4444;
  &:focus { border-color: #EF4444; }
}

.invalid-text {
  color: #EF4444;
  font-family: Roboto, sans-serif;
  font-size: 12px;
  display: block;
  margin-top: 2px;
}

.mt-hint {
  font-family: Roboto, sans-serif;
  font-size: 12px;
  color: #808080;
  margin-top: 4px;
}
```

## Checkbox (native)

```html
<label class="rd-checkbox-item">
  <input type="checkbox" [(ngModel)]="isNewTab" />
  <span>Open link in new tab</span>
</label>
```

```scss
.rd-checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    min-width: 16px;
    margin: 0;
    accent-color: #1C5D95;
    border-radius: 3px;
    cursor: pointer;
  }

  span {
    font-family: Roboto, sans-serif;
    font-size: 13px;
    color: #334155;
  }
}
```

## Reactive form setup (TypeScript)

```typescript
this.createCourseForm = this.fb.group({
  courseName: new FormControl('', [Validators.required]),
  courseDescription: new FormControl('', [Validators.required]),
})
```

## The `!important` / global-utility trap

Never use `!important` in component SCSS to override a global utility class that also uses `!important`. Global styles (`styles.scss`, `utility.scss`) are injected into `<head>` **after** component styles, so the global always wins regardless of specificity. Instead: remove the utility class from the HTML and add a custom class without `!important`, or move spacing ownership to the parent via `gap`.

## When you must keep `mat-form-field`

If a Material field genuinely can't be replaced, restyle it via MDC CSS custom properties (NOT element overrides) — see `course-settings.component.scss`:

```scss
::ng-deep .mat-mdc-form-field {
  --mdc-outlined-text-field-container-shape: 8px;
  --mdc-outlined-text-field-outline-color: #CBD5E1;
  --mdc-outlined-text-field-focus-outline-color: #1C5D95;
  --mdc-outlined-text-field-focus-outline-width: 2px;
  --mdc-outlined-text-field-input-text-font: Roboto, sans-serif;
}
```

## Checklist before done

- [ ] Reused `.module-input` / `.rd-checkbox-item` — no new field style invented
- [ ] Native HTML used instead of patching a misbehaving Material component
- [ ] Roboto everywhere; tokens match the table above
- [ ] Inline validation, helper/hint text, required indicator, char counter preserved
- [ ] No `!important` fighting a global utility class
- [ ] Error/touched states styled; field works with `formControlName`/`[(ngModel)]`
