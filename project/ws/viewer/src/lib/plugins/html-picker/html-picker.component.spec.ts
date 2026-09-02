// The component pulls in the ace editor modes/workers purely for their side effects;
// none of that is exercised by these tests and loading it under jsdom is slow.
jest.mock('ace-builds/src-noconflict/ext-language_tools', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/mode-css', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/mode-html', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/mode-javascript', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/mode-text', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/snippets/css', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/snippets/html', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/snippets/javascript', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/snippets/text', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/theme-cobalt', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/worker-css', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/worker-html', () => ({}), { virtual: true })
jest.mock('ace-builds/src-noconflict/worker-javascript', () => ({}), { virtual: true })

import { HtmlPickerComponent } from './html-picker.component'

describe('HtmlPickerComponent', () => {
  let component: HtmlPickerComponent
  let eventSvc: any
  let iframe: HTMLIFrameElement

  const data = (over: any = {}) => ({
    question: 'Build a page',
    htmlPresent: true,
    cssPresent: true,
    javascriptPresent: true,
    html: '<p>hi</p>',
    css: 'p { color: red; }',
    javascript: 'console.log(1)',
    cdnLinks: [],
    ...over,
  })

  const iframeDoc = () => iframe.contentWindow!.document

  beforeEach(() => {
    jest.useFakeTimers()
    eventSvc = { raiseInteractTelemetry: jest.fn() }

    iframe = document.createElement('iframe')
    iframe.id = 'my-output'
    document.body.appendChild(iframe)

    component = new HtmlPickerComponent(eventSvc)
    component.identifier = 'do_html1'
    component.newData = data() as any
  })

  afterEach(() => {
    component.ngOnDestroy()
    document.body.removeChild(iframe)
    jest.useRealTimers()
  })

  it('should be created with the editor defaults', () => {
    expect(component).toBeTruthy()
    expect(component.options.maxLines).toBe(1000)
    expect(component.options.enableSnippets).toBe(true)
    expect(component.firstInput).toBe(true)
    expect(component.firstClick).toBe(true)
    expect(() => component.ngOnInit()).not.toThrow()
  })

  describe('update', () => {
    it('writes the html into the preview frame', () => {
      component.update()

      expect(iframe.src).toContain('javascript')
      expect(iframe.src).toContain('hi')
    })

    it('is reached through the editor change handler', () => {
      const spy = jest.spyOn(component, 'update')

      component.onChange()

      expect(spy).toHaveBeenCalled()
    })

    it('strips html comments up to the end of the line', () => {
      component.newData = data({ html: '<p>a</p>// a note\n<p>b</p>' }) as any

      component.update()

      expect(iframe.src).not.toContain('a note')
      expect(iframe.src).toContain('b')
    })

    it('escapes single quotes in the html', () => {
      component.newData = data({ html: "<p class='x'>hi</p>" }) as any

      component.update()

      expect(decodeURIComponent(iframe.src)).toContain("\\'")
    })

    it('injects the stylesheet into the frame head', () => {
      component.update()

      const style = iframeDoc().head.querySelector('style')
      expect(style).not.toBeNull()
      expect(style!.innerHTML).toContain('color: red')
    })

    it('injects the script into the frame body', () => {
      component.update()

      const script = iframeDoc().body.querySelector('script')
      expect(script).not.toBeNull()
      expect(script!.textContent).toContain('console.log(1)')
    })

    it('strips javascript comments before injecting', () => {
      component.newData = data({ javascript: 'var a = 1 // set a\nvar b = 2' }) as any

      component.update()

      expect(iframeDoc().body.querySelector('script')).not.toBeNull()
    })

    it('omits the html when the author has turned it off', () => {
      component.newData = data({ htmlPresent: false }) as any

      component.update()

      expect(iframe.src).not.toContain('hi')
    })

    it('omits the stylesheet when the author has turned css off', () => {
      component.newData = data({ cssPresent: false }) as any

      component.update()

      expect(iframeDoc().head.querySelector('style')).toBeNull()
    })

    it('omits the script when the author has turned javascript off', () => {
      component.newData = data({ javascriptPresent: false }) as any

      component.update()

      expect(iframeDoc().body.querySelector('script')).toBeNull()
    })

    it('handles a picker with no data at all', () => {
      component.newData = null as any

      expect(() => component.update()).not.toThrow()
    })

    it('treats missing code fields as empty', () => {
      component.newData = {
        htmlPresent: true,
        cssPresent: true,
        javascriptPresent: true,
      } as any

      component.update()

      expect(iframeDoc().head.querySelector('style')).toBeNull()
      expect(iframeDoc().body.querySelector('script')).toBeNull()
    })

    it('adds a stylesheet link for a css cdn entry', () => {
      component.newData = data({
        cdnLinks: [{ type: 'css', src: 'https://cdn/x.css' }],
      }) as any

      component.update()
      jest.runOnlyPendingTimers()

      const link = iframeDoc().head.querySelector('link')
      expect(link!.getAttribute('href')).toBe('https://cdn/x.css')
      expect(link!.getAttribute('rel')).toBe('stylesheet')
    })

    it('adds a script tag for a javascript cdn entry', () => {
      component.newData = data({
        cdnLinks: [{ type: 'js', src: 'https://cdn/x.js' }],
      }) as any

      component.update()
      jest.runOnlyPendingTimers()

      const script = iframeDoc().head.querySelector('script')
      expect(script!.getAttribute('src')).toBe('https://cdn/x.js')
    })

    it('skips a cdn entry with no source', () => {
      component.newData = data({ cdnLinks: [{ type: 'css' }] }) as any

      component.update()
      jest.runOnlyPendingTimers()

      expect(iframeDoc().head.querySelector('link')).toBeNull()
    })
  })

  describe('input telemetry', () => {
    it('raises a code-input event on the first keystroke and starts the timer', () => {
      component.raiseInputChange()

      expect(eventSvc.raiseInteractTelemetry).toHaveBeenCalledWith('editor', 'codeinput', {
        contentId: 'do_html1',
      })
      expect(component.firstInput).toBe(false)
      expect(component.inputInterval).toBeDefined()
    })

    it('does not raise a second event for the next keystroke', () => {
      component.raiseInputChange()
      eventSvc.raiseInteractTelemetry.mockClear()

      component.raiseInputChange()

      expect(eventSvc.raiseInteractTelemetry).not.toHaveBeenCalled()
    })

    it('reports continued typing every two minutes', () => {
      component.raiseInputChange()
      component.raiseInputChange()
      eventSvc.raiseInteractTelemetry.mockClear()

      jest.advanceTimersByTime(2 * 60000)

      expect(eventSvc.raiseInteractTelemetry).toHaveBeenCalledWith('editor', 'codeinput', expect.anything())
    })

    it('stays quiet on the timer when nothing has been typed since', () => {
      component.raiseInputChange()
      eventSvc.raiseInteractTelemetry.mockClear()

      jest.advanceTimersByTime(2 * 60000)

      expect(eventSvc.raiseInteractTelemetry).not.toHaveBeenCalled()
    })
  })

  describe('click telemetry', () => {
    it('raises a button-click event on the first click and starts the timer', () => {
      component.raiseClickEvent()

      expect(eventSvc.raiseInteractTelemetry).toHaveBeenCalledWith('editor', 'buttonclick', {
        contentId: 'do_html1',
      })
      expect(component.firstClick).toBe(false)
      expect(component.clickInterval).toBeDefined()
    })

    it('reports continued clicking every two minutes', () => {
      component.raiseClickEvent()
      component.raiseClickEvent()
      eventSvc.raiseInteractTelemetry.mockClear()

      jest.advanceTimersByTime(2 * 60000)

      expect(eventSvc.raiseInteractTelemetry).toHaveBeenCalledWith('editor', 'buttonclick', expect.anything())
    })

    it('stays quiet on the timer when nothing has been clicked since', () => {
      component.raiseClickEvent()
      eventSvc.raiseInteractTelemetry.mockClear()

      jest.advanceTimersByTime(2 * 60000)

      expect(eventSvc.raiseInteractTelemetry).not.toHaveBeenCalled()
    })
  })

  describe('raiseInteractTelemetry', () => {
    it('sends nothing for content with no identifier', () => {
      component.identifier = null

      component.raiseInteractTelemetry('editor', 'codeinput')

      expect(eventSvc.raiseInteractTelemetry).not.toHaveBeenCalled()
      expect(component.isInput).toBe(false)
    })

    it('clears the typing flag after reporting', () => {
      component.isInput = true

      component.raiseInteractTelemetry('editor', 'codeinput')

      expect(component.isInput).toBe(false)
    })

    it('clears the clicking flag after reporting', () => {
      component.isClick = true

      component.raiseInteractTelemetry('editor', 'buttonclick')

      expect(component.isClick).toBe(false)
    })

    it('leaves both flags alone for another event', () => {
      component.isInput = true
      component.isClick = true

      component.raiseInteractTelemetry('editor', 'other')

      expect(component.isInput).toBe(true)
      expect(component.isClick).toBe(true)
    })
  })

  describe('ngOnDestroy', () => {
    it('stops both telemetry timers', () => {
      component.raiseInputChange()
      component.raiseInputChange()
      component.raiseClickEvent()
      component.raiseClickEvent()

      component.ngOnDestroy()
      eventSvc.raiseInteractTelemetry.mockClear()
      jest.advanceTimersByTime(5 * 60000)

      expect(eventSvc.raiseInteractTelemetry).not.toHaveBeenCalled()
    })

    it('is safe when no timers were ever started', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
