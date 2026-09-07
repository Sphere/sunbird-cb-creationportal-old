import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { ModuleCreationComponent } from './module-creation.component'

/**
 * Wave 18 — the resource authoring surface of ModuleCreationComponent:
 * `resourceLinkSave`, `deleteUploadedFile`, `updateCouseDuration`,
 * `createResourseContent`, `addResModule`, `addIndependentResource`,
 * `editContent`, `editAssessmentRes`, `addAssessment` and `uploadAppIcon`.
 * Direct instantiation, as with the sibling specs.
 */
describe('ModuleCreationComponent (resource authoring)', () => {
  let component: ModuleCreationComponent
  let cdr: any
  let dialog: any
  let contentService: any
  let snackBar: any
  let loader: any
  let uploadService: any
  let http: any
  let initService: any
  let editorService: any
  let storeService: any
  let configurationsService: any
  let valueSvc: any
  let quizResolverSvc: any

  let afterClosed: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  beforeEach(() => {
    afterClosed = new Subject<any>()

    cdr = { detectChanges: jest.fn() }
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable(), close: jest.fn() }),
      closeAll: jest.fn(),
    }
    contentService = {
      changeActiveCont: new Subject<string>(),
      parentContent: 'do_course',
      currentContent: 'do_res',
      upDatedContent: {},
      originalContent: { do_course: { status: 'Draft' } },
      getUpdatedMeta: jest.fn().mockReturnValue({ contentType: 'Resource', versionKey: 'vkMeta' }),
      getOriginalMeta: jest.fn().mockReturnValue(null),
      parentUpdatedMeta: jest.fn().mockReturnValue(null),
      setUpdatedMeta: jest.fn(),
      setOriginalMeta: jest.fn(),
      cleanProperties: jest.fn((c: any) => ({ ...c })),
      resetOriginalMeta: jest.fn(),
      resetOriginalMetaWithHierarchy: jest.fn(),
      removeListOfFilesAndUpdatedIPR: jest.fn(),
      updateListOfUpdatedIPR: jest.fn(),
      resetStatus: jest.fn().mockReturnValue(false),
      changeStatusDraft: jest.fn(),
      getNodeModifyData: jest.fn().mockReturnValue({}),
    }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    uploadService = { upload: jest.fn().mockReturnValue(of({ name: 'ok', artifactUrl: 'https://cdn/bucket/x.png' })) }
    http = { post: jest.fn().mockReturnValue(of({ result: { identifier: 'asset_1' } })) }
    initService = {
      backToHomeMessage: new Subject<any>(),
      updateResourceMessage: new Subject<any>(),
      ordinals: { subTitles: ['en'] },
      authConfig: new Proxy({}, { get: () => ({ type: 'string', defaultValue: { Resource: [{ value: '' }] } }) }),
      collectionConfig: { childrenConfig: {}, maxDepth: 4 },
      updateAssessment: jest.fn(),
      isAssessmentOrQuizAction: jest.fn(),
      uploadData: jest.fn(),
      publishData: jest.fn(),
    }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_course', versionKey: 'vkRead', children: [] })),
      readContentV2: jest.fn().mockReturnValue(of({ identifier: 'do_res', name: 'Read name', versionKey: 'vkV2' })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      newCreatedLexid: 'do_new',
      resourseID: 'do_new',
    }
    storeService = {
      currentParentNode: 3,
      parentNode: ['do_course'],
      parentData: null,
      changedHierarchy: {},
      flatNodeMap: new Map(),
      uniqueIdMap: new Map(),
      lexIdMap: new Map([['do_new', [7]]]),
      uploadFileType: { next: jest.fn() },
      treeStructureChange: { next: jest.fn() },
      selectedNodeChange: { next: jest.fn() },
      getTreeHierarchy: jest.fn().mockReturnValue({}),
      getNewTreeHierarchy: jest.fn().mockReturnValue({ do_course: { children: [] } }),
      createChildOrSibling: jest.fn().mockResolvedValue(true),
      validationCheck: jest.fn().mockReturnValue(null),
      deleteContentNode: jest.fn(),
    }
    configurationsService = {
      userProfile: { userId: 'u1', userName: 'User One', email: 'u1@x.com' },
      instanceConfig: { logos: { defaultContent: 'default.png' } },
    }
    valueSvc = { isLtMedium$: of(false), isXSmall$: of(false) }
    quizResolverSvc = { getJSON: jest.fn().mockReturnValue(of({ isAssessment: true, questions: [] })) }
    ;(window as any).env = { azureBucket: 'bucket' }

    component = new ModuleCreationComponent(
      cdr,
      dialog,
      contentService,
      { parent: null } as any,
      { navigate: jest.fn(), navigateByUrl: jest.fn(), url: '/author' } as any,
      { startProfanity: jest.fn().mockReturnValue(of({})) } as any,
      snackBar,
      loader,
      { userId: 'u1', userName: 'User One', hasRole: jest.fn().mockReturnValue(false) } as any,
      uploadService,
      http,
      initService,
      editorService,
      storeService,
      configurationsService,
      { buildTreeAndMap: jest.fn(), hasAccess: jest.fn().mockReturnValue(true) } as any,
      { showCreatorHeader: jest.fn() } as any,
      valueSvc,
      new FormBuilder(),
      { getQuizConfig: jest.fn().mockReturnValue({}) } as any,
      quizResolverSvc,
      { observe: jest.fn().mockReturnValue(of({ matches: false })) } as any,
      { addComment: jest.fn().mockReturnValue(of({})) } as any,
      { downloadResource: jest.fn(), downloadAllAsZip: jest.fn(), hasDownloadableResources: jest.fn() } as any,
    )
    component.currentCourseId = 'do_course'
    component.currentParentId = 'do_course'
    component.currentContent = 'do_res'
    component.versionKey = { versionKey: 'vkMeta' } as any
    component.courseData = { identifier: 'do_course', children: [] } as any
    component.content = { identifier: 'do_res', versionKey: 'vkContent', mimeType: 'text/x-url' } as any
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

  // ------------------------------------------------------- resourceLinkSave --

  describe('resourceLinkSave', () => {
    /** Fills the link form so it validates. */
    const fillValidForm = (over: any = {}) => {
      component.resourceLinkForm.patchValue({
        name: 'My resource',
        artifactUrl: 'https://example.com/page',
        instructions: 'do this',
        duration: 10,
        ...over,
      })
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(60 as any)
    }

    beforeEach(() => {
      jest.spyOn(component, 'saves').mockResolvedValue(undefined)
      jest.spyOn(component, 'clearForm').mockImplementation(() => {})
    })

    it('refuses to save an incomplete form', async () => {
      await component.resourceLinkSave()
      expectNotified(Notify.REQUIRED_FIELD)
      expect(component.saves).not.toHaveBeenCalled()
    })

    it('refuses a zero duration', async () => {
      fillValidForm()
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(0 as any)
      await component.resourceLinkSave()
      expectNotified(Notify.DURATION_CANT_BE_0)
      expect(component.saves).not.toHaveBeenCalled()
    })

    it('allows a zero duration on an assessment', async () => {
      component.isAssessmentOrQuizEnabled = true
      fillValidForm()
      jest.spyOn(component, 'timeToSeconds').mockReturnValue(0 as any)
      await component.resourceLinkSave()
      expect(component.saves).toHaveBeenCalled()
    })

    it('stores a valid link resource and clears the form', async () => {
      fillValidForm()
      component.updatedVersionKey = 'vkUpd'
      await component.resourceLinkSave()
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My resource',
          artifactUrl: 'https://example.com/page',
          description: 'do this',
          isIframeSupported: 'No',
          versionKey: 'vkUpd',
        }),
        'do_res',
      )
      expect(component.saves).toHaveBeenCalled()
      expect(component.clearForm).toHaveBeenCalled()
      expect(component.editItem).toBe('')
    })

    it('marks the resource as iframe supported when the flag is on', async () => {
      fillValidForm({ isIframeSupported: true })
      await component.resourceLinkSave()
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(expect.objectContaining({ isIframeSupported: 'Yes' }), 'do_res')
    })

    it('carries the answer-popup flag for an assessment resource', async () => {
      // isAssessmentResource is derived from the loaded content.
      component.content = { mimeType: 'application/json', isAssessment: true, isCorrectAnswerPopUp: false } as any
      fillValidForm()
      await component.resourceLinkSave()
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(expect.objectContaining({ isCorrectAnswerPopUp: false }), 'do_res')
    })

    it('defaults the answer-popup flag when the content has none', async () => {
      component.content = { mimeType: 'application/json', isAssessment: true } as any
      fillValidForm()
      await component.resourceLinkSave()
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(expect.objectContaining({ isCorrectAnswerPopUp: true }), 'do_res')
    })

    it('rejects a blank name on a valid link', async () => {
      fillValidForm({ name: '   ' })
      await component.resourceLinkSave()
      expectNotified(Notify.INVALID_RESOURCE_NAME)
      expect(component.saves).not.toHaveBeenCalled()
    })

    it('rejects a malformed link', async () => {
      fillValidForm({ artifactUrl: 'not a url' })
      await component.resourceLinkSave()
      expectNotified(Notify.LINK_IS_INVALID)
      expect(component.saves).not.toHaveBeenCalled()
    })

    it('saves an assessment that carries no link at all', async () => {
      component.isAssessmentOrQuizEnabled = true
      fillValidForm({ artifactUrl: 'not a url' })
      await component.resourceLinkSave()
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'My resource', versionKey: 'vkMeta' }),
        'do_res',
      )
      expect(component.saves).toHaveBeenCalled()
    })

    it('rejects a blank name on a link-less assessment', async () => {
      component.isAssessmentOrQuizEnabled = true
      fillValidForm({ artifactUrl: 'not a url', name: '  ' })
      await component.resourceLinkSave()
      expectNotified(Notify.INVALID_RESOURCE_NAME)
    })

    it('carries the answer-popup flag on a link-less assessment', async () => {
      component.isAssessmentOrQuizEnabled = true
      component.content = { mimeType: 'application/json', isAssessment: true, isCorrectAnswerPopUp: true } as any
      fillValidForm({ artifactUrl: 'not a url' })
      await component.resourceLinkSave()
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(expect.objectContaining({ isCorrectAnswerPopUp: true }), 'do_res')
    })
  })

  // ------------------------------------------------------ deleteUploadedFile --

  describe('deleteUploadedFile', () => {
    beforeEach(() => {
      jest.spyOn(component, 'getChildrenCount').mockReturnValue(undefined as any)
      jest.spyOn(component, 'updateCouseDuration').mockImplementation(() => {})
    })

    it('does nothing when the confirmation is declined', async () => {
      await component.deleteUploadedFile()
      afterClosed.next(false)
      expect(contentService.removeListOfFilesAndUpdatedIPR).not.toHaveBeenCalled()
    })

    it('clears the upload and pushes the emptied metadata', async () => {
      component.uploadFileName = 'old.pdf'
      component.content = { identifier: 'do_res', versionKey: 'vkContent', mimeType: 'application/pdf' } as any
      await component.deleteUploadedFile()
      afterClosed.next(true)
      expect(contentService.removeListOfFilesAndUpdatedIPR).toHaveBeenCalledWith('do_res')
      expect(component.uploadFileName).toBe('')
      expect(component.file).toBeNull()
      expect(component.duration).toBe('0')
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(
        expect.objectContaining({ versionKey: 'vkContent', artifactUrl: null, downloadUrl: null }),
        'do_res',
      )
      expectNotified(Notify.UPLOAD_FILE_REMOVED)
    })

    it('also resets the duration and questions for a video', async () => {
      component.content = { identifier: 'do_res', versionKey: 'vkContent', mimeType: 'video/mp4' } as any
      await component.deleteUploadedFile()
      afterClosed.next(true)
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.duration).toBe('0')
      expect(meta.videoQuestions).toEqual([])
      expect(component.updateCouseDuration).toHaveBeenCalled()
    })

    it('also resets the duration for audio', async () => {
      component.content = { identifier: 'do_res', versionKey: 'vkContent', mimeType: 'audio/mpeg' } as any
      await component.deleteUploadedFile()
      afterClosed.next(true)
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.duration).toBe('0')
    })

    it('reloads the preview player when one is mounted', async () => {
      const load = jest.fn()
      component.videoPlayer = { nativeElement: { load } } as any
      await component.deleteUploadedFile()
      afterClosed.next(true)
      expect(load).toHaveBeenCalled()
    })

    it('unlocks the settings page when two children remain', async () => {
      editorService.readcontentV3.mockReturnValue(of({ identifier: 'do_course', children: [{ identifier: 'a' }, { identifier: 'b' }] }))
      await component.deleteUploadedFile()
      afterClosed.next(true)
      expect(component.showSettingsPage).toBe(true)
    })

    it('keeps the settings page locked with a single child', async () => {
      editorService.readcontentV3.mockReturnValue(of({ identifier: 'do_course', children: [{ identifier: 'a' }] }))
      await component.deleteUploadedFile()
      afterClosed.next(true)
      expect(component.showSettingsPage).toBe(false)
    })

    it('stops when the metadata update returns nothing', async () => {
      editorService.updateNewContentV3.mockReturnValue(of(null))
      await component.deleteUploadedFile()
      afterClosed.next(true)
      expect(editorService.updateContentV4).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------- updateCouseDuration --

  describe('updateCouseDuration', () => {
    it('sums the durations of every resource and nested resource', () => {
      const setCourseDuration = jest.spyOn(component as any, 'setCourseDuration').mockImplementation(() => {})
      component.updateCouseDuration({
        versionKey: 'vk',
        children: [
          { duration: '30', children: [{ duration: '20' }] },
          { duration: '10', children: [] },
        ],
      })
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.duration).toBe('60')
      expect(body.request.content.versionKey).toBe('vk')
      expect(setCourseDuration).toHaveBeenCalledWith('60')
    })

    it('posts a zero duration for a childless course', () => {
      component.updateCouseDuration({ versionKey: 'vk', children: [] })
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.duration).toBe('0')
    })

    it('posts a zero duration when no child declares one', () => {
      component.updateCouseDuration({ versionKey: 'vk', children: [{ children: [] }] })
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.duration).toBe('0')
    })
  })

  // --------------------------------------------------- createResourseContent --

  describe('createResourseContent', () => {
    beforeEach(() => {
      jest.spyOn(component, 'setContentType').mockResolvedValue(undefined)
    })

    it('configures a link resource', () => {
      component.createResourseContent('Link', 'link')
      expect(component.isLinkEnabled).toBe(true)
      expect(component.isPdfOrAudioOrVedioEnabled).toBe(false)
      expect(component.setContentType).toHaveBeenCalledWith('link', 'url')
      expect(component.isLinkPageEnabled).toBe(true)
      expect(component.isResourceTypeEnabled).toBe(false)
    })

    it('names each new independent resource in sequence', () => {
      component.createResourseContent('Link', 'link')
      component.createResourseContent('Link', 'link')
      expect(component.independentResourceNames).toEqual([{ name: 'Resource 1' }, { name: 'Resource 2' }])
    })

    it('configures a PDF resource', () => {
      component.createResourseContent('PDF', 'pdf')
      expect(component.uploadText).toBe('PDF')
      expect(component.acceptType).toBe('.pdf')
      expect(component.isShowDownloadBtnEnabled).toBe(true)
      expect(component.setContentType).toHaveBeenCalledWith('pdf', 'pdf')
    })

    it('configures an audio resource', () => {
      component.createResourseContent('Audio', 'audio')
      expect(component.uploadText).toBe('mp3')
      expect(component.acceptType).toBe('.mp3')
      expect(component.setContentType).toHaveBeenCalledWith('audio', 'audio')
    })

    it('configures a video resource and resets the player', () => {
      const load = jest.fn()
      component.videoPlayer = { nativeElement: { load } } as any
      component.videoQuestions = [{ q: 1 }] as any
      component.createResourseContent('Video', 'video')
      expect(component.videoQuestions).toEqual([])
      expect(component.uploadVideoUrl).toBe('')
      expect(load).toHaveBeenCalled()
      expect(component.acceptType).toBe('.mp4, .m4v')
    })

    it('configures a video resource without a mounted player', () => {
      component.videoPlayer = undefined as any
      component.createResourseContent('Video', 'video')
      expect(component.uploadText).toBe('mp4, m4v')
    })

    it('configures a SCORM package', () => {
      component.createResourseContent('SCORM v1.1/1.2', 'zip')
      expect(component.acceptType).toBe('.zip')
      expect(component.isShowDownloadBtnEnabled).toBe(false)
      expect(component.setContentType).toHaveBeenCalledWith('zip', 'zip')
    })

    it('configures an assessment', () => {
      component.createResourseContent('Assessment', 'assessment')
      expect(component.assessment).toBe(true)
      expect(component.isAssessmentOrQuizEnabled).toBe(true)
      expect(sessionStorage.getItem('assessment')).toBe('true')
      expect(component.setContentType).toHaveBeenCalledWith('assessment')
    })

    it('configures a quiz', () => {
      component.createResourseContent('Quiz', 'quiz')
      expect(component.assessment).toBe(false)
      expect(component.isAssessmentOrQuizEnabled).toBe(true)
      expect(sessionStorage.getItem('quiz')).toBe('true')
    })

    it('still flips the page state for an unknown resource type', () => {
      component.createResourseContent('Unknown', 'x')
      expect(component.setContentType).not.toHaveBeenCalled()
      expect(component.isOnClickOfResourceTypeEnabled).toBe(true)
    })
  })

  // --------------------------------------------- module / independent adding --

  describe('module and resource adding', () => {
    beforeEach(() => {
      jest.spyOn(component, 'clearForm').mockImplementation(() => {})
    })

    it('hides the resource picker when the selection is cancelled', () => {
      component.showAddModuleForm = true
      component.cancelResouceSelection()
      expect(component.showAddModuleForm).toBe(false)
    })

    it('opens a blank module form', () => {
      const moduleCreate = jest.spyOn(component, 'moduleCreate').mockImplementation(() => {})
      component.addModule()
      expect(component.moduleButtonName).toBe('Create')
      expect(moduleCreate).toHaveBeenCalledWith('Module Name', 'Module Name', '')
      expect(component.editItem).toBe('')
    })

    it('toggles a module open and closed', () => {
      component.toggleChildren({ identifier: 'do_m1' })
      expect(component.showChildrenMap['do_m1']).toBe(true)
      component.toggleChildren({ identifier: 'do_m1' })
      expect(component.showChildrenMap['do_m1']).toBe(false)
    })

    it('targets a module when adding a resource inside it', async () => {
      await component.addResModule('do_unit', 'do_course')
      expect(component.addResourceModule).toEqual(expect.objectContaining({ module: true, modID: 'do_unit', courseID: 'do_course' }))
      expect(component.showAddModuleForm).toBe(true)
      expect(component.updatedVersionKey).toBe('vkV2')
    })

    it('confirms before adding a resource outside any module', async () => {
      await component.addIndependentResource()
      afterClosed.next('New')
      expect(component.addResourceModule).toEqual(expect.objectContaining({ module: false, modID: 'do_course', courseID: 'do_course' }))
      expect(component.isResourceTypeEnabled).toBe(true)
      expect(component.updatedVersionKey).toBe('vkV2')
      expect(component.editItem).toBe('')
    })

    it('backs out when the confirmation is declined', async () => {
      await component.addIndependentResource()
      afterClosed.next('Cancel')
      expect(component.showAddModuleForm).toBe(false)
      expect(editorService.readContentV2).not.toHaveBeenCalled()
    })

    it('falls back to a blank image source with no instance config', () => {
      configurationsService.instanceConfig = null
      const target = { src: 'broken.png' }
      component.changeToDefaultImg({ target })
      expect(target.src).toBe('')
    })

    it('swaps in the default content image when one is configured', () => {
      const target = { src: 'broken.png' }
      component.changeToDefaultImg({ target })
      expect(target.src).toBe('default.png')
    })
  })

  // ----------------------------------------------------------- editContent --

  describe('editContent', () => {
    const content = (over: any = {}) => ({
      identifier: 'do_res',
      name: 'Resource A',
      contentType: 'Resource',
      mimeType: 'text/x-url',
      instructions: '<p>read <b>this</b></p>',
      duration: '60',
      ...over,
    })

    it('re-reads a resource to pick up its latest version key', async () => {
      await component.editContent(content())
      expect(editorService.readContentV2).toHaveBeenCalledWith('do_res')
      expect(component.updatedVersionKey).toBe('vkV2')
      expect(component.moduleButtonName).toBe('Save')
      expect(component.editItem).toBe('do_res')
    })

    it('does not re-read a CourseUnit', async () => {
      await component.editContent(content({ contentType: 'CourseUnit', mimeType: 'application/vnd.ekstep.content-collection' }))
      expect(editorService.readContentV2).not.toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('strips the markup out of the instructions', async () => {
      editorService.readContentV2.mockReturnValue(of(content({ instructions: '<p>read <b>this</b></p>' })))
      await component.editContent(content())
      expect(component.topicDescription).toBe('read this')
    })

    it('leaves the description empty when there are no instructions', async () => {
      editorService.readContentV2.mockReturnValue(of(content({ instructions: undefined })))
      await component.editContent(content({ instructions: undefined }))
      expect(component.topicDescription).toBe('')
    })

    it('maps the iframe and download flags', async () => {
      editorService.readContentV2.mockReturnValue(of(content({ isIframeSupported: 'Yes', showDownloadBtn: 'Yes', gatingEnabled: true })))
      await component.editContent(content())
      expect(component.isNewTab).toBe(true)
      expect(component.isShowBtn).toBe(true)
      expect(component.isGating).toBe(true)
    })

    it('opens a link resource in the link editor', async () => {
      editorService.readContentV2.mockReturnValue(of(content({ artifactUrl: 'https://x.com' })))
      await component.editContent(content())
      expect(component.isLinkEnabled).toBe(true)
      expect(component.editResourceLinks).toBe('https://x.com')
    })

    it('falls back to a blank link when the resource has no url', async () => {
      editorService.readContentV2.mockReturnValue(of(content({ artifactUrl: undefined })))
      await component.editContent(content())
      expect(component.editResourceLinks).toBe('')
    })

    it('opens a PDF in the upload editor', async () => {
      const pdf = content({ mimeType: 'application/pdf', artifactUrl: 'https://cdn/dir/file.pdf' })
      editorService.readContentV2.mockReturnValue(of(pdf))
      await component.editContent(pdf)
      expect(component.uploadFileName).toBe('file.pdf')
      expect(component.acceptType).toBe('.pdf')
      expect(component.isPdfOrAudioOrVedioEnabled).toBe(true)
    })

    it('opens an audio resource in the upload editor', async () => {
      const audio = content({ mimeType: 'audio/mpeg', artifactUrl: 'https://cdn/dir/song.mp3' })
      editorService.readContentV2.mockReturnValue(of(audio))
      await component.editContent(audio)
      expect(component.uploadFileName).toBe('song.mp3')
      expect(component.acceptType).toBe('.mp3')
    })

    it('opens an audio resource with no artifact', async () => {
      const audio = content({ mimeType: 'audio/mpeg', artifactUrl: undefined })
      editorService.readContentV2.mockReturnValue(of(audio))
      await component.editContent(audio)
      expect(component.uploadFileName).toBe('')
    })

    it('opens a video and restores its in-video questions', async () => {
      const load = jest.fn()
      component.videoPlayer = { nativeElement: { load } } as any
      const video = content({
        mimeType: 'video/mp4',
        artifactUrl: 'https://cdn/dir/clip.mp4',
        videoQuestions: JSON.stringify([{ question: 'q1' }]),
      })
      editorService.readContentV2.mockReturnValue(of(video))
      await component.editContent(video)
      expect(component.uploadVideoUrl).toBe('https://cdn/dir/clip.mp4')
      expect(component.videoQuestions).toEqual([{ question: 'q1' }])
      expect(load).toHaveBeenCalled()
    })

    it('opens a video with no questions and no player', async () => {
      component.videoPlayer = undefined as any
      const video = content({ mimeType: 'video/mp4', artifactUrl: undefined })
      editorService.readContentV2.mockReturnValue(of(video))
      await component.editContent(video)
      expect(component.videoQuestions).toEqual([])
      expect(component.uploadVideoUrl).toBe('')
    })

    it('opens a SCORM archive in the upload editor', async () => {
      const zip = content({ mimeType: 'application/vnd.ekstep.html-archive', artifactUrl: 'https://cdn/dir/p.zip' })
      editorService.readContentV2.mockReturnValue(of(zip))
      await component.editContent(zip)
      expect(component.uploadFileName).toBe('p.zip')
      expect(component.acceptType).toBe('.zip')
      expect(component.isShowDownloadBtnEnabled).toBe(false)
    })

    it('reads the quiz JSON of an existing assessment', async () => {
      const quiz = content({ mimeType: 'application/json', artifactUrl: 'https://cdn/bucket/quiz.json' })
      editorService.readContentV2.mockReturnValue(of(quiz))
      quizResolverSvc.getJSON.mockReturnValue(of({ isAssessment: true, questions: [] }))
      await component.editContent(quiz)
      expect(quizResolverSvc.getJSON).toHaveBeenCalled()
      expect(initService.isAssessmentOrQuizAction).toHaveBeenCalledWith(true)
      expect(component.assessmentOrQuizName).toBe('Assessment')
      expect(component.isAddOrEdit).toBe(true)
    })

    it('treats a quiz with no artifact as a fresh one', async () => {
      const quiz = content({ mimeType: 'application/json', artifactUrl: undefined, downloadUrl: undefined })
      editorService.readContentV2.mockReturnValue(of(quiz))
      await component.editContent(quiz)
      expect(quizResolverSvc.getJSON).not.toHaveBeenCalled()
      expect(component.isAddOrEdit).toBe(false)
    })

    it('ignores a quiz payload that carries no assessment flag', async () => {
      const quiz = content({ mimeType: 'application/json', artifactUrl: 'https://cdn/bucket/q.json' })
      editorService.readContentV2.mockReturnValue(of(quiz))
      quizResolverSvc.getJSON.mockReturnValue(of({ questions: [], other: 1 }))
      await component.editContent(quiz)
      expect(initService.isAssessmentOrQuizAction).not.toHaveBeenCalled()
    })

    it('ignores an all-but-empty quiz payload', async () => {
      const quiz = content({ mimeType: 'application/json', artifactUrl: 'https://cdn/bucket/q.json' })
      editorService.readContentV2.mockReturnValue(of(quiz))
      quizResolverSvc.getJSON.mockReturnValue(of({ isAssessment: true }))
      await component.editContent(quiz)
      expect(initService.isAssessmentOrQuizAction).not.toHaveBeenCalled()
    })

    it('seeds the answer-popup flag on an assessment that lacks one', async () => {
      editorService.readContentV2.mockReturnValue(of(content({ isAssessment: true })))
      await component.editContent(content({ isAssessment: true }))
      expect(component.content.isCorrectAnswerPopUp).toBe(false)
    })

    it('leaves a self assessment untouched', async () => {
      component.isSelfAssessment = true
      editorService.readContentV2.mockReturnValue(of(content({ isAssessment: true })))
      await component.editContent(content({ isAssessment: true }))
      expect(component.content.isCorrectAnswerPopUp).toBeUndefined()
    })
  })

  // ------------------------------------------------------- editAssessmentRes --

  describe('editAssessmentRes', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('mounts a self assessment straight away', () => {
      component.isSelfAssessment = true
      component.editAssessmentRes({ identifier: 'do_quiz' })
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      jest.advanceTimersByTime(50)
      expect(initService.updateAssessment).toHaveBeenCalledWith({ identifier: 'do_quiz' })
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('mounts the builder directly when the name did not change', () => {
      component.moduleName = 'Same'
      component.editAssessmentRes({ identifier: 'do_quiz', name: 'Same' })
      jest.advanceTimersByTime(50)
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
      expect(initService.updateAssessment).toHaveBeenCalled()
    })

    it('renames the assessment before mounting the builder', () => {
      component.moduleName = 'Renamed'
      component.updatedVersionKey = 'vkUpd'
      component.editAssessmentRes({ identifier: 'do_quiz', name: 'Old' })
      expect(editorService.updateNewContentV3).toHaveBeenCalledWith(
        { request: { content: { name: 'Renamed', versionKey: 'vkUpd' } } },
        'do_res',
      )
      expect(component.editItem).toBe('')
      expect(initService.updateAssessment).toHaveBeenCalled()
    })

    it('drops the loader when the rename returns nothing', () => {
      editorService.updateNewContentV3.mockReturnValue(of(null))
      component.moduleName = 'Renamed'
      component.editAssessmentRes({ identifier: 'do_quiz', name: 'Old' })
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(initService.updateAssessment).not.toHaveBeenCalled()
    })

    it('drops the loader when the rename fails', () => {
      editorService.updateNewContentV3.mockReturnValue(throwError(() => new Error('boom')))
      component.moduleName = 'Renamed'
      component.editAssessmentRes({ identifier: 'do_quiz', name: 'Old' })
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  // ---------------------------------------------------------- addAssessment --

  describe('addAssessment', () => {
    it('mounts the builder directly when the form has no name', async () => {
      await component.addAssessment()
      expect(component.viewMode).toBe('assessment')
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
      expect(initService.updateAssessment).toHaveBeenCalledWith(expect.objectContaining({ type: 'assessment', identifier: 'do_res' }))
    })

    it('renames the assessment from the form before mounting', async () => {
      component.resourceLinkForm.controls.name.setValue('My quiz')
      component.updatedVersionKey = 'vkUpd'
      await component.addAssessment()
      expect(editorService.updateNewContentV3).toHaveBeenCalledWith(
        { request: { content: { name: 'My quiz', versionKey: 'vkUpd' } } },
        'do_res',
      )
      expect(component.editItem).toBe('')
      expect(initService.updateAssessment).toHaveBeenCalled()
      expect(loader.changeLoadState).toHaveBeenLastCalledWith(false)
    })

    it('does not mount when the rename returns nothing', async () => {
      editorService.updateNewContentV3.mockReturnValue(of(null))
      component.resourceLinkForm.controls.name.setValue('My quiz')
      await component.addAssessment()
      expect(initService.updateAssessment).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------- uploadAppIcon --

  describe('uploadAppIcon', () => {
    const imageFile = (name = 'icon.png', size = 1000) => ({ name, size }) as File
    const cropped = () => new File(['bytes'], 'cropped.png', { type: 'image/png' })

    it('rejects a non-image file', () => {
      component.uploadAppIcon(imageFile('notes.txt'))
      expectNotified(Notify.INVALID_FORMAT)
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('rejects an oversized image', () => {
      component.uploadAppIcon(imageFile('icon.png', 100 * 1024 * 1024))
      expectNotified(Notify.SIZE_ERROR)
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('stores the uploaded icon against the resource and saves it', () => {
      uploadService.upload.mockReturnValue(
        of({ name: 'ok', artifactUrl: 'https://cdn/bucket/x.png', content_url: 'https://cdn/bucket/t.png' }),
      )
      component.content = { identifier: 'do_res', contentType: 'Resource' } as any
      component.courseData = { identifier: 'do_course', versionKey: 'vkCourse', children: [] } as any
      component.uploadAppIcon(imageFile())
      afterClosed.next(cropped())
      expect(http.post).toHaveBeenCalled()
      expect(uploadService.upload).toHaveBeenCalled()
      expect(component.thumbnail).toBe('https://cdn/bucket/t.png')
      expect(contentService.setUpdatedMeta).toHaveBeenCalledWith(
        expect.objectContaining({ appIcon: 'https://cdn/bucket/x.png', versionKey: 'vkCourse' }),
        'do_res',
      )
      expect(editorService.updateNewContentV3).toHaveBeenCalled()
    })

    it('pushes the hierarchy instead for a module icon', () => {
      const updateSpy = jest.spyOn(component, 'update').mockResolvedValue(undefined)
      component.content = { identifier: 'do_unit', contentType: 'CourseUnit' } as any
      component.uploadAppIcon(imageFile())
      afterClosed.next(cropped())
      expect(updateSpy).toHaveBeenCalled()
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('does nothing when the crop is cancelled', () => {
      component.uploadAppIcon(imageFile())
      afterClosed.next(undefined)
      expect(http.post).not.toHaveBeenCalled()
    })

    it('ignores an error payload from the upload', () => {
      uploadService.upload.mockReturnValue(of({ name: 'Error', message: 'nope' }))
      component.uploadAppIcon(imageFile())
      afterClosed.next(cropped())
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })
  })
})
