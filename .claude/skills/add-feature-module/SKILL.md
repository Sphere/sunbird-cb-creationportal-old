---
name: add-feature-module
description: Scaffold a new lazy-loaded feature page/module in the correct monorepo tier and wire it into routing with the guard chain. Use when adding a new page, route, or feature area (dashboard, listing, detail view, etc.). Triggers — "add a feature", "create a new page", "add a route/module", "scaffold a lazy-loaded module".
---

# Add a lazy-loaded feature module

Feature pages are lazy-loaded NgModules. Decide the tier first, then scaffold the module, its routing module, and wire it into the root router with a guard.

## Pick the correct tier (never mix cross-tier concerns)

- `project/ws/app/`    → `@ws/app` — general feature pages (home, dashboard, search, profile, toc, events)
- `project/ws/author/` → `@ws/author` — content authoring/editor features
- `project/ws/viewer/` → `@ws/viewer` — content consumption
- `src/app/`           → app shell, top-level routing, guards, interceptors

Most new pages belong in `project/ws/app/src/lib/routes/<feature-name>/`.

## Steps

### 1. Create the feature folder

```
project/ws/app/src/lib/routes/<feature-name>/
├── <feature-name>.module.ts
├── <feature-name>-routing.module.ts
└── components/
    └── <feature-name>-home/
        ├── <feature-name>-home.component.ts
        ├── <feature-name>-home.component.html
        └── <feature-name>-home.component.scss
```

### 2. Root component — selector convention `ws-app-<feature>-<component>`

`standalone: false` is mandatory (matches migrated declarations).

```typescript
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core'

@Component({
  standalone: false,
  selector: 'ws-app-my-feature-home',
  templateUrl: './my-feature-home.component.html',
  styleUrls: ['./my-feature-home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyFeatureHomeComponent implements OnInit {
  ngOnInit() {}
}
```

In the template, use built-in control flow (`@if` / `@for` with `track` / `@switch`) — not `*ngIf` / `*ngFor`. See the Angular 21 standards in CLAUDE.md §3.

### 3. Feature routing module — `<feature-name>-routing.module.ts`

```typescript
import { NgModule } from '@angular/core'
import { RouterModule, Routes } from '@angular/router'
import { MyFeatureHomeComponent } from './components/my-feature-home/my-feature-home.component'

const routes: Routes = [
  {
    path: '',
    component: MyFeatureHomeComponent,
    data: { pageType: 'feature', pageKey: 'myFeature' },
    // resolve: { pageData: PageResolve },  // add if the page needs prefetched data
  },
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MyFeatureRoutingModule { }
```

### 4. Feature module — `<feature-name>.module.ts`

Declare all components; import the routing module + Material modules directly.

```typescript
import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { MyFeatureRoutingModule } from './my-feature-routing.module'
import { MyFeatureHomeComponent } from './components/my-feature-home/my-feature-home.component'

@NgModule({
  declarations: [MyFeatureHomeComponent],
  imports: [
    CommonModule,
    MyFeatureRoutingModule,
    // MatCardModule, MatButtonModule, MatIconModule, BtnPageBackModule, ...
  ],
})
export class MyFeatureModule { }
```

### 5. Wire into the root router — `src/app/app-routing.module.ts`

Add a `loadChildren` entry. Apply `GeneralGuard` (the standard chain `GeneralGuard → LoginGuard → EmptyRouteGuard` is configured at the shell level; feature routes typically use `GeneralGuard`). Add `data.requiredFeatures` / `requiredRoles` so role/feature visibility is enforced.

```typescript
{
  path: 'app/my-feature',
  loadChildren: () =>
    import('./routes/route-my-feature.module').then(m => m.RouteMyFeatureModule),
  canActivate: [GeneralGuard],
  data: { pageType: 'feature', pageKey: 'myFeature', requiredFeatures: ['myFeature'] },
},
```

If the existing routing uses thin `route-*.module.ts` wrappers in `src/app/routes/` that re-export the `@ws/app` feature module, follow that pattern: create `src/app/routes/route-my-feature.module.ts` importing your `@ws/app` feature module.

### 6. Resolver-based prefetch (optional)

For data the page needs before activation, add a resolver service (`@Injectable()`, `resolve()` returning an `Observable`) and reference it in the route's `resolve: {}`. Use `runGuardsAndResolvers: 'always'` when the same component must re-resolve on param changes.

## Checklist before done

- [ ] Code is in the correct tier (`@ws/app` / `@ws/author` / `@ws/viewer`)
- [ ] `standalone: false` on every component
- [ ] Selector is `ws-app-<feature>-<component>`
- [ ] Lazy-loaded via `loadChildren` in the root router
- [ ] `canActivate: [GeneralGuard]` + `requiredFeatures`/`requiredRoles` in route `data`
- [ ] Feature routing module uses `RouterModule.forChild`
- [ ] Loading / Empty / Error / Success states considered for the page
- [ ] Angular 21 standards (CLAUDE.md §3): `inject()`, `@if`/`@for` control flow, `OnPush`, signals for local state, `takeUntilDestroyed`/`async` for subscriptions
