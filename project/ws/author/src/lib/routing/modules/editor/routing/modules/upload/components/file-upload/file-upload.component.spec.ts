import { FormBuilder } from '@angular/forms'
import { Subject, of } from 'rxjs'

import { FileUploadComponent } from './file-upload.component'

/**
 * FileUploadComponent is a heavy component (11 injected deps, ViewChild templates,
 * large template). Per the project testing guidance we instantiate the class
 * directly with mocked collaborators and exercise its public logic rather than
 * rendering it via TestBed. A real FormBuilder is used because the form wiring is
 * lightweight and central to most methods.
 */
describe('FileUploadComponent (direct instantiation)', () => {
  let component: FileUploadComponent
  let formBuilder: FormBuilder
  let snackBar: { openFromComponent: jest.Mock }
  let dialog: any
  let contentService: any
  let uploadService: any
  let loaderService: any
  let authInitService: any
  let valueSvc: any
  let profanityService: any
  let editorService: any
  let storeService: any

  const makeFile = (name: string, size = 10): File => ({ name, size } as unknown as File)

  beforeEach(() => {
    formBuilder = new FormBuilder()
    snackBar = { openFromComponent: jest.fn() }
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }),
      closeAll: jest.fn(),
    }
    contentService = {
      currentContent: 'content-1',
      parentContent: 'parent-1',
      changeActiveCont: new Subject<string>(),
      upDatedContent: {},
      originalContent: { 'content-1': { status: 'Draft', mimeType: 'application/pdf', artifactUrl: 'old-url' } },
      getListOfFiles: jest.fn().mockReturnValue({}),
      getListOfUpdatedIPR: jest.fn().mockReturnValue({}),
      getUpdatedMeta: jest.fn().mockReturnValue({ category: 'Resource', contentType: 'Resource' }),
      getOriginalMeta: jest.fn().mockReturnValue({ contentType: 'Resource', category: 'Resource' }),
      setUpdatedMeta: jest.fn(),
      updateListOfFiles: jest.fn(),
      updateListOfUpdatedIPR: jest.fn(),
      removeListOfFilesAndUpdatedIPR: jest.fn(),
      cleanProperties: jest.fn(x => x),
      resetOriginalMetaWithHierarchy: jest.fn(),
    }
    uploadService = { upload: jest.fn().mockReturnValue(of({ artifactUrl: 'up-url' })) }
    loaderService = { changeLoad: { next: jest.fn() } }
    authInitService = { authConfig: {} }
    valueSvc = { isXSmall$: of(false) }
    profanityService = { startProfanity: jest.fn().mockReturnValue(of({})) }
    editorService = {
      updateContentV3: jest.fn().mockReturnValue(of({ params: { status: 'successful' } })),
      readcontentV3: jest.fn().mockReturnValue(of({ result: {} })),
    }
    storeService = { uploadFileTypeValue: 'pdf', parentNode: [] }

    component = new FileUploadComponent(
      formBuilder,
      snackBar as any,
      dialog,
      contentService,
      uploadService,
      loaderService,
      authInitService,
      valueSvc,
      profanityService,
      editorService,
      storeService,
    )
  })

  it('creates', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit acceptType selection', () => {
    it('sets .pdf accept type for pdf', () => {
      storeService.uploadFileTypeValue = 'pdf'
      component.ngOnInit()
      expect(component.acceptType).toBe('.pdf')
      expect(component.fileUploadForm).toBeTruthy()
    })

    it('sets .mp3 accept type for audio', () => {
      storeService.uploadFileTypeValue = 'audio'
      component.ngOnInit()
      expect(component.acceptType).toBe('.mp3')
    })

    it('sets video accept types for video', () => {
      storeService.uploadFileTypeValue = 'video'
      component.ngOnInit()
      expect(component.acceptType).toBe('.mp4, .m4v')
    })

    it('sets .zip accept type for zip', () => {
      storeService.uploadFileTypeValue = 'zip'
      component.ngOnInit()
      expect(component.acceptType).toBe('.zip')
    })

    it('falls back to combined accept types for unknown filetype', () => {
      storeService.uploadFileTypeValue = 'other'
      component.ngOnInit()
      expect(component.acceptType).toBe('.mp3,.mp4,.pdf,.zip,.m4v')
    })

    it('reacts to changeActiveCont emissions', () => {
      component.ngOnInit()
      const spy = jest.spyOn(component, 'triggerDataChange').mockImplementation(() => {})
      contentService.changeActiveCont.next('content-2')
      expect(component.currentContent).toBe('content-2')
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('setAcceptType', () => {
    it.each([
      ['audio/mpeg', '.mp3'],
      ['video/mp4', '.mp4, .m4v'],
      ['application/pdf', '.pdf'],
      ['application/vnd.ekstep.html-archive', '.zip'],
      ['unknown/type', '.mp3,.mp4,.pdf,.zip,.m4v'],
    ])('maps %s -> %s', (mime, expected) => {
      component.setAcceptType(mime)
      expect(component.acceptType).toBe(expected)
    })
  })

  it('selectEntryPoint prefixes with slash', () => {
    component.selectEntryPoint('assets/index.html')
    expect(component.entryPoint).toBe('/assets/index.html')
  })

  it('iprChecked toggles iprAccepted and notifies content service', () => {
    component.iprAccepted = false
    component.iprChecked()
    expect(component.iprAccepted).toBe(true)
    expect(contentService.updateListOfUpdatedIPR).toHaveBeenCalledWith('content-1', true)
  })

  it('clearUploadedFile resets file state', () => {
    component.createFileUploadForm()
    component.canUpdate = false
    component.file = makeFile('a.pdf')
    component.mimeType = 'application/pdf'
    component.clearUploadedFile()
    expect(contentService.removeListOfFilesAndUpdatedIPR).toHaveBeenCalledWith('content-1')
    expect(component.file).toBeNull()
    expect(component.duration).toBe('0')
    expect(component.mimeType).toBe('')
  })

  it('closeDialog closes all dialogs', () => {
    component.closeDialog()
    expect(dialog.closeAll).toHaveBeenCalled()
  })

  it('errorMessage opens a failure snackbar', () => {
    component.errorMessage()
    expect(snackBar.openFromComponent).toHaveBeenCalled()
  })

  it('generateStreamUrl builds an azure snapshot url', () => {
    const url = component.generateStreamUrl('index1.html')
    expect(url).toContain('content-1-snapshot/index1.html')
  })

  describe('generateUrl', () => {
    beforeEach(() => {
      ;(window as any).env = { azureBucket: 'my-bucket' }
    })
    it('returns the url unchanged when it already contains the bucket', () => {
      expect(component.generateUrl('https://x/my-bucket/file.pdf')).toBe('https://x/my-bucket/file.pdf')
      expect(component.bucket).toBe('my-bucket')
    })
    it('returns undefined when the url does not contain the bucket', () => {
      expect(component.generateUrl('https://x/other/file.pdf')).toBeUndefined()
    })
  })

  describe('onDrop', () => {
    it('rejects unsupported formats with a snackbar', () => {
      component.onDrop(makeFile('bad.txt'))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('rejects files larger than the max size', () => {
      component.onDrop(makeFile('big.mp4', 5 * 1024 * 1024 * 1024))
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('opens the transcode confirm dialog for mp4 and assigns on confirm', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      const assignSpy = jest.spyOn(component, 'assignFileValues').mockImplementation(() => {})
      component.onDrop(makeFile('clip.mp4'))
      expect(dialog.open).toHaveBeenCalled()
      expect(assignSpy).toHaveBeenCalled()
    })

    it('directly assigns for pdf without a dialog', () => {
      const assignSpy = jest.spyOn(component, 'assignFileValues').mockImplementation(() => {})
      component.onDrop(makeFile('doc.pdf'))
      expect(assignSpy).toHaveBeenCalledWith(expect.anything(), 'doc.pdf')
    })
  })

  describe('assignFileValues', () => {
    beforeEach(() => {
      component.createFileUploadForm()
      component.canUpdate = false
      component.currentContent = 'content-1'
    })

    it('sets pdf mime type and does not call getDuration/extractFile', () => {
      const durationSpy = jest.spyOn(component, 'getDuration').mockImplementation(() => {})
      const extractSpy = jest.spyOn(component, 'extractFile').mockImplementation(() => {})
      component.assignFileValues(makeFile('doc.pdf'), 'doc.pdf')
      expect(component.mimeType).toBe('application/pdf')
      expect(contentService.updateListOfFiles).toHaveBeenCalled()
      expect(durationSpy).not.toHaveBeenCalled()
      expect(extractSpy).not.toHaveBeenCalled()
    })

    it('calls getDuration for video', () => {
      const durationSpy = jest.spyOn(component, 'getDuration').mockImplementation(() => {})
      component.assignFileValues(makeFile('clip.mp4'), 'clip.mp4')
      expect(component.mimeType).toBe('video/mp4')
      expect(durationSpy).toHaveBeenCalled()
    })

    it('calls extractFile for zip', () => {
      const extractSpy = jest.spyOn(component, 'extractFile').mockImplementation(() => {})
      component.assignFileValues(makeFile('archive.zip'), 'archive.zip')
      expect(component.mimeType).toBe('application/vnd.ekstep.html-archive')
      expect(extractSpy).toHaveBeenCalled()
    })

    it('blocks a mime-type change on Live content and shows a snackbar', () => {
      contentService.originalContent['content-1'] = {
        status: 'Live',
        mimeType: 'application/pdf',
        artifactUrl: 'live-url',
      }
      const iprSpy = jest.spyOn(component, 'iprChecked').mockImplementation(() => {})
      component.assignFileValues(makeFile('clip.mp4'), 'clip.mp4')
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(component.mimeType).toBe('application/pdf')
      expect(iprSpy).toHaveBeenCalled()
    })
  })

  it('assignData populates the form and marks it pristine', () => {
    component.assignData({
      artifactUrl: 'u',
      mimeType: 'application/pdf',
      size: 100,
      duration: '5',
      versionKey: 'v1',
    } as any)
    expect(component.fileUploadForm.controls.artifactUrl.value).toBe('u')
    expect(component.mimeType).toBe('application/pdf')
    expect(component.iprAccepted).toBe(true)
    expect(component.fileUploadForm.pristine).toBe(true)
  })

  it('triggerDataChange assigns data for a Resource', () => {
    const assignSpy = jest.spyOn(component, 'assignData').mockImplementation(() => {})
    component.isCollectionEditor = false
    component.triggerDataChange()
    expect(assignSpy).toHaveBeenCalled()
  })

  it('ngOnChanges triggers upload only when callSave is set', () => {
    const spy = jest.spyOn(component, 'triggerUpload').mockResolvedValue(undefined as any)
    component.callSave = false
    component.ngOnChanges()
    expect(spy).not.toHaveBeenCalled()
    component.callSave = true
    component.ngOnChanges()
    expect(spy).toHaveBeenCalled()
  })

  it('showIpr opens the ipr dialog and stores the result', () => {
    dialog.open.mockReturnValue({ afterClosed: () => of(true) })
    component.showIpr()
    expect(dialog.open).toHaveBeenCalled()
    expect(component.iprAccepted).toBe(true)
    expect(contentService.updateListOfUpdatedIPR).toHaveBeenCalledWith('content-1', true)
  })

  it('profanityCheckAPICall delegates to the profanity service', () => {
    component.file = makeFile('doc.pdf')
    component.profanityCheckAPICall('some-url')
    expect(profanityService.startProfanity).toHaveBeenCalledWith('content-1', 'some-url', 'doc.pdf')
  })

  it('storeData sets updated meta preserving versionKey', () => {
    component.createFileUploadForm()
    component.canUpdate = false
    contentService.getOriginalMeta.mockReturnValue({ versionKey: 'vk-1', contentType: 'Resource' })
    component.storeData()
    expect(contentService.setUpdatedMeta).toHaveBeenCalled()
    const [meta] = contentService.setUpdatedMeta.mock.calls[contentService.setUpdatedMeta.mock.calls.length - 1]
    expect(meta.versionKey).toBe('vk-1')
  })

  it('triggerUpload shows a snackbar when no file is selected', async () => {
    component.file = null
    await component.triggerUpload()
    expect(snackBar.openFromComponent).toHaveBeenCalled()
  })

  it('triggerUpload proceeds through update + read + upload on success', async () => {
    component.createFileUploadForm()
    component.file = makeFile('doc.pdf')
    component.mimeType = 'application/pdf'
    contentService.upDatedContent = { 'content-1': { title: 'x' } }
    const uploadSpy = jest.spyOn(component, 'upload').mockImplementation(() => {})
    await component.triggerUpload()
    expect(editorService.updateContentV3).toHaveBeenCalled()
    expect(editorService.readcontentV3).toHaveBeenCalled()
    expect(uploadSpy).toHaveBeenCalled()
  })

  it('upload posts formdata and emits save on success', () => {
    component.createFileUploadForm()
    component.canUpdate = false
    component.file = makeFile('doc.pdf')
    component.mimeType = 'application/pdf'
    const emitSpy = jest.spyOn(component.data, 'emit')
    ;(window as any).env = { azureBucket: 'my-bucket' }
    component.upload()
    expect(uploadService.upload).toHaveBeenCalled()
    expect(loaderService.changeLoad.next).toHaveBeenCalledWith(true)
    expect(emitSpy).toHaveBeenCalledWith('save')
  })
})
