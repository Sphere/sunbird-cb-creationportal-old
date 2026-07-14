import { PlainCKEditorComponent } from './plain-ckeditor.component'

// The component is CKEditor-heavy and its template needs the global CKEDITOR + a real DOM host,
// which are brittle under jsdom. Per the project convention for heavy components, we instantiate
// the class directly with mocked collaborators and a stubbed global CKEDITOR, and test the
// toolbar-button wiring logic (the part restored after the Angular migration dropped it).
describe('PlainCKEditorComponent - custom upload toolbar buttons', () => {
  let component: PlainCKEditorComponent
  let addImageSpy: jest.SpyInstance
  let addFileSpy: jest.SpyInstance
  let addBlankSpy: jest.SpyInstance

  const accessControlSvc: any = { locale: 'en', rootOrg: 'root', org: 'org', userId: 'u1', userName: 'user' }

  beforeEach(() => {
    // Reset the once-only plugin registration guard between tests.
    ;(PlainCKEditorComponent as any).uploadPluginRegistered = false

    component = new PlainCKEditorComponent(
      {} as any, // snackBar
      {} as any, // uploadService
      {} as any, // configurationSvc
      accessControlSvc,
      {} as any, // loaderService
      { detach: jest.fn(), detectChanges: jest.fn() } as any, // cdr
      {} as any, // http
    )

    // Stub the upload handlers so the config callbacks are observable without running upload logic.
    addImageSpy = jest.spyOn(component, 'addImageUploadBtn').mockImplementation(() => undefined)
    addFileSpy = jest.spyOn(component, 'addFileUploadBtn').mockImplementation(() => undefined)
    addBlankSpy = jest.spyOn(component, 'addBlankBtn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    delete (global as any).CKEDITOR
    document.getElementById('ws-ck-upload-icons')?.remove()
    jest.restoreAllMocks()
  })

  describe('uploadToolbarConfig()', () => {
    it('declares the wsuploads plugin and routes callbacks to the existing handlers', () => {
      const cfg: any = component.uploadToolbarConfig()

      expect(cfg.extraPlugins).toBe('wsuploads')
      expect(typeof cfg.wsOnUploadImage).toBe('function')
      expect(typeof cfg.wsOnUploadFile).toBe('function')
      expect(typeof cfg.wsOnAddBlank).toBe('function')

      cfg.wsOnUploadImage()
      cfg.wsOnUploadFile()
      cfg.wsOnAddBlank()

      expect(addImageSpy).toHaveBeenCalledTimes(1)
      expect(addFileSpy).toHaveBeenCalledTimes(1)
      expect(addBlankSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('initiateConfig() / allConfig()', () => {
    it('adds the wsuploads plugin to both the basic and advanced configs', () => {
      component.initiateConfig()
      component.allConfig()

      expect(component.config.extraPlugins).toBe('wsuploads')
      expect(component.configsecond.extraPlugins).toBe('wsuploads')
    })
  })

  describe('registerUploadPlugin()', () => {
    function stubCkeditor() {
      const added: { name?: string; def?: any } = {}
      ;(global as any).CKEDITOR = {
        plugins: {
          add: jest.fn((name: string, def: any) => {
            added.name = name
            added.def = def
          }),
        },
      }
      return added
    }

    it('registers a single "wsuploads" plugin that adds the three insert-group buttons', () => {
      const added = stubCkeditor()

      component.registerUploadPlugin()

      expect((global as any).CKEDITOR.plugins.add).toHaveBeenCalledTimes(1)
      expect(added.name).toBe('wsuploads')

      // Drive the plugin init with a fake editor and assert the commands + buttons it creates.
      const commands: Record<string, any> = {}
      const fakeEditor: any = {
        config: {
          wsOnUploadImage: jest.fn(),
          wsOnUploadFile: jest.fn(),
          wsOnAddBlank: jest.fn(),
        },
        addCommand: jest.fn((name: string, def: any) => (commands[name] = def)),
        ui: { addButton: jest.fn() },
      }
      added.def.init(fakeEditor)

      expect(fakeEditor.ui.addButton).toHaveBeenCalledWith(
        'WsUploadImage',
        expect.objectContaining({ command: 'wsUploadImageCmd', toolbar: 'insert' }),
      )
      expect(fakeEditor.ui.addButton).toHaveBeenCalledWith(
        'WsUploadFile',
        expect.objectContaining({ command: 'wsUploadFileCmd', toolbar: 'insert' }),
      )
      expect(fakeEditor.ui.addButton).toHaveBeenCalledWith(
        'WsAddBlank',
        expect.objectContaining({ command: 'wsAddBlankCmd', toolbar: 'insert' }),
      )

      // Executing the image command must invoke the per-instance handler from editor config.
      commands['wsUploadImageCmd'].exec(fakeEditor)
      expect(fakeEditor.config.wsOnUploadImage).toHaveBeenCalledTimes(1)
    })

    it('injects a stylesheet with data-URI backgrounds for the three button icons', () => {
      stubCkeditor()

      component.registerUploadPlugin()

      const style = document.getElementById('ws-ck-upload-icons')
      expect(style).not.toBeNull()
      const css = style!.textContent || ''
      expect(css).toContain('.cke_button__wsuploadimage_icon')
      expect(css).toContain('.cke_button__wsuploadfile_icon')
      expect(css).toContain('.cke_button__wsaddblank_icon')
      expect(css).toContain('data:image/svg+xml;base64,')
      expect(css).toContain('!important')
    })

    it('is idempotent - does not re-register the plugin on repeated calls', () => {
      stubCkeditor()

      component.registerUploadPlugin()
      component.registerUploadPlugin()

      expect((global as any).CKEDITOR.plugins.add).toHaveBeenCalledTimes(1)
    })

    it('no-ops safely when CKEDITOR is unavailable', () => {
      expect((global as any).CKEDITOR).toBeUndefined()
      expect(() => component.registerUploadPlugin()).not.toThrow()
      expect((PlainCKEditorComponent as any).uploadPluginRegistered).toBe(false)
    })
  })

  describe('insertImageHtml()', () => {
    it('focuses the editor, inserts a well-formed img, and emits the new content', () => {
      const editor: any = {
        focus: jest.fn(),
        insertHtml: jest.fn(),
        getData: jest.fn().mockReturnValue('<p><img src="x"></p>'),
      }
      component.editorInstance = editor
      const emitted: string[] = []
      component.value.subscribe(v => emitted.push(v))

      component.insertImageHtml('/content/asset/pic.png')

      // Focus must happen before insertHtml (the dialog stole focus → no selection otherwise).
      expect(editor.focus).toHaveBeenCalled()
      expect(editor.insertHtml).toHaveBeenCalledTimes(1)
      const html = editor.insertHtml.mock.calls[0][0]
      expect(html).toMatch(/^<img alt="" src=".+" \/>$/)
      // The plain asset URL is inserted as-is (so the <img> loads immediately); it is NOT
      // wrapped in the AUTHORING_CONTENT_BASE proxy/encoded form, which failed to render.
      expect(html).toContain('src="/content/asset/pic.png"')
      // Content is synced from the editor and propagated to the parent.
      expect(emitted.length).toBeGreaterThan(0)
    })

    it('no-ops when there is no editor instance', () => {
      component.editorInstance = null
      expect(() => component.insertImageHtml('/x.png')).not.toThrow()
    })

    it('destroys an orphan editor bound to the same host before creating a new one', () => {
      const host = {}
      const orphan = { element: { $: host }, destroy: jest.fn() }
      const other = { element: { $: {} }, destroy: jest.fn() }
      ;(global as any).CKEDITOR = { instances: { editor1: orphan, editor2: other } }
      ;(component as any).destroyEditorsOnHost(host)

      // Only the instance bound to this exact host element is destroyed.
      expect(orphan.destroy).toHaveBeenCalledWith(true)
      expect(other.destroy).not.toHaveBeenCalled()
    })

    it('restores the caret captured at click time, then inserts', () => {
      const bookmarks = [{ startOffset: 3 }]
      const selection = {
        getRanges: jest.fn().mockReturnValue([{}]),
        createBookmarks2: jest.fn().mockReturnValue(bookmarks),
        selectBookmarks: jest.fn(),
      }
      const editor: any = {
        getSelection: jest.fn().mockReturnValue(selection),
        focus: jest.fn(),
        fire: jest.fn(),
        insertHtml: jest.fn(),
        setData: jest.fn((_d: string, opts: any) => opts && opts.callback && opts.callback()),
        getData: jest.fn().mockReturnValue(''),
      }
      component.editorInstance = editor

      // Simulate the button click snapshotting the selection before the file dialog opens.
      ;(component as any).captureEditorSelection()
      expect(selection.createBookmarks2).toHaveBeenCalledWith(true)

      component.insertImageHtml('/x.png')

      expect(selection.selectBookmarks).toHaveBeenCalledWith(bookmarks)
      expect(editor.insertHtml).toHaveBeenCalledTimes(1)
    })

    it('falls back to the end of the editable when no caret was captured', () => {
      const range = { moveToElementEditEnd: jest.fn() }
      const selection = { selectRanges: jest.fn() }
      const editable = {}
      const editor: any = {
        getSelection: jest.fn().mockReturnValue(selection),
        editable: jest.fn().mockReturnValue(editable),
        createRange: jest.fn().mockReturnValue(range),
        focus: jest.fn(),
        fire: jest.fn(),
        insertHtml: jest.fn(),
        setData: jest.fn((_d: string, opts: any) => opts && opts.callback && opts.callback()),
        getData: jest.fn().mockReturnValue(''),
      }
      component.editorInstance = editor

      // No captureEditorSelection() call → savedBookmarks stays null → fallback path.
      component.insertImageHtml('/x.png')

      expect(range.moveToElementEditEnd).toHaveBeenCalledWith(editable)
      expect(selection.selectRanges).toHaveBeenCalledWith([range])
      expect(editor.insertHtml).toHaveBeenCalledTimes(1)
    })
  })
})
