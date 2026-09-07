import { Subject } from 'rxjs'

import { PlainCKEditorComponent } from './plain-ckeditor.component'

/**
 * Wave 18 — the `content` setter of PlainCKEditorComponent: the three URL-rewrite
 * modes and the caret-preserving guard around pushing data into a live editor.
 */
describe('PlainCKEditorComponent (content setter)', () => {
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

  /** A CKEditor instance stub whose data and focus state the test controls. */
  const editorStub = (over: any = {}) => ({
    status: 'ready',
    focusManager: { hasFocus: false },
    getData: jest.fn().mockReturnValue('previous'),
    setData: jest.fn(),
    ...over,
  })

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
    component = build()
  })

  afterEach(() => jest.restoreAllMocks())

  describe('rewrite modes', () => {
    it('leaves the markup untouched when both rewrites are off', () => {
      component.doRegex = false
      component.doPartialRegex = false
      component.content = '<p>plain</p>'
      expect(component.html).toBe('<p>plain</p>')
    })

    it('applies the download rewrite by default', () => {
      component.doRegex = true
      component.doPartialRegex = false
      component.content = '<p>plain</p>'
      expect(component.html).toBe('<p>plain</p>')
    })

    it('expands partial asset paths onto the content store', () => {
      component.doPartialRegex = true
      component.id = 'do_1'
      component.content = '<img src="/assets/pic.png"><a href="/assets/doc.pdf">d</a>'
      expect(component.html).toContain('content-store')
      expect(component.html).toContain('do_1')
    })
  })

  describe('pushing data into a live editor', () => {
    it('updates an unfocused editor whose data has changed', () => {
      const editor = editorStub()
      component.editorInstance = editor as any
      component.doRegex = false
      component.content = '<p>new</p>'
      expect(editor.setData).toHaveBeenCalledWith('<p>new</p>')
    })

    it('leaves a focused editor alone so the caret does not jump', () => {
      const editor = editorStub({ focusManager: { hasFocus: true } })
      component.editorInstance = editor as any
      component.doRegex = false
      component.content = '<p>new</p>'
      expect(editor.setData).not.toHaveBeenCalled()
    })

    it('skips the push when the editor already holds that markup', () => {
      const editor = editorStub({ getData: jest.fn().mockReturnValue('<p>same</p>') })
      component.editorInstance = editor as any
      component.doRegex = false
      component.content = '<p>same</p>'
      expect(editor.setData).not.toHaveBeenCalled()
    })

    it('treats an editor with no focus manager as unfocused', () => {
      const editor = editorStub({ focusManager: undefined })
      component.editorInstance = editor as any
      component.doRegex = false
      component.content = '<p>new</p>'
      expect(editor.setData).toHaveBeenCalled()
    })

    it('does not push into an editor that is not ready yet', () => {
      const editor = editorStub({ status: 'loading' })
      component.editorInstance = editor as any
      component.doRegex = false
      component.content = '<p>new</p>'
      expect(editor.setData).not.toHaveBeenCalled()
    })

    it('copes with no editor mounted at all', () => {
      component.editorInstance = undefined as any
      component.doRegex = false
      expect(() => (component.content = '<p>new</p>')).not.toThrow()
      expect(component.html).toBe('<p>new</p>')
    })
  })
})
