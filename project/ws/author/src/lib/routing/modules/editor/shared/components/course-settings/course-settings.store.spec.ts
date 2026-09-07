import { TestBed } from '@angular/core/testing'
import { FormBuilder, ReactiveFormsModule } from '@angular/forms'
import { BehaviorSubject, of, throwError } from 'rxjs'

import { CourseSettingsComponent } from './course-settings.component'

/**
 * Covers storeData and the icon-upload paths that the other course-settings specs
 * leave out.
 */
describe('CourseSettingsComponent (storeData + uploads)', () => {
  let component: CourseSettingsComponent
  let fb: FormBuilder

  let editorService: any
  let contentService: any
  let configSvc: any
  let ref: any
  let loader: any
  let authInitService: any
  let accessService: any
  let http: any
  let router: any
  let storeService: any
  let snackBar: any
  let dialog: any
  let uploadService: any

  /** authConfig entry used when storeData needs a default for a cleared field. */
  const cfgEntry = () => ({ type: 'text', defaultValue: { Course: [{ value: '' }] } })

  const build = () => {
    editorService = {
      getAllEntities: jest.fn(() => of({ result: { entity: [] } })),
      readcontentV3: jest.fn(() => of({ duration: 0, identifier: 'id', name: 'n' })),
      rolesMapped: jest.fn(() => of([])),
      sourceNames: jest.fn(() => of([])),
      fetchEmployeeList: jest.fn(() => of([])),
      updateNewContentV3: jest.fn(() => of({})),
      checkRole: jest.fn(() => of(['admin'])),
    }
    contentService = {
      parentUpdatedMeta: jest.fn(() => ({ identifier: 'parent1' })),
      getUpdatedMeta: jest.fn(() => ({ identifier: 'id' })),
      getOriginalMeta: jest.fn(() => ({ contentType: 'Course', versionKey: 'vk-1' })),
      setUpdatedMeta: jest.fn(),
      hasAccess: jest.fn(() => true),
      checkCondition: jest.fn(() => true),
      isPresent: jest.fn(() => false),
      changeActiveCont: new BehaviorSubject<string>('id'),
      currentContentID: '',
      currentContentData: null,
      parentContent: 'parent1',
    }
    configSvc = {
      userProfile: { userId: 'u1', givenName: 'User One' },
      instanceConfig: { authoring: { urlPatternMatching: [] }, logos: { defaultContent: 'default.png' } },
      activeLocale: { locals: ['en'] },
    }
    ref = { detach: jest.fn(), detectChanges: jest.fn() }
    loader = { changeLoad: { next: jest.fn() } }
    authInitService = {
      ordinals: { audience: [], jobProfile: [], region: [], accessPaths: [], complexityLevel: [], resourceType: [], categoryType: [] },
      currentPageAction: jest.fn(),
      saveData: jest.fn(),
      authConfig: {},
      isEditMetaPageAction: jest.fn(),
      uploadData: jest.fn(),
    }
    accessService = { rootOrg: 'other', userId: 'u1', userName: 'User One', authoringConfig: { doUniqueCheck: false } }
    http = { post: jest.fn(() => of({ result: { identifier: 'assetId', versionKey: 'vk' } })) }
    router = { url: '/author/editor/abc/collection', navigate: jest.fn(() => Promise.resolve(true)), events: of() }
    storeService = { parentData: null }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(false) })) }
    uploadService = { upload: jest.fn(() => of({ name: 'ok', artifactUrl: 'https://h/bucket/icon.png' })) }

    return new CourseSettingsComponent(
      fb,
      uploadService,
      snackBar,
      dialog,
      editorService,
      contentService,
      configSvc,
      ref,
      loader,
      authInitService,
      accessService,
      http,
      router,
      storeService,
    )
  }

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    TestBed.configureTestingModule({ imports: [ReactiveFormsModule] })
    fb = TestBed.inject(FormBuilder)
    component = build()
    component.createForm()
    component.contentMeta = { identifier: 'id' } as any
    component.isEditEnabled = true
    ;(window as any).env = { azureBucket: 'bucket' }
  })

  afterEach(() => {
    if (component && component.timer) {
      clearInterval(component.timer)
    }
    jest.restoreAllMocks()
  })

  describe('storeData', () => {
    // The form has many empty controls; storeData looks up a configured default for
    // each cleared field, so every key has to resolve or it throws into the catch.
    beforeEach(() => {
      authInitService.authConfig = new Proxy({}, { get: () => cfgEntry() })
      // canExpiry defaults to true, which would dereference the (null) expiryDate.
      component.canExpiry = false
    })

    it('does nothing when editing is disabled', () => {
      component.isEditEnabled = false
      component.storeData()
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })

    it('does nothing when there is no original meta', () => {
      contentService.getOriginalMeta.mockReturnValue(undefined)
      component.storeData()
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })

    it('writes only the changed fields and preserves the original versionKey', () => {
      component.contentForm.controls.name.setValue('New Name')

      component.storeData()

      expect(contentService.setUpdatedMeta).toHaveBeenCalledTimes(1)
      const [meta, id] = contentService.setUpdatedMeta.mock.calls[0]
      expect(id).toBe('id')
      expect(meta.name).toBe('New Name')
      expect(meta.versionKey).toBe('vk-1')
    })

    it('normalises a null rolesMapped to an empty list', () => {
      component.contentForm.controls.rolesMapped.setValue(null)
      component.storeData()
      expect(component.contentForm.value.rolesMapped).toEqual([])
    })

    // storeData only emits fields that DIFFER from the original, so a value that is
    // carried across from the original ends up absent from the payload — which is
    // exactly what stops it being overwritten server-side.
    it('leaves the artifact and mime type out of the payload for an exempt mime type', () => {
      contentService.getOriginalMeta.mockReturnValue({
        contentType: 'Course',
        mimeType: 'application/json',
        artifactUrl: 'orig.json',
        versionKey: 'vk-1',
      })
      component.contentForm.controls.name.setValue('X')

      component.storeData()

      const meta = contentService.setUpdatedMeta.mock.calls[0][0]
      expect(meta.artifactUrl).toBeUndefined()
      expect(meta.mimeType).toBeUndefined()
    })

    it('does blank the artifact url for a non-exempt mime type', () => {
      contentService.getOriginalMeta.mockReturnValue({
        contentType: 'Course',
        mimeType: 'text/x-url',
        artifactUrl: 'orig.html',
        versionKey: 'vk-1',
      })
      component.contentForm.controls.artifactUrl.setValue('')
      component.stage = 0

      component.storeData()

      expect(contentService.setUpdatedMeta.mock.calls[0][0].artifactUrl).toBe('')
    })

    it('carries the original duration through rather than blanking it', () => {
      contentService.getOriginalMeta.mockReturnValue({ contentType: 'Course', duration: '120', versionKey: 'vk-1' })
      component.contentForm.controls.duration.setValue('')

      component.storeData()

      expect(contentService.setUpdatedMeta.mock.calls[0][0].duration).toBeUndefined()
    })

    it('carries the original icon and thumbnail through rather than blanking them', () => {
      contentService.getOriginalMeta.mockReturnValue({
        contentType: 'Course',
        appIcon: 'icon.png',
        thumbnail: 'thumb.png',
        versionKey: 'vk-1',
      })

      component.storeData()

      const meta = contentService.setUpdatedMeta.mock.calls[0][0]
      expect(meta.appIcon).toBeUndefined()
      expect(meta.thumbnail).toBeUndefined()
    })

    it('inherits missing fields from the parent for a draft child', () => {
      contentService.getOriginalMeta.mockReturnValue({ contentType: 'Course', versionKey: 'vk-1' })
      contentService.parentUpdatedMeta.mockReturnValue({
        identifier: 'parent1',
        subTitle: 'Parent subtitle',
        body: 'Parent body',
        instructions: 'Parent instructions',
        sourceName: 'Parent source',
      })
      component.contentForm.controls.status.setValue('Draft')
      component.contentForm.controls.identifier.setValue('child1')

      component.storeData()

      const meta = contentService.setUpdatedMeta.mock.calls[0][0]
      expect(meta.subTitle).toBe('Parent subtitle')
      expect(meta.body).toBe('Parent body')
      expect(meta.instructions).toBe('Parent instructions')
      expect(meta.sourceName).toBe('Parent source')
    })

    it('does not inherit when the draft is the parent itself', () => {
      contentService.parentUpdatedMeta.mockReturnValue({ identifier: 'same', subTitle: 'Parent subtitle' })
      component.contentForm.controls.status.setValue('Draft')
      component.contentForm.controls.identifier.setValue('same')

      component.storeData()

      // No inheritance: subTitle falls back to the configured default instead.
      expect(contentService.setUpdatedMeta.mock.calls[0][0].subTitle).toBe('')
    })

    it('formats the expiry date when expiry is enabled', () => {
      component.canExpiry = true
      component.contentForm.controls.expiryDate.setValue(new Date('2030-01-02T03:04:05.000Z'))

      component.storeData()

      expect(contentService.setUpdatedMeta.mock.calls[0][0].expiryDate).toBe('20300102T030405+0000')
    })

    it('substitutes the configured default for a cleared field', () => {
      contentService.getOriginalMeta.mockReturnValue({ contentType: 'Course', name: 'Was Set', versionKey: 'vk-1' })
      component.contentForm.controls.name.setValue('')

      component.storeData()

      expect(contentService.setUpdatedMeta.mock.calls[0][0].name).toBe('')
    })

    it('drops the artifact url once past the first stage without a type', () => {
      component.stage = 1
      component.type = ''
      component.contentForm.controls.artifactUrl.setValue('a.pdf')

      component.storeData()

      expect(contentService.setUpdatedMeta.mock.calls[0][0].artifactUrl).toBeUndefined()
    })

    it('signals the settings page for a self assessment', () => {
      component.isSelfAssessment = true
      component.storeData()
      expect(authInitService.isEditMetaPageAction).toHaveBeenCalledWith('isSettingsPage')
    })

    it('warns the user when the parent has not been saved yet', () => {
      authInitService.authConfig = {}
      contentService.getOriginalMeta.mockReturnValue({ contentType: 'Course', name: 'Was Set', versionKey: 'vk-1' })
      component.contentForm.controls.name.setValue('')

      component.storeData()

      expect(snackBar.open).toHaveBeenCalledWith('Please Save Parent first and refresh page.')
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })
  })

  describe('uploadAppIcon', () => {
    const image = (name = 'pic.png', size = 1000) => {
      const f = new File(['x'], name, { type: 'image/png' })
      Object.defineProperty(f, 'size', { value: size })
      return f
    }

    it('rejects an unsupported file type', () => {
      component.uploadAppIcon(new File(['x'], 'notes.txt'))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('rejects an oversized image', () => {
      component.uploadAppIcon(image('pic.png', 50 * 1024 * 1024))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('opens the crop dialog for a valid image', () => {
      component.uploadAppIcon(image())
      expect(dialog.open).toHaveBeenCalled()
      expect(dialog.open.mock.calls[0][1].data.imageFileName).toBe('pic.png')
    })

    it('does nothing further when the crop dialog is dismissed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) })
      component.uploadAppIcon(image())
      expect(http.post).not.toHaveBeenCalled()
    })

    it('creates the asset then uploads and stores the returned url', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(image('cropped.png')) })
      const storeData = jest.spyOn(component, 'storeData').mockImplementation(() => undefined)

      component.uploadAppIcon(image())

      expect(http.post).toHaveBeenCalled()
      expect(uploadService.upload).toHaveBeenCalled()
      expect(component.contentForm.controls.appIcon.value).toBe('https://h/bucket/icon.png')
      expect(component.contentForm.controls.thumbnail.value).toBe('https://h/bucket/icon.png')
      expect(storeData).toHaveBeenCalled()
      expect(authInitService.uploadData).toHaveBeenCalledWith('thumbnail')
      expect(component.canUpdate).toBe(true)
    })

    it('generates a 16-digit asset code', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(image('cropped.png')) })
      jest.spyOn(component, 'storeData').mockImplementation(() => undefined)

      component.uploadAppIcon(image())

      expect(http.post.mock.calls[0][1].request.content.code).toMatch(/^\d{16}$/)
      expect(http.post.mock.calls[0][1].request.content.createdBy).toBe('u1')
    })

    it('surfaces an error result from the upload', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(image('cropped.png')) })
      uploadService.upload.mockReturnValue(of({ name: 'Error', message: 'too big' }))

      component.uploadAppIcon(image())

      expect(snackBar.open).toHaveBeenCalledWith('too big', undefined, { duration: 2000 })
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('reports a failed upload', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(image('cropped.png')) })
      uploadService.upload.mockReturnValue(throwError(() => new Error('nope')))

      component.uploadAppIcon(image())

      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('strips illegal characters from the file name', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(image('cropped.png')) })
      jest.spyOn(component, 'storeData').mockImplementation(() => undefined)

      component.uploadAppIcon(image('my pic!.png'))

      expect(http.post.mock.calls[0][1].request.content.name).toBe('mypic.png')
    })
  })

  describe('uploadSourceIcon', () => {
    it('rejects an unsupported file type', () => {
      component.uploadSourceIcon(new File(['x'], 'notes.txt'))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })
  })
})
