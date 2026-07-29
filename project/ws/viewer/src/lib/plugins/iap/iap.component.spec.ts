import { IapComponent } from './iap.component'

describe('IapComponent', () => {
  let component: IapComponent
  let domSanitizer: any
  let logger: any
  let iframe: HTMLIFrameElement
  let postMessage: jest.Mock

  const ARTIFACT = 'https://assess.example.org/quiz/index.html'

  /** Put the iframe the component posts proctoring messages into on the page. */
  const renderIframe = () => {
    iframe = document.createElement('iframe')
    iframe.id = 'iap-iframe'
    document.body.appendChild(iframe)
    postMessage = jest.fn()
    Object.defineProperty(iframe, 'contentWindow', {
      value: { postMessage },
      configurable: true,
    })
  }

  const startProctoring = () => {
    window.dispatchEvent(new MessageEvent('message', { data: { functionToExecute: 'turnOnProctoring' } }))
  }

  const lastPost = () => postMessage.mock.calls[postMessage.mock.calls.length - 1]

  beforeEach(() => {
    domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn((u: string) => `safe:${u}`) }
    logger = { log: jest.fn() }
    component = new IapComponent(domSanitizer, logger)
    component.iapContent = { artifactUrl: ARTIFACT } as any
    renderIframe()
  })

  afterEach(() => {
    component.ngOnDestroy()
    document.body.removeChild(iframe)
    jest.restoreAllMocks()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.iframeUrl).toBeNull()
    expect(component.proctoringWarning).toBe(false)
    expect(component.proctoringStarted).toBe(false)
    expect(() => component.ngOnInit()).not.toThrow()
  })

  describe('ngOnChanges', () => {
    it('trusts the artifact url of the assessment', () => {
      component.ngOnChanges()

      expect(domSanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith(ARTIFACT)
      expect(component.iframeUrl).toBe(`safe:${ARTIFACT}`)
    })

    it('clears the url when the content has no artifact', () => {
      component.iframeUrl = 'safe:old' as any
      component.iapContent = { artifactUrl: '' } as any

      component.ngOnChanges()

      expect(component.iframeUrl).toBeNull()
    })

    it('clears the url when there is no content at all', () => {
      component.iframeUrl = 'safe:old' as any
      component.iapContent = null

      component.ngOnChanges()

      expect(component.iframeUrl).toBeNull()
    })
  })

  describe('window messages', () => {
    beforeEach(() => {
      component.ngAfterViewInit()
    })

    it('logs a message that carries no data', () => {
      window.dispatchEvent(new MessageEvent('message', { data: null }))

      expect(logger.log).toHaveBeenCalledWith('data unavailable')
      expect(component.proctoringStarted).toBe(false)
    })

    it('starts proctoring on request', () => {
      startProctoring()

      expect(component.proctoringStarted).toBe(true)
      expect(component.proctoringWarning).toBe(true)
      expect(postMessage).toHaveBeenCalledWith({ proctoring: 'none' }, 'https://assess.example.org')
    })

    it('stops proctoring on request', () => {
      startProctoring()

      window.dispatchEvent(new MessageEvent('message', { data: { functionToExecute: 'turnOffProctoring' } }))

      expect(component.proctoringStarted).toBe(false)
      expect(component.proctoringWarning).toBe(false)
    })

    it('ignores an unrelated message', () => {
      window.dispatchEvent(new MessageEvent('message', { data: { other: true } }))

      expect(component.proctoringStarted).toBe(false)
    })

    it('stops listening once destroyed', () => {
      component.ngOnDestroy()

      startProctoring()

      expect(component.proctoringStarted).toBe(false)
    })
  })

  describe('proctoring guards', () => {
    beforeEach(() => {
      component.ngAfterViewInit()
      startProctoring()
      postMessage.mockClear()
    })

    it('reports and blocks a right click', () => {
      const event = { preventDefault: jest.fn() }
      component.contextCheck(event)

      expect(lastPost()[0]).toEqual({ proctoring: 'rightClick' })
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('reports and blocks an attempt to leave the page', () => {
      const event = { returnValue: '' }
      component.beforeUnload(event)

      expect(lastPost()[0]).toEqual({ proctoring: 'beforeunload' })
      expect(event.returnValue).toBe('You are not allowed to close window.')
    })

    it.each([
      ['copyCheck', 'copy'],
      ['cutCheck', 'cut'],
      ['pasteCheck', 'paste'],
    ])('%s reports and blocks the %s', (method, signal) => {
      const event = { preventDefault: jest.fn() }
      ;(component as any)[method](event)

      expect(lastPost()[0]).toEqual({ proctoring: signal })
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('reports a visibility change', () => {
      component.visibilityCheck()

      expect(logger.log).toHaveBeenCalledWith('document.visibilityState >', expect.anything())
      expect(lastPost()[0]).toEqual({ proctoring: 'visibilitychange' })
    })

    it('raises the warning when the assessment leaves fullscreen', () => {
      component.proctoringWarning = false

      component.fullscreenCheck()

      expect(lastPost()[0]).toEqual({ proctoring: 'fullScreen' })
      expect(component.proctoringWarning).toBe(true)
    })

    it.each([
      [{ altKey: true }, 'alt'],
      [{ ctrlKey: true }, 'ctrl'],
      [{ key: 'tab' }, 'tab'],
      [{ key: 'esc' }, 'esc'],
      [{ key: 'window' }, 'window'],
      [{ key: 'f1' }, 'f1'],
      [{ key: 'f8' }, 'f8'],
      [{ key: 'f12' }, 'f12'],
    ])('reports and blocks %o as %s', (props, signal) => {
      const event = { preventDefault: jest.fn(), ...props } as any
      component.keydownCheck(event)

      expect(lastPost()[0]).toEqual({ proctoring: signal })
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('lets an ordinary key through', () => {
      const event = { preventDefault: jest.fn(), key: 'a' } as any
      component.keydownCheck(event)

      expect(postMessage).not.toHaveBeenCalled()
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('posts to the page origin when the content has no artifact url', () => {
      component.iapContent = null

      component.contextCheck({ preventDefault: jest.fn() })

      expect(lastPost()[1]).toBe(window.location.origin)
    })

    it('does not post when the iframe has no content window', () => {
      Object.defineProperty(iframe, 'contentWindow', { value: null, configurable: true })

      expect(() => component.contextCheck({ preventDefault: jest.fn() })).not.toThrow()
      expect(postMessage).not.toHaveBeenCalled()
    })
  })

  describe('enterFullScreen', () => {
    const withFullscreenApi = (name: string) => {
      const spy = jest.fn()
      ;(iframe as any)[name] = spy
      return spy
    }

    afterEach(() => {
      ;['requestFullscreen', 'mozRequestFullScreen', 'webkitRequestFullscreen', 'msRequestFullscreen'].forEach(
        n => delete (iframe as any)[n],
      )
    })

    it.each(['requestFullscreen', 'mozRequestFullScreen', 'webkitRequestFullscreen', 'msRequestFullscreen'])(
      'uses the %s vendor api',
      name => {
        const spy = withFullscreenApi(name)
        component.proctoringWarning = true

        component.enterFullScreen()

        expect(spy).toHaveBeenCalled()
        expect(component.proctoringWarning).toBe(false)
      },
    )

    it('clears the warning even with no fullscreen api available', () => {
      component.proctoringWarning = true

      component.enterFullScreen()

      expect(component.proctoringWarning).toBe(false)
    })

    it('does nothing when the iframe is not on the page', () => {
      document.body.removeChild(iframe)
      component.proctoringWarning = true

      expect(() => component.enterFullScreen()).not.toThrow()

      document.body.appendChild(iframe)
    })
  })

  describe('exiting fullscreen on teardown', () => {
    const apis = ['exitFullscreen', 'mozCancelFullScreen', 'webkitExitFullscreen', 'msExitFullscreen']

    afterEach(() => {
      apis.forEach(n => delete (document as any)[n])
    })

    it.each(apis)('uses the %s vendor api', name => {
      const spy = jest.fn()
      ;(document as any)[name] = spy
      component.ngAfterViewInit()
      startProctoring()

      component.ngOnDestroy()

      expect(spy).toHaveBeenCalled()
      expect(component.proctoringWarning).toBe(false)
    })

    it('tolerates a browser with no exit api', () => {
      component.ngAfterViewInit()
      startProctoring()

      expect(() => component.ngOnDestroy()).not.toThrow()
    })

    it('does not try to exit fullscreen when proctoring never started', () => {
      const spy = jest.fn()
      ;(document as any).exitFullscreen = spy
      component.ngAfterViewInit()

      component.ngOnDestroy()

      expect(spy).not.toHaveBeenCalled()
    })
  })
})
