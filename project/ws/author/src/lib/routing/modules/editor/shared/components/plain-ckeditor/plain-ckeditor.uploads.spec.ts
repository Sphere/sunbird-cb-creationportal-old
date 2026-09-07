import { of, throwError } from 'rxjs'

import { PlainCKEditorComponent } from './plain-ckeditor.component'

/**
 * Covers the toolbar upload handlers the other plain-ckeditor specs leave out:
 * addImageUploadBtn, addFileUploadBtn, addBlankBtn and the theme getter.
 */
describe('PlainCKEditorComponent (toolbar uploads)', () => {
  let component: PlainCKEditorComponent
  let snackBar: any
  let uploadService: any
  let configurationSvc: any
  let accessControlSvc: any
  let loaderService: any
  let cdr: any
  let http: any

  /** The hidden <input type=file> the handlers append to the body. */
  let input: HTMLInputElement
  /** The change listener the handler wires onto that input. */
  let changeHandler: (e: any) => void

  const build = () => new PlainCKEditorComponent(snackBar, uploadService, configurationSvc, accessControlSvc, loaderService, cdr, http)

  const file = (name: string, size = 100) => {
    const f = new File(['x'], name)
    Object.defineProperty(f, 'size', { value: size })
    return f
  }

  /** Runs the change handler the component wired onto its hidden input. */
  const pick = (f: File | undefined) => {
    changeHandler({ target: { files: f ? [f] : [] } })
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    uploadService = { upload: jest.fn().mockReturnValue(of({ name: 'ok', artifactUrl: 'https://h/bucket/img.png' })) }
    configurationSvc = { prefChangeNotifier: of(null) }
    accessControlSvc = { locale: 'en', userId: 'u1', userName: 'User One' }
    loaderService = { changeLoad: { next: jest.fn() } }
    cdr = { detach: jest.fn(), detectChanges: jest.fn() }
    http = { post: jest.fn().mockReturnValue(of({ result: { identifier: 'assetId' } })) }

    component = build()
    component.id = 'content1'
    component.location = '/web-hosted'

    // Capture the input the handler appends, and neutralise the click that would
    // otherwise try to open a real file dialog.
    jest.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => undefined)
    jest.spyOn(HTMLInputElement.prototype, 'addEventListener').mockImplementation((evt: string, cb: any) => {
      if (evt === 'change') {
        changeHandler = cb
      }
    })
    jest.spyOn(document.body, 'appendChild').mockImplementation((el: any) => {
      input = el
      return el
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('addImageUploadBtn', () => {
    beforeEach(() => {
      jest.spyOn(component as any, 'captureEditorSelection').mockImplementation(() => undefined)
    })

    it('appends a hidden image picker and opens it', () => {
      component.addImageUploadBtn()
      expect(input.getAttribute('type')).toBe('file')
      expect(input.getAttribute('accept')).toContain('.png')
      expect(input.style.display).toBe('none')
      expect((component as any).captureEditorSelection).toHaveBeenCalled()
    })

    it('does nothing when no file is chosen', () => {
      component.addImageUploadBtn()
      pick(undefined)
      expect(http.post).not.toHaveBeenCalled()
    })

    it('rejects an unsupported extension', () => {
      component.addImageUploadBtn()
      pick(file('notes.txt'))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(http.post).not.toHaveBeenCalled()
    })

    it('rejects an oversized image', () => {
      component.addImageUploadBtn()
      pick(file('big.png', 50 * 1024 * 1024))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(http.post).not.toHaveBeenCalled()
    })

    it('creates the asset then uploads and inserts the image', () => {
      const insert = jest.spyOn(component, 'insertImageHtml').mockImplementation(() => undefined)
      component.doRegex = true

      component.addImageUploadBtn()
      pick(file('pic.png'))

      expect(http.post).toHaveBeenCalled()
      expect(uploadService.upload).toHaveBeenCalled()
      expect(insert).toHaveBeenCalledWith('https://h/bucket/img.png')
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('strips the host from the url when regex rewriting is off', () => {
      const insert = jest.spyOn(component, 'insertImageHtml').mockImplementation(() => undefined)
      component.doRegex = false

      component.addImageUploadBtn()
      pick(file('pic.png'))

      expect(insert).toHaveBeenCalledWith('/bucket/img.png')
    })

    it('sanitises the asset name and generates a 16-digit code', () => {
      jest.spyOn(component, 'insertImageHtml').mockImplementation(() => undefined)

      component.addImageUploadBtn()
      pick(file('my pic!.png'))

      const content = http.post.mock.calls[0][1].request.content
      expect(content.name).toBe('mypic.png')
      expect(content.code).toMatch(/^\d{16}$/)
      expect(content.createdBy).toBe('u1')
      expect(content.creator).toBe('User One')
    })

    it('surfaces an error result from the upload', () => {
      uploadService.upload.mockReturnValue(of({ name: 'Error', message: 'rejected' }))

      component.addImageUploadBtn()
      pick(file('pic.png'))

      expect(snackBar.open).toHaveBeenCalledWith('rejected', undefined, { duration: 2000 })
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('reports a failed upload', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('nope')))

      component.addImageUploadBtn()
      pick(file('pic.png'))

      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  describe('addFileUploadBtn', () => {
    it('appends a hidden zip picker and opens it', () => {
      component.addFileUploadBtn()
      expect(input.getAttribute('type')).toBe('file')
      expect(input.getAttribute('accept')).toBe('.zip')
    })

    it('does nothing when no file is chosen', () => {
      component.addFileUploadBtn()
      pick(undefined)
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('rejects a non-zip file', () => {
      component.addFileUploadBtn()
      pick(file('notes.txt'))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('rejects an oversized zip', () => {
      component.addFileUploadBtn()
      pick(file('big.zip', 1001 * 1024 * 1024))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('accepts a valid zip', () => {
      component.addFileUploadBtn()
      expect(() => pick(file('bundle.zip'))).not.toThrow()
    })
  })

  describe('addBlankBtn', () => {
    it('inserts an underlined blank into the editor', () => {
      const insertHtml = jest.fn()
      component.editorInstance = { insertHtml } as any

      component.addBlankBtn()

      expect(insertHtml).toHaveBeenCalledWith(' <input style="border-style:none none solid none"> ')
    })

    it('is safe with no live editor', () => {
      component.editorInstance = null
      expect(() => component.addBlankBtn()).not.toThrow()
    })
  })

  describe('theme getter', () => {
    it('converts the computed background colour into a hex string', () => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ backgroundColor: 'rgb(17, 34, 51)' } as any)
      expect(component.theme).toBe('#112233')
    })

    it('handles an rgba background', () => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ backgroundColor: 'rgba(255, 255, 255, 1)' } as any)
      expect(component.theme).toBe('#ffffff')
    })
  })
})
