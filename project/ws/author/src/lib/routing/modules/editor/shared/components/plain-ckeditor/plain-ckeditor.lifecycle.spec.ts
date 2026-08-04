import { Subject } from 'rxjs'

import { PlainCKEditorComponent } from './plain-ckeditor.component'

/**
 * Covers the lifecycle / content-emission paths the sibling
 * plain-ckeditor.component.spec.ts leaves out: ngOnInit config selection and theme
 * syncing, the upload/download regex replacers, onContentChanged in all three
 * regex modes, initEditor, destroyEditorsOnHost, and teardown.
 */
describe('PlainCKEditorComponent (lifecycle + content)', () => {
  let component: PlainCKEditorComponent
  let snackBar: any
  let uploadService: any
  let configurationSvc: any
  let accessControlSvc: any
  let loaderService: any
  let cdr: any
  let http: any
  let prefChangeNotifier: Subject<any>

  const build = () => new PlainCKEditorComponent(snackBar, uploadService, configurationSvc, accessControlSvc, loaderService, cdr, http)

  const stubCkeditor = (over: any = {}) => {
    ;(global as any).CKEDITOR = {
      on: jest.fn(),
      dtd: { a: {} },
      instances: {},
      plugins: { add: jest.fn() },
      replace: jest.fn(),
      ...over,
    }
  }

  beforeEach(() => {
    ;(PlainCKEditorComponent as any).uploadPluginRegistered = false
    prefChangeNotifier = new Subject<any>()
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    uploadService = { upload: jest.fn() }
    configurationSvc = { prefChangeNotifier }
    accessControlSvc = { locale: 'en', rootOrg: 'root', org: 'org', userId: 'u1', userName: 'user' }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    cdr = { detach: jest.fn(), detectChanges: jest.fn() }
    http = { get: jest.fn(), post: jest.fn() }
    stubCkeditor()
    component = build()
  })

  afterEach(() => {
    delete (global as any).CKEDITOR
    document.getElementById('ws-ck-upload-icons')?.remove()
    jest.restoreAllMocks()
  })

  describe('ngOnInit', () => {
    it('builds both configs and wires the CKEditor globals', () => {
      component.ngOnInit()
      expect(component.config).toBeTruthy()
      expect(component.configsecond).toBeTruthy()
      expect((global as any).CKEDITOR.on).toHaveBeenCalledWith('dialogDefinition', expect.any(Function))
      expect((global as any).CKEDITOR.dtd.a.div).toBe(1)
    })

    it('opens the advanced toolbar when there is no edit meta', () => {
      component.editMeta = ''
      component.ngOnInit()
      expect(component.showAdvancedSettings).toBe(true)
    })

    it('opens the advanced toolbar when edit meta is undefined', () => {
      component.editMeta = undefined as any
      component.ngOnInit()
      expect(component.showAdvancedSettings).toBe(true)
    })

    it('uses the compact toolbar when edit meta is present', () => {
      component.editMeta = 'description'
      component.ngOnInit()
      expect(component.showAdvancedSettings).toBe(false)
    })

    it('re-applies the theme colour to both configs and the live editor', () => {
      component.ngOnInit()
      const setUiColor = jest.fn()
      component.editorInstance = { setUiColor } as any
      component.config.uiColor = 'stale'
      component.configsecond.uiColor = 'stale'

      prefChangeNotifier.next('changed')

      expect(component.config.uiColor).toBe(component.theme)
      expect(component.configsecond.uiColor).toBe(component.theme)
      expect(setUiColor).toHaveBeenCalledWith(component.theme)
    })

    it('survives a theme change with no live editor', () => {
      component.ngOnInit()
      component.editorInstance = null
      component.config.uiColor = 'stale'
      expect(() => prefChangeNotifier.next('changed')).not.toThrow()
      expect(component.config.uiColor).toBe(component.theme)
    })

    it('leaves the configs alone when the theme already matches', () => {
      component.ngOnInit()
      const setUiColor = jest.fn()
      component.editorInstance = { setUiColor } as any
      prefChangeNotifier.next('changed')
      expect(setUiColor).not.toHaveBeenCalled()
    })
  })

  describe('regex replacers', () => {
    it('regexUploadReplace decodes the captured path', () => {
      expect(component.regexUploadReplace('', 'a%20b', '/c.png')).toBe('a b/c.png')
    })

    it('regexDownloadReplace re-encodes onto the authoring base', () => {
      const out = component.regexDownloadReplace('', 'a b', '/c.png')
      expect(out).toContain('a%20b/c.png')
    })

    it('both replacers tolerate the default empty match string', () => {
      expect(component.regexUploadReplace(undefined as any, 'x', 'y')).toBe('xy')
    })
  })

  describe('onContentChanged', () => {
    it('emits the raw html when no regex mode is on', () => {
      const emitted: string[] = []
      component.value.subscribe(v => emitted.push(v))
      component.doRegex = false
      component.doPartialRegex = false
      component.html = '<p>hello</p>'

      component.onContentChanged()

      expect(emitted).toEqual(['<p>hello</p>'])
    })

    it('applies the upload regex in full-regex mode', () => {
      const emitted: string[] = []
      component.value.subscribe(v => emitted.push(v))
      component.doRegex = true
      component.doPartialRegex = false
      component.html = '<p>x</p>'

      component.onContentChanged()

      expect(emitted).toHaveLength(1)
    })

    it('strips the content-store prefix from src and href in partial mode', () => {
      const emitted: string[] = []
      component.value.subscribe(v => emitted.push(v))
      component.doPartialRegex = true
      component.html = '<img src="https://host/content-store/a.png"><a href="https://host/content-store/b.pdf">x</a>'

      component.onContentChanged()

      expect(emitted[0]).toContain('src="a.png"')
      expect(emitted[0]).toContain('href="b.pdf"')
      expect(emitted[0]).not.toContain('content-store')
    })

    it('partial mode wins over full-regex mode', () => {
      const emitted: string[] = []
      component.value.subscribe(v => emitted.push(v))
      component.doPartialRegex = true
      component.doRegex = true
      component.html = '<img src="https://host/content-store/a.png">'

      component.onContentChanged()

      expect(emitted[0]).toContain('src="a.png"')
    })
  })

  describe('makeTargetAsBlank', () => {
    const fireDialog = (payload: any) => {
      component.makeTargetAsBlank()
      const handler = (global as any).CKEDITOR.on.mock.calls.find((c: any[]) => c[0] === 'dialogDefinition')[1]
      handler(payload)
    }

    it('defaults the link dialog target to a new tab', () => {
      const targetField: any = {}
      fireDialog({
        data: {
          name: 'link',
          definition: { getContents: () => ({ get: () => targetField }) },
        },
      })
      expect(targetField.default).toBe('_blank')
    })

    it('ignores dialogs other than link', () => {
      const getContents = jest.fn()
      fireDialog({ data: { name: 'image', definition: { getContents } } })
      expect(getContents).not.toHaveBeenCalled()
    })

    it('swallows a malformed dialog definition', () => {
      expect(() => fireDialog({ data: { name: 'link', definition: {} } })).not.toThrow()
    })
  })

  describe('allowAdditionalContents', () => {
    it('permits block elements inside anchors', () => {
      component.allowAdditionalContents()
      const dtd = (global as any).CKEDITOR.dtd
      expect(dtd.a).toEqual({ div: 1, p: 1, i: 1, span: 1 })
    })
  })

  describe('toggleAdvancedSettings', () => {
    it('flips the toolbar and re-initialises the editor', () => {
      jest.useFakeTimers()
      const initEditor = jest.spyOn(component as any, 'initEditor').mockImplementation(() => undefined)
      component.showAdvancedSettings = false

      component.toggleAdvancedSettings()

      expect(component.showAdvancedSettings).toBe(true)
      jest.runAllTimers()
      expect(initEditor).toHaveBeenCalled()
      jest.useRealTimers()
    })
  })

  describe('ngAfterViewInit', () => {
    it('captures the i18n button labels and schedules editor creation', () => {
      jest.useFakeTimers()
      const initEditor = jest.spyOn(component as any, 'initEditor').mockImplementation(() => undefined)
      component.image = { nativeElement: { innerHTML: 'Insert image' } } as any
      component.file = { nativeElement: { innerHTML: 'Insert file' } } as any
      component.blank = { nativeElement: { innerHTML: 'Insert blank' } } as any

      component.ngAfterViewInit()

      expect(component.imageName).toBe('Insert image')
      expect(component.fileName).toBe('Insert file')
      expect(component.blankName).toBe('Insert blank')
      expect(cdr.detectChanges).toHaveBeenCalled()
      jest.runAllTimers()
      expect(initEditor).toHaveBeenCalled()
      jest.useRealTimers()
    })
  })

  describe('initEditor', () => {
    const host = () => ({ nativeElement: document.createElement('div') })

    it('bails out once the component has been destroyed', () => {
      component.editorHost = host() as any
      ;(component as any)._editorDestroyed = true
      ;(component as any).initEditor()
      expect((global as any).CKEDITOR.replace).not.toHaveBeenCalled()
    })

    it('bails out when there is no host element', () => {
      component.editorHost = undefined as any
      ;(component as any).initEditor()
      expect((global as any).CKEDITOR.replace).not.toHaveBeenCalled()
    })

    it('destroys a previous instance before replacing', () => {
      const destroy = jest.fn()
      component.editorHost = host() as any
      component.editorInstance = { destroy } as any
      ;(global as any).CKEDITOR.replace.mockReturnValue({ on: jest.fn() })

      ;(component as any).initEditor()

      expect(destroy).toHaveBeenCalled()
      expect((global as any).CKEDITOR.replace).toHaveBeenCalled()
    })

    it('passes the advanced config and the i18n labels through', () => {
      component.editorHost = host() as any
      component.showAdvancedSettings = true
      component.configsecond = { marker: 'advanced' } as any
      component.config = { marker: 'basic' } as any
      component.imageName = 'IMG'
      component.fileName = 'FILE'
      component.blankName = 'BLANK'
      ;(global as any).CKEDITOR.replace.mockReturnValue({ on: jest.fn() })

      ;(component as any).initEditor()

      const cfg = (global as any).CKEDITOR.replace.mock.calls[0][1]
      expect(cfg.marker).toBe('advanced')
      expect(cfg.wsUploadImageLabel).toBe('IMG')
      expect(cfg.wsUploadFileLabel).toBe('FILE')
      expect(cfg.wsAddBlankLabel).toBe('BLANK')
    })

    it('passes the compact config when advanced settings are off', () => {
      component.editorHost = host() as any
      component.showAdvancedSettings = false
      component.configsecond = { marker: 'advanced' } as any
      component.config = { marker: 'basic' } as any
      ;(global as any).CKEDITOR.replace.mockReturnValue({ on: jest.fn() })

      ;(component as any).initEditor()

      expect((global as any).CKEDITOR.replace.mock.calls[0][1].marker).toBe('basic')
    })

    it('seeds the editor with existing html once it is ready', () => {
      const handlers: Record<string, any> = {}
      const setData = jest.fn()
      component.editorHost = host() as any
      component.html = '<p>existing</p>'
      ;(global as any).CKEDITOR.replace.mockReturnValue({
        on: (evt: string, cb: any) => {
          handlers[evt] = cb
        },
        setData,
        getData: jest.fn().mockReturnValue('<p>existing</p>'),
      })

      ;(component as any).initEditor()
      handlers.instanceReady()

      expect(setData).toHaveBeenCalledWith('<p>existing</p>')
    })

    it('does not seed an empty editor', () => {
      const handlers: Record<string, any> = {}
      const setData = jest.fn()
      component.editorHost = host() as any
      component.html = ''
      ;(global as any).CKEDITOR.replace.mockReturnValue({
        on: (evt: string, cb: any) => {
          handlers[evt] = cb
        },
        setData,
      })

      ;(component as any).initEditor()
      handlers.instanceReady()

      expect(setData).not.toHaveBeenCalled()
    })

    it('mirrors editor changes back onto html and emits them', () => {
      const handlers: Record<string, any> = {}
      const emitted: string[] = []
      component.value.subscribe(v => emitted.push(v))
      component.editorHost = host() as any
      ;(global as any).CKEDITOR.replace.mockReturnValue({
        on: (evt: string, cb: any) => {
          handlers[evt] = cb
        },
        getData: jest.fn().mockReturnValue('<p>typed</p>'),
      })

      ;(component as any).initEditor()
      handlers.change()

      expect(component.html).toBe('<p>typed</p>')
      expect(emitted).toEqual(['<p>typed</p>'])
    })
  })

  describe('destroyEditorsOnHost', () => {
    it('does nothing without a host', () => {
      expect(() => (component as any).destroyEditorsOnHost(null)).not.toThrow()
    })

    it('does nothing when CKEDITOR has no instances map', () => {
      ;(global as any).CKEDITOR = { on: jest.fn() }
      expect(() => (component as any).destroyEditorsOnHost(document.createElement('div'))).not.toThrow()
    })

    it('destroys only the instances bound to that host', () => {
      const hostEl = document.createElement('div')
      const otherEl = document.createElement('div')
      const mine = { element: { $: hostEl }, destroy: jest.fn() }
      const theirs = { element: { $: otherEl }, destroy: jest.fn() }
      ;(global as any).CKEDITOR.instances = { mine, theirs }

      ;(component as any).destroyEditorsOnHost(hostEl)

      expect(mine.destroy).toHaveBeenCalledWith(true)
      expect(theirs.destroy).not.toHaveBeenCalled()
    })

    it('swallows an error from an already-destroyed instance', () => {
      const hostEl = document.createElement('div')
      ;(global as any).CKEDITOR.instances = {
        gone: {
          element: { $: hostEl },
          destroy: () => {
            throw new Error('already gone')
          },
        },
      }
      expect(() => (component as any).destroyEditorsOnHost(hostEl)).not.toThrow()
    })

    it('skips entries with no element', () => {
      const hostEl = document.createElement('div')
      ;(global as any).CKEDITOR.instances = { empty: {} }
      expect(() => (component as any).destroyEditorsOnHost(hostEl)).not.toThrow()
    })
  })

  describe('ngOnDestroy', () => {
    it('tears down the editor, the subscription and change detection', () => {
      const destroy = jest.fn()
      const unsubscribe = jest.fn()
      component.editorInstance = { destroy } as any
      component.subscription = { unsubscribe } as any

      component.ngOnDestroy()

      expect(destroy).toHaveBeenCalled()
      expect(component.editorInstance).toBeNull()
      expect(unsubscribe).toHaveBeenCalled()
      expect(cdr.detach).toHaveBeenCalled()
      expect((component as any)._editorDestroyed).toBe(true)
    })

    it('is safe with nothing to tear down', () => {
      component.editorInstance = null
      component.subscription = undefined as any
      expect(() => component.ngOnDestroy()).not.toThrow()
      expect(cdr.detach).toHaveBeenCalled()
    })
  })
})
