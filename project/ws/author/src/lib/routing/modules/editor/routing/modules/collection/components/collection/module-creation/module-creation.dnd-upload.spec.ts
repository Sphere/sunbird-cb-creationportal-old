import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { ModuleCreationComponent } from './module-creation.component'

/**
 * Wave 18 — the drag-and-drop reordering and file-upload surface of
 * ModuleCreationComponent: `dragDrop`, `compute`, `drop`, `dragEnd`,
 * `triggerUpload`, `upload`, `getassessment`, `addQuestion`, `editAssessment`,
 * `updateSelectedQuiz`, `validateNdShowError` and `saveCourseDetails`.
 * Direct instantiation, as with the sibling specs.
 */
describe('ModuleCreationComponent (drag-drop and uploads)', () => {
  let component: ModuleCreationComponent
  let cdr: any
  let dialog: any
  let contentService: any
  let activateRoute: any
  let snackBar: any
  let loader: any
  let uploadService: any
  let initService: any
  let editorService: any
  let storeService: any
  let quizStoreSvc: any
  let quizResolverSvc: any
  let profanityService: any

  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>
  let onFormChange: Subject<any>
  let onFormQuestion: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  /**
   * A two-module course: Module A holds R1 and R2, Module B holds R3, and R4 sits
   * directly under the course. `identfs` is therefore
   * [A, R1, R2, B, R3, R4] in flattened drag order.
   */
  const buildCourse = () => ({
    identifier: 'do_course',
    children: [
      {
        identifier: 'do_A',
        contentType: 'CourseUnit',
        parent: 'do_course',
        children: [
          { identifier: 'do_R1', contentType: 'Resource', parent: 'do_A' },
          { identifier: 'do_R2', contentType: 'Resource', parent: 'do_A' },
        ],
      },
      {
        identifier: 'do_B',
        contentType: 'CourseUnit',
        parent: 'do_course',
        children: [{ identifier: 'do_R3', contentType: 'Resource', parent: 'do_B' }],
      },
      { identifier: 'do_R4', contentType: 'Resource', parent: 'do_course', children: [] },
    ],
  })

  const buildHierarchy = () => ({
    do_course: { children: ['do_A', 'do_B', 'do_R4'] },
    do_A: { children: ['do_R1', 'do_R2'] },
    do_B: { children: ['do_R3'] },
  })

  beforeEach(() => {
    changeActiveCont = new Subject<string>()
    afterClosed = new Subject<any>()
    onFormChange = new Subject<any>()
    onFormQuestion = new Subject<any>()

    cdr = { detectChanges: jest.fn() }
    dialog = {
      open: jest.fn().mockReturnValue({
        afterClosed: () => afterClosed.asObservable(),
        close: jest.fn(),
        componentInstance: { onFormChange, onFormQuestion },
      }),
      closeAll: jest.fn(),
    }
    contentService = {
      changeActiveCont,
      parentContent: 'do_course',
      currentContent: 'do_res',
      upDatedContent: { do_res: { name: 'R', category: 'Resource' } },
      originalContent: { do_res: { status: 'Draft' } },
      getUpdatedMeta: jest.fn().mockReturnValue({ contentType: 'Resource' }),
      getOriginalMeta: jest.fn().mockReturnValue({ category: 'Resource', mimeType: 'application/pdf' }),
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
      getNewNodeModifyData: jest.fn().mockReturnValue({}),
    }
    activateRoute = { parent: null }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    uploadService = { upload: jest.fn().mockReturnValue(of({ artifactUrl: 'https://cdn/bucket/f.pdf' })) }
    initService = {
      backToHomeMessage: new Subject<any>(),
      updateResourceMessage: new Subject<any>(),
      ordinals: { subTitles: ['en', 'hi'] },
      authConfig: new Proxy({}, { get: () => ({ type: 'string', defaultValue: { Resource: [{ value: '' }] } }) }),
      collectionConfig: { childrenConfig: {}, maxDepth: 4 },
      updateAssessment: jest.fn(),
      isAssessmentOrQuizAction: jest.fn(),
    }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_course', versionKey: 'vkRead', children: [] })),
      readContentV2: jest.fn().mockReturnValue(of({ versionKey: 'vkV2' })),
      updateContentV3: jest.fn().mockReturnValue(of({ params: { status: 'successful' } })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      newCreatedLexid: '',
    }
    storeService = {
      currentParentNode: 3,
      parentNode: ['do_course'],
      parentData: null,
      changedHierarchy: {},
      flatNodeMap: new Map(),
      uniqueIdMap: new Map(),
      lexIdMap: new Map(),
      uploadFileType: { next: jest.fn() },
      treeStructureChange: { next: jest.fn() },
      selectedNodeChange: { next: jest.fn() },
      getTreeHierarchy: jest.fn(buildHierarchy),
      getNewTreeHierarchy: jest.fn().mockReturnValue({}),
      validationCheck: jest.fn().mockReturnValue(null),
      deleteContentNode: jest.fn(),
    }
    quizStoreSvc = {
      getQuizConfig: jest.fn().mockReturnValue({}),
      collectiveQuiz: {},
      selectedQuizIndex: of(2),
      currentId: '',
      assessmentDuration: 0,
      passPercentage: 0,
      addQuestion: jest.fn(),
      changeQuiz: jest.fn(),
      getQuiz: jest.fn().mockReturnValue({ question: 'old', options: [{ text: 'a' }, { text: 'b' }] }),
      updateQuiz: jest.fn(),
      validateQuiz: jest.fn().mockReturnValue(''),
    }
    quizResolverSvc = {
      getJSON: jest.fn().mockReturnValue(of({})),
      getUpdatedData: jest.fn().mockReturnValue(of([])),
      canEdit: jest.fn().mockReturnValue(true),
    }
    profanityService = { startProfanity: jest.fn().mockReturnValue(of({})) }
    ;(window as any).env = { azureBucket: 'bucket' }

    component = new ModuleCreationComponent(
      cdr,
      dialog,
      contentService,
      activateRoute,
      { navigate: jest.fn(), navigateByUrl: jest.fn(), url: '/author' } as any,
      profanityService,
      snackBar,
      loader,
      { userId: 'u1', userName: 'User One', hasRole: jest.fn().mockReturnValue(false) } as any,
      uploadService,
      { post: jest.fn().mockReturnValue(of({})) } as any,
      initService,
      editorService,
      storeService,
      { userProfile: { userId: 'u1' }, instanceConfig: { logos: { defaultContent: 'd.png' } } } as any,
      { buildTreeAndMap: jest.fn(), hasAccess: jest.fn().mockReturnValue(true) } as any,
      { showCreatorHeader: jest.fn() } as any,
      { isLtMedium$: of(false), isXSmall$: of(false) } as any,
      new FormBuilder(),
      quizStoreSvc,
      quizResolverSvc,
      { observe: jest.fn().mockReturnValue(of({ matches: false })) } as any,
      { addComment: jest.fn().mockReturnValue(of({})) } as any,
      { downloadResource: jest.fn(), downloadAllAsZip: jest.fn(), hasDownloadableResources: jest.fn() } as any,
    )
    component.currentCourseId = 'do_course'
    component.currentParentId = 'do_course'
    component.currentContent = 'do_res'
    component.courseData = buildCourse() as any
    component.content = { identifier: 'do_course', contentType: 'Course' } as any
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

  const lastHierarchy = () => editorService.updateContentV4.mock.calls.at(-1)[0].request.data.hierarchy

  /** Lets the microtasks queued inside a subscribe callback settle. */
  const flush = async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  }

  // -------------------------------------------------------- dragDrop/compute --

  describe('dragDrop, compute and dragEnd', () => {
    it('remembers what is being dragged', () => {
      component.dragDrop({ identifier: 'do_R1' }, { identifier: 'do_A' }, 'move')
      expect(component.dragEle1).toEqual({ identifier: 'do_R1' })
      expect(component.dragEle2).toEqual({ identifier: 'do_A' })
      expect(component.dragEle3).toBe('move')
    })

    it('finds a top-level child of the course', () => {
      expect(component.compute('do_R4')).toEqual([expect.objectContaining({ identifier: 'do_R4' })])
    })

    it('returns a mapped list for a nested child', () => {
      expect(component.compute('do_R1')).toHaveLength(3)
    })

    it('ignores the drag end event', () => {
      expect(() => component.dragEnd({ any: 'thing' })).not.toThrow()
    })
  })

  // ------------------------------------------------------------------ drop --

  describe('drop', () => {
    it('reorders two course-level resources when dragged upwards', async () => {
      // Course-level resources only: R4 above R5.
      component.courseData = {
        identifier: 'do_course',
        children: [
          { identifier: 'do_R4', contentType: 'Resource', parent: 'do_course', children: [] },
          { identifier: 'do_R5', contentType: 'Resource', parent: 'do_course', children: [] },
        ],
      } as any
      storeService.getTreeHierarchy.mockReturnValue({ do_course: { children: ['do_R4', 'do_R5'] } })
      await component.drop({ previousIndex: 1, currentIndex: 0 })
      expect(lastHierarchy().do_course.children).toEqual(['do_R5', 'do_R4'])
      expect(storeService.parentData).toBeTruthy()
    })

    it('reorders two course-level resources when dragged downwards', async () => {
      component.courseData = {
        identifier: 'do_course',
        children: [
          { identifier: 'do_R4', contentType: 'Resource', parent: 'do_course', children: [] },
          { identifier: 'do_R5', contentType: 'Resource', parent: 'do_course', children: [] },
        ],
      } as any
      storeService.getTreeHierarchy.mockReturnValue({ do_course: { children: ['do_R4', 'do_R5'] } })
      await component.drop({ previousIndex: 0, currentIndex: 1 })
      expect(lastHierarchy().do_course.children).toEqual(['do_R5', 'do_R4'])
    })

    it('moves a resource up into an empty module', async () => {
      // identfs = [A, B, R3]; drag R3 (index 2) onto A (index 0).
      component.courseData = {
        identifier: 'do_course',
        children: [
          { identifier: 'do_A', contentType: 'CourseUnit', parent: 'do_course', children: [] },
          {
            identifier: 'do_B',
            contentType: 'CourseUnit',
            parent: 'do_course',
            children: [{ identifier: 'do_R3', contentType: 'Resource', parent: 'do_B' }],
          },
        ],
      } as any
      storeService.getTreeHierarchy.mockReturnValue({
        do_course: { children: ['do_A', 'do_B'] },
        do_A: { children: [] },
        do_B: { children: ['do_R3'] },
      })
      await component.drop({ previousIndex: 2, currentIndex: 0 })
      const h = lastHierarchy()
      expect(h.do_A.children).toEqual(['do_R3'])
      expect(h.do_B.children).toEqual([])
    })

    it('moves a resource up alongside a populated module', async () => {
      // identfs = [A, R1, R2, B, R3, R4]; drag R3 (index 4) onto A (index 0).
      await component.drop({ previousIndex: 4, currentIndex: 0 })
      const h = lastHierarchy()
      expect(h.do_course.children).toContain('do_R3')
      expect(h.do_B.children).toEqual([])
    })

    it('moves a resource up next to another resource', async () => {
      // drag R3 (index 4) onto R1 (index 1).
      await component.drop({ previousIndex: 4, currentIndex: 1 })
      const h = lastHierarchy()
      expect(h.do_A.children).toContain('do_R3')
      expect(h.do_B.children).toEqual([])
    })

    it('moves a module up above another module', async () => {
      // drag B (index 3) onto A (index 0).
      await component.drop({ previousIndex: 3, currentIndex: 0 })
      expect(lastHierarchy().do_course.children[0]).toBe('do_B')
    })

    it('moves a resource down into an empty module', async () => {
      component.courseData = {
        identifier: 'do_course',
        children: [
          {
            identifier: 'do_A',
            contentType: 'CourseUnit',
            parent: 'do_course',
            children: [{ identifier: 'do_R1', contentType: 'Resource', parent: 'do_A' }],
          },
          { identifier: 'do_B', contentType: 'CourseUnit', parent: 'do_course', children: [] },
        ],
      } as any
      storeService.getTreeHierarchy.mockReturnValue({
        do_course: { children: ['do_A', 'do_B'] },
        do_A: { children: ['do_R1'] },
        do_B: { children: [] },
      })
      // identfs = [A, R1, B]; drag R1 (index 1) onto B (index 2).
      await component.drop({ previousIndex: 1, currentIndex: 2 })
      const h = lastHierarchy()
      expect(h.do_B.children).toEqual(['do_R1'])
      expect(h.do_A.children).toEqual([])
    })

    it('moves a resource down alongside a populated module', async () => {
      // drag R1 (index 1) onto B (index 3).
      await component.drop({ previousIndex: 1, currentIndex: 3 })
      const h = lastHierarchy()
      expect(h.do_course.children).toContain('do_R1')
      expect(h.do_A.children).toEqual(['do_R2'])
    })

    it('moves a resource down next to another resource', async () => {
      // drag R1 (index 1) onto R3 (index 4).
      await component.drop({ previousIndex: 1, currentIndex: 4 })
      const h = lastHierarchy()
      expect(h.do_B.children).toContain('do_R1')
      expect(h.do_A.children).toEqual(['do_R2'])
    })

    it('moves a module down below another module', async () => {
      // drag A (index 0) onto B (index 3).
      await component.drop({ previousIndex: 0, currentIndex: 3 })
      expect(lastHierarchy().do_course.children).toContain('do_A')
    })

    it('confirms before dropping a resource past the last one', async () => {
      // R4 is last in identfs; drag R1 (index 1) onto it (index 5).
      await component.drop({ previousIndex: 1, currentIndex: 5 })
      expect(dialog.open).toHaveBeenCalled()
      expect(editorService.updateContentV4).not.toHaveBeenCalled()
    })

    it('lifts the resource out of its module when the confirmation is accepted', async () => {
      await component.drop({ previousIndex: 1, currentIndex: 5 })
      afterClosed.next('New')
      const h = lastHierarchy()
      expect(h.do_course.children).toContain('do_R1')
      expect(h.do_A.children).toEqual(['do_R2'])
    })

    it('keeps the resource beside the target when the confirmation is declined', async () => {
      await component.drop({ previousIndex: 1, currentIndex: 5 })
      afterClosed.next('Cancel')
      const h = lastHierarchy()
      expect(h.do_course.children).toContain('do_R1')
      expect(h.do_A.children).toEqual(['do_R2'])
    })

    it('leaves the tree untouched when a resource is dropped onto itself', async () => {
      await component.drop({ previousIndex: 1, currentIndex: 1 })
      const h = lastHierarchy()
      expect(h.do_A.children).toEqual(['do_R1', 'do_R2'])
      expect(h.do_course.children).toEqual(['do_A', 'do_B', 'do_R4'])
    })

    it('refreshes the course once the hierarchy is written', async () => {
      await component.drop({ previousIndex: 3, currentIndex: 0 })
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  // ---------------------------------------------------------- triggerUpload --

  describe('triggerUpload', () => {
    beforeEach(() => {
      jest.spyOn(component, 'storeData').mockImplementation(() => {})
      jest.spyOn(component, 'upload').mockImplementation(() => {})
      jest.spyOn(component, 'errorMessage').mockImplementation(() => {})
      component.file = { name: 'doc.pdf', size: 10 } as File
      component.mimeType = 'application/pdf'
      contentService.upDatedContent = { do_res: { name: 'R', category: 'Resource' } }
    })

    it('asks for a file when none was picked', async () => {
      component.file = null
      await component.triggerUpload()
      expectNotified(Notify.UPLOAD_FILE)
      expect(editorService.updateContentV3).not.toHaveBeenCalled()
    })

    it('saves the metadata then hands over to the uploader', async () => {
      await component.triggerUpload()
      expect(component.fileUploadForm.controls.mimeType.value).toBe('application/pdf')
      expect(component.storeData).toHaveBeenCalled()
      expect(editorService.updateContentV3).toHaveBeenCalledWith({ request: { content: expect.objectContaining({ name: 'R' }) } }, 'do_res')
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

    it('does not upload when the metadata save fails', async () => {
      editorService.updateContentV3.mockReturnValue(of({ params: { status: 'failed' } }))
      await component.triggerUpload()
      expect(component.upload).not.toHaveBeenCalled()
    })

    it('does not upload when the metadata save rejects', async () => {
      editorService.updateContentV3.mockReturnValue(throwError(() => new Error('boom')))
      await component.triggerUpload()
      expect(component.upload).not.toHaveBeenCalled()
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
      jest.spyOn(component, 'storeData').mockImplementation(() => {})
      jest.spyOn(component, 'action').mockImplementation(() => {})
      jest.spyOn(component, 'validateFile').mockImplementation(() => {})
      jest.spyOn(component, 'profanityCheckAPICall').mockImplementation(() => {})
      jest.spyOn(component, 'generateStreamUrl').mockReturnValue('https://stream/x')
      component.file = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
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
      expectNotified(Notify.UPLOAD_SUCCESS)
      expect(component.action).toHaveBeenCalledWith('save')
      expect(component.validateFile).toHaveBeenCalled()
    })

    it('starts transcoding for an uploaded video and reloads the player', () => {
      const load = jest.fn()
      component.videoPlayer = { nativeElement: { load } } as any
      component.mimeType = 'video/mp4'
      uploadService.upload.mockReturnValue(of({ artifactUrl: 'https://cdn/bucket/clip.mp4' }))
      component.upload()
      expect(component.uploadVideoUrl).toBe('https://cdn/bucket/clip.mp4')
      expect(load).toHaveBeenCalled()
      expect(component.fileUploadForm.controls.transcoding.value).toEqual({
        lastTranscodedOn: null,
        retryCount: 0,
        status: 'STARTED',
      })
      expect(component.profanityCheckAPICall).not.toHaveBeenCalled()
    })

    it('handles a video upload with no mounted player', () => {
      component.videoPlayer = undefined as any
      component.mimeType = 'video/mp4'
      uploadService.upload.mockReturnValue(of({ artifactUrl: 'https://cdn/bucket/clip.mp4' }))
      component.upload()
      expect(component.uploadVideoUrl).toBe('https://cdn/bucket/clip.mp4')
    })

    it('stores the raw url of a SCORM package with its entry point', () => {
      component.mimeType = 'application/vnd.ekstep.html-archive'
      component.file = new File(['x'], 'pkg.zip', { type: 'application/zip' })
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
      component.file = new File(['x'], 'pkg.zip', { type: 'application/zip' })
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

    it('clears the picked file and warns when the upload fails', () => {
      component.mimeType = 'application/pdf'
      component.uploadFileName = 'doc.pdf'
      uploadService.upload.mockReturnValue(throwError(() => new Error('network')))
      component.upload()
      expect(component.uploadFileName).toBe('')
      expect(component.file).toBeNull()
      expectNotified(Notify.UPLOAD_FILE_ERROR)
    })
  })

  // ---------------------------------------------------------- getassessment --

  describe('getassessment', () => {
    const routeWith = (contents: any[]) => ({
      parent: { parent: { data: of({ contents }) } },
    })

    beforeEach(() => {
      component.mediumSizeBreakpoint$ = of(false) as any
    })

    it('does nothing more without a grandparent route', () => {
      component.getassessment()
      changeActiveCont.next('do_quiz')
      expect(component.allLanguages).toEqual(['en', 'hi'])
      expect(quizResolverSvc.getUpdatedData).not.toHaveBeenCalled()
    })

    it('collapses the side navigation on a small screen', () => {
      component.mediumSizeBreakpoint$ = of(true) as any
      component.getassessment()
      changeActiveCont.next('do_quiz')
      expect(component.sideNavBarOpened).toBe(false)
      expect(component.showContent).toBe(false)
    })

    it('opens the side navigation on a wide screen', () => {
      component.getassessment()
      changeActiveCont.next('do_quiz')
      expect(component.sideNavBarOpened).toBe(true)
      expect(component.showContent).toBe(true)
    })

    it('seeds an empty quiz for a fresh assessment', () => {
      component.activateRoute = routeWith([{ content: { identifier: 'do_quiz' } }]) as any
      contentService.getOriginalMeta.mockReturnValue({ mimeType: 'application/json' })
      component.getassessment()
      changeActiveCont.next('do_quiz')
      expect(quizStoreSvc.collectiveQuiz.do_quiz).toEqual([])
      expect(component.currentId).toBe('do_quiz')
      expect(quizStoreSvc.changeQuiz).toHaveBeenCalledWith(0)
      expect(component.selectedQuizIndex).toBe(2)
    })

    it('ignores a resource that is not an assessment', () => {
      component.activateRoute = routeWith([{ content: { identifier: 'do_res' } }]) as any
      contentService.getOriginalMeta.mockReturnValue({ mimeType: 'application/pdf' })
      component.getassessment()
      changeActiveCont.next('do_res')
      expect(quizResolverSvc.getJSON).not.toHaveBeenCalled()
    })

    it('loads the stored questions of an existing assessment', () => {
      component.activateRoute = routeWith([{ content: { identifier: 'do_quiz' } }]) as any
      contentService.getOriginalMeta.mockReturnValue({
        mimeType: 'application/json',
        artifactUrl: 'https://cdn/bucket/q.json',
        categoryType: 'Quiz',
        duration: '600',
      })
      quizResolverSvc.getJSON.mockReturnValue(of({ assessmentDuration: 300, passPercentage: 70, questions: [{ id: 'q1' }] }))
      component.getassessment()
      changeActiveCont.next('do_quiz')
      expect(component.assessmentDuration).toBe(5)
      expect(component.passPercentage).toBe(70)
      expect(component.resourceType).toBe('Quiz')
      expect(component.quizDuration).toBe('600')
      expect(component.contentLoaded).toBe(true)
      expect(quizStoreSvc.collectiveQuiz.do_quiz).toEqual([{ id: 'q1' }])
    })

    it('starts from an empty question list when the payload carries none', () => {
      component.activateRoute = routeWith([{ content: { identifier: 'do_quiz' }, data: null }]) as any
      contentService.getOriginalMeta.mockReturnValue({
        mimeType: 'application/json',
        artifactUrl: 'https://cdn/bucket/q.json',
      })
      quizResolverSvc.getJSON.mockReturnValue(of({ assessmentDuration: 300, passPercentage: 70 }))
      quizResolverSvc.getUpdatedData.mockReturnValue(of([{ data: { questions: [{ id: 'fromResolver' }] } }]))
      component.getassessment()
      changeActiveCont.next('do_quiz')
      expect(quizStoreSvc.collectiveQuiz.do_quiz).toEqual([])
      expect(component.assessmentDuration).toBe(5)
    })

    it('re-reads the questions for the active id as a last resort', () => {
      component.activateRoute = routeWith([{ content: { identifier: 'do_quiz' }, data: null }]) as any
      contentService.getOriginalMeta.mockReturnValue({
        mimeType: 'application/json',
        artifactUrl: 'https://cdn/bucket/q.json',
      })
      quizResolverSvc.getJSON.mockReturnValue(of({ assessmentDuration: 300, passPercentage: 70 }))
      quizResolverSvc.getUpdatedData.mockReturnValueOnce(of([])).mockReturnValue(of([{ data: { questions: [{ id: 'late' }] } }]))
      component.getassessment()
      changeActiveCont.next('do_quiz')
      expect(component.currentId).toBe('do_quiz')
    })

    it('resets the assessment settings for an empty payload', () => {
      component.activateRoute = routeWith([{ content: { identifier: 'do_quiz' } }]) as any
      contentService.getOriginalMeta.mockReturnValue({
        mimeType: 'application/json',
        artifactUrl: 'https://cdn/bucket/q.json',
        duration: '450',
      })
      quizResolverSvc.getJSON.mockReturnValue(of({ onlyOneKey: true }))
      component.getassessment()
      changeActiveCont.next('do_quiz')
      expect(component.assessmentDuration).toBe('')
      expect(component.passPercentage).toBe('')
      expect(component.quizDuration).toBe('450')
      expect(component.contentLoaded).toBe(true)
    })
  })

  // -------------------------------------------------------- quiz editing --

  describe('quiz editing', () => {
    it('adds a question of the selected type', () => {
      component.assessmentOrQuizForm.controls.questionType.setValue('mcq-sca')
      quizStoreSvc.collectiveQuiz.do_res = [{ id: 'q1' }]
      component.addQuestion()
      expect(quizStoreSvc.addQuestion).toHaveBeenCalledWith('mcq-sca')
      expect(component.assessmentData).toEqual([{ id: 'q1' }])
    })

    it('opens the question editor and wires its change streams', () => {
      const stopPropagation = jest.fn()
      component.editAssessment(0, { stopPropagation }, { id: 'q1' })
      expect(stopPropagation).toHaveBeenCalled()
      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: expect.objectContaining({ type: 'editAssessment', index: 1 }) }),
      )
      onFormChange.next({ options: [{ isCorrect: true }, {}] })
      expect(quizStoreSvc.updateQuiz).toHaveBeenCalled()
      onFormQuestion.next({ question: 'new text' })
      expect(quizStoreSvc.updateQuiz).toHaveBeenCalledTimes(2)
      afterClosed.next(undefined)
    })

    it('merges the edited options into the stored quiz', () => {
      component.updateSelectedQuiz({ options: [{ isCorrect: true }, { isCorrect: false }] })
      const [index, updated] = quizStoreSvc.updateQuiz.mock.calls[0]
      expect(index).toBe(0)
      expect(updated.options[0]).toEqual({ text: 'a', isCorrect: true })
      expect(updated.options[1]).toEqual({ text: 'b', isCorrect: false })
    })

    it('replaces just the question text', () => {
      component.updateSelectedQuiz('new text', 'question')
      const [, updated] = quizStoreSvc.updateQuiz.mock.calls[0]
      expect(updated.question).toBe('new text')
    })

    it('validates the quiz when the edit left it invalid', () => {
      const validate = jest.spyOn(component, 'validateNdShowError')
      component.updateSelectedQuiz({ isInValid: true, options: [{}, {}] })
      expect(validate).toHaveBeenCalled()
    })

    it('says nothing when the quiz is valid', () => {
      component.validateNdShowError(true)
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })

    it('reports the validation error when asked to', () => {
      quizStoreSvc.validateQuiz.mockReturnValue('NO_CORRECT_ANSWER')
      component.validateNdShowError(true)
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: 'NO_CORRECT_ANSWER' },
        duration: expect.any(Number),
      })
    })

    it('stays quiet when it was not asked to show the error', () => {
      quizStoreSvc.validateQuiz.mockReturnValue('NO_CORRECT_ANSWER')
      component.validateNdShowError()
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------- saveCourseDetails --

  describe('saveCourseDetails', () => {
    beforeEach(() => {
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(3600 as any)
      jest.spyOn(component, 'clearForm').mockImplementation(() => {})
      component.content = { identifier: 'do_course' } as any
      component.thumbnail = 'thumb.png'
      component.topicDescription = 'About the course'
    })

    it('refuses a blank course name', async () => {
      component.moduleName = '   '
      await component.saveCourseDetails()
      await flush()
      expectNotified(Notify.INVALID_COURSE_NAME)
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('saves the course details and refreshes', async () => {
      component.moduleName = '  My course  '
      component.isGating = true
      editorService.readcontentV3.mockReturnValue(of({ identifier: 'do_course', versionKey: 'vkC', children: [] }))
      await component.saveCourseDetails()
      await flush()
      expect(editorService.updateNewContentV3).toHaveBeenCalledWith(
        {
          request: {
            content: {
              versionKey: 'vkC',
              name: 'My course',
              appIcon: 'thumb.png',
              gatingEnabled: true,
              instructions: 'About the course',
              thumbnail: 'thumb.png',
              duration: '3600',
            },
          },
        },
        'do_course',
      )
      expectNotified(Notify.SAVE_SUCCESS)
      expect(component.clearForm).toHaveBeenCalled()
    })

    it('still finishes when the update call fails', async () => {
      editorService.updateNewContentV3.mockReturnValue(throwError(() => new Error('boom')))
      component.moduleName = 'My course'
      await component.saveCourseDetails()
      await flush()
      expectNotified(Notify.SAVE_SUCCESS)
    })
  })
})
