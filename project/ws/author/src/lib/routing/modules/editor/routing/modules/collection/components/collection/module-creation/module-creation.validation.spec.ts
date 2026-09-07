import { FormBuilder } from '@angular/forms'
import { of, Subject } from 'rxjs'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { ModuleCreationComponent } from './module-creation.component'

/**
 * Wave 18 — the validation and file-upload surface of ModuleCreationComponent:
 * `findInvalidEntriesIndices`, `notifyInvalid`, `saveDetails`, `routerValuesCall`,
 * `uploadPdf`, `assignFileValues`, `iprChecked`, `getDuration` and
 * `resourcePdfSave`. Direct instantiation, as with the sibling specs.
 */
describe('ModuleCreationComponent (validation and uploads)', () => {
  let component: ModuleCreationComponent
  let cdr: any
  let dialog: any
  let contentService: any
  let activateRoute: any
  let snackBar: any
  let loader: any
  let initService: any
  let editorService: any
  let storeService: any
  let resolverService: any
  let headerService: any

  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  /** A well-formed in-video question. */
  const question = (over: any = {}) => ({
    timestampInSeconds: 10,
    question: [
      {
        text: 'What?',
        options: [
          { text: 'A', isCorrect: true, answerInfo: 'because' },
          { text: 'B', isCorrect: false, answerInfo: 'nope' },
        ],
      },
    ],
    ...over,
  })

  beforeEach(() => {
    changeActiveCont = new Subject<string>()
    afterClosed = new Subject<any>()

    cdr = { detectChanges: jest.fn() }
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable(), close: jest.fn() }),
      closeAll: jest.fn(),
    }
    contentService = {
      changeActiveCont,
      parentContent: 'do_course',
      currentContent: 'do_res',
      upDatedContent: {},
      originalContent: { do_res: { status: 'Draft', mimeType: 'application/pdf', artifactUrl: 'https://old.pdf' } },
      getUpdatedMeta: jest.fn().mockReturnValue({ contentType: 'Resource' }),
      getOriginalMeta: jest.fn().mockReturnValue(null),
      setUpdatedMeta: jest.fn(),
      setOriginalMeta: jest.fn(),
      cleanProperties: jest.fn((c: any) => ({ ...c })),
      resetOriginalMeta: jest.fn(),
      resetOriginalMetaWithHierarchy: jest.fn(),
      updateListOfFiles: jest.fn(),
      removeListOfFilesAndUpdatedIPR: jest.fn(),
      updateListOfUpdatedIPR: jest.fn(),
      resetStatus: jest.fn().mockReturnValue(false),
      changeStatusDraft: jest.fn(),
      getNodeModifyData: jest.fn().mockReturnValue({}),
    }
    activateRoute = { parent: null }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    initService = {
      backToHomeMessage: new Subject<any>(),
      updateResourceMessage: new Subject<any>(),
      ordinals: { subTitles: ['en'] },
      authConfig: new Proxy({}, { get: () => ({ type: 'string', defaultValue: { Resource: [{ value: '' }] } }) }),
      collectionConfig: { childrenConfig: {}, maxDepth: 4 },
      updateAssessment: jest.fn(),
      isAssessmentOrQuizAction: jest.fn(),
      uploadData: jest.fn(),
    }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_course', versionKey: 'vkRead', children: [] })),
      readContentV2: jest.fn().mockReturnValue(of({ identifier: 'do_res', versionKey: 'vkV2' })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      newCreatedLexid: '',
    }
    storeService = {
      currentParentNode: 3,
      currentSelectedNode: 0,
      parentNode: [],
      changedHierarchy: {},
      flatNodeMap: new Map([[1, { id: 1 }]]),
      uniqueIdMap: new Map(),
      lexIdMap: new Map([['do_res', [1]]]),
      uploadFileType: { next: jest.fn() },
      treeStructureChange: { next: jest.fn() },
      selectedNodeChange: { next: jest.fn() },
      getTreeHierarchy: jest.fn().mockReturnValue({}),
      getNewTreeHierarchy: jest.fn().mockReturnValue({}),
      validationCheck: jest.fn().mockReturnValue(null),
      deleteContentNode: jest.fn(),
    }
    resolverService = { buildTreeAndMap: jest.fn(), hasAccess: jest.fn().mockReturnValue(true) }
    headerService = { showCreatorHeader: jest.fn() }
    ;(window as any).env = { azureBucket: 'bucket' }

    component = new ModuleCreationComponent(
      cdr,
      dialog,
      contentService,
      activateRoute,
      { navigate: jest.fn(), navigateByUrl: jest.fn(), url: '/author' } as any,
      { startProfanity: jest.fn().mockReturnValue(of({})) } as any,
      snackBar,
      loader,
      { userId: 'u1', userName: 'User One', hasRole: jest.fn().mockReturnValue(false) } as any,
      { upload: jest.fn().mockReturnValue(of({})) } as any,
      { post: jest.fn().mockReturnValue(of({})) } as any,
      initService,
      editorService,
      storeService,
      { userProfile: { userId: 'u1' }, instanceConfig: { logos: { defaultContent: 'd.png' } } } as any,
      resolverService,
      headerService,
      { isLtMedium$: of(false), isXSmall$: of(false) } as any,
      new FormBuilder(),
      { getQuizConfig: jest.fn().mockReturnValue({}) } as any,
      { getJSON: jest.fn().mockReturnValue(of({})) } as any,
      { observe: jest.fn().mockReturnValue(of({ matches: false })) } as any,
      { addComment: jest.fn().mockReturnValue(of({})) } as any,
      { downloadResource: jest.fn(), downloadAllAsZip: jest.fn(), hasDownloadableResources: jest.fn() } as any,
    )
    component.currentCourseId = 'do_res'
    component.currentParentId = 'do_course'
    component.currentContent = 'do_res'
    component.courseData = { identifier: 'do_course', children: [] } as any
    component.content = { identifier: 'do_res', contentType: 'Resource', mimeType: 'application/pdf' } as any
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  const expectNotified = (type: any) =>
    expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
      data: { type },
      duration: expect.any(Number),
    })

  /** Matches a notification regardless of any extra payload it carries. */
  const expectNotifiedType = (type: any) =>
    expect(snackBar.openFromComponent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ data: expect.objectContaining({ type }) }),
    )

  /** Lets the microtasks queued inside a subscribe callback settle. */
  const flush = async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  }

  // ------------------------------------------------ findInvalidEntriesIndices --

  describe('findInvalidEntriesIndices', () => {
    beforeEach(() => {
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(600 as any)
    })

    it('accepts a well-formed question', () => {
      expect(component.findInvalidEntriesIndices([question()])).toBeUndefined()
    })

    it('rejects a timestamp past the typed duration', () => {
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(5 as any)
      expect(component.findInvalidEntriesIndices([question()])).toEqual(expect.objectContaining({ invalidTime: true }))
    })

    it('measures against the real clip length when the browser reported one', () => {
      component.videoActualDuration = 5
      expect(component.findInvalidEntriesIndices([question()])).toEqual(expect.objectContaining({ invalidTime: true }))
    })

    it('rejects a zero timestamp', () => {
      expect(component.findInvalidEntriesIndices([question({ timestampInSeconds: 0 })])).toEqual(
        expect.objectContaining({ invalidSec: true }),
      )
    })

    it('rejects a duplicated timestamp', () => {
      expect(component.findInvalidEntriesIndices([question(), question()])).toEqual(
        expect.objectContaining({ duplicateTimestamp: true, index: 1 }),
      )
    })

    it('rejects an empty question', () => {
      const q = question()
      q.question[0].text = ''
      expect(component.findInvalidEntriesIndices([q])).toEqual(expect.objectContaining({ invalidQuestion: true }))
    })

    it('rejects an option with no text', () => {
      const q = question()
      q.question[0].options[1].text = ''
      expect(component.findInvalidEntriesIndices([q])).toEqual(expect.objectContaining({ invalidOption: true }))
    })

    it('rejects a question with a single option', () => {
      const q = question()
      q.question[0].options = [{ text: 'A', isCorrect: true, answerInfo: 'x' }]
      expect(component.findInvalidEntriesIndices([q])).toEqual(expect.objectContaining({ invalidMinOption: true }))
    })

    it('rejects a question with no correct option', () => {
      const q = question()
      q.question[0].options.forEach((o: any) => (o.isCorrect = false))
      expect(component.findInvalidEntriesIndices([q])).toEqual(expect.objectContaining({ invalidIsCorrect: true }))
    })

    it('rejects a question missing answer information', () => {
      const q = question()
      q.question[0].options[0].answerInfo = ''
      expect(component.findInvalidEntriesIndices([q])).toEqual(expect.objectContaining({ invalidAnswerInfo: true }))
    })

    it('returns the first offending entry only', () => {
      const good = question({ timestampInSeconds: 5 })
      const bad = question({ timestampInSeconds: 0 })
      expect(component.findInvalidEntriesIndices([good, bad])).toEqual(expect.objectContaining({ index: 1 }))
    })
  })

  // ---------------------------------------------------------- notifyInvalid --

  describe('notifyInvalid', () => {
    it.each([
      ['invalidTime', Notify.DURATION_CANT_BE_GREATER],
      ['duplicateTimestamp', Notify.DUPLICATE_TIMESTAMP],
      ['invalidSec', Notify.QUESTION_DURATION_CANT_BE_0],
      ['invalidQuestion', Notify.INVALID_QUESTION],
      ['invalidOption', Notify.INVALID_OPTION],
      ['invalidAnswerInfo', Notify.INVALID_ANSWER_INFO],
      ['invalidMinOption', Notify.INVALID_MIN_OPTION],
      ['invalidIsCorrect', Notify.INVALID_IS_CORRECT],
    ])('reports %s', (flag, type) => {
      const invalid = { [flag]: true }
      component.notifyInvalid(invalid)
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type, data: invalid },
        duration: expect.any(Number),
      })
    })

    it('says nothing when nothing is wrong', () => {
      component.notifyInvalid({})
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })

    it('reports every problem it was given', () => {
      component.notifyInvalid({ invalidTime: true, invalidQuestion: true, invalidOption: true })
      expect(snackBar.openFromComponent).toHaveBeenCalledTimes(3)
    })
  })

  // ------------------------------------------------------------ saveDetails --

  describe('saveDetails', () => {
    beforeEach(() => {
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(60 as any)
      jest.spyOn(component, 'update').mockResolvedValue(undefined)
      jest.spyOn(component, 'clearForm').mockImplementation(() => {})
      component.updatedVersionKey = 'vkUpd'
      component.editResourceLinks = ''
    })

    it('reports the invalid question instead of saving', async () => {
      component.videoQuestions = [question({ timestampInSeconds: 0 })] as any
      await component.saveDetails('Name', 'desc', 'thumb.png', false, false, 'application/pdf')
      expectNotifiedType(Notify.QUESTION_DURATION_CANT_BE_0)
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })

    it('refuses a zero-duration resource', async () => {
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(0 as any)
      await component.saveDetails('Name', 'desc', 'thumb.png', false, false, 'application/pdf')
      expectNotified(Notify.DURATION_CANT_BE_0)
    })

    it('allows a zero-duration assessment', async () => {
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(0 as any)
      await component.saveDetails('Name', 'desc', 'thumb.png', false, false, 'application/json')
      expect(contentService.setUpdatedMeta).toHaveBeenCalled()
    })

    it('allows a zero-duration module', async () => {
      component.content = { identifier: 'do_unit', contentType: 'CourseUnit' } as any
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(0 as any)
      await component.saveDetails('Name', 'desc', 'thumb.png', false, false, 'application/pdf')
      expect(contentService.setUpdatedMeta).toHaveBeenCalled()
    })

    it('stores the resource details and refreshes the tree', async () => {
      await component.saveDetails('  Name  ', 'desc', 'thumb.png', false, false, 'application/pdf')
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Name',
          appIcon: 'thumb.png',
          thumbnail: 'thumb.png',
          instructions: 'desc',
          description: 'desc',
          duration: '60',
          isIframeSupported: 'No',
          showDownloadBtn: 'No',
          versionKey: 'vkUpd',
        }),
        'do_res',
      )
      expect(editorService.updateNewContentV3).toHaveBeenCalled()
      await flush()
      expect(component.update).toHaveBeenCalled()
      expect(component.clearForm).toHaveBeenCalled()
      expect(component.editItem).toBe('')
    })

    it('maps the new-tab and download flags', async () => {
      await component.saveDetails('Name', 'desc', 'thumb.png', true, true, 'application/pdf')
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.isIframeSupported).toBe('Yes')
      expect(meta.showDownloadBtn).toBe('Yes')
    })

    it('always allows an iframe for a SCORM package', async () => {
      component.acceptType = '.zip'
      await component.saveDetails('Name', 'desc', 'thumb.png', false, false, 'application/pdf')
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.isIframeSupported).toBe('Yes')
    })

    it('carries the answer-popup flag for an assessment', async () => {
      component.content = {
        identifier: 'do_res',
        contentType: 'Resource',
        mimeType: 'application/json',
        isAssessment: true,
        isCorrectAnswerPopUp: true,
      } as any
      await component.saveDetails('Name', 'desc', 'thumb.png', false, false, 'application/json')
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.isCorrectAnswerPopUp).toBe(true)
    })

    it('attaches the in-video questions to a video resource', async () => {
      component.content = { identifier: 'do_res', contentType: 'Resource', mimeType: 'video/mp4' } as any
      component.videoQuestions = [question()] as any
      await component.saveDetails('Name', 'desc', 'thumb.png', false, false, 'video/mp4')
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.videoQuestions).toEqual(component.videoQuestions)
    })

    it('stores a valid YouTube link on a link resource', async () => {
      component.content = { identifier: 'do_res', contentType: 'Resource', mimeType: 'text/x-url' } as any
      component.editResourceLinks = 'https://www.youtube.com/watch?v=abcdefghijk'
      await component.saveDetails('Name', 'desc', 'thumb.png', false, false, 'text/x-url')
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.artifactUrl).toBe('https://www.youtube.com/watch?v=abcdefghijk')
    })

    it('rejects a malformed link on a link resource', async () => {
      component.content = { identifier: 'do_res', contentType: 'Resource', mimeType: 'text/x-url' } as any
      component.editResourceLinks = 'not-a-youtube-link'
      await component.saveDetails('Name', 'desc', 'thumb.png', false, false, 'text/x-url')
      expectNotified(Notify.LINK_IS_INVALID)
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })

    it('rejects a blank resource name', async () => {
      await component.saveDetails('   ', 'desc', 'thumb.png', false, false, 'application/pdf')
      expectNotified(Notify.INVALID_RESOURCE_NAME)
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })

    it('rejects a blank module name with the module message', async () => {
      component.content = { identifier: 'do_unit', contentType: 'CourseUnit' } as any
      await component.saveDetails('   ', 'desc', 'thumb.png', false, false, 'application/pdf')
      expectNotified(Notify.INVALID_MODULE_NAME)
    })

    it('saves a module straight through the hierarchy', async () => {
      component.content = { identifier: 'do_unit', contentType: 'CourseUnit' } as any
      await component.saveDetails('Module', 'desc', 'thumb.png', false, false, 'application/pdf')
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
      expect(component.update).toHaveBeenCalled()
      expect(component.clearForm).toHaveBeenCalled()
    })

    it('does not clear the form when the resource update returns nothing', async () => {
      editorService.updateNewContentV3.mockReturnValue(of(null))
      await component.saveDetails('Name', 'desc', 'thumb.png', false, false, 'application/pdf')
      await flush()
      expect(component.clearForm).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------ generateUrl --

  describe('generateUrl and jsonVerify', () => {
    it('keeps a url that lives in the configured bucket', () => {
      expect(component.generateUrl('https://cdn/bucket/x.png')).toBe('https://cdn/bucket/x.png')
    })

    it('drops a url from anywhere else', () => {
      expect(component.generateUrl('https://elsewhere/x.png')).toBeUndefined()
    })

    it('recognises parseable json', () => {
      expect(component.jsonVerify('{"a":1}')).toBe(true)
    })

    it('rejects unparseable json', () => {
      expect(component.jsonVerify('nope')).toBe(false)
    })
  })

  // ------------------------------------------------------- routerValuesCall --

  describe('routerValuesCall', () => {
    it('follows the active content and drops non-resources into the meta view', () => {
      component.routerValuesCall()
      contentService.getUpdatedMeta.mockReturnValue({ contentType: 'CourseUnit' })
      changeActiveCont.next('do_unit')
      expect(component.currentContent).toBe('do_unit')
      expect(component.currentCourseId).toBe('do_unit')
      expect(component.viewMode).toBe('meta')
    })

    it('leaves the view alone for a resource', () => {
      component.viewMode = 'upload'
      component.routerValuesCall()
      contentService.getUpdatedMeta.mockReturnValue({ contentType: 'Resource' })
      changeActiveCont.next('do_res')
      expect(component.viewMode).toBe('upload')
    })

    it('does nothing more without a grandparent route', () => {
      component.routerValuesCall()
      expect(resolverService.buildTreeAndMap).not.toHaveBeenCalled()
    })

    it('builds the tree from the resolved route data', () => {
      const content = { identifier: 'do_res', name: 'Course A', children: [{ identifier: 'do_c1' }] }
      component.activateRoute = {
        parent: {
          parent: { data: of({ contents: [{ content, data: {} }] }) },
          url: of([{ path: 'collection' }]),
        },
      } as any
      component.routerValuesCall()
      expect(component.courseName).toBe('Course A')
      expect(storeService.parentNode).toContain('do_res')
      expect(resolverService.buildTreeAndMap).toHaveBeenCalled()
      expect(component.currentParentId).toBe('do_res')
      expect(storeService.currentParentNode).toBe(1)
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith('do_c1')
      expect(headerService.showCreatorHeader).toHaveBeenCalledWith('Course A')
    })

    it('selects a freshly created node when there is one', () => {
      editorService.newCreatedLexid = 'do_new'
      storeService.lexIdMap.set('do_new', [9])
      const content = { identifier: 'do_res', name: 'Course A', children: [] }
      component.activateRoute = {
        parent: {
          parent: { data: of({ contents: [{ content, data: {} }] }) },
          url: of([{ path: 'collection' }]),
        },
      } as any
      component.routerValuesCall()
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(9)
    })

    it('leaves the header alone outside the collection route', () => {
      const content = { identifier: 'do_res', name: 'Course A', children: [] }
      component.activateRoute = {
        parent: {
          parent: { data: of({ contents: [{ content, data: {} }] }) },
          url: of([{ path: 'settings' }]),
        },
      } as any
      component.routerValuesCall()
      expect(headerService.showCreatorHeader).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------- uploadPdf --

  describe('uploadPdf', () => {
    const asFile = (name: string, type = '', size = 100) => ({ name, type, size }) as File

    beforeEach(() => {
      jest.spyOn(component, 'assignFileValues').mockImplementation(() => {})
      jest.spyOn(component, 'triggerUpload').mockResolvedValue(undefined)
      component.acceptType = '.pdf'
    })

    it('rejects a file whose extension does not match the picker', () => {
      component.uploadPdf(asFile('notes.txt'))
      expectNotified(Notify.INVALID_FORMAT)
      expect(component.triggerUpload).not.toHaveBeenCalled()
    })

    it('rejects an unsupported extension that still matches the picker', () => {
      component.acceptType = '.doc'
      component.uploadPdf(asFile('paper.doc'))
      expectNotified(Notify.INVALID_FORMAT)
    })

    it('rejects a file over the size limit', () => {
      component.uploadPdf(asFile('big.pdf', '', 10 * 1024 * 1024 * 1024))
      expectNotified(Notify.SIZE_ERROR)
    })

    it('uploads a PDF straight away', () => {
      component.uploadPdf(asFile('doc.pdf'))
      expect(component.uploadFileName).toBe('doc.pdf')
      expect(component.assignFileValues).toHaveBeenCalled()
      expect(component.triggerUpload).toHaveBeenCalled()
    })

    it('strips unsafe characters out of the file name', () => {
      component.uploadPdf(asFile('my report (final).pdf'))
      expect(component.uploadFileName).toBe('myreportfinal.pdf')
    })

    it('warns about transcoding before uploading an mp4', () => {
      component.uploadPdf(asFile('clip.mp4', 'video/mp4'))
      expect(dialog.open).toHaveBeenCalled()
      expect(component.triggerUpload).not.toHaveBeenCalled()
      afterClosed.next(true)
      expect(component.uploadFileName).toBe('clip.mp4')
      expect(component.triggerUpload).toHaveBeenCalled()
    })

    it('warns about transcoding before uploading an m4v', () => {
      component.uploadPdf(asFile('clip.m4v', 'video/m4v'))
      afterClosed.next(true)
      expect(component.triggerUpload).toHaveBeenCalled()
    })

    it('abandons the video upload when the warning is dismissed', () => {
      component.uploadPdf(asFile('clip.mp4', 'video/mp4'))
      afterClosed.next(false)
      expect(component.triggerUpload).not.toHaveBeenCalled()
    })

    it('shows the SCORM guideline and keeps the file once every box is ticked', () => {
      component.acceptType = '.zip'
      const file = asFile('pkg.zip')
      component.uploadPdf(file)
      component.fileUploadCondition = {
        fileName: true,
        iframe: true,
        eval: true,
        preview: true,
        externalReference: true,
        isSubmitPressed: true,
        url: '',
      } as any
      afterClosed.next(undefined)
      expect(component.assignFileValues).toHaveBeenCalled()
      expect(component.fileUploaded).toBe(file)
    })

    it('discards the SCORM upload when a box is left unticked', () => {
      component.acceptType = '.zip'
      component.uploadPdf(asFile('pkg.zip'))
      afterClosed.next(undefined)
      expect(component.assignFileValues).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------- assignFileValues --

  describe('assignFileValues', () => {
    const asFile = (name: string) => ({ name, type: '', size: 10 }) as File

    beforeEach(() => {
      jest.spyOn(component, 'getDuration').mockImplementation(() => {})
      jest.spyOn(component, 'extractFile').mockImplementation(() => {})
    })

    it('records a PDF and its icon', () => {
      component.assignFileValues(asFile('doc.pdf'), 'doc.pdf')
      expect(component.mimeType).toBe('application/pdf')
      expect(component.uploadIcon).toBe('cbp-assets/images/pdf-icon.png')
      expect(contentService.updateListOfFiles).toHaveBeenCalledWith('do_res', expect.anything())
    })

    it('reads the duration of a video', () => {
      contentService.originalContent.do_res.mimeType = 'video/mp4'
      component.assignFileValues(asFile('clip.mp4'), 'clip.mp4')
      expect(component.mimeType).toBe('video/mp4')
      expect(component.getDuration).toHaveBeenCalled()
      expect(component.uploadIcon).toBe('cbp-assets/images/video-icon.png')
    })

    it('reads the duration of an m4v', () => {
      contentService.originalContent.do_res.mimeType = 'video/mp4'
      component.assignFileValues(asFile('clip.m4v'), 'clip.m4v')
      expect(component.mimeType).toBe('video/mp4')
    })

    it('reads the duration of audio', () => {
      contentService.originalContent.do_res.mimeType = 'audio/mpeg'
      component.assignFileValues(asFile('song.mp3'), 'song.mp3')
      expect(component.mimeType).toBe('audio/mpeg')
      expect(component.getDuration).toHaveBeenCalled()
    })

    it('unpacks a SCORM archive', () => {
      contentService.originalContent.do_res.mimeType = 'application/vnd.ekstep.html-archive'
      component.assignFileValues(asFile('pkg.zip'), 'pkg.zip')
      expect(component.mimeType).toBe('application/vnd.ekstep.html-archive')
      expect(component.extractFile).toHaveBeenCalled()
      expect(component.uploadIcon).toBe('cbp-assets/images/SCROM-img.svg')
    })

    it('refuses to change the file type of a live resource', () => {
      contentService.originalContent.do_res = {
        status: 'Live',
        mimeType: 'application/pdf',
        artifactUrl: 'https://old.pdf',
      }
      component.assignFileValues(asFile('clip.mp4'), 'clip.mp4')
      expectNotified(Notify.CANNOT_CHANGE_MIME_TYPE)
      expect(component.mimeType).toBe('application/pdf')
      expect(component.fileUploadForm.controls.artifactUrl.value).toBe('https://old.pdf')
      expect(component.getDuration).not.toHaveBeenCalled()
    })

    it('refuses to change the file type of a previously live resource', () => {
      contentService.originalContent.do_res = {
        status: 'Draft',
        prevStatus: 'Live',
        mimeType: 'application/pdf',
        artifactUrl: 'https://old.pdf',
      }
      component.assignFileValues(asFile('clip.mp4'), 'clip.mp4')
      expectNotified(Notify.CANNOT_CHANGE_MIME_TYPE)
    })

    it('allows replacing a live resource with the same file type', () => {
      contentService.originalContent.do_res = { status: 'Live', mimeType: 'application/pdf' }
      component.assignFileValues(asFile('doc.pdf'), 'doc.pdf')
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------- iprChecked --

  describe('iprChecked', () => {
    it('toggles the IPR acceptance and records it', () => {
      component.iprChecked()
      expect(component.iprAccepted).toBe(true)
      expect(contentService.updateListOfUpdatedIPR).toHaveBeenCalledWith('do_res', true)
      component.iprChecked()
      expect(component.iprAccepted).toBe(false)
    })
  })

  // ----------------------------------------------------------- getDuration --

  describe('getDuration', () => {
    it('reads the length of the selected video once its metadata loads', () => {
      const element: any = {}
      jest.spyOn(document, 'createElement').mockReturnValue(element)
      const createObjectURL = jest.fn().mockReturnValue('blob:x')
      const revokeObjectURL = jest.fn()
      Object.defineProperty(window, 'URL', { value: { createObjectURL, revokeObjectURL }, configurable: true })
      ;(global as any).URL.createObjectURL = createObjectURL

      component.mimeType = 'video/mp4'
      component.file = { name: 'clip.mp4' } as File
      component.getDuration()
      expect(document.createElement).toHaveBeenCalledWith('video')

      element.duration = 42.4
      element.onloadedmetadata()
      expect(component.duration).toBe('42')
      ;(document.createElement as jest.Mock).mockRestore()
    })

    it('uses an audio element for audio', () => {
      const element: any = {}
      jest.spyOn(document, 'createElement').mockReturnValue(element)
      ;(global as any).URL.createObjectURL = jest.fn().mockReturnValue('blob:x')
      component.mimeType = 'audio/mpeg'
      component.file = { name: 'song.mp3' } as File
      component.getDuration()
      expect(document.createElement).toHaveBeenCalledWith('audio')
      ;(document.createElement as jest.Mock).mockRestore()
    })
  })

  // ------------------------------------------------------- resourcePdfSave --

  describe('resourcePdfSave', () => {
    const fillForm = (over: any = {}) => {
      component.resourcePdfForm.patchValue({
        name: 'My PDF',
        instructions: 'read it',
        appIcon: 'a.png',
        thumbnail: 't.png',
        duration: 60,
        ...over,
      })
      component.uploadFileName = 'doc.pdf'
    }

    beforeEach(() => {
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(60 as any)
      jest.spyOn(component, 'update').mockResolvedValue(undefined)
      jest.spyOn(component, 'save').mockResolvedValue(undefined)
      jest.spyOn(component, 'clearForm').mockImplementation(() => {})
      component.updatedVersionKey = 'vkUpd'
    })

    it('reports an invalid question instead of saving', async () => {
      fillForm()
      component.videoQuestions = [question({ timestampInSeconds: 0 })] as any
      await component.resourcePdfSave()
      expectNotifiedType(Notify.QUESTION_DURATION_CANT_BE_0)
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })

    it('refuses an incomplete form', async () => {
      await component.resourcePdfSave()
      expectNotified(Notify.REQUIRED_FIELD)
    })

    it('refuses to save with no uploaded file', async () => {
      fillForm()
      component.uploadFileName = ''
      await component.resourcePdfSave()
      expectNotified(Notify.REQUIRED_FIELD)
    })

    it('refuses a zero duration', async () => {
      fillForm({ duration: 0 })
      await component.resourcePdfSave()
      expectNotified(Notify.DURATION_CANT_BE_0)
    })

    it('refuses a blank name', async () => {
      fillForm({ name: '   ' })
      await component.resourcePdfSave()
      expectNotified(Notify.INVALID_RESOURCE_NAME)
    })

    it('stores the uploaded resource and clears the form', async () => {
      fillForm()
      await component.resourcePdfSave()
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My PDF',
          instructions: 'read it',
          description: 'read it',
          appIcon: 'a.png',
          thumbnail: 't.png',
          isIframeSupported: 'No',
          showDownloadBtn: 'No',
          duration: 60,
          versionKey: 'vkUpd',
          videoQuestions: [],
        }),
        'do_res',
      )
      expect(component.update).toHaveBeenCalled()
      expect(component.save).toHaveBeenCalled()
      expect(component.clearForm).toHaveBeenCalled()
      expect(component.editItem).toBe('')
    })

    it('maps the iframe and download flags', async () => {
      fillForm({ isIframeSupported: true, showDownloadBtn: true })
      await component.resourcePdfSave()
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.isIframeSupported).toBe('Yes')
      expect(meta.showDownloadBtn).toBe('Yes')
    })

    it('always allows an iframe for a SCORM package', async () => {
      component.acceptType = '.zip'
      fillForm()
      await component.resourcePdfSave()
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.isIframeSupported).toBe('Yes')
    })

    it('carries the in-video questions', async () => {
      fillForm()
      component.videoQuestions = [question()] as any
      await component.resourcePdfSave()
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.videoQuestions).toHaveLength(1)
    })
  })
})
