import { LOCALE_ID, NO_ERRORS_SCHEMA } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { BehaviorSubject } from 'rxjs'
import { DowntimeBannerComponent } from './downtime-banner.component'
import { DowntimeConfigService } from '../../services/downtime-config.service'
import { DowntimeState } from '../../models/downtime.model'

describe('DowntimeBannerComponent', () => {
  let state$: BehaviorSubject<DowntimeState>
  let downtimeSvc: any

  const downtime = (over: Partial<DowntimeState> = {}): DowntimeState => ({
    isDowntime: true,
    type: 'partial',
    refreshInterval: 60,
    content: {
      icon: 'warning',
      title: { en: 'Uploads are paused', hi: 'अपलोड रुके हैं' },
      message: { en: 'Editing still works.', hi: 'संपादन चालू है' },
      css: { bannerColor: '#ffeeaa', position: 'top' },
    },
    ...over,
  })

  const render = () => {
    TestBed.configureTestingModule({
      declarations: [DowntimeBannerComponent],
      providers: [
        { provide: DowntimeConfigService, useValue: downtimeSvc },
        { provide: LOCALE_ID, useValue: 'en' },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    const fixture = TestBed.createComponent(DowntimeBannerComponent)
    fixture.detectChanges()
    return fixture
  }

  beforeEach(() => {
    state$ = new BehaviorSubject<DowntimeState>(downtime())
    downtimeSvc = {
      downtime$: state$.asObservable(),
      get current() {
        return state$.value
      },
      isBypassed: jest.fn().mockReturnValue(false),
    }
  })

  it('shows the configured notice during a partial downtime', () => {
    const el: HTMLElement = render().nativeElement
    expect(el.querySelector('.downtime-banner')!.getAttribute('role')).toBe('status')
    expect(el.querySelector('.downtime-banner-title')!.textContent).toContain('Uploads are paused')
    expect(el.querySelector('.downtime-banner-message')!.textContent).toContain('Editing still works.')
    expect(el.querySelector('.downtime-banner-tag')).toBeNull()
  })

  it('uses the Material icon for the configured alias', () => {
    const icon = render().nativeElement.querySelector('.downtime-banner-icon mat-icon') as HTMLElement
    expect(icon.textContent).toContain('warning')
  })

  it('sits at the bottom when configured to', () => {
    state$.next(downtime({ content: { ...downtime().content, css: { position: 'bottom' } } }))
    expect(render().nativeElement.querySelector('.downtime-banner').classList).toContain('is-bottom')
  })

  it('shows nothing when there is no downtime', () => {
    state$.next(downtime({ isDowntime: false }))
    expect(render().nativeElement.querySelector('.downtime-banner')).toBeNull()
  })

  it('stays hidden during a full downtime, which has its own page', () => {
    state$.next(downtime({ type: 'full' }))
    expect(render().nativeElement.querySelector('.downtime-banner')).toBeNull()
  })

  it('tells a tester bypassing a full downtime that the portal is in maintenance', () => {
    downtimeSvc.isBypassed.mockReturnValue(true)
    state$.next(downtime({ type: 'full' }))
    const el: HTMLElement = render().nativeElement
    expect(el.querySelector('.downtime-banner')).toBeTruthy()
    expect(el.querySelector('.downtime-banner-tag')!.textContent).toContain('bypassing')
  })

  it('can be dismissed', () => {
    const fixture = render()
    ;(fixture.nativeElement.querySelector('.downtime-banner-close') as HTMLButtonElement).click()
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('.downtime-banner')).toBeNull()
  })

  it('shows a configured app link', () => {
    state$.next(
      downtime({ content: { ...downtime().content, appLink: { isEnabled: true, url: 'https://status.example', label: 'Status' } } }),
    )
    const link = render().nativeElement.querySelector('.downtime-banner-link') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('https://status.example')
  })
})
