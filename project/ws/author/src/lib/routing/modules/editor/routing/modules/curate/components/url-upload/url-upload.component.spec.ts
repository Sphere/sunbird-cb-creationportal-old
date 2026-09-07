import { FormBuilder } from '@angular/forms'
import { Subject, of } from 'rxjs'
import { UrlUploadComponent } from './url-upload.component'

describe('UrlUploadComponent', () => {
  let component: UrlUploadComponent
  let contentService: any
  let configSvc: any
  let initService: any
  let editorService: any
  let changeActiveCont$: Subject<string>
  let logSpy: jest.SpyInstance

  const meta = (over: any = {}) => ({
    artifactUrl: '',
    mimeType: 'application/html',
    isIframeSupported: 'No',
    isInIntranet: false,
    isExternal: true,
    versionKey: 'v1',
    contentType: 'Resource',
    category: 'Resource',
    ...over,
  })

  const authConfigEntry = () => ({
    type: 'string',
    defaultValue: { Resource: [{ value: '' }] },
  })

  const build = () => {
    const c = new UrlUploadComponent(new FormBuilder(), contentService, configSvc, initService, editorService)
    return c
  }

  const storedMeta = () => {
    const calls = contentService.setUpdatedMeta.mock.calls
    return calls[calls.length - 1][0]
  }

  beforeEach(() => {
    changeActiveCont$ = new Subject<string>()
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    contentService = {
      currentContent: 'do_1',
      changeActiveCont: changeActiveCont$,
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      getOriginalMeta: jest.fn().mockReturnValue(meta()),
      setUpdatedMeta: jest.fn(),
    }
    configSvc = {
      instanceConfig: {
        authoring: {
          urlPatternMatching: [
            { pattern: 'youtube\\.com', source: 'youtube', allowIframe: true },
            { pattern: 'vimeo\\.com', source: 'vimeo', allowIframe: false },
          ],
        },
      },
    }
    initService = {
      authConfig: {
        artifactUrl: authConfigEntry(),
        mimeType: authConfigEntry(),
        isIframeSupported: authConfigEntry(),
        isInIntranet: { type: 'boolean', defaultValue: { Resource: [{ value: false }] } },
        isExternal: { type: 'boolean', defaultValue: { Resource: [{ value: false }] } },
        versionKey: authConfigEntry(),
      },
    }
    editorService = {
      checkReadAPI: jest.fn().mockReturnValue(of({ result: { content: { isIframeSupported: 'Yes' } } })),
      updateContentV3: jest.fn().mockReturnValue(of({ ok: true })),
    }

    component = build()
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.canUpdate).toBe(true)
    expect(component.isCreatorEnable).toBe(true)
    expect(component.isCollectionEditor).toBe(false)
  })

  describe('ngOnInit', () => {
    it('takes the current content off the editor store', () => {
      component.ngOnInit()

      expect(component.currentContent).toBe('do_1')
    })

    it('re-reads the iframe support when the active content changes', () => {
      component.ngOnInit()

      changeActiveCont$.next('do_2')

      expect(component.currentContent).toBe('do_2')
      expect(component.setIframeVal).toBe('')
      expect(editorService.checkReadAPI).toHaveBeenCalledWith('do_2')
      expect(component.urlUploadForm.value.isIframeSupported).toBe('Yes')
    })

    it('leaves the form alone when the read api returns nothing', () => {
      editorService.checkReadAPI.mockReturnValue(of(null))
      component.ngOnInit()

      changeActiveCont$.next('do_2')

      expect(component.urlUploadForm).toBeUndefined()
    })
  })

  describe('triggerDataChange', () => {
    beforeEach(() => component.ngOnInit())

    it('builds the form from the updated meta', () => {
      component.triggerDataChange('Yes')

      expect(component.urlUploadForm.value).toMatchObject({
        artifactUrl: '',
        mimeType: 'application/html',
        isIframeSupported: 'Yes',
        isExternal: true,
        versionKey: 'v1',
      })
    })

    it('only edits resources inside a collection editor', () => {
      component.isCollectionEditor = true
      contentService.getUpdatedMeta.mockReturnValue(meta({ category: 'Collection' }))

      component.triggerDataChange('Yes')

      expect(component.urlUploadForm).toBeUndefined()
    })

    it('edits a resource inside a collection editor', () => {
      component.isCollectionEditor = true

      component.triggerDataChange('Yes')

      expect(component.urlUploadForm).toBeTruthy()
    })
  })

  describe('assignData', () => {
    beforeEach(() => component.ngOnInit())

    it('seeds the form and leaves it pristine', () => {
      component.assignData(meta({ artifactUrl: '', isInIntranet: true }) as any)

      expect(component.urlUploadForm.value.isInIntranet).toBe(true)
      expect(component.urlUploadForm.pristine).toBe(true)
      expect(component.urlUploadForm.untouched).toBe(true)
      expect(component.canUpdate).toBe(true)
    })

    it('applies the platform defaults for a bare meta', () => {
      component.assignData({ versionKey: 'v1' } as any)

      expect(component.urlUploadForm.value.mimeType).toBe('application/html')
      expect(component.urlUploadForm.value.isInIntranet).toBe(false)
      expect(component.urlUploadForm.value.isExternal).toBe(true)
    })

    it('validates an artifact url that is already set', () => {
      const spy = jest.spyOn(component, 'check')

      component.assignData(meta({ artifactUrl: 'https://example.org/a' }) as any)

      expect(spy).toHaveBeenCalled()
    })

    it('reuses an existing form on a second assignment', () => {
      component.assignData(meta() as any)
      const form = component.urlUploadForm

      component.assignData(meta({ versionKey: 'v2' }) as any)

      expect(component.urlUploadForm).toBe(form)
      expect(component.urlUploadForm.value.versionKey).toBe('v2')
    })
  })

  describe('check', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.assignData(meta() as any)
      contentService.setUpdatedMeta.mockClear()
    })

    it('rewrites a youtube url and marks it as a url resource', () => {
      component.urlUploadForm.controls.artifactUrl.setValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')

      expect(component.urlUploadForm.value.mimeType).toBe('text/x-url')
      expect(component.urlUploadForm.value.artifactUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
      expect(component.canUpdate).toBe(true)
    })

    it('marks a youtube url with no recognisable video id as an error', () => {
      component.urlUploadForm.controls.artifactUrl.setValue('https://www.youtube.com/watch?v=abc')

      expect(component.urlUploadForm.value.artifactUrl).toBe('error')
    })

    it('treats a non-iframe source as plain html', () => {
      component.urlUploadForm.controls.artifactUrl.setValue('https://vimeo.com/12345')

      expect(component.urlUploadForm.value.mimeType).toBe('application/html')
    })

    it('leaves an unmatched url alone', () => {
      component.urlUploadForm.controls.artifactUrl.setValue('https://example.org/page')

      expect(component.urlUploadForm.value.artifactUrl).toBe('https://example.org/page')
      expect(component.urlUploadForm.value.mimeType).toBe('application/html')
    })

    it('skips pattern matching when the instance configures none', () => {
      configSvc.instanceConfig = null

      expect(() => component.check()).not.toThrow()
      expect(contentService.setUpdatedMeta).toHaveBeenCalled()
    })

    it('skips pattern matching when the authoring config has no patterns', () => {
      configSvc.instanceConfig = { authoring: {} }

      expect(() => component.check()).not.toThrow()
    })
  })

  describe('storeData', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.assignData(meta() as any)
      contentService.setUpdatedMeta.mockClear()
    })

    it('stores nothing for a form that matches the saved meta', () => {
      component.storeData()

      expect(storedMeta()).toEqual({})
    })

    it('stores only what changed, alongside the version key', () => {
      component.canUpdate = false
      component.urlUploadForm.controls.artifactUrl.setValue('https://example.org/a')
      component.canUpdate = true

      component.storeData()

      expect(storedMeta().artifactUrl).toBe('https://example.org/a')
      expect(storedMeta().versionKey).toBe('v1')
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(expect.anything(), 'do_1')
    })

    it('keeps the iframe flag only for a url resource', () => {
      component.canUpdate = false
      component.urlUploadForm.controls.mimeType.setValue('text/x-url')
      component.urlUploadForm.controls.isIframeSupported.setValue('Yes')
      component.canUpdate = true

      component.storeData()

      expect(storedMeta().isIframeSupported).toBe('Yes')
    })

    it('drops the iframe flag for a non-url resource', () => {
      component.canUpdate = false
      component.urlUploadForm.controls.artifactUrl.setValue('https://example.org/a')
      component.canUpdate = true

      component.storeData()

      expect(storedMeta().isIframeSupported).toBeUndefined()
    })

    it('falls back to the configured default when a field is cleared', () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ artifactUrl: 'https://old' }))
      component.canUpdate = false
      component.urlUploadForm.controls.artifactUrl.setValue('')
      component.canUpdate = true

      component.storeData()

      expect(storedMeta().artifactUrl).toBe('')
    })
  })

  describe('submit', () => {
    it('stores the form and asks the editor to save', () => {
      const spy = jest.fn()
      component.data.subscribe(spy)
      component.ngOnInit()
      component.assignData(meta() as any)

      component.submit()

      expect(contentService.setUpdatedMeta).toHaveBeenCalled()
      expect(spy).toHaveBeenCalledWith('save')
    })
  })

  describe('isIframeSupportedClicked', () => {
    it('pushes the iframe flag to the content api', () => {
      component.ngOnInit()
      component.assignData(meta({ isIframeSupported: 'Yes' }) as any)

      component.isIframeSupportedClicked()

      expect(editorService.updateContentV3).toHaveBeenCalledWith(
        { request: { content: { isIframeSupported: 'Yes', versionKey: 'v1' } } },
        'do_1',
      )
    })
  })

  describe('showError', () => {
    it('stays quiet for a valid control', () => {
      expect(component.showError({ invalid: false } as any)).toBe(false)
    })

    it('reports an invalid control once submit has been pressed', () => {
      component.isSubmitPressed = true

      expect(component.showError({ invalid: true, touched: false } as any)).toBe(true)
    })

    it('reports an invalid control the author has touched', () => {
      expect(component.showError({ invalid: true, touched: true } as any)).toBe(true)
    })

    it('stays quiet for an untouched invalid control before submit', () => {
      expect(component.showError({ invalid: true, touched: false } as any)).toBe(false)
    })
  })
})
