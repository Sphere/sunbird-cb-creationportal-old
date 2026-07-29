import { of, throwError } from 'rxjs'
import { HtmlComponent } from './html.component'

describe('HtmlComponent', () => {
  let component: HtmlComponent
  let snackBar: any
  let uploadService: any
  let loader: any

  beforeEach(() => {
    snackBar = { openFromComponent: jest.fn() }
    uploadService = { upload: jest.fn().mockReturnValue(of({ code: 'ok', artifactURL: 'a/b.html' })) }
    loader = { changeLoad: { next: jest.fn() } }
    component = new HtmlComponent(snackBar, uploadService, loader)
    component.content = {} as any
    component.identifier = 'id-1'
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('sets dataType to html when html is present', () => {
      const emitSpy = jest.spyOn(component.data, 'emit')
      component.content = { html: '<p>hi</p>' } as any
      component.ngOnInit()
      expect(component.dataType).toBe('html')
      expect(emitSpy).toHaveBeenCalledWith({ content: component.content, isValid: true })
    })

    it('renders template via mustache and sets dataType html', () => {
      component.content = { template: 'Hi {{name}}', templateData: { name: 'Bob' } } as any
      component.ngOnInit()
      expect(component.dataType).toBe('html')
      expect(component.content.html).toContain('Hi Bob')
    })

    it('replaces escaped slashes in rendered template', () => {
      component.content = { template: '{{path}}', templateData: { path: 'a/b' } } as any
      component.ngOnInit()
      expect(component.content.html).toBe('a/b')
    })

    it('sets dataType templateUrl when templateUrl present', () => {
      component.content = { templateUrl: 'http://x/y.html' } as any
      component.ngOnInit()
      expect(component.dataType).toBe('templateUrl')
    })

    it('defaults dataType to html and emits isValid false when empty', () => {
      const emitSpy = jest.spyOn(component.data, 'emit')
      component.content = {} as any
      component.ngOnInit()
      expect(component.dataType).toBe('html')
      expect(emitSpy).toHaveBeenCalledWith({ content: component.content, isValid: false })
    })
  })

  describe('update', () => {
    it('emits merged content with new key/value', () => {
      const emitSpy = jest.spyOn(component.data, 'emit')
      component.content = { html: 'x' } as any
      component.update('templateUrl', 'http://u')
      expect(emitSpy).toHaveBeenCalledWith({
        content: { html: 'x', templateUrl: 'http://u' },
        isValid: true,
      })
    })

    it('re-renders html when template key is updated', () => {
      component.content = { template: 'Hello {{n}}', templateData: { n: 'Z' } } as any
      component.update('template', 'Hello {{n}}')
      expect(component.content.html).toContain('Hello Z')
    })

    it('re-renders html when templateData key is updated', () => {
      component.content = { template: 'V {{n}}', templateData: { n: 'Q' } } as any
      component.update('templateData', { n: 'Q' })
      expect(component.content.html).toContain('V Q')
    })
  })

  describe('upload', () => {
    const makeFile = (name: string, size = 10) => {
      const f = new File(['data'], name)
      Object.defineProperty(f, 'size', { value: size })
      return f
    }

    it('rejects a non-html file when type is html', () => {
      component.upload(makeFile('bad.txt'), 'html')
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('rejects a non-json file when type is json', () => {
      component.upload(makeFile('bad.txt'), 'json')
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('rejects a file that exceeds max size', () => {
      component.upload(makeFile('good.html', 2000 * 1024 * 1024), 'html')
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('uploads a valid html file and emits update on success', () => {
      component.content = { html: 'x' } as any
      const emitSpy = jest.spyOn(component.data, 'emit')
      component.upload(makeFile('good.html'), 'html')
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      expect(uploadService.upload).toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      expect(emitSpy).toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('uses authArtifactUrl fallback when artifactURL missing', () => {
      uploadService.upload.mockReturnValue(of({ code: 'ok', authArtifactUrl: 'auth/x.json' }))
      component.content = {} as any
      component.upload(makeFile('good.json'), 'json')
      expect(uploadService.upload).toHaveBeenCalled()
    })

    it('handles upload error by hiding loader and showing failure', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('fail')))
      component.upload(makeFile('good.html'), 'html')
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('does nothing extra when success response has no code', () => {
      uploadService.upload.mockReturnValue(of({}))
      const emitSpy = jest.spyOn(component.data, 'emit')
      component.upload(makeFile('good.html'), 'html')
      expect(emitSpy).not.toHaveBeenCalled()
    })
  })
})
