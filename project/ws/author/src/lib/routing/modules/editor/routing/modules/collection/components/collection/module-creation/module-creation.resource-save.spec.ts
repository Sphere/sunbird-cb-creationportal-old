import { FormBuilder, FormControl } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { ModuleCreationComponent } from './module-creation.component'

/**
 * Wave 18 — the resource-level save path of ModuleCreationComponent:
 * `save`, `update`, `triggerSave`, `subAction`, `setContentType`,
 * `uploadResourceAppIcon`, `updateStoreData`, `copyToClipboard`, `closeDialog`.
 * Direct instantiation, as with the sibling specs.
 */
describe('ModuleCreationComponent (resource save path)', () => {
  let component: ModuleCreationComponent
  let dialog: any
  let contentService: any
  let router: any
  let snackBar: any
  let loader: any
  let accessService: any
  let uploadService: any
  let http: any
  let initService: any
  let editorService: any
  let storeService: any
  let configurationsService: any

  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
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
    changeActiveCont = new Subject<string>()
    afterClosed = new Subject<any>()

    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }),
      closeAll: jest.fn(),
    }
    contentService = {
      changeActiveCont,
      parentContent: 'do_course',
      currentContent: '',
      upDatedContent: {},
      originalContent: { do_course: { status: 'Draft' } },
      currentContentData: null,
      currentContentID: '',
      getUpdatedMeta: jest.fn().mockReturnValue({ contentType: 'Course', versionKey: 'vkMeta' }),
      getOriginalMeta: jest.fn().mockReturnValue(null),
      parentUpdatedMeta: jest.fn().mockReturnValue(null),
      setUpdatedMeta: jest.fn(),
      setOriginalMeta: jest.fn(),
      cleanProperties: jest.fn(cleanProperties),
      resetOriginalMeta: jest.fn(),
      resetOriginalMetaWithHierarchy: jest.fn(),
      removeListOfFilesAndUpdatedIPR: jest.fn(),
      updateListOfUpdatedIPR: jest.fn(),
      resetStatus: jest.fn().mockReturnValue(false),
      changeStatusDraft: jest.fn(),
      getNodeModifyData: jest.fn().mockReturnValue({}),
    }
    router = { navigate: jest.fn(), navigateByUrl: jest.fn(), url: '/author/editor/do_course/collection' }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    accessService = { userId: 'u1', userName: 'User One', hasRole: jest.fn().mockReturnValue(false) }
    uploadService = { upload: jest.fn().mockReturnValue(of({ name: 'ok', artifactUrl: 'https://cdn/bucket/x.png' })) }
    http = { post: jest.fn().mockReturnValue(of({ result: { identifier: 'asset_1' } })) }
    initService = {
      backToHomeMessage: new Subject<any>(),
      updateResourceMessage: new Subject<any>(),
      ordinals: { subTitles: ['en'] },
      authConfig: new Proxy({}, { get: () => ({ type: 'string', defaultValue: { Resource: [{ value: '' }] } }) }),
      collectionConfig: { childrenConfig: {}, maxDepth: 4 },
      uploadData: jest.fn(),
      publishData: jest.fn(),
    }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_course', versionKey: 'vkRead', children: [] })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ duration: '10' })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      resourceToModule: jest.fn().mockReturnValue(of({ ok: true })),
      newCreatedLexid: 'do_new',
      resourseID: 'do_new',
    }
    storeService = {
      currentParentNode: 3,
      currentSelectedNode: 0,
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
    ;(window as any).env = { azureBucket: 'bucket' }

    component = new ModuleCreationComponent(
      { detectChanges: jest.fn() } as any,
      dialog,
      contentService,
      { parent: null } as any,
      router,
      { startProfanity: jest.fn().mockReturnValue(of({})) } as any,
      snackBar,
      loader,
      accessService,
      uploadService,
      http,
      initService,
      editorService,
      storeService,
      configurationsService,
      { buildTreeAndMap: jest.fn(), hasAccess: jest.fn().mockReturnValue(true) } as any,
      { showCreatorHeader: jest.fn() } as any,
      { isLtMedium$: of(false) } as any,
      new FormBuilder(),
      { getQuizConfig: jest.fn().mockReturnValue({}) } as any,
      {} as any,
      { observe: jest.fn().mockReturnValue(of({ matches: false })) } as any,
      { addComment: jest.fn().mockReturnValue(of({})) } as any,
      { downloadResource: jest.fn(), downloadAllAsZip: jest.fn(), hasDownloadableResources: jest.fn() } as any,
    )
    component.currentCourseId = 'do_course'
    component.currentParentId = 'do_course'
    component.versionKey = { versionKey: 'vkMeta' } as any
    component.courseData = { identifier: 'do_course', children: [] } as any
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  // ----------------------------------------------------------------- save() --

  describe('save', () => {
    it('does nothing when there is no pending change', async () => {
      await component.save()
      expect(loader.changeLoad.next).not.toHaveBeenCalledWith(true)
    })

    it('flushes a pending resource selection first', async () => {
      const updateSpy = jest.spyOn(component, 'update').mockResolvedValue(undefined)
      component.resourseSelected = 'do_res'
      await component.save()
      expect(updateSpy).toHaveBeenCalled()
    })

    it('reads the current version for a non-CourseUnit then notifies success', async () => {
      contentService.upDatedContent = { do_course: { name: 'x' } }
      jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)
      await component.save()
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expect(component.versionID).toEqual(expect.objectContaining({ versionKey: 'vkRead' }))
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SAVE_SUCCESS },
        duration: expect.any(Number),
      })
    })

    it('skips the version read for a CourseUnit', async () => {
      contentService.getUpdatedMeta.mockReturnValue({ contentType: 'CourseUnit' })
      contentService.upDatedContent = { do_course: { name: 'x' } }
      jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)
      await component.save()
      expect(editorService.readcontentV3).not.toHaveBeenCalled()
    })

    it('saves when only the hierarchy changed', async () => {
      storeService.changedHierarchy = { do_course: {} }
      const trigger = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)
      await component.save()
      expect(trigger).toHaveBeenCalled()
    })

    it('opens the error parser on a 409 and resolves the node by id', async () => {
      contentService.upDatedContent = { do_course: { name: 'x' } }
      storeService.lexIdMap.set('do_x', [5])
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409, error: {} })) as any)
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      await component.save()
      expect(component.isError).toBe(true)
      afterClosed.next('do_x')
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(5)
      expect(activeSpy).toHaveBeenCalledWith('do_x')
      expect(component.isError).toBe(false)
    })

    it('resolves the node by index on a 409', async () => {
      contentService.upDatedContent = { do_course: { name: 'x' } }
      storeService.uniqueIdMap.set(6, 'do_y')
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409, error: {} })) as any)
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      await component.save()
      afterClosed.next(6)
      expect(activeSpy).toHaveBeenCalledWith('do_y')
    })

    it('clears the error flag when the 409 dialog is dismissed', async () => {
      contentService.upDatedContent = { do_course: { name: 'x' } }
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409, error: {} })) as any)
      await component.save()
      afterClosed.next(undefined)
      expect(component.isError).toBe(false)
    })

    it('only notifies on a non-conflict failure', async () => {
      contentService.upDatedContent = { do_course: { name: 'x' } }
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 500 })) as any)
      await component.save()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SAVE_FAIL },
        duration: expect.any(Number),
      })
    })
  })

  // --------------------------------------------------------------- update() --

  describe('update', () => {
    it('pushes the hierarchy and refreshes the course', async () => {
      await component.update()
      expect(component.resourseSelected).toBe('')
      expect(storeService.getNewTreeHierarchy).toHaveBeenCalled()
      expect(editorService.updateContentV4).toHaveBeenCalled()
      expect(contentService.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SUCCESS },
        duration: expect.any(Number),
      })
    })

    it('rolls the child durations up onto the course', async () => {
      editorService.readcontentV3.mockReturnValue(
        of({
          identifier: 'do_course',
          versionKey: 'vkRead',
          children: [
            { identifier: 'do_a', duration: '30', children: [{ identifier: 'do_a1', duration: '20' }] },
            { identifier: 'do_b', duration: '10', children: [] },
          ],
        }),
      )
      const setDuration = jest.spyOn(component as any, 'setCourseDuration').mockImplementation(() => {})
      await component.update()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.duration).toBe('60')
      expect(setDuration).toHaveBeenCalledWith('60')
    })

    it('skips the duration roll-up when no child declares one', async () => {
      editorService.readcontentV3.mockReturnValue(
        of({ identifier: 'do_course', versionKey: 'vkRead', children: [{ identifier: 'do_a', children: [] }] }),
      )
      await component.update()
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
    })

    it('unlocks the settings page once the course has two children', async () => {
      editorService.readcontentV3.mockReturnValue(
        of({
          identifier: 'do_course',
          versionKey: 'vkRead',
          children: [
            { identifier: 'do_a', children: [] },
            { identifier: 'do_b', children: [] },
          ],
        }),
      )
      await component.update()
      expect(component.showSettingsPage).toBe(true)
    })

    it('keeps the settings page locked for a single-child course', async () => {
      editorService.readcontentV3.mockReturnValue(
        of({ identifier: 'do_course', versionKey: 'vkRead', children: [{ identifier: 'do_a', children: [] }] }),
      )
      await component.update()
      expect(component.showSettingsPage).toBe(false)
    })
  })

  // ---------------------------------------------------------- triggerSave() --

  describe('triggerSave', () => {
    it('falls back to the hierarchy endpoint when the selected node has no edits', async () => {
      component.currentCourseId = 'do_selected'
      contentService.upDatedContent = { do_unit: { name: 'x' } }
      storeService.parentNode = []
      await component.triggerSave().toPromise()
      expect(editorService.updateContentV4).toHaveBeenCalled()
      expect(contentService.upDatedContent).toEqual({})
      expect(storeService.changedHierarchy).toEqual({})
    })

    it('marks a known root node without adding a synthetic one', async () => {
      component.currentCourseId = 'do_selected'
      storeService.parentNode = ['do_root']
      contentService.upDatedContent = { do_root: { name: 'x' } }
      await component.triggerSave().toPromise()
      expect(editorService.updateContentV4).toHaveBeenCalled()
    })

    it('gives a CourseUnit Parent visibility and routes it to the hierarchy endpoint', async () => {
      const node: any = { category: 'CourseUnit', name: 'unit' }
      contentService.upDatedContent = { do_course: node }
      await component.triggerSave().toPromise()
      expect(node.visibility).toBe('Parent')
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
      expect(editorService.updateContentV4).toHaveBeenCalled()
    })

    it('gives a Collection Parent visibility', async () => {
      const node: any = { category: 'Collection', name: 'coll' }
      contentService.upDatedContent = { do_course: node }
      await component.triggerSave().toPromise()
      expect(node.visibility).toBe('Parent')
    })

    it('takes the version key from the cached meta when it has one', async () => {
      contentService.getUpdatedMeta.mockReturnValue({ versionKey: 'vkMeta' })
      contentService.upDatedContent = { do_course: { category: 'Resource', name: 'r' } }
      await component.triggerSave().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.versionKey).toBe('vkMeta')
    })

    it('falls back to the freshly read version when the meta has none', async () => {
      contentService.getUpdatedMeta.mockReturnValue({})
      component.versionID = { versionKey: 'vkFresh' }
      contentService.upDatedContent = { do_course: { category: 'Resource', name: 'r' } }
      await component.triggerSave().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.versionKey).toBe('vkFresh')
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

    it('sends a Course through the single-content endpoint', async () => {
      contentService.upDatedContent = { do_course: { category: 'Course', name: 'r' } }
      await component.triggerSave().toPromise()
      expect(editorService.updateNewContentV3).toHaveBeenCalled()
      expect(contentService.upDatedContent).toEqual({})
    })
  })

  // ------------------------------------------------------------- subAction --

  describe('subAction', () => {
    const meta = (over: any = {}) => ({
      identifier: 'do_res',
      contentType: 'Resource',
      mimeType: 'application/pdf',
      fileType: '',
      createdBy: 'u1',
      ...over,
    })

    it('activates the node it was given', () => {
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      contentService.getUpdatedMeta.mockReturnValue(meta())
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(activeSpy).toHaveBeenCalledWith('do_res')
    })

    it('ignores an unhandled event type', () => {
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      component.subAction({ type: 'somethingElse', identifier: 'do_res' })
      expect(activeSpy).toHaveBeenCalledWith('do_res')
      expect(component.editItem).toBeFalsy()
    })

    it('loads a Resource into the editor and marks the creator', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta())
      component.subAction({ type: 'editContent', identifier: 'do_res', nodeClicked: false })
      expect(component.editItem).toBe('do_res')
      expect(component.checkCreator).toBe(true)
    })

    it('marks a non-creator when the profile does not match', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ createdBy: 'someone-else' }))
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.checkCreator).toBe(false)
    })

    it('marks a non-creator when there is no profile at all', () => {
      configurationsService.userProfile = null
      contentService.getUpdatedMeta.mockReturnValue(meta())
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.checkCreator).toBe(false)
    })

    it('seeds the answer-popup flag on an assessment that lacks it', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ isAssessment: true }))
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.content.isCorrectAnswerPopUp).toBe(false)
    })

    it('leaves an existing answer-popup flag alone', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ isAssessment: true, isCorrectAnswerPopUp: true }))
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.content.isCorrectAnswerPopUp).toBe(true)
    })

    it('leaves a self assessment alone', () => {
      component.isSelfAssessment = true
      contentService.getUpdatedMeta.mockReturnValue(meta({ isAssessment: true }))
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.content.isCorrectAnswerPopUp).toBeUndefined()
    })

    it.each(['application/pdf', 'application/x-mpegURL', 'application/vnd.ekstep.html-archive', 'audio/mpeg', 'video/mp4'])(
      'opens %s in the upload view',
      mimeType => {
        contentService.getUpdatedMeta.mockReturnValue(meta({ mimeType }))
        component.subAction({ type: 'editContent', identifier: 'do_res' })
        expect(component.viewMode).toBe('upload')
      },
    )

    it.each(['video/x-youtube', 'text/x-url', 'application/html'])('opens a linked %s in the curate view', mimeType => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ mimeType, fileType: '' }))
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('curate')
    })

    it('opens an uploaded html archive in the upload view', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ mimeType: 'application/html', fileType: 'upload' }))
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('upload')
    })

    it('leaves the view alone for a quiz', () => {
      component.viewMode = 'meta'
      contentService.getUpdatedMeta.mockReturnValue(meta({ mimeType: 'application/quiz', fileType: 'x' }))
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('meta')
    })

    it('leaves the view alone for a json assessment', () => {
      component.viewMode = 'meta'
      contentService.getUpdatedMeta.mockReturnValue(meta({ mimeType: 'application/json', fileType: 'x' }))
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('meta')
    })

    it('opens a web module in the web module view', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ mimeType: 'application/web-module', fileType: 'x' }))
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('webmodule')
    })

    it('falls back to the meta view for an unknown mime type', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ mimeType: 'application/unknown', fileType: 'x' }))
      component.subAction({ type: 'editContent', identifier: 'do_res' })
      expect(component.viewMode).toBe('meta')
    })

    it('does not load a non-Resource into the editor', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ contentType: 'CourseUnit' }))
      component.subAction({ type: 'editContent', identifier: 'do_unit' })
      expect(component.editItem).toBeFalsy()
    })
  })

  // --------------------------------------------------------- setContentType --

  describe('setContentType', () => {
    beforeEach(() => {
      jest.spyOn(component, 'subAction').mockImplementation(() => {})
      jest.spyOn(component, 'getChildrenCount').mockReturnValue(undefined as any)
      component.addResourceModule = { module: false, courseID: 'do_course', modID: 'do_unit' } as any
    })

    it('creates a resource under the course and selects it', async () => {
      await component.setContentType('link')
      expect(component.resourseSelected).toBe('link')
      expect(storeService.createChildOrSibling).toHaveBeenCalled()
      expect(editorService.updateContentV4).toHaveBeenCalled()
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(7)
      expect(component.subAction).toHaveBeenCalledWith({
        type: 'editContent',
        identifier: 'do_new',
        nodeClicked: false,
      })
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('announces the file type when one is given', async () => {
      await component.setContentType('link', 'pdf')
      expect(storeService.uploadFileType.next).toHaveBeenCalledWith('pdf')
    })

    it('creates a link resource with the link file type', async () => {
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

    it('remembers the course as parent data for a new module', async () => {
      // courseData is replaced by the refresh that follows, so keep the original.
      const before = component.courseData
      await component.setContentType({ type: 'collection' })
      expect(storeService.parentData).toBe(before)
      expect(storeService.createChildOrSibling).toHaveBeenCalledWith(
        { type: 'collection' },
        expect.anything(),
        undefined,
        'below',
        expect.objectContaining({ topicName: 'Add Module' }),
        '',
      )
    })

    it('attaches the new resource to the target module', async () => {
      component.addResourceModule = { module: true, courseID: 'do_course', modID: 'do_unit' } as any
      storeService.getNewTreeHierarchy.mockReturnValue({ do_unit: { children: [] } })
      await component.setContentType('link')
      expect(editorService.resourceToModule).toHaveBeenCalledWith({
        request: { rootId: 'do_course', unitId: 'do_unit', children: ['do_new'] },
      })
      const [body] = editorService.updateContentV4.mock.calls[0]
      expect(body.request.data.hierarchy.do_unit.children).toContain('do_new')
    })

    it('names an assessment resource accordingly', async () => {
      component.addResourceModule = { module: true, courseID: 'do_course', modID: 'do_unit' } as any
      storeService.getNewTreeHierarchy.mockReturnValue({ do_unit: { children: [] } })
      await component.setContentType('assessment')
      const [body] = editorService.updateContentV4.mock.calls[0]
      expect(body.request.data.hierarchy.do_new.name).toBe('Assessment')
    })

    it('expands every module of the refreshed course', async () => {
      editorService.readcontentV3.mockReturnValue(
        of({ identifier: 'do_course', children: [{ identifier: 'do_m1' }, { identifier: 'do_m2' }] }),
      )
      await component.setContentType('link')
      expect(component.showChildrenMap).toEqual({ do_m1: true, do_m2: true })
    })

    it('leaves the selection alone when nothing new was created', async () => {
      editorService.newCreatedLexid = ''
      await component.setContentType('link')
      expect(storeService.selectedNodeChange.next).not.toHaveBeenCalled()
    })

    it('drops the loader when creation fails', async () => {
      storeService.createChildOrSibling.mockResolvedValue(false)
      await component.setContentType('link')
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(component.subAction).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------- uploadResourceAppIcon --

  describe('uploadResourceAppIcon', () => {
    const imageFile = (name = 'icon.png', size = 1000) => ({ name, size }) as File
    // The crop result is appended to a FormData, so it has to be a real Blob.
    const cropped = () => new File(['icon-bytes'], 'cropped.png', { type: 'image/png' })

    it('rejects a file whose extension is not an image', () => {
      component.uploadResourceAppIcon(imageFile('notes.txt'))
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.INVALID_FORMAT },
        duration: expect.any(Number),
      })
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('rejects a file that is too large', () => {
      component.uploadResourceAppIcon(imageFile('icon.png', 100 * 1024 * 1024))
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SIZE_ERROR },
        duration: expect.any(Number),
      })
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('uploads the cropped image and fills both forms', () => {
      jest.spyOn(component, 'updateStoreData').mockImplementation(() => {})
      component.uploadResourceAppIcon(imageFile())
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(cropped())
      expect(http.post).toHaveBeenCalled()
      expect(uploadService.upload).toHaveBeenCalled()
      expect(component.resourceLinkForm.controls.appIcon.value).toContain('x.png')
      expect(component.resourcePdfForm.controls.thumbnail.value).toContain('x.png')
      expect(component.updateStoreData).toHaveBeenCalled()
      expect(initService.uploadData).toHaveBeenCalledWith('thumbnail')
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.UPLOAD_SUCCESS },
        duration: expect.any(Number),
      })
    })

    it('does nothing when the crop dialog is cancelled', () => {
      component.uploadResourceAppIcon(imageFile())
      afterClosed.next(undefined)
      expect(http.post).not.toHaveBeenCalled()
    })

    it('surfaces the message when the upload comes back as an error payload', () => {
      uploadService.upload.mockReturnValue(of({ name: 'Error', message: 'too big' }))
      component.uploadResourceAppIcon(imageFile())
      afterClosed.next(cropped())
      expect(snackBar.open).toHaveBeenCalledWith('too big', undefined, { duration: 2000 })
    })

    it('notifies a failure when the upload call rejects', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('network')))
      component.uploadResourceAppIcon(imageFile())
      afterClosed.next(cropped())
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.UPLOAD_FAIL },
        duration: expect.any(Number),
      })
    })
  })

  // -------------------------------------------------------- updateStoreData --

  describe('updateStoreData', () => {
    /**
     * The diff is taken over `resourceLinkForm.value`, so only controls that exist
     * on the form are ever considered. The status/versionKey-driven branches below
     * are only reachable when the form carries those extra metadata controls, so
     * the tests that exercise them register the controls first.
     */
    const withMetaControls = () => {
      component.resourceLinkForm.addControl('status', new FormControl('Draft'))
      component.resourceLinkForm.addControl('identifier', new FormControl('do_new'))
      component.resourceLinkForm.addControl('versionKey', new FormControl('vkForm'))
      component.resourceLinkForm.addControl('subTitle', new FormControl(''))
      component.resourceLinkForm.addControl('body', new FormControl(''))
      component.resourceLinkForm.addControl('description', new FormControl(''))
      component.resourceLinkForm.addControl('categoryType', new FormControl(''))
      component.resourceLinkForm.addControl('resourceType', new FormControl(''))
      component.resourceLinkForm.addControl('sourceName', new FormControl(''))
      component.resourceLinkForm.addControl('lang', new FormControl(''))
    }

    it('does nothing when the resource has no stored original', () => {
      contentService.getOriginalMeta.mockReturnValue(null)
      component.updateStoreData()
      expect(contentService.setUpdatedMeta).not.toHaveBeenCalled()
    })

    it('stores the changed fields against the newly created resource', () => {
      contentService.getOriginalMeta.mockReturnValue({ name: 'old', contentType: 'Resource' })
      component.resourceLinkForm.controls.name.setValue('new')
      component.updateStoreData()
      const [meta, id] = contentService.setUpdatedMeta.mock.calls[0]
      expect(id).toBe('do_new')
      expect(meta.name).toBe('new')
    })

    it('carries the stored version key straight through', () => {
      withMetaControls()
      contentService.getOriginalMeta.mockReturnValue({ contentType: 'Resource', versionKey: 'vk9' })
      component.updateStoreData()
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.versionKey).toBe('vk9')
    })

    it('falls back to the configured default when a field was cleared', () => {
      contentService.getOriginalMeta.mockReturnValue({ name: 'old', contentType: 'Resource' })
      component.resourceLinkForm.controls.name.setValue('')
      component.updateStoreData()
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.name).toBe('')
    })

    it('never writes the iframe flag into the store', () => {
      contentService.getOriginalMeta.mockReturnValue({ isIframeSupported: 'no', contentType: 'Resource' })
      component.resourceLinkForm.controls.isIframeSupported.setValue('yes')
      component.updateStoreData()
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.isIframeSupported).toBeUndefined()
    })

    it('keeps the uploaded artifact of an exempt mime type instead of the form value', () => {
      contentService.getOriginalMeta.mockReturnValue({
        contentType: 'Resource',
        mimeType: 'video/mp4',
        artifactUrl: 'https://cdn/v.mp4',
      })
      component.resourceLinkForm.controls.artifactUrl.setValue('https://typed-by-hand')
      component.updateStoreData()
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.artifactUrl).toBeUndefined()
    })

    it('inherits the duration and icon from the original when the form has none', () => {
      contentService.getOriginalMeta.mockReturnValue({
        contentType: 'Resource',
        duration: '120',
        appIcon: 'a.png',
        thumbnail: 't.png',
      })
      component.updateStoreData()
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      // Inherited values match the original, so they are not part of the delta.
      expect(meta.duration).toBeUndefined()
      expect(meta.appIcon).toBeUndefined()
    })

    it('inherits the parent metadata for a draft resource', () => {
      withMetaControls()
      contentService.getOriginalMeta.mockReturnValue({ contentType: 'Resource', identifier: 'do_new' })
      contentService.parentUpdatedMeta.mockReturnValue({
        identifier: 'do_course',
        subTitle: 'Parent subtitle',
        body: 'Parent body',
        instructions: 'Parent instructions',
        description: 'Parent description',
        categoryType: 'Parent category',
        resourceType: 'Parent resource',
        sourceName: 'Parent source',
        lang: 'en',
      })
      component.updateStoreData()
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.subTitle).toBe('Parent subtitle')
      expect(meta.body).toBe('Parent body')
      expect(meta.description).toBe('Parent description')
      expect(meta.cneName).toBe('')
    })

    it('does not inherit from itself', () => {
      withMetaControls()
      contentService.getOriginalMeta.mockReturnValue({ contentType: 'Resource', identifier: 'do_new' })
      contentService.parentUpdatedMeta.mockReturnValue({ identifier: 'do_new', subTitle: 'Parent subtitle' })
      component.updateStoreData()
      const [meta] = contentService.setUpdatedMeta.mock.calls[0]
      expect(meta.subTitle).toBe('')
    })

    it('does not inherit when there is no parent metadata', () => {
      withMetaControls()
      contentService.getOriginalMeta.mockReturnValue({ contentType: 'Resource', identifier: 'do_new' })
      contentService.parentUpdatedMeta.mockReturnValue(null)
      component.updateStoreData()
      expect(contentService.setUpdatedMeta).toHaveBeenCalled()
    })

    it('leaves a non-draft resource free of parent metadata', () => {
      withMetaControls()
      component.resourceLinkForm.controls.status.setValue('Live')
      contentService.getOriginalMeta.mockReturnValue({ contentType: 'Resource', identifier: 'do_new' })
      component.updateStoreData()
      expect(contentService.parentUpdatedMeta).not.toHaveBeenCalled()
    })

    it('warns the author when the store cannot be read', () => {
      contentService.getOriginalMeta.mockImplementation(() => {
        throw new Error('no parent')
      })
      component.updateStoreData()
      expect(snackBar.open).toHaveBeenCalledWith('Please Save Parent first and refresh page.')
    })
  })

  // ------------------------------------------------------------- misc glue --

  describe('misc', () => {
    it('emits the action it was clicked with', () => {
      const emit = jest.spyOn(component.actions, 'emit')
      component.click('save', 'meta')
      expect(emit).toHaveBeenCalledWith({ action: 'save', type: 'meta' })
    })

    it('closes every open dialog', () => {
      component.closeDialog()
      expect(dialog.closeAll).toHaveBeenCalled()
    })

    it('copies the given text to the clipboard', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      component.copyToClipboard('https://share/me')
      expect(writeText).toHaveBeenCalledWith('https://share/me')
    })

    it('swallows a clipboard failure', async () => {
      const writeText = jest.fn().mockRejectedValue(new Error('denied'))
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      expect(() => component.copyToClipboard('x')).not.toThrow()
      await Promise.resolve()
    })
  })
})
