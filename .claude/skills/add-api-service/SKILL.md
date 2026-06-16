---
name: add-api-service
description: Add a new backend API call following the project's service, endpoint-constant, and auth-interceptor conventions. Use when integrating a new endpoint, adding a method to an existing service, or creating a new data service. Triggers — "add an API call", "call this endpoint", "create a service method", "integrate the backend", "fetch/save data from the server".
---

# Add a new API service call

HTTP calls live in `@Injectable` services that return typed `Observable<T>`. Endpoint URLs are centralized constants. Auth headers are added globally by the interceptor — do not add them per-call.

## Conventions at a glance

- **`@Injectable({ providedIn: 'root' })`** on every service.
- **Use `inject()` for new code** — it's the Angular 21 best practice (CLAUDE.md §3) and the `@angular-eslint/prefer-inject` lint rule nudges toward it. Most _existing_ services still use constructor injection; when editing one of those, match its style, but write **new** services with `inject()`.
- Methods return **`Observable<T>`** with the generic passed to the HTTP method (`this.http.get<T>(...)`).
- Endpoint URLs go in a **constants file**, composed from base prefixes.
- New Sunbird API calls go through the **`/apis/proxies/v8/`** prefix unless hitting a microservice directly.
- **Never set `Authorization`/`org`/`rootOrg`/`locale` headers manually** — `AppInterceptorService` (`src/app/services/app-interceptor.service.ts`) injects them on every same-origin request.

## Steps

### 1. Add/locate the endpoint constant

Endpoint constants for authoring live in `project/ws/author/src/lib/constants/apiEndpoints.ts`. Compose from a base prefix:

```typescript
export const PROXY_SLAG_V8 = `apis/proxies/v8/`
export const API_PROXY_V8 = 'apis/proxies/v8/'
const ACTION_CONTENT_V3 = `${API_PROXY_V8}action/content/v3/`

export const MY_NEW_ENDPOINT = `${ACTION_CONTENT_V3}my/resource`
```

For a feature-local service, a small `API_END_POINTS` object at the top of the service file is also an accepted pattern:

```typescript
const PROTECTED_SLAG_V8 = `/apis/protected/v8`
const API_END_POINTS = {
  myResource: `${PROTECTED_SLAG_V8}/my/resource`,
}
```

### 2. Define the response model/interface

```typescript
export interface IMyResource {
  id: string
  name: string
  status: string
}
```

### 3. Add the service method

```typescript
import { inject, Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { IMyResource } from '../models/my-resource.model'
import { MY_NEW_ENDPOINT } from '../constants/apiEndpoints'

@Injectable({ providedIn: 'root' })
export class MyResourceService {
  private http = inject(HttpClient)

  getResource(id: string): Observable<IMyResource> {
    return this.http.get<IMyResource>(`${MY_NEW_ENDPOINT}/${id}`)
  }

  searchResources(params: { q: string }): Observable<IMyResource[]> {
    return this.http.get<IMyResource[]>(MY_NEW_ENDPOINT, { params })
  }

  saveResource(body: IMyResource): Observable<IMyResource> {
    return this.http.post<IMyResource>(MY_NEW_ENDPOINT, body).pipe(map(res => res /* transform if needed */))
  }
}
```

### 4. Consume it

Inject the service (`inject()` in new code) in the component/resolver and subscribe (or use the `async` pipe). For route-prefetched data, wrap the call in a resolver service (`@Injectable()` with a `resolve()` returning the `Observable`) and reference it in the route's `resolve: {}`.

### 5. Write unit tests (mandatory — ships in the same change)

Every new service/method gets a `*.spec.ts` — a hard rule (CLAUDE.md "Testing"), enforced by the CI coverage gate. Services are cheap to test by direct instantiation with a mocked `HttpClient`:

```typescript
import { of } from 'rxjs'
import { MyResourceService } from './my-resource.service'

describe('MyResourceService', () => {
  let http: { get: jest.Mock; post: jest.Mock }
  let service: MyResourceService

  beforeEach(() => {
    http = { get: jest.fn().mockReturnValue(of({ id: '1' })), post: jest.fn().mockReturnValue(of({})) }
    service = new MyResourceService(http as any)
  })

  it('requests the resource by id', done => {
    service.getResource('1').subscribe(r => {
      expect(r).toEqual({ id: '1' })
      done()
    })
    expect(http.get).toHaveBeenCalledWith('apis/proxies/v8/.../1')
  })
})
```

Use `jest.spyOn`/`jest.fn()` (not Jasmine `spyOn`); for a `TestBed`-based test use `provideHttpClient()` + `provideHttpClientTesting()`. Run via Node 20 (`nvs use node/20.20.1 && npx jest <spec>`) and confirm green before done.

## Auth / headers — already handled

`AppInterceptorService` clones each same-origin request and adds `Authorization`, `org`, `rootOrg`, `locale`, `wid`, and `hostPath` from `ConfigurationsService`. It also handles transient-error retry and a `419` → login redirect. So:

- Don't set auth headers in your service.
- External CORS URLs (e.g. `https://static.*`, S3) are intentionally skipped by the interceptor.
- An auth failure almost always means token expiry or a missing role — not a bug in your call.

## Config-driven base URLs

`ConfigurationsService` (`library/ws-widget/utils`) exposes `baseUrl` / `sitePath` (→ `assets/configurations`) for config-file fetches and holds `activeOrg`, `rootOrg`, `userProfile`, etc. Inject it when a call needs org/user context that isn't already in the interceptor headers.

## Checklist before done

- [ ] `@Injectable({ providedIn: 'root' })`; `inject(HttpClient)` for new services (match constructor style only when editing existing constructor-based files)
- [ ] Endpoint is a named constant composed from a base prefix (`/apis/proxies/v8/` for Sunbird APIs)
- [ ] Method returns `Observable<T>` with the generic on the HTTP call
- [ ] Response typed via a model/interface
- [ ] No manual auth/org/locale headers (interceptor owns them)
- [ ] Error/transform handled with `.pipe(map/catchError)` where needed
- [ ] **Unit tests written** (`*.spec.ts`) and green; coverage stays above the ratchet (CI gate)
- [ ] API contract not changed without approval
- [ ] Angular 21 standards (CLAUDE.md §3): `inject()` for new services; typed models (no `any`); consumers use `async` pipe / `takeUntilDestroyed`
