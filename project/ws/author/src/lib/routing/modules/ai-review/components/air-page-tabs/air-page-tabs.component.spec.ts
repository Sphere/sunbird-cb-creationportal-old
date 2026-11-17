import { NO_ERRORS_SCHEMA } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router, RouterLink, UrlTree, provideRouter } from '@angular/router'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
import { aiReviewAdminGuard } from '../../utils/admin-guard'
import { AirPageTabsComponent } from './air-page-tabs.component'

describe('AirPageTabsComponent', () => {
  const render = (admin: boolean, current: 'past' | 'reports') => {
    TestBed.configureTestingModule({
      declarations: [AirPageTabsComponent],
      imports: [RouterLink],
      providers: [provideRouter([]), { provide: AccessControlService, useValue: { hasAiReviewAdminRole: () => admin } }],
      schemas: [NO_ERRORS_SCHEMA],
    })
    const fixture = TestBed.createComponent(AirPageTabsComponent)
    fixture.componentRef.setInput('current', current)
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  afterEach(() => TestBed.resetTestingModule())

  it('shows Past reviews and Reports to an AI review admin, marking the page it is on', () => {
    const el = render(true, 'reports')
    const links = Array.from(el.querySelectorAll('a'))
    expect(links.map(a => a.textContent!.trim())).toEqual(['Past reviews', 'Reports'])
    expect(links[1].getAttribute('aria-current')).toBe('page')
    expect(links[0].getAttribute('aria-current')).toBeNull()
    expect(links[1].getAttribute('href')).toBe('/author/ai-review/reports')
  })

  it('shows nothing to anyone else', () => {
    expect(render(false, 'past').querySelector('nav')).toBeNull()
  })
})

describe('aiReviewAdminGuard', () => {
  const run = (admin: boolean) => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AccessControlService, useValue: { hasAiReviewAdminRole: () => admin } }],
    })
    const out = TestBed.runInInjectionContext(() => aiReviewAdminGuard({} as never, {} as never))
    const router = TestBed.inject(Router)
    TestBed.resetTestingModule()
    return { out, router }
  }

  it('lets an admin into Reports, and sends anyone else to Past reviews', () => {
    expect(run(true).out).toBe(true)
    const { out, router } = run(false)
    expect(out instanceof UrlTree).toBe(true)
    expect(router.serializeUrl(out as UrlTree)).toBe('/author/ai-review')
  })
})
