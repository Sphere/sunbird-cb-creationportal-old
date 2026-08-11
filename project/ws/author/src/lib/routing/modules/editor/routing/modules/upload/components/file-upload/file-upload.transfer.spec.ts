import { FormBuilder } from '@angular/forms'
import { Subject, of, throwError } from 'rxjs'

import { FileUploadComponent } from './file-upload.component'

/**
 * Wave 18 — the transfer half of FileUploadComponent: the confirmation dialogs in
 * `onDrop`, `triggerUpload`, `upload`, `getDuration`, `generateStreamUrl` and
 * `processAndShowResult`. Direct instantiation, as with the sibling spec.
 */
describe('FileUploadComponent (transfer)', () => {
  let component: FileUploadComponent
  let formBuilder: FormBuilder
  let snackBar: any
  let dialog: any
  let contentService: any
  let uploadService: any
  let loaderService: any
  let authInitService: any
  let valueSvc: any
  let profanityService: any
  let editorService: any
  let storeService: any
  let afterClosed: Subject<any>

  /** A real File — upload() hands this straight to FormData.append. */
  const makeFile = (name: string, size = 10): File => {
    const file = new File(['x'], name)
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
    ;(console.error as jest.Mock).mockRestore()
  })

  beforeEach(() => {
    afterClosed = new Subject<any>()
    formBuilder = new FormBuilder()
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }),
      closeAll: jest.fn(),
    }
    contentService = {
      currentContent: 'content-1',
      parentContent: 'parent-1',
      changeActiveCont: new Subject<string>(),
      upDatedContent: { 'content-1': { name: 'R', category: 'Resource' } },
      originalContent: { 'content-1': { status: 'Draft', mimeType: 'application/pdf', artifactUrl: 'old-url' } },
      getListOfFiles: jest.fn().mockReturnValue({}),
      getListOfUpdatedIPR: jest.fn().mockReturnValue({}),
      getUpdatedMeta: jest.fn().mockReturnValue({ category: 'Resource', contentType: 'Resource' }),
      getOriginalMeta: jest.fn().mockReturnValue({ contentType: 'Resource', category: 'Resource' }),
      setUpdatedMeta: jest.fn(),
      updateListOfFiles: jest.fn(),
      updateListOfUpdatedIPR: jest.fn(),
      removeListOfFilesAndUpdatedIPR: jest.fn(),
      cleanProperties: jest.fn((x: any) => ({ ...x })),
      resetOriginalMetaWithHierarchy: jest.fn(),
    }
    uploadService = { upload: jest.fn().mockReturnValue(of({ artifactUrl: 'https://cdn/bucket/f.pdf' })) }
    loaderService = { changeLoad: { next: jest.fn() } }
    authInitService = {
      authConfig: new Proxy({}, { get: () => ({ type: 'string', defaultValue: { Resource: [{ value: '' }] } }) }),
    }
    valueSvc = { isXSmall$: of(false) }
    profanityService = { startProfanity: jest.fn().mockReturnValue(of({})) }
    editorService = {
      updateContentV3: jest.fn().mockReturnValue(of({ params: { status: 'successful' } })),
      readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'parent-1', children: [] })),
    }
    storeService = { uploadFileTypeValue: 'pdf', parentNode: [] }
    ;(window as any).env = { azureBucket: 'bucket' }

    component = new FileUploadComponent(
      formBuilder,
      snackBar,
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
    component.currentContent = 'content-1'
    component.createForm()
  })

  afterEach(() => jest.clearAllMocks())

  // ----------------------------------------------------------------- onDrop --

  describe('onDrop confirmations', () => {
    beforeEach(() => {
      jest.spyOn(component, 'assignFileValues').mockImplementation(() => undefined)
      component.acceptedType = '.mp4'
    })

    it('warns about transcoding before accepting an mp4', () => {
      component.onDrop(makeFile('clip.mp4'))
      expect(dialog.open).toHaveBeenCalled()
      expect(component.assignFileValues).not.toHaveBeenCalled()
      afterClosed.next(true)
      expect(component.assignFileValues).toHaveBeenCalled()
    })

    it('abandons the video when the warning is dismissed', () => {
      component.onDrop(makeFile('clip.mp4'))
      afterClosed.next(false)
      expect(component.assignFileValues).not.toHaveBeenCalled()
    })

    it('accepts a SCORM package once every box is ticked', () => {
      component.acceptedType = '.zip'
      component.onDrop(makeFile('pkg.zip'))
      component.fileUploadCondition = {
        fileName: true,
        iframe: true,
        eval: true,
        preview: true,
        externalReference: true,
        url: '',
      } as any
      afterClosed.next(undefined)
      expect(component.assignFileValues).toHaveBeenCalled()
    })

    it('discards a SCORM package when a box is left unticked', () => {
      component.acceptedType = '.zip'
      component.onDrop(makeFile('pkg.zip'))
      afterClosed.next(undefined)
      expect(component.assignFileValues).not.toHaveBeenCalled()
    })

    it('accepts a PDF without any confirmation', () => {
      component.acceptedType = '.pdf'
      component.onDrop(makeFile('doc.pdf'))
      expect(dialog.open).not.toHaveBeenCalled()
      expect(component.assignFileValues).toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------- triggerUpload --

  describe('triggerUpload', () => {
    beforeEach(() => {
      jest.spyOn(component, 'storeData').mockImplementation(() => undefined)
      jest.spyOn(component, 'upload').mockImplementation(() => undefined)
      jest.spyOn(component, 'errorMessage').mockImplementation(() => undefined)
      component.file = makeFile('doc.pdf')
      component.mimeType = 'application/pdf'
    })

    it('saves the metadata then hands over to the uploader', async () => {
      await component.triggerUpload()
      expect(editorService.updateContentV3).toHaveBeenCalled()
      expect(contentService.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
      expect(component.upload).toHaveBeenCalled()
    })

    it('drops the category from the outgoing metadata', async () => {
      await component.triggerUpload()
      const [body] = editorService.updateContentV3.mock.calls[0]
      expect(body.request.content.category).toBeUndefined()
    })

    it('marks a module payload as a parent node', async () => {
      contentService.getOriginalMeta.mockReturnValue({ category: 'CourseUnit' })
      await component.triggerUpload()
      expect(component.upload).toHaveBeenCalled()
    })

    it('reports an error when the metadata save fails', async () => {
      editorService.updateContentV3.mockReturnValue(of({ params: { status: 'failed' } }))
      await component.triggerUpload()
      expect(component.errorMessage).toHaveBeenCalled()
      expect(component.upload).not.toHaveBeenCalled()
    })

    it('reports an error when the metadata save rejects', async () => {
      editorService.updateContentV3.mockReturnValue(throwError(() => new Error('boom')))
      await component.triggerUpload()
      expect(component.errorMessage).toHaveBeenCalled()
    })

    it('reports an error when the hierarchy cannot be re-read', async () => {
      editorService.readcontentV3.mockReturnValue(throwError(() => new Error('boom')))
      await component.triggerUpload()
      expect(component.errorMessage).toHaveBeenCalled()
      expect(component.upload).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------------- upload --

  describe('upload', () => {
    beforeEach(() => {
      jest.spyOn(component, 'storeData').mockImplementation(() => undefined)
      jest.spyOn(component, 'profanityCheckAPICall').mockImplementation(() => undefined)
      jest.spyOn(component, 'generateStreamUrl').mockReturnValue('https://stream/x')
      component.file = makeFile('doc.pdf')
      component.duration = '120'
    })

    it('stores the bucket url of an uploaded PDF and runs the profanity check', () => {
      component.mimeType = 'application/pdf'
      component.upload()
      expect(component.fileUploadForm.controls.artifactUrl.value).toBe('https://cdn/bucket/f.pdf')
      expect(component.fileUploadForm.controls.downloadUrl.value).toBe('https://cdn/bucket/f.pdf')
      expect(component.fileUploadForm.controls.duration.value).toBe('120')
      expect(component.profanityCheckAPICall).toHaveBeenCalledWith('https://cdn/bucket/f.pdf')
      expect(component.canUpdate).toBe(true)
      expect(component.storeData).toHaveBeenCalled()
    })

    it('starts transcoding for an uploaded video', () => {
      component.mimeType = 'video/mp4'
      component.file = makeFile('clip.mp4')
      uploadService.upload.mockReturnValue(of({ artifactUrl: 'https://cdn/bucket/clip.mp4' }))
      component.upload()
      expect(component.fileUploadForm.controls.transcoding.value).toEqual({
        lastTranscodedOn: null,
        retryCount: 0,
        status: 'STARTED',
      })
      expect(component.profanityCheckAPICall).not.toHaveBeenCalled()
    })

    it('stores the raw url of a SCORM package with its entry point', () => {
      component.mimeType = 'application/vnd.ekstep.html-archive'
      component.file = makeFile('pkg.zip')
      component.entryPoint = 'index.html'
      component.fileUploadCondition = { url: 'https://host/pkg' } as any
      uploadService.upload.mockReturnValue(of({ artifactUrl: 'https://elsewhere/pkg.zip' }))
      component.upload()
      expect(component.fileUploadForm.controls.artifactUrl.value).toBe('https://elsewhere/pkg.zip')
      expect(component.fileUploadForm.controls.isExternal.value).toBe(false)
      expect(component.fileUploadForm.controls.streamingUrl.value).toBe('https://stream/x')
      expect(component.fileUploadForm.controls.entryPoint.value).toBe('index.html')
    })

    it('falls back to a blank entry point and url for a SCORM package', () => {
      component.mimeType = 'application/vnd.ekstep.html-archive'
      component.file = makeFile('pkg.zip')
      component.entryPoint = ''
      component.fileUploadCondition = { url: '' } as any
      uploadService.upload.mockReturnValue(of({ artifactUrl: 'https://elsewhere/pkg.zip' }))
      component.upload()
      expect(component.generateStreamUrl).toHaveBeenCalledWith('')
      expect(component.fileUploadForm.controls.entryPoint.value).toBe('')
    })

    it('stores a blank url when the upload came back empty', () => {
      component.mimeType = 'application/pdf'
      uploadService.upload.mockReturnValue(of(null))
      component.upload()
      expect(component.fileUploadForm.controls.artifactUrl.value).toBe('')
    })

    it('notifies a failure when the upload rejects', () => {
      component.mimeType = 'application/pdf'
      uploadService.upload.mockReturnValue(throwError(() => new Error('network')))
      component.upload()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  // ------------------------------------------------------------ getDuration --

  describe('getDuration', () => {
    it('reads the clip length once its metadata loads', () => {
      const element: any = {}
      jest.spyOn(document, 'createElement').mockReturnValue(element)
      ;(global as any).URL.createObjectURL = jest.fn().mockReturnValue('blob:x')
      ;(global as any).URL.revokeObjectURL = jest.fn()
      component.mimeType = 'video/mp4'
      component.file = makeFile('clip.mp4')
      component.getDuration()
      expect(document.createElement).toHaveBeenCalledWith('video')
      expect(component.enableUpload).toBe(false)
      element.duration = 42.4
      element.onloadedmetadata()
      expect(component.duration).toBe('42')
      expect(component.enableUpload).toBe(true)
      ;(document.createElement as jest.Mock).mockRestore()
    })

    it('uses an audio element for audio', () => {
      const element: any = {}
      jest.spyOn(document, 'createElement').mockReturnValue(element)
      ;(global as any).URL.createObjectURL = jest.fn().mockReturnValue('blob:x')
      component.mimeType = 'audio/mpeg'
      component.file = makeFile('song.mp3')
      component.getDuration()
      expect(document.createElement).toHaveBeenCalledWith('audio')
      ;(document.createElement as jest.Mock).mockRestore()
    })
  })

  // ------------------------------------------------- misc transfer helpers --

  describe('helpers', () => {
    it('builds the streaming url from the snapshot folder', () => {
      expect(component.generateStreamUrl('index.html')).toContain('content-1-snapshot/index.html')
    })

    it('closes every open dialog', () => {
      component.closeDialog()
      expect(dialog.closeAll).toHaveBeenCalled()
    })

    it('offers the entry-point picker for a clean archive', () => {
      component.errorFileList = []
      component.processAndShowResult()
      expect(dialog.open).toHaveBeenCalledWith(component.selectFile, expect.anything())
    })

    it('rejects an archive with badly named files', () => {
      component.errorFileList = ['bad name.html']
      component.processAndShowResult()
      expect(component.file).toBeNull()
      expect(dialog.open).toHaveBeenCalledWith(component.errorFile, expect.anything())
    })
  })
})
