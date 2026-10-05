import { TestBed } from '@angular/core/testing'
import { provideHttpClient } from '@angular/common/http'
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { ConfigurationsService, LoggerService } from '@ws-widget/utils'
import { DOWNTIME_FORM_READ_URL, DowntimeConfigService } from './downtime-config.service'
import { DOWNTIME_DEFAULTS } from '../models/downtime.model'

describe('DowntimeConfigService', () => {
  let service: DowntimeConfigService
  let http: HttpTestingController
  let configSvc: { userProfile: any }
  let logger: { warn: jest.Mock; info: jest.Mock; error: jest.Mock }

  /** The form-read response shape, with `web` under DOWN_TIME_INFO.WEB. */
  const formResponse = (web: any) => ({ result: { form: { data: { schemas: { DOWN_TIME_INFO: { WEB: web } } } } } })

  const cbp = (over: any = {}) => ({
    isEnabled: true,
    type: 'full',
    refreshInterval: 60,
    content: {
      icon: 'wrench',
      title: { en: 'Down for maintenance', hi: 'रखरखाव' },
      message: { en: 'Back at 6pm.', hi: 'शाम 6 बजे' },
    },
    ...over,
  })

  /** Starts load() and answers the form read with `body`. */
  const loadWith = async (body: any) => {
    const loading = service.load()
    http.expectOne(DOWNTIME_FORM_READ_URL).flush(body)
    return loading
  }

  beforeEach(() => {
    sessionStorage.clear()
    window.history.replaceState({}, '', '/')
    configSvc = { userProfile: null }
    logger = { warn: jest.fn(), info: jest.fn(), error: jest.fn() }
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ConfigurationsService, useValue: configSvc },
        { provide: LoggerService, useValue: logger },
      ],
    })
    service = TestBed.inject(DowntimeConfigService)
    http = TestBed.inject(HttpTestingController)
  })

  afterEach(() => {
    service.ngOnDestroy()
    http.verify()
    jest.useRealTimers()
  })

  it('reads the app_update_info form with no session needed', async () => {
    const loading = service.load()
    const req = http.expectOne(DOWNTIME_FORM_READ_URL)
    expect(req.request.method).toBe('POST')
    expect(req.request.body.request).toEqual(
      expect.objectContaining({ type: 'app_update_info', subtype: '*', action: 'get', component: 'app', rootOrgId: '*' }),
    )
    req.flush(formResponse({}))
    await loading
  })

  describe('reading the config', () => {
    it('reports no downtime when the form has no downtime section', async () => {
      const state = await loadWith({ result: { form: { data: {} } } })
      expect(state.isDowntime).toBe(false)
      expect(service.isBlocking()).toBe(false)
    })

    it('uses the cbp section', async () => {
      const state = await loadWith(formResponse({ cbp: cbp(), default: cbp({ isEnabled: false }) }))
      expect(state).toEqual(expect.objectContaining({ isDowntime: true, type: 'full', refreshInterval: 60 }))
      expect(state.content.title.en).toBe('Down for maintenance')
    })

    it('falls back to the default section, so one switch can cover every portal', async () => {
      const state = await loadWith(formResponse({ default: cbp({ type: 'partial' }) }))
      expect(state).toEqual(expect.objectContaining({ isDowntime: true, type: 'partial' }))
    })

    it("ignores another portal's section", async () => {
      const state = await loadWith(formResponse({ sphere: cbp() }))
      expect(state.isDowntime).toBe(false)
    })

    it('reports no downtime when the section is switched off', async () => {
      const state = await loadWith(formResponse({ cbp: cbp({ isEnabled: false }) }))
      expect(state.isDowntime).toBe(false)
    })

    it('treats an unknown type as a full downtime', async () => {
      const state = await loadWith(formResponse({ cbp: cbp({ type: 'everything' }) }))
      expect(state.type).toBe('full')
    })

    it('fills in defaults for missing content and refresh interval', async () => {
      const state = await loadWith(formResponse({ cbp: { isEnabled: true, type: 'full' } }))
      expect(state.refreshInterval).toBe(DOWNTIME_DEFAULTS.REFRESH_INTERVAL)
      expect(state.content.icon).toBe(DOWNTIME_DEFAULTS.ICON)
      expect(state.content.title).toEqual(DOWNTIME_DEFAULTS.TITLE)
      expect(state.content.message).toEqual(DOWNTIME_DEFAULTS.MESSAGE)
      expect(state.content.css).toEqual(expect.objectContaining({ theme: 'light', position: 'top' }))
    })

    it('shows only an enabled https app link', async () => {
      const withLink = (appLink: any) => loadWith(formResponse({ cbp: cbp({ content: { ...cbp().content, appLink } }) }))
      expect((await withLink({ isEnabled: true, url: 'https://status.example', label: 'Status' })).content.appLink).toBeTruthy()
      expect((await withLink({ isEnabled: false, url: 'https://status.example', label: 'Status' })).content.appLink).toBeUndefined()
      expect((await withLink({ isEnabled: true, url: 'javascript:alert(1)', label: 'x' })).content.appLink).toBeUndefined()
    })

    it('never blocks the portal when the config cannot be read', async () => {
      const loading = service.load()
      http.expectOne(DOWNTIME_FORM_READ_URL).flush('down', { status: 502, statusText: 'Bad Gateway' })
      const state = await loading
      expect(state.isDowntime).toBe(false)
      expect(logger.warn).toHaveBeenCalled()
    })
  })

  describe('bypass', () => {
    it('blocks everyone during a full downtime by default', async () => {
      await loadWith(formResponse({ cbp: cbp() }))
      expect(service.isBlocking()).toBe(true)
    })

    it('does not block during a partial downtime', async () => {
      await loadWith(formResponse({ cbp: cbp({ type: 'partial' }) }))
      expect(service.isBlocking()).toBe(false)
    })

    it('lets a tester in with the bypass code in the URL, for the rest of the session', async () => {
      window.history.replaceState({}, '', '/?downtimeBypass=go-live-42')
      await loadWith(formResponse({ cbp: cbp({ bypassCode: 'go-live-42' }) }))
      expect(service.isBypassed()).toBe(true)
      expect(service.isBlocking()).toBe(false)
      expect(sessionStorage.getItem('cbp-downtime-bypass')).toBe('go-live-42')
    })

    it('ignores a wrong bypass code', async () => {
      window.history.replaceState({}, '', '/?downtimeBypass=guess')
      await loadWith(formResponse({ cbp: cbp({ bypassCode: 'go-live-42' }) }))
      expect(service.isBlocking()).toBe(true)
    })

    it('allows no bypass when the config sets no code', async () => {
      window.history.replaceState({}, '', '/?downtimeBypass=anything')
      await loadWith(formResponse({ cbp: cbp() }))
      expect(service.isBlocking()).toBe(true)
    })

    it('lets signed-in users of a bypass org in', async () => {
      configSvc.userProfile = { rootOrgId: 'org-qa' }
      await loadWith(formResponse({ cbp: cbp({ bypassOrgs: ['org-qa'] }) }))
      expect(service.isBlocking()).toBe(false)
    })

    it('blocks signed-in users of other orgs', async () => {
      configSvc.userProfile = { rootOrgId: 'org-other' }
      await loadWith(formResponse({ cbp: cbp({ bypassOrgs: ['org-qa'] }) }))
      expect(service.isBlocking()).toBe(true)
    })
  })

  describe('re-checking the config', () => {
    it('picks up a downtime switched on while the portal is open', async () => {
      jest.useFakeTimers()
      await loadWith(formResponse({ cbp: cbp({ isEnabled: false, refreshInterval: 30 }) }))
      expect(service.isBlocking()).toBe(false)
      jest.advanceTimersByTime(30_000)
      http.expectOne(DOWNTIME_FORM_READ_URL).flush(formResponse({ cbp: cbp({ refreshInterval: 30 }) }))
      expect(service.isBlocking()).toBe(true)
    })

    it('reloads once a full downtime ends, when start-up was skipped for it', async () => {
      jest.useFakeTimers()
      const reload = jest.spyOn(service as any, 'reloadPage').mockImplementation(() => undefined)
      await loadWith(formResponse({ cbp: cbp({ refreshInterval: 30 }) }))
      jest.advanceTimersByTime(30_000)
      http.expectOne(DOWNTIME_FORM_READ_URL).flush(formResponse({ cbp: cbp({ isEnabled: false, refreshInterval: 30 }) }))
      expect(reload).toHaveBeenCalledTimes(1)
    })

    it('does not reload when the portal had already started', async () => {
      jest.useFakeTimers()
      const reload = jest.spyOn(service as any, 'reloadPage').mockImplementation(() => undefined)
      await loadWith(formResponse({ cbp: cbp({ refreshInterval: 30 }) }))
      service.markAppStarted()
      jest.advanceTimersByTime(30_000)
      http.expectOne(DOWNTIME_FORM_READ_URL).flush(formResponse({ cbp: cbp({ isEnabled: false, refreshInterval: 30 }) }))
      expect(reload).not.toHaveBeenCalled()
      expect(service.isBlocking()).toBe(false)
    })

    it('follows a changed refresh interval', async () => {
      jest.useFakeTimers()
      await loadWith(formResponse({ cbp: cbp({ isEnabled: false, refreshInterval: 30 }) }))
      jest.advanceTimersByTime(30_000)
      http.expectOne(DOWNTIME_FORM_READ_URL).flush(formResponse({ cbp: cbp({ isEnabled: false, refreshInterval: 120 }) }))
      jest.advanceTimersByTime(30_000)
      http.expectNone(DOWNTIME_FORM_READ_URL)
      jest.advanceTimersByTime(90_000)
      http.expectOne(DOWNTIME_FORM_READ_URL).flush(formResponse({}))
    })

    it('stops re-checking when destroyed', async () => {
      jest.useFakeTimers()
      await loadWith(formResponse({ cbp: cbp({ isEnabled: false, refreshInterval: 30 }) }))
      service.ngOnDestroy()
      jest.advanceTimersByTime(60_000)
      http.expectNone(DOWNTIME_FORM_READ_URL)
    })
  })
})
