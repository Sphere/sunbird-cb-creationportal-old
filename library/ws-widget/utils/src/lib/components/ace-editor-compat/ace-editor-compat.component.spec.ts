// ace-builds is an ESM namespace, so its `edit` binding cannot be redefined by
// jest.spyOn — the module itself has to be mocked. The mode/theme bundles are
// side-effect imports that register against the global ace the real package
// installs, so they have to be stubbed out alongside it.
jest.mock('ace-builds', () => ({ edit: jest.fn() }))
jest.mock('ace-builds/src-min-noconflict/mode-text', () => ({}))
jest.mock('ace-builds/src-min-noconflict/mode-javascript', () => ({}))
jest.mock('ace-builds/src-min-noconflict/mode-python', () => ({}))
jest.mock('ace-builds/src-min-noconflict/mode-java', () => ({}))
jest.mock('ace-builds/src-min-noconflict/mode-html', () => ({}))
jest.mock('ace-builds/src-min-noconflict/mode-css', () => ({}))
jest.mock('ace-builds/src-min-noconflict/mode-sql', () => ({}))
jest.mock('ace-builds/src-min-noconflict/theme-monokai', () => ({}))
jest.mock('ace-builds/src-min-noconflict/theme-eclipse', () => ({}))

import * as ace from 'ace-builds'

import { AceEditorCompatComponent } from './ace-editor-compat.component'

describe('AceEditorCompatComponent', () => {
  let comp: AceEditorCompatComponent
  let editor: any
  let changeHandler: () => void

  const attachHost = () => {
    comp.host = { nativeElement: document.createElement('div') } as any
  }

  beforeEach(() => {
    changeHandler = () => undefined
    editor = {
      setTheme: jest.fn(),
      session: { setMode: jest.fn() },
      setReadOnly: jest.fn(),
      setOptions: jest.fn(),
      setValue: jest.fn(),
      getValue: jest.fn().mockReturnValue(''),
      destroy: jest.fn(),
      on: jest.fn((_evt: string, cb: any) => {
        changeHandler = cb
      }),
    }
    ;(ace.edit as jest.Mock).mockReturnValue(editor)
    comp = new AceEditorCompatComponent()
    attachHost()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('exposes the ng2-ace-editor default inputs', () => {
    expect(comp.mode).toBe('text')
    expect(comp.theme).toBe('monokai')
    expect(comp.readOnly).toBe(false)
    expect(comp.options).toEqual({})
    expect(comp.autoUpdateContent).toBe(true)
    expect(comp.durationBeforeCallback).toBe(0)
  })

  describe('ngAfterViewInit', () => {
    it('builds the editor with the configured mode, theme, readOnly and options', () => {
      comp.mode = 'javascript'
      comp.theme = 'eclipse'
      comp.readOnly = true
      comp.options = { fontSize: 14 }

      comp.ngAfterViewInit()

      expect(ace.edit).toHaveBeenCalledWith(comp.host.nativeElement)
      expect(editor.setTheme).toHaveBeenCalledWith('ace/theme/eclipse')
      expect(editor.session.setMode).toHaveBeenCalledWith('ace/mode/javascript')
      expect(editor.setReadOnly).toHaveBeenCalledWith(true)
      expect(editor.setOptions).toHaveBeenCalledWith({ fontSize: 14 })
    })

    it('flushes text supplied before the view existed', () => {
      comp.text = 'pre-set'
      comp.ngAfterViewInit()
      expect(editor.setValue).toHaveBeenCalledWith('pre-set', -1)
    })

    it('does not seed the editor when no text was supplied', () => {
      comp.ngAfterViewInit()
      expect(editor.setValue).not.toHaveBeenCalled()
    })
  })

  describe('text setter', () => {
    it('pushes new text into a live editor', () => {
      comp.ngAfterViewInit()
      editor.getValue.mockReturnValue('old')
      comp.text = 'new'
      expect(editor.setValue).toHaveBeenCalledWith('new', -1)
    })

    it('skips the write when the editor already holds that text', () => {
      comp.ngAfterViewInit()
      editor.getValue.mockReturnValue('same')
      comp.text = 'same'
      expect(editor.setValue).not.toHaveBeenCalled()
    })

    it('coerces an empty value to an empty string', () => {
      comp.ngAfterViewInit()
      editor.getValue.mockReturnValue('old')
      comp.text = undefined as any
      expect(editor.setValue).toHaveBeenCalledWith('', -1)
    })

    it('does not write when autoUpdateContent is off', () => {
      comp.ngAfterViewInit()
      comp.autoUpdateContent = false
      editor.getValue.mockReturnValue('old')
      comp.text = 'new'
      expect(editor.setValue).not.toHaveBeenCalled()
    })
  })

  describe('change events', () => {
    it('emits on both outputs immediately when there is no debounce', () => {
      const change: string[] = []
      const changed: string[] = []
      comp.textChange.subscribe(v => change.push(v))
      comp.textChanged.subscribe(v => changed.push(v))
      comp.ngAfterViewInit()

      editor.getValue.mockReturnValue('typed')
      changeHandler()

      expect(change).toEqual(['typed'])
      expect(changed).toEqual(['typed'])
    })

    it('debounces the emit by durationBeforeCallback', () => {
      jest.useFakeTimers()
      const change: string[] = []
      comp.textChange.subscribe(v => change.push(v))
      comp.durationBeforeCallback = 300
      comp.ngAfterViewInit()

      editor.getValue.mockReturnValue('typed')
      changeHandler()
      expect(change).toEqual([])

      jest.advanceTimersByTime(300)
      expect(change).toEqual(['typed'])
      jest.useRealTimers()
    })

    it('only emits once for a burst of keystrokes', () => {
      jest.useFakeTimers()
      const change: string[] = []
      comp.textChange.subscribe(v => change.push(v))
      comp.durationBeforeCallback = 200
      comp.ngAfterViewInit()

      editor.getValue.mockReturnValue('a')
      changeHandler()
      editor.getValue.mockReturnValue('ab')
      changeHandler()
      jest.advanceTimersByTime(200)

      expect(change).toEqual(['ab'])
      jest.useRealTimers()
    })
  })

  describe('ngOnChanges', () => {
    it('is a no-op before the editor exists', () => {
      expect(() => comp.ngOnChanges({ mode: {} } as any)).not.toThrow()
      expect(editor.session.setMode).not.toHaveBeenCalled()
    })

    it('applies a mode change', () => {
      comp.ngAfterViewInit()
      comp.mode = 'python'
      comp.ngOnChanges({ mode: {} } as any)
      expect(editor.session.setMode).toHaveBeenLastCalledWith('ace/mode/python')
    })

    it('applies a theme change', () => {
      comp.ngAfterViewInit()
      comp.theme = 'eclipse'
      comp.ngOnChanges({ theme: {} } as any)
      expect(editor.setTheme).toHaveBeenLastCalledWith('ace/theme/eclipse')
    })

    it('applies a readOnly change', () => {
      comp.ngAfterViewInit()
      comp.readOnly = true
      comp.ngOnChanges({ readOnly: {} } as any)
      expect(editor.setReadOnly).toHaveBeenLastCalledWith(true)
    })

    it('applies an options change', () => {
      comp.ngAfterViewInit()
      comp.options = { tabSize: 4 }
      comp.ngOnChanges({ options: {} } as any)
      expect(editor.setOptions).toHaveBeenLastCalledWith({ tabSize: 4 })
    })

    it('ignores unrelated changes', () => {
      comp.ngAfterViewInit()
      const modeCalls = editor.session.setMode.mock.calls.length
      comp.ngOnChanges({ somethingElse: {} } as any)
      expect(editor.session.setMode).toHaveBeenCalledTimes(modeCalls)
    })
  })

  describe('ngOnDestroy', () => {
    it('destroys the editor', () => {
      comp.ngAfterViewInit()
      comp.ngOnDestroy()
      expect(editor.destroy).toHaveBeenCalled()
    })

    it('is safe when the editor was never created', () => {
      expect(() => comp.ngOnDestroy()).not.toThrow()
    })

    it('cancels a pending debounced emit', () => {
      jest.useFakeTimers()
      const change: string[] = []
      comp.textChange.subscribe(v => change.push(v))
      comp.durationBeforeCallback = 300
      comp.ngAfterViewInit()

      editor.getValue.mockReturnValue('typed')
      changeHandler()
      comp.ngOnDestroy()
      jest.advanceTimersByTime(300)

      expect(change).toEqual([])
      jest.useRealTimers()
    })
  })
})
