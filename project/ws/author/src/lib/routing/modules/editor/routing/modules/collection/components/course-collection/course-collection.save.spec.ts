import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { CourseCollectionComponent } from './course-collection.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

/**
 * Wave 18 — the save path of CourseCollectionComponent: `setContentType`,
 * `tempSave`, `save`, `triggerSave`, `update`, `getMessage`, `subAction` and the
 * step-validity handlers. Direct instantiation, as with the sibling specs.
 */
describe('CourseCollectionComponent (save path)', () => {
  let component: CourseCollectionComponent
  let contentService: any
  let storeService: any
  let initService: any
  let loaderService: any
  let dialog: any
  let snackBar: any
  let editorService: any
  let router: any
  let configurationsService: any
  let cdr: any

  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const meta = (over: any = {}) => ({
    identifier: 'do_course',
    status: 'Draft',
    contentType: 'Course',
    versionKey: 'vkCourse',
    createdBy: 'u1',
    children: [],
    ...over,
  })

  const cleanProperties = (objParam: any) => {
    const obj = { ...objParam }
    Object.getOwnPropertyNames(obj).forEach(p => {
      const v = (obj as any)[p]
      if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
        delete (obj as any)[p]
      }
    })
    return obj
  }

  beforeEach(() => {
    sessionStorage.clear()
    changeActiveCont = new Subject<string>()
    afterClosed = new Subject<any>()

    contentService = {
      changeActiveCont,
      parentContent: 'do_course',
      currentContent: 'do_course',
      originalContent: { do_course: meta() },
      upDatedContent: {},
      currentContentData: null,
      currentContentID: '',
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      getOriginalMeta: jest.fn().mockReturnValue(meta()),
      setOriginalMeta: jest.fn(),
      checkConditionV2: jest.fn().mockReturnValue(true),
      cleanProperties: jest.fn(cleanProperties),
      resetOriginalMeta: jest.fn(),
      resetOriginalMetaWithHierarchy: jest.fn(),
      resetStatus: jest.fn().mockReturnValue(false),
      changeStatusDraft: jest.fn(),
      getNodeModifyData: jest.fn().mockReturnValue({}),
    }
    storeService = {
      parentNode: ['do_course'],
      parentData: null,
      currentParentNode: 1,
      currentSelectedNode: 1,
      changedHierarchy: {},
      lexIdMap: new Map<string, number[]>([
        ['do_course', [1]],
        ['do_new', [9]],
      ]),
      uniqueIdMap: new Map([[1, 'do_course']]),
      flatNodeMap: new Map(),
      selectedNodeChange: { next: jest.fn() },
      treeStructureChange: { next: jest.fn() },
      uploadFileType: { next: jest.fn() },
      getTreeHierarchy: jest.fn().mockReturnValue({}),
      getNewTreeHierarchy: jest.fn().mockReturnValue({ do_course: { children: [] } }),
      validationCheck: jest.fn().mockReturnValue(null),
      createChildOrSibling: jest.fn().mockResolvedValue(true),
    }
    initService = {
      currentMessage: new Subject<any>(),
      currentNavigationMessage: new Subject<any>(),
      isBackButtonClickedMessage: new Subject<any>(),
      publishMessage: new Subject<any>(),
      isBackButtonFromAssessmentClickedMessage: new Subject<any>(),
      uploadMessage: new Subject<any>(),
      saveContentMessage: new Subject<any>(),
      createModuleMessage: new Subject<any>(),
      updateAssessmentMessage: new Subject<any>(),
      collectionConfig: { stepper: true, languageBar: true, actionButtons: { enabled: true, buttons: [] } },
      isEditMetaPageAction: jest.fn(),
      backToHome: jest.fn(),
      publishData: jest.fn(),
      updateResources: jest.fn(),
      isBackButtonClickedFromAssessmentAction: jest.fn(),
    }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }),
      closeAll: jest.fn(),
    }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    editorService = {
      newCreatedLexid: 'do_new',
      readcontentV3: jest.fn().mockReturnValue(of(meta({ versionKey: 'vkRead' }))),
      updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      deleteContent: jest.fn().mockReturnValue(of({})),
      sendEmailNotificationAPI: jest.fn().mockReturnValue(of({ ok: true })),
    }
    router = { navigate: jest.fn(), navigateByUrl: jest.fn(), url: '/author/editor/do_course/collection' }
    configurationsService = {
      userRoles: new Set(['content_creator']),
      userProfile: { userId: 'u1', userName: 'User One', email: 'u1@x.com' },
    }
    cdr = { detectChanges: jest.fn() }

    component = new CourseCollectionComponent(
      contentService,
      { parent: null } as any,
      storeService,
      { buildTreeAndMap: jest.fn() } as any,
      initService,
      loaderService,
      dialog,
      snackBar,
      editorService,
      router,
      { userId: 'u1', hasRole: jest.fn().mockReturnValue(false) } as any,
      { observe: jest.fn().mockReturnValue(of({ matches: false })) } as any,
      new FormBuilder(),
      { isSavePressed: false, headerSaveData: new Subject<any>(), showCreatorHeader: jest.fn() } as any,
      { showNavbarDisplay$: { next: jest.fn() } } as any,
      configurationsService,
      { addComment: jest.fn().mockReturnValue(of({})) } as any,
      cdr,
    )
    component.currentParentId = 'do_course'
    component.currentCourseId = 'do_course'
    component.courseID = 'do_course'
    component.versionKey = meta() as any
    component.courseData = meta() as any
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

  // -------------------------------------------------------- setContentType --

  describe('setContentType', () => {
    beforeEach(() => {
      jest.spyOn(component, 'subAction').mockResolvedValue(undefined)
      component.createTopicForm = new FormBuilder().group({ name: ['Module A'], description: ['About'] })
      component.createModule = { name: 'Module A', description: 'About' } as any
    })

    it('does nothing without a topic form', async () => {
      component.createTopicForm = undefined as any
      await component.setContentType('collection')
      expect(storeService.createChildOrSibling).not.toHaveBeenCalled()
      expect(component.resourseSelected).toBe('collection')
    })

    it('announces the picked file type', async () => {
      await component.setContentType('collection', 'pdf')
      expect(storeService.uploadFileType.next).toHaveBeenCalledWith('pdf')
    })

    it('creates the module, selects it and opens the editor', async () => {
      await component.setContentType('collection')
      expect(storeService.createChildOrSibling).toHaveBeenCalledWith(
        'collection',
        expect.objectContaining({ category: 'Course' }),
        undefined,
        'below',
        { topicDescription: 'About', topicName: 'Module A' },
        '',
      )
      expectNotified(Notify.SUCCESS)
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(9)
      expect(component.currentContent).toBe('do_new')
      expect(component.showAddchapter).toBe(true)
      expect(component.subAction).toHaveBeenCalledWith({
        type: 'editContent',
        identifier: 'do_new',
        nodeClicked: false,
      })
    })

    it('marks a web resource as a link', async () => {
      await component.setContentType('web')
      expect(storeService.createChildOrSibling).toHaveBeenCalledWith(
        'web',
        expect.anything(),
        undefined,
        'below',
        expect.anything(),
        'link',
      )
    })

    it('skips the selection when nothing new was created', async () => {
      editorService.newCreatedLexid = ''
      await component.setContentType('collection')
      expect(storeService.selectedNodeChange.next).not.toHaveBeenCalled()
    })

    it('reports a failed creation', async () => {
      storeService.createChildOrSibling.mockResolvedValue(false)
      await component.setContentType('collection')
      expectNotified(Notify.FAIL)
      expect(storeService.selectedNodeChange.next).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------- tempSave --

  describe('tempSave', () => {
    it('refreshes the version key then saves', async () => {
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      await component.tempSave()
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_new')
      expect(component.versionKey).toEqual(expect.objectContaining({ versionKey: 'vkRead' }))
      expectNotified(Notify.SAVE_SUCCESS)
    })

    it('falls back to the current course when nothing new was created', async () => {
      editorService.newCreatedLexid = ''
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      await component.tempSave()
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
    })

    it('skips the refresh when the course has no pending metadata', async () => {
      contentService.getUpdatedMeta.mockReturnValue(null)
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      await component.tempSave()
      expect(editorService.readcontentV3).not.toHaveBeenCalled()
    })

    it('hands a save failure to the conflict handler', async () => {
      const handle = jest.spyOn(component, 'handleSaveConflict').mockImplementation(() => {})
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409 })) as any)
      await component.tempSave()
      expect(handle).toHaveBeenCalledWith({ status: 409 }, { width: '80vw', height: '90vh' })
    })
  })

  // ------------------------------------------------------------------ save --

  describe('save', () => {
    beforeEach(() => {
      jest.spyOn(component, 'action').mockImplementation(() => {})
      jest.spyOn(component, 'update').mockResolvedValue(undefined)
    })

    it('reports the course as already up to date', async () => {
      await component.save()
      expectNotified(Notify.UP_TO_DATE)
    })

    it('flushes a pending resource selection first', async () => {
      component.resourseSelected = 'do_res'
      await component.save()
      expect(component.update).toHaveBeenCalled()
    })

    it('recovers the course id from the route when it was cleared', async () => {
      component.currentCourseId = '' as any
      await component.save()
      expect(component.currentCourseId).toBe('do_course')
    })

    it('arms the quiz save trigger in assessment view', async () => {
      component.viewMode = 'assessment'
      await component.save()
      expect(component.triggerQuizSave).toBe(true)
    })

    it('arms the upload save trigger in upload view', async () => {
      component.viewMode = 'upload'
      await component.save()
      expect(component.triggerUploadSave).toBe(true)
    })

    it('runs the next action straight away when nothing changed', async () => {
      await component.save('push')
      expect(component.action).toHaveBeenCalledWith('push')
    })

    it('advances the stepper when an up-to-date course is on the module page', async () => {
      component.isModulePageEnabled = true
      component.viewMode = 'meta'
      await component.save()
      expect(component.clickedNext).toBe(true)
      expect(component.steps[2]).toEqual(expect.objectContaining({ key: 'CourseBuilder', activeStep: true }))
      expect(cdr.detectChanges).toHaveBeenCalled()
    })

    it('reads the current version before saving a changed course', async () => {
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      await component.save()
      expect(component.isChanged).toBe(true)
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expectNotified(Notify.SAVE_SUCCESS)
    })

    it('skips the version read for a module', async () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ contentType: 'CourseUnit' }))
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      await component.save()
      expect(editorService.readcontentV3).not.toHaveBeenCalled()
    })

    it('saves when only the hierarchy changed', async () => {
      storeService.changedHierarchy = { do_course: {} }
      const trigger = jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      await component.save()
      expect(trigger).toHaveBeenCalled()
    })

    it('runs the next action after a successful save', async () => {
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      await component.save('push')
      expect(component.action).toHaveBeenCalledWith('push')
    })

    it('advances the stepper after a successful save on the module page', async () => {
      component.isModulePageEnabled = true
      component.viewMode = 'meta'
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      await component.save()
      expect(component.clickedNext).toBe(true)
      expect(cdr.detectChanges).toHaveBeenCalled()
    })

    it('leaves the stepper alone while editing an assessment', async () => {
      component.isModulePageEnabled = true
      component.viewMode = 'assessment'
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)
      await component.save()
      expect(component.clickedNext).toBe(false)
    })

    it('hands a save failure to the conflict handler', async () => {
      const handle = jest.spyOn(component, 'handleSaveConflict').mockImplementation(() => {})
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409 })) as any)
      await component.save()
      expect(handle).toHaveBeenCalledWith({ status: 409 }, { width: '80vw', height: '90vh' })
    })
  })

  // ----------------------------------------------------------- triggerSave --

  describe('triggerSave', () => {
    it('leaves the edit-meta page when the chapter form is open', async () => {
      component.showAddchapter = true
      component.clickedNext = false
      await component.triggerSave().toPromise()
      expect(initService.isEditMetaPageAction).toHaveBeenCalledWith(false)
    })

    it('stays put once the stepper has already advanced', async () => {
      component.showAddchapter = true
      component.clickedNext = true
      await component.triggerSave().toPromise()
      // The component signals other page transitions through the same channel, so
      // assert only that it did not signal the back-to-edit-meta one.
      expect(initService.isEditMetaPageAction).not.toHaveBeenCalledWith(false)
    })

    it('falls back to the hierarchy endpoint when the course has no edits', async () => {
      component.currentCourseId = 'do_selected'
      contentService.upDatedContent = { do_unit: { name: 'x' } }
      storeService.parentNode = []
      storeService.changedHierarchy = { dirty: true }
      await component.triggerSave().toPromise()
      expect(editorService.updateContentV4).toHaveBeenCalled()
      expect(storeService.changedHierarchy).toEqual({})
      expect(contentService.upDatedContent).toEqual({})
      expect(contentService.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
    })

    it('marks a known root node without adding a synthetic one', async () => {
      component.currentCourseId = 'do_selected'
      storeService.parentNode = ['do_root']
      contentService.upDatedContent = { do_root: { name: 'x' } }
      await component.triggerSave().toPromise()
      expect(editorService.updateContentV4).toHaveBeenCalled()
    })

    it('gives a module Parent visibility and uses the hierarchy endpoint', async () => {
      const node: any = { category: 'CourseUnit', name: 'unit' }
      contentService.upDatedContent = { do_course: node }
      await component.triggerSave().toPromise()
      expect(node.visibility).toBe('Parent')
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
      expect(editorService.updateContentV4).toHaveBeenCalled()
    })

    it('gives a collection Parent visibility', async () => {
      const node: any = { category: 'Collection', name: 'coll' }
      contentService.upDatedContent = { do_course: node }
      await component.triggerSave().toPromise()
      expect(node.visibility).toBe('Parent')
    })

    it('takes the version key from the freshly read version', async () => {
      component.versionID = { versionKey: 'vkFresh' }
      contentService.upDatedContent = { do_course: { category: 'Resource', name: 'r' } }
      await component.triggerSave().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.versionKey).toBe('vkFresh')
    })

    it('falls back to the cached version key', async () => {
      component.versionID = undefined
      component.versionKey = { versionKey: 'vkCached' } as any
      contentService.upDatedContent = { do_course: { category: 'Resource', name: 'r' } }
      await component.triggerSave().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.versionKey).toBe('vkCached')
    })

    it('stringifies a zero duration', async () => {
      contentService.upDatedContent = { do_course: { category: 'Resource', duration: 0 } }
      await component.triggerSave().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.duration).toBe('0')
    })

    it('leaves a string duration alone', async () => {
      contentService.upDatedContent = { do_course: { category: 'Resource', duration: '90' } }
      await component.triggerSave().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.duration).toBe('90')
    })

    it('expands the contact lists and drops the category', async () => {
      contentService.upDatedContent = {
        do_course: {
          category: 'Resource',
          trackContacts: [{ id: 'r1' }],
          publisherDetails: [{ id: 'p1' }],
          creatorContacts: [{ id: 'c1' }],
          catalogPaths: [{ identifier: 't1' }],
        },
      }
      await component.triggerSave().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.category).toBeUndefined()
      expect(body.request.content.reviewerIDs).toEqual(['r1'])
      expect(body.request.content.publisherIDs).toEqual(['p1'])
      expect(body.request.content.creatorIDs).toEqual(['c1'])
      expect(body.request.content.topics).toEqual(['t1'])
      expect(contentService.currentContentID).toBe('do_course')
    })

    it('resets the change bookkeeping after saving a resource', async () => {
      contentService.upDatedContent = { do_course: { category: 'Resource', name: 'r' } }
      storeService.changedHierarchy = { dirty: true }
      await component.triggerSave().toPromise()
      expect(storeService.changedHierarchy).toEqual({})
      expect(contentService.resetOriginalMeta).toHaveBeenCalled()
      expect(contentService.upDatedContent).toEqual({})
    })

    it('rolls the resource durations up when saving the course', async () => {
      component.versionKey = meta({ children: [{ duration: '30' }, { duration: '20' }] }) as any
      contentService.upDatedContent = { do_course: { category: 'Course', name: 'c' } }
      await component.triggerSave().toPromise()
      expect(editorService.updateNewContentV3).toHaveBeenCalled()
      expect(contentService.upDatedContent).toEqual({})
    })

    it('clears the duration when the course has no resources', async () => {
      component.versionKey = meta({ children: [] }) as any
      contentService.upDatedContent = { do_course: { category: 'Course', name: 'c' } }
      await component.triggerSave().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.duration).toBeNull()
    })

    it('marks a course with no competency', async () => {
      component.versionKey = meta({ competency: undefined }) as any
      contentService.upDatedContent = { do_course: { category: 'Course', name: 'c' } }
      await component.triggerSave().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.competency).toBe(false)
    })

    it('leaves an existing competency alone', async () => {
      component.versionKey = meta({ competency: true }) as any
      contentService.upDatedContent = { do_course: { category: 'Course', name: 'c' } }
      await component.triggerSave().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.competency).toBeUndefined()
    })

    it('does not write when the selected content is not the course being edited', async () => {
      component.courseID = 'do_other'
      contentService.upDatedContent = { do_course: { category: 'Course', name: 'c' } }
      const result = await component.triggerSave().toPromise()
      expect(result).toBe(true)
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------- update --

  describe('update', () => {
    it('pushes the hierarchy and refreshes the course', async () => {
      component.resourseSelected = 'do_res'
      await component.update()
      expect(component.resourseSelected).toBe('')
      expect(editorService.updateContentV4).toHaveBeenCalledWith({
        request: { data: { nodesModified: {}, hierarchy: {} } },
      })
      expect(contentService.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------ getMessage --

  describe('getMessage', () => {
    const withStatus = (status: string) => {
      contentService.originalContent = { do_course: meta({ status }) }
    }

    it.each([
      ['Draft', Notify.SEND_FOR_REVIEW_SUCCESS],
      ['Live', Notify.SEND_FOR_REVIEW_SUCCESS],
      ['InReview', Notify.REVIEW_SUCCESS],
      ['Reviewed', Notify.PUBLISH_SUCCESS],
      ['Review', Notify.PUBLISH_SUCCESS],
    ])('maps %s to its success message', (status, expected) => {
      withStatus(status)
      expect(component.getMessage('success')).toBe(expected)
    })

    it.each([
      ['Draft', Notify.SEND_FOR_REVIEW_FAIL],
      ['Live', Notify.SEND_FOR_REVIEW_FAIL],
      ['InReview', Notify.REVIEW_FAIL],
      ['Reviewed', Notify.PUBLISH_FAIL],
      ['Review', Notify.PUBLISH_FAIL],
    ])('maps %s to its failure message', (status, expected) => {
      withStatus(status)
      expect(component.getMessage('failure')).toBe(expected)
    })

    it('returns an empty message for an unknown status', () => {
      withStatus('Unknown')
      expect(component.getMessage('success')).toBe('')
      expect(component.getMessage('failure')).toBe('')
    })
  })

  // ------------------------------------------------------------- subAction --

  describe('subAction', () => {
    const content = (over: any = {}) => ({
      identifier: 'do_res',
      parent: 'do_course',
      createdBy: 'u1',
      mimeType: 'application/pdf',
      fileType: '',
      ...over,
    })

    beforeEach(() => {
      contentService.getUpdatedMeta.mockReturnValue(content())
    })

    it('activates the node it was given', async () => {
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      await component.subAction({ type: 'editMeta', identifier: 'do_res' })
      expect(activeSpy).toHaveBeenCalledWith('do_res')
      expect(component.viewMode).toBe('meta')
    })

    it('hides the chapter form on request', async () => {
      component.showAddchapter = true
      await component.subAction({ type: 'showAddChapter', identifier: 'do_res' })
      expect(component.showAddchapter).toBe(false)
    })

    it('opens the viewer for a preview', async () => {
      const preview = jest.spyOn(component, 'preview').mockResolvedValue(undefined)
      await component.subAction({ type: 'preview', identifier: 'do_res' })
      expect(preview).toHaveBeenCalledWith('do_res')
    })

    it('marks the creator when the profile matches', async () => {
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.checkCreator).toBe(true)
      expect(component.viewMode).toBe('upload')
    })

    it('marks a non-creator when the profile does not match', async () => {
      contentService.getUpdatedMeta.mockReturnValue(content({ createdBy: 'someone-else' }))
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.checkCreator).toBe(false)
    })

    it('marks a non-creator with no profile at all', async () => {
      configurationsService.userProfile = null
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.checkCreator).toBe(false)
    })

    it('attaches a freshly created module to the hierarchy', async () => {
      component.createModule = { name: 'Module A' } as any
      storeService.getNewTreeHierarchy.mockReturnValue({ do_course: { children: [] } })
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      const [body] = editorService.updateContentV4.mock.calls[0]
      expect(body.request.data.hierarchy.do_course.children).toContain('do_res')
      expect(body.request.data.hierarchy.do_res).toEqual(
        expect.objectContaining({ contentType: 'CourseUnit', primaryCategory: 'Course Unit' }),
      )
      expect(component.showAddchapter).toBe(true)
      expect(initService.updateResources).toHaveBeenCalledWith('update')
    })

    it('shows the self-assessment steps', async () => {
      component.isSelfAssessment = true
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.header).toBe('Self Assessment Details')
      expect(component.steps).toHaveLength(3)
    })

    it('shows the course steps by default', async () => {
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.steps).toHaveLength(4)
    })

    it.each(['application/pdf', 'application/x-mpegURL', 'application/vnd.ekstep.html-archive', 'audio/mpeg', 'video/mp4'])(
      'opens %s in the upload view',
      async mimeType => {
        contentService.getUpdatedMeta.mockReturnValue(content({ mimeType }))
        await component.subAction({ type: 'editContent', identifier: 'do_res' })
        expect(component.viewMode).toBe('upload')
      },
    )

    it.each(['video/x-youtube', 'text/x-url', 'application/html'])('opens a linked %s in the curate view', async mimeType => {
      contentService.getUpdatedMeta.mockReturnValue(content({ mimeType, fileType: '' }))
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('curate')
    })

    it('opens an uploaded html archive in the upload view', async () => {
      contentService.getUpdatedMeta.mockReturnValue(content({ mimeType: 'application/html', fileType: 'upload' }))
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('upload')
    })

    it.each(['application/quiz', 'application/json'])('opens %s in the assessment view', async mimeType => {
      contentService.getUpdatedMeta.mockReturnValue(content({ mimeType, fileType: 'x' }))
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('assessment')
    })

    it('opens a web module in the web module view', async () => {
      contentService.getUpdatedMeta.mockReturnValue(content({ mimeType: 'application/web-module', fileType: 'x' }))
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('webmodule')
    })

    it('falls back to the meta view for an unknown mime type', async () => {
      contentService.getUpdatedMeta.mockReturnValue(content({ mimeType: 'application/unknown', fileType: 'x' }))
      await component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('meta')
    })
  })

  // ------------------------------------------------------- step validity --

  describe('step validity', () => {
    it('records the course details validity', () => {
      component.onCourseDetailsValidity(true)
      expect(component.isCourseDetailsValid).toBe(true)
    })

    it('records the course builder validity', () => {
      component.onCourseBuilderValidity(true)
      expect(component.isCourseBuilderValid).toBe(true)
    })

    it('records the course settings validity', () => {
      component.onCourseSettingsValidity(true)
      expect(component.isCourseSettingsValid).toBe(true)
    })
  })

  // ------------------------------------------------------ validationCheck --

  describe('validationCheck', () => {
    it('passes when the store reports no problems', () => {
      expect(component.validationCheck).toBe(true)
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('opens the error parser and fails when the store reports problems', () => {
      storeService.validationCheck.mockReturnValue([{ id: 'do_x' }])
      expect(component.validationCheck).toBe(false)
      expect(dialog.open).toHaveBeenCalled()
    })

    it('selects the offending node by lex id', () => {
      storeService.validationCheck.mockReturnValue([{ id: 'do_x' }])
      storeService.lexIdMap.set('do_x', [5])
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      expect(component.validationCheck).toBe(false)
      afterClosed.next('do_x')
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(5)
      expect(activeSpy).toHaveBeenCalledWith('do_x')
    })

    it('selects the offending node by index', () => {
      storeService.validationCheck.mockReturnValue([{ id: 'do_x' }])
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      expect(component.validationCheck).toBe(false)
      afterClosed.next(1)
      expect(activeSpy).toHaveBeenCalledWith('do_course')
    })

    it('ignores a dismissed dialog', () => {
      storeService.validationCheck.mockReturnValue([{ id: 'do_x' }])
      expect(component.validationCheck).toBe(false)
      afterClosed.next(undefined)
      expect(storeService.selectedNodeChange.next).not.toHaveBeenCalled()
    })
  })
})
