import { of, Subject } from 'rxjs'
import { ActivityStripMultipleComponent } from './activity-strip-multiple.component'

describe('ActivityStripMultipleComponent', () => {
  let component: ActivityStripMultipleComponent
  let contentStripSvc: any
  let contentSvc: any
  let loggerSvc: any
  let snackBar: any
  let utilitySvc: any

  const apiStrip = (over: any = {}) => ({
    key: 'k1',
    title: 'Strip One',
    request: { api: { path: '/some/path', queryParams: { a: 1 } } },
    ...over,
  })

  const build = (strips: any[] = [apiStrip()], extra: any = {}) => {
    const c = new ActivityStripMultipleComponent(contentStripSvc, contentSvc, loggerSvc, snackBar, utilitySvc)
    c.widgetData = { strips, ...extra } as any
    ;(c as any).userManual = {} as any
    return c
  }

  beforeEach(() => {
    contentStripSvc = { fetchNetworkUsers: jest.fn().mockReturnValue(of([{ identifier: 'do_1' }])) }
    contentSvc = { fetchContentLikes: jest.fn().mockResolvedValue({ do_1: 3 }) }
    loggerSvc = { warn: jest.fn() }
    snackBar = { dismiss: jest.fn(), openFromTemplate: jest.fn() }
    utilitySvc = { isMobile: false }
    sessionStorage.clear()
    component = build()
  })

  it('is created with a unique host id', () => {
    expect(component).toBeTruthy()
    expect(component.id).toMatch(/^activity-multiple_/)
  })

  describe('ngOnInit', () => {
    it('opens the user manual snackbar and initialises the strips', () => {
      component.ngOnInit()

      expect(snackBar.openFromTemplate).toHaveBeenCalled()
      expect(component.stripsKeyOrder).toEqual(['k1'])
      expect(contentStripSvc.fetchNetworkUsers).toHaveBeenCalledWith({ a: 1 }, '/some/path')
    })

    it('shows the parent loader while a requested fetch is still pending', () => {
      contentStripSvc.fetchNetworkUsers.mockReturnValue(new Subject())
      component = build([apiStrip()], { loader: true })
      component.ngOnInit()

      expect(component.showParentLoader).toBe(true)
    })

    it('processes an empty (non-api) strip directly without fetching', () => {
      component = build([{ key: 'empty', title: 'Empty', request: {} }])
      component.ngOnInit()

      expect(contentStripSvc.fetchNetworkUsers).not.toHaveBeenCalled()
      expect(component.stripsResultDataMap['empty']).toBeTruthy()
    })
  })

  describe('checkForEmptyWidget', () => {
    it('returns true when a strip has an api request', () => {
      expect(component.checkForEmptyWidget(apiStrip() as any)).toBe(true)
    })

    it('returns false when there is no api request', () => {
      expect(component.checkForEmptyWidget({ request: {} } as any)).toBe(false)
      expect(component.checkForEmptyWidget({} as any)).toBe(false)
    })
  })

  describe('fetchNetworkUsers', () => {
    it('fetches and populates the strip result map', () => {
      component.fetchNetworkUsers(apiStrip() as any, true)

      expect(contentStripSvc.fetchNetworkUsers).toHaveBeenCalledWith({ a: 1 }, '/some/path')
      expect(component.stripsResultDataMap['k1'].widgets && component.stripsResultDataMap['k1'].widgets!.length).toBe(1)
    })

    it('does nothing when the api config is empty', () => {
      component.fetchNetworkUsers({ key: 'k', request: { api: {} } } as any, true)

      expect(contentStripSvc.fetchNetworkUsers).not.toHaveBeenCalled()
    })
  })

  describe('transformContentsToWidgets', () => {
    it('maps contents into card widgets', () => {
      const widgets = (component as any).transformContentsToWidgets(
        [{ identifier: 'do_1' }, { identifier: 'do_2' }],
        apiStrip({ stripConfig: { cardSubType: 'x', intranetMode: true } }),
      )

      expect(widgets).toHaveLength(2)
      expect(widgets[0].widgetType).toBe('card')
      expect(widgets[0].widgetData.content.identifier).toBe('do_1')
      expect(widgets[0].widgetData.cardSubType).toBe('x')
      expect(widgets[0].widgetData.context).toEqual({ pageSection: 'k1', position: 0 })
    })

    it('tolerates a null content list', () => {
      expect((component as any).transformContentsToWidgets(null, apiStrip())).toEqual([])
    })
  })

  describe('processStrip', () => {
    it('builds a done strip with pre/post widgets and marks content available', async () => {
      const strip = apiStrip({ preWidgets: [{ widgetHostClass: 'p' }], postWidgets: [{ widgetHostClass: 'q' }] })
      await (component as any).processStrip(strip, [{ widgetData: {} }], 'done', true, null)

      const data = component.stripsResultDataMap['k1']
      expect(data.widgets!.length).toBe(3)
      expect(component.contentAvailable).toBe(true)
      expect(component.successDataCount).toBe(1)
    })

    it('marks no-data when done with no results', async () => {
      const strip = apiStrip({ noDataWidget: { widgetType: 'x' } })
      await (component as any).processStrip(strip, [], 'done', true, null)

      const data = component.stripsResultDataMap['k1']
      expect(data.showOnNoData).toBe(true)
      expect(component.contentAvailable).toBe(false)
      expect(component.noDataCount).toBe(1)
    })

    it('processes likes when fetchLikes is set', async () => {
      const strip = apiStrip({ fetchLikes: true })
      const results = [{ widgetData: { content: { identifier: 'do_1' } } }]
      await (component as any).processStrip(strip, results, 'done', true, null)

      expect(contentSvc.fetchContentLikes).toHaveBeenCalled()
      expect(results[0].widgetData.likes).toBe(3)
    })
  })

  describe('checkParentStatus', () => {
    it('flags parent error when every strip errored', () => {
      component.widgetData = { strips: [apiStrip()] } as any
      ;(component as any).checkParentStatus('error', 0)

      expect(component.errorDataCount).toBe(1)
      expect(component.showParentError).toBe(true)
    })

    it('returns early while some strips still succeed and settle is incomplete', () => {
      component.widgetData = { strips: [apiStrip(), apiStrip({ key: 'k2' })] } as any
      ;(component as any).checkParentStatus('done', 5)

      expect(component.successDataCount).toBe(1)
      expect(component.showParentNoData).toBe(false)
    })
  })

  describe('setHiddenForStrip / getIfStripHidden', () => {
    it('persists the hidden flag to session storage', () => {
      component.stripsResultDataMap['k1'] = { showStrip: true } as any
      component.setHiddenForStrip('k1')

      expect(component.stripsResultDataMap['k1'].showStrip).toBe(false)
      expect(sessionStorage.getItem('cstrip_k1')).toBe('1')
      expect((component as any).getIfStripHidden('k1')).toBe(false)
    })

    it('reports visible when nothing is stored', () => {
      expect((component as any).getIfStripHidden('unknown')).toBe(true)
    })
  })

  describe('showAccordion', () => {
    it('respects the accordion flag on mobile', () => {
      utilitySvc.isMobile = true
      component.stripsResultDataMap['k1'] = { mode: 'accordion' } as any
      component.showAccordionData = false

      expect(component.showAccordion('k1')).toBe(false)
    })

    it('always shows on desktop', () => {
      component.stripsResultDataMap['k1'] = { mode: 'accordion' } as any
      expect(component.showAccordion('k1')).toBe(true)
    })
  })

  describe('toggleInfo', () => {
    it('toggles the visibility mode of a below-mode info block', () => {
      component.stripsResultDataMap['k1'] = { stripInfo: { mode: 'below', visibilityMode: 'hidden' } } as any
      component.toggleInfo({ key: 'k1' } as any)

      expect(component.stripsResultDataMap['k1'].stripInfo!.visibilityMode).toBe('visible')
    })

    it('coerces an unsupported mode to below and warns', () => {
      component.stripsResultDataMap['k1'] = { stripInfo: { mode: 'side', visibilityMode: 'visible' } } as any
      component.toggleInfo({ key: 'k1' } as any)

      expect(loggerSvc.warn).toHaveBeenCalled()
      expect(component.stripsResultDataMap['k1'].stripInfo!.visibilityMode).toBe('hidden')
    })

    it('does nothing without strip info', () => {
      component.stripsResultDataMap['k1'] = {} as any
      expect(() => component.toggleInfo({ key: 'k1' } as any)).not.toThrow()
    })
  })

  describe('processContentLikes', () => {
    it('assigns like counts onto the results', async () => {
      const results: any[] = [{ widgetData: { content: { identifier: 'do_1' } } }]
      await component.processContentLikes(results)

      expect(results[0].widgetData.likes).toBe(3)
    })

    it('swallows a fetch error', async () => {
      contentSvc.fetchContentLikes.mockRejectedValue(new Error('boom'))
      const results: any[] = [{ widgetData: { content: { identifier: 'do_1' } } }]

      await expect(component.processContentLikes(results)).resolves.toBeUndefined()
    })
  })

  describe('snackbar helpers', () => {
    it('closeSnackBar dismisses the snackbar', () => {
      component.closeSnackBar()
      expect(snackBar.dismiss).toHaveBeenCalled()
    })

    it('openUserManualDialogue opens from the template', () => {
      component.openUserManualDialogue()
      expect(snackBar.openFromTemplate).toHaveBeenCalledWith(component.userManual, expect.anything())
    })
  })

  describe('download', () => {
    it('dismisses the snackbar and issues an XHR', () => {
      const send = jest.fn()
      const open = jest.fn()
      const xhrMock: any = { open, send, onload: null, response: new Blob() }
      const orig = (global as any).XMLHttpRequest
      ;(global as any).XMLHttpRequest = jest.fn(() => xhrMock)

      component.download()

      expect(snackBar.dismiss).toHaveBeenCalled()
      expect(open).toHaveBeenCalledWith('GET', '/assets/common/user-manual/manual.pdf', true)
      expect(send).toHaveBeenCalled()
      expect(() => xhrMock.onload()).not.toThrow()
      ;(global as any).XMLHttpRequest = orig
    })
  })

  describe('lifecycle', () => {
    it('unsubscribes on destroy', () => {
      const unsubscribe = jest.fn()
      component.changeEventSubscription = { unsubscribe } as any
      component.ngOnDestroy()

      expect(unsubscribe).toHaveBeenCalled()
    })

    it('is safe to destroy without a subscription', () => {
      component.changeEventSubscription = null
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
