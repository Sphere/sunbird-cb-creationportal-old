import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { EditMetaComponent } from './edit-meta.component'

/**
 * Wave 18 — `uploadAppIcon`'s format, size and resolution guards, and the crop /
 * upload chain in `openThumbnailCropDialog`.
 */
describe('EditMetaComponent (thumbnail upload)', () => {
  let component: EditMetaComponent
  let snackBar: any
  let dialog: any
  let uploadService: any
  let loader: any
  let http: any
  let authInitService: any
  let afterClosed: Subject<any>

  /** A file the component only ever inspects the name and size of. */
  const imageFile = (name = 'icon.png', size = 1000) => ({ name, size }) as File
  const cropped = () => new File(['bytes'], 'icon.png', { type: 'image/png' })

  /**
   * Drives the FileReader / Image chain the resolution check depends on. Both the
   * read and the decode complete on later ticks, so settleImage() below drains them.
   */
  const withImage = (width: number, height: number) => {
    class StubReader {
      result = 'data:image/png;base64,xxx'
      onload: any
      readAsDataURL() {
        setTimeout(() => this.onload && this.onload(), 0)
      }
    }
    class StubImage {
      width = width
      height = height
      onload: any
      set src(_v: string) {
        // The component assigns src before onload, so fire on a later tick.
        setTimeout(() => this.onload && this.onload(), 0)
      }
    }
    ;(global as any).FileReader = StubReader
    ;(global as any).Image = StubImage
  }

  /** Drains the reader and decode ticks the resolution check waits on. */
  const settleImage = () => {
    jest.runOnlyPendingTimers()
    jest.runOnlyPendingTimers()
  }

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  beforeEach(() => {
    jest.useFakeTimers()
    afterClosed = new Subject<any>()
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    uploadService = { upload: jest.fn().mockReturnValue(of({ name: 'ok', artifactUrl: 'https://cdn/bucket/i.png' })) }
    loader = { changeLoad: { next: jest.fn() } }
    http = { post: jest.fn().mockReturnValue(of({ result: { identifier: 'asset_1' } })) }
    authInitService = {
      ordinals: { audience: [], jobProfile: [], region: [], accessPaths: [], complexityLevel: [] },
      authConfig: {},
      currentPageAction: jest.fn(),
      saveData: jest.fn(),
      uploadData: jest.fn(),
    }
    ;(window as any).env = { azureBucket: 'bucket' }

    component = new EditMetaComponent(
      new FormBuilder(),
      uploadService,
      snackBar,
      dialog,
      {
        languageList: jest.fn().mockReturnValue(of([])),
        fetchEmployeeList: jest.fn().mockReturnValue(of([])),
        readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_1', children: [] })),
        updateNewContentV3: jest.fn().mockReturnValue(of({})),
        checkReadAPI: jest.fn().mockReturnValue(of({ result: { content: {} } })),
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
        checkRole: jest.fn().mockReturnValue(of([])),
      } as any,
      {
        changeActiveCont: new Subject<any>(),
        getUpdatedMeta: jest.fn().mockReturnValue({ identifier: 'do_1' }),
        getOriginalMeta: jest.fn().mockReturnValue(undefined),
        hasAccess: jest.fn().mockReturnValue(true),
        setUpdatedMeta: jest.fn(),
        parentUpdatedMeta: jest.fn().mockReturnValue({ identifier: 'parent_1' }),
        checkCondition: jest.fn().mockReturnValue(false),
        isPresent: jest.fn().mockReturnValue(false),
        currentContentData: null,
        currentContentID: null,
      } as any,
      {
        userProfile: { userId: 'u1' },
        instanceConfig: { logos: { defaultContent: 'default.png' }, authoring: {} },
        activeLocale: { locals: ['en'] },
      } as any,
      { detach: jest.fn(), detectChanges: jest.fn() } as any,
      loader,
      authInitService,
      { rootOrg: 'sunbird', userId: 'u1', userName: 'User One', authoringConfig: { doUniqueCheck: false } } as any,
      http,
      { url: '/author/editor/do_1/details' } as any,
    )
    component.createForm()
    component.contentMeta = { identifier: 'do_1' } as any
  })

  afterEach(() => {
    clearInterval((component as any).timer)
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('guards', () => {
    it('rejects a file that is not an image', () => {
      component.uploadAppIcon(imageFile('notes.txt'))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('rejects an oversized image', () => {
      component.uploadAppIcon(imageFile('icon.png', 100 * 1024 * 1024))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('rejects an image below the minimum resolution', () => {
      withImage(400, 200)
      component.uploadAppIcon(imageFile())
      settleImage()
      expect(snackBar.open).toHaveBeenCalledWith(expect.stringContaining('at least 760 x 400 px'), undefined, expect.anything())
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('opens the crop dialog for a large enough image', () => {
      withImage(1024, 768)
      component.uploadAppIcon(imageFile())
      settleImage()
      expect(dialog.open).toHaveBeenCalled()
    })
  })

  describe('the crop and upload chain', () => {
    const openCrop = () => {
      withImage(1024, 768)
      component.uploadAppIcon(imageFile())
      settleImage()
    }

    it('uploads the cropped image and fills the form', () => {
      openCrop()
      afterClosed.next(cropped())
      expect(http.post).toHaveBeenCalled()
      expect(uploadService.upload).toHaveBeenCalled()
      expect(component.contentForm.controls.appIcon.value).toContain('i.png')
      expect(authInitService.uploadData).toHaveBeenCalledWith('thumbnail')
    })

    it('does nothing when the crop is cancelled', () => {
      openCrop()
      afterClosed.next(undefined)
      expect(http.post).not.toHaveBeenCalled()
    })

    it('surfaces the message on an error payload', () => {
      uploadService.upload.mockReturnValue(of({ name: 'Error', message: 'too big' }))
      openCrop()
      afterClosed.next(cropped())
      expect(snackBar.open).toHaveBeenCalledWith('too big', undefined, { duration: 2000 })
    })

    it('notifies a failure when the upload rejects', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('network')))
      openCrop()
      afterClosed.next(cropped())
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })
})
