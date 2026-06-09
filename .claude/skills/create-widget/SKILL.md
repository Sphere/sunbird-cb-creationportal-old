---
name: create-widget
description: Create a new reusable widget in the @ws-widget/collection library and register it with the runtime resolver. Use when adding a new card, button, content block, or any config-driven UI widget that should be resolvable by type string via [wsResolverWidget]. Triggers — "create a widget", "add a new widget", "register a widget", "make a resolvable component".
---

# Create a new widget (@ws-widget/collection)

Widgets are config-driven components resolved at runtime by a `widgetType::widgetSubType` key. Follow this exact pattern — anything you skip breaks runtime resolution.

## Where things live

- Widget code: `library/ws-widget/collection/src/lib/<widget-name>/`
- Type-string config: `library/ws-widget/collection/src/lib/collection.config.ts` (`ROOT_WIDGET_CONFIG`)
- Component mapping: `library/ws-widget/collection/src/lib/registration.config.ts` (`WIDGET_REGISTRATION_CONFIG`)
- Barrel exports: `library/ws-widget/collection/src/public-api.ts`
- Resolver internals (do not edit): `library/ws-widget/resolver/`

## Steps

### 1. Create the widget folder

```
library/ws-widget/collection/src/lib/<widget-name>/
├── <widget-name>.component.ts
├── <widget-name>.component.html
├── <widget-name>.component.scss
├── <widget-name>.module.ts
└── <widget-name>.model.ts
```

For widgets with sub-components/dialogs, use `components/`, `models/`, `services/` subfolders (see `btn-content-feedback-v2/` as the reference for a complex widget).

### 2. Model — `<widget-name>.model.ts`

Define the typed `widgetData` interface:

```typescript
export interface IMyWidgetData {
  title: string
  // ...the data the widget renders
}
```

### 3. Component — `<widget-name>.component.ts`

Extend `WidgetBaseComponent` and implement `NsWidgetResolver.IWidgetData<T>` so the resolver can drive it. **`standalone: false` is mandatory** (matches the 503 migrated declarations) and the selector prefix is `ws-widget-`.

```typescript
import { Component, Input, OnInit } from '@angular/core'
import { NsWidgetResolver, WidgetBaseComponent } from '@ws-widget/resolver'
import { IMyWidgetData } from './my-widget.model'

@Component({
  standalone: false,
  selector: 'ws-widget-my-widget',
  templateUrl: './my-widget.component.html',
  styleUrls: ['./my-widget.component.scss'],
})
export class MyWidgetComponent extends WidgetBaseComponent
  implements OnInit, NsWidgetResolver.IWidgetData<IMyWidgetData> {
  @Input() widgetData!: IMyWidgetData

  ngOnInit() {
    // init logic
  }
}
```

A widget that doesn't need resolver lifecycle hooks can skip `extends WidgetBaseComponent` (see `btn-follow`), but still must be `standalone: false` with the `ws-widget-` prefix.

### 4. Module — `<widget-name>.module.ts`

Plain NgModule. Declare and **export** the component; import `WidgetResolverModule` when the component extends `WidgetBaseComponent`. Import Material modules directly (no shared barrel).

```typescript
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { WidgetResolverModule } from '@ws-widget/resolver'
import { MyWidgetComponent } from './my-widget.component'

@NgModule({
  declarations: [MyWidgetComponent],
  imports: [CommonModule, WidgetResolverModule /*, MatCardModule, ... */],
  exports: [MyWidgetComponent],
})
export class MyWidgetModule { }
```

### 5. Add the type string — `collection.config.ts`

Add an entry to `ROOT_WIDGET_CONFIG`:

```typescript
myWidget: {
  _type: 'myWidget',
  default: 'default',
},
```

### 6. Register the mapping — `registration.config.ts`

Add to the `WIDGET_REGISTRATION_CONFIG` array:

```typescript
{
  widgetType: ROOT_WIDGET_CONFIG.myWidget._type,
  widgetSubType: ROOT_WIDGET_CONFIG.myWidget.default,
  component: MyWidgetComponent,
},
```

(Import `MyWidgetComponent` at the top of that file.)

### 7. Export — `public-api.ts`

```typescript
export * from './lib/my-widget/my-widget.module'
export * from './lib/my-widget/my-widget.model'
```

## How it renders

Parent templates resolve the widget at runtime by config, not by tag:

```html
<ng-container [wsResolverWidget]="{ widgetType: 'myWidget', widgetSubType: 'default', widgetData: data }">
</ng-container>
```

The resolver builds the key `widget:myWidget::default`, checks permissions, then instantiates the mapped component.

## Checklist before done

- [ ] `standalone: false` on the component
- [ ] Selector is `ws-widget-<name>`
- [ ] Component exported from its module; module + model exported from `public-api.ts`
- [ ] `ROOT_WIDGET_CONFIG` entry added
- [ ] `WIDGET_REGISTRATION_CONFIG` mapping added (with import)
- [ ] `widgetData` is typed via the model interface
- [ ] Follows the design-system / input styling rules (see the `style-form-input` skill for any form fields)
- [ ] Angular 21 standards (CLAUDE.md §3): `inject()`, `@if`/`@for` control flow, signals for local state, `takeUntilDestroyed`/`async` — without breaking the resolver's `@Input() widgetData` contract
