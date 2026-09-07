import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'

import { ConfigurationsService, ResourceDownloadService } from '@ws-widget/utils'

import { AppTocContentCardComponent } from './app-toc-content-card.component'

@Pipe({ standalone: false, name: 'pipeDurationTransform' })
class StubDurationPipe implements PipeTransform {
  transform(value: any): string {
    return String(value)
  }
}

/**
 * Gating is a course-level setting and the lock is a pure indicator, so it has to
 * render on EVERY resource row regardless of mimeType. It kept going missing on
 * assessments and quizzes because it lived inside a per-type conditional block,
 * hence the coverage per type here rather than a single happy-path case.
 */
describe('AppTocContentCardComponent gating lock', () => {
  let fixture: ComponentFixture<AppTocContentCardComponent>
  let component: AppTocContentCardComponent

  const resource = (over: any = {}) =>
    ({
      identifier: 'do_res',
      name: 'A resource',
      contentType: 'Resource',
      mimeType: 'application/pdf',
      ...over,
    }) as any

  const lock = () => fixture.nativeElement.querySelector('img[src="cbp-assets/icons/lock.png"]')

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppTocContentCardComponent, StubDurationPipe],
      imports: [MatIconModule, MatMenuModule],
      providers: [
        {
          provide: ConfigurationsService,
          useValue: {
            userProfile: { userId: 'user-1' },
            userRoles: new Set<string>(),
            instanceConfig: { logos: { defaultContent: 'default.png' } },
          },
        },
        { provide: ResourceDownloadService, useValue: { downloadResource: jest.fn() } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents()

    fixture = TestBed.createComponent(AppTocContentCardComponent)
    component = fixture.componentInstance
    component.rootId = 'do_root'
    component.rootContentType = 'Course'
  })

  const renderWith = (content: any, gatingEnabled: boolean) => {
    component.content = content
    component.gatingEnabled = gatingEnabled
    fixture.detectChanges()
  }

  it.each([
    ['a PDF', { mimeType: 'application/pdf' }],
    ['an assessment', { mimeType: 'application/json', isAssessment: true }],
    ['a quiz', { mimeType: 'application/json', isAssessment: false }],
    ['a video', { mimeType: 'video/mp4' }],
    ['a link', { mimeType: 'text/x-url' }],
    ['a type with no icon mapping', { mimeType: 'application/octet-stream' }],
  ])('shows the lock on %s when gating is on', (_label, over) => {
    renderWith(resource(over), true)

    expect(lock()).toBeTruthy()
  })

  it('does not show the lock when gating is off', () => {
    renderWith(resource(), false)

    expect(lock()).toBeFalsy()
  })

  it('renders exactly one lock per row', () => {
    renderWith(resource({ mimeType: 'application/json', isAssessment: true }), true)

    expect(fixture.nativeElement.querySelectorAll('img[src="cbp-assets/icons/lock.png"]').length).toBe(1)
  })

  it('leaves the row link intact, so the lock stays an indicator and never blocks the click', () => {
    renderWith(resource(), true)

    const anchor = fixture.nativeElement.querySelector('.resource-container a')
    expect(anchor).toBeTruthy()
    expect(getComputedStyle(anchor).pointerEvents).not.toBe('none')
  })

  it('is a flex sibling of the row body, not nested inside it', () => {
    renderWith(resource(), true)

    const box = fixture.nativeElement.querySelector('.progrss-box')
    expect(box.parentElement.classList).toContain('resource-container')
    expect(box.previousElementSibling.classList).toContain('width-expand')
  })

  it('defaults to off so a course without gating shows nothing', () => {
    expect(new AppTocContentCardComponent({} as any, {} as any).gatingEnabled).toBe(false)
  })
})
