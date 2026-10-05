import { LOCALE_ID, NO_ERRORS_SCHEMA } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { BehaviorSubject } from 'rxjs'
import { DowntimeFullComponent } from './downtime-full.component'
import { DowntimeConfigService } from '../../services/downtime-config.service'
import { DowntimeState } from '../../models/downtime.model'

describe('DowntimeFullComponent', () => {
  let state$: BehaviorSubject<DowntimeState>
  let downtimeSvc: any

  const downtime = (over: Partial<DowntimeState> = {}): DowntimeState => ({
    isDowntime: true,
    type: 'full',
    refreshInterval: 60,
    content: {
      icon: 'wrench',
      title: { en: 'Down for maintenance', hi: 'रखरखाव जारी है' },
      message: { en: 'Back at 6pm.', hi: 'शाम 6 बजे' },
      css: { backgroundColor: '#000000', textColor: '#ffffff', primaryColor: '#ff0000' },
    },
    ...over,
  })

  const render = (locale = 'en') => {
    TestBed.configureTestingModule({
      declarations: [DowntimeFullComponent],
      providers: [
        { provide: DowntimeConfigService, useValue: downtimeSvc },
        { provide: LOCALE_ID, useValue: locale },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    const fixture = TestBed.createComponent(DowntimeFullComponent)
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
      isBlocking: jest.fn((s: DowntimeState) => s.isDowntime && s.type === 'full'),
    }
  })

  it('covers the portal with the configured title and message during a full downtime', () => {
    const el: HTMLElement = render().nativeElement
    const page = el.querySelector('.downtime-full') as HTMLElement
    expect(page).toBeTruthy()
    expect(page.getAttribute('role')).toBe('alertdialog')
    expect(el.querySelector('.downtime-full-title')!.textContent).toContain('Down for maintenance')
    expect(el.querySelector('.downtime-full-message')!.textContent).toContain('Back at 6pm.')
  })

  it('applies the configured colours', () => {
    const page = render().nativeElement.querySelector('.downtime-full') as HTMLElement
    expect(page.style.getPropertyValue('--dt-bg')).toBe('#000000')
    expect(page.style.getPropertyValue('--dt-primary')).toBe('#ff0000')
  })

  it("shows the text in the portal's language", () => {
    const el: HTMLElement = render('hi').nativeElement
    expect(el.querySelector('.downtime-full-title')!.textContent).toContain('रखरखाव जारी है')
  })

  it('shows nothing when there is no downtime', () => {
    state$.next(downtime({ isDowntime: false }))
    expect(render().nativeElement.querySelector('.downtime-full')).toBeNull()
  })

  it('shows nothing during a partial downtime', () => {
    state$.next(downtime({ type: 'partial' }))
    expect(render().nativeElement.querySelector('.downtime-full')).toBeNull()
  })

  it('shows nothing to a user bypassing the downtime', () => {
    downtimeSvc.isBlocking.mockReturnValue(false)
    expect(render().nativeElement.querySelector('.downtime-full')).toBeNull()
  })

  it('appears when a downtime is switched on while the portal is open', () => {
    state$.next(downtime({ isDowntime: false }))
    const fixture = render()
    state$.next(downtime())
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('.downtime-full')).toBeTruthy()
  })

  it('uses a configured image as the icon', () => {
    state$.next(downtime({ content: { ...downtime().content, icon: 'https://cdn.example/tools.svg' } }))
    const img = render().nativeElement.querySelector('.downtime-full-icon img') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('https://cdn.example/tools.svg')
  })

  it('shows the app link and its hint when configured', () => {
    state$.next(
      downtime({
        content: {
          ...downtime().content,
          appLink: { isEnabled: true, url: 'https://status.example', label: 'Status page', hint: 'Updated hourly' },
        },
      }),
    )
    const el: HTMLElement = render().nativeElement
    const link = el.querySelector('.downtime-full-link') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('https://status.example')
    expect(link.textContent).toContain('Status page')
    expect(el.querySelector('.downtime-full-hint')!.textContent).toContain('Updated hourly')
  })
})
