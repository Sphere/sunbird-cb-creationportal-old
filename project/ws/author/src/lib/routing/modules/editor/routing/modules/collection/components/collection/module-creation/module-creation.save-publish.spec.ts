import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { ModuleCreationComponent } from './module-creation.component'

/**
 * Wave 18 — the save / review / publish pipeline of ModuleCreationComponent.
 *
 * These are the largest uncovered methods in the repo (`saves`, `triggerSaves`,
 * `updates`, `validationCheck`, `takeAction`, `finalCall`, `finalSaveAndRedirect`,
 * `sendEmailNotification`, `getMessage`). As with the sibling direct spec, the
 * component is instantiated as a plain class with mocked collaborators — a TestBed
 * render is brittle under jsdom for a component this size.
 */
describe('ModuleCreationComponent (save / review / publish pipeline)', () => {
  let component: ModuleCreationComponent
  let cdr: any
  let dialog: any
  let contentService: any
  let activateRoute: any
  let router: any
  let profanityService: any
  let snackBar: any
  let loader: any
  let accessService: any
  let uploadService: any
  let http: any
  let initService: any
  let editorService: any
  let storeService: any
  let configurationsService: any
  let resolverService: any
  let headerService: any
  let valueSvc: any
  let quizStoreSvc: any
  let quizResolverSvc: any
  let breakpointObserver: any
  let progressSvc: any
  let resourceDownloadSvc: any

  let changeActiveCont: Subject<string>
  let backToHomeMessage: Subject<any>
  let updateResourceMessage: Subject<any>
  let afterClosed: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const build = () =>
    new ModuleCreationComponent(
      cdr,
      dialog,
      contentService,
      activateRoute,
      router,
      profanityService,
      snackBar,
      loader,
      accessService,
      uploadService,
      http,
      initService,
      editorService,
      storeService,
      configurationsService,
      resolverService,
      headerService,
      valueSvc,
      new FormBuilder(),
      quizStoreSvc,
      quizResolverSvc,
      breakpointObserver,
      progressSvc,
      resourceDownloadSvc,
    )

  beforeEach(() => {
    changeActiveCont = new Subject<string>()
    backToHomeMessage = new Subject<any>()
    updateResourceMessage = new Subject<any>()
    afterClosed = new Subject<any>()

    cdr = { detectChanges: jest.fn() }
    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }),
      closeAll: jest.fn(),
    }
    contentService = {
      changeActiveCont,
      parentContent: 'do_course',
      upDatedContent: {},
      originalContent: { do_course: { status: 'Draft' } },
      currentContentData: null,
      currentContentID: '',
      getUpdatedMeta: jest.fn().mockReturnValue({ contentType: 'Course', status: 'Draft', versionKey: 'vkMeta' }),
      getOriginalMeta: jest.fn().mockReturnValue({ identifier: 'do_course', children: [] }),
      setUpdatedMeta: jest.fn(),
      setOriginalMeta: jest.fn(),
      // Mirrors the real EditorContentService.cleanProperties: a shallow copy with
      // null / undefined / '' / empty-array entries stripped. The copy matters —
      // the caller deletes `category` from the payload but reads it back off the
      // original object afterwards to choose the endpoint.
      cleanProperties: jest.fn((objParam: any) => {
        const obj = { ...objParam }
        Object.getOwnPropertyNames(obj).forEach(p => {
          const v = (obj as any)[p]
          if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) {
            delete (obj as any)[p]
          }
        })
        return obj
      }),
      resetOriginalMeta: jest.fn(),
      resetOriginalMetaWithHierarchy: jest.fn(),
      removeListOfFilesAndUpdatedIPR: jest.fn(),
      updateListOfUpdatedIPR: jest.fn(),
      resetStatus: jest.fn().mockReturnValue(false),
      changeStatusDraft: jest.fn(),
      getNodeModifyData: jest.fn().mockReturnValue({}),
    }
    activateRoute = { parent: null }
    router = { navigateByUrl: jest.fn(), navigate: jest.fn(), url: '/author/editor/do_course/collection' }
    profanityService = { startProfanity: jest.fn().mockReturnValue(of({})) }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    accessService = { userId: 'u1', userName: 'User One', hasRole: jest.fn().mockReturnValue(false) }
    uploadService = { upload: jest.fn().mockReturnValue(of({ artifactUrl: 'a.pdf' })) }
    http = { post: jest.fn().mockReturnValue(of({ result: { identifier: 'asset_1' } })) }
    initService = {
      backToHomeMessage,
      updateResourceMessage,
      ordinals: { subTitles: ['en'] },
      authConfig: new Proxy({}, { get: () => ({ type: 'string', defaultValue: { Resource: [{ value: '' }] } }) }),
      collectionConfig: { childrenConfig: {}, maxDepth: 4 },
    }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of({ identifier: 'do_course', versionKey: 'vkRead', children: [] })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      sendToReview: jest.fn().mockReturnValue(of({ params: { status: 'successful' } })),
      updateContentWithFewFields: jest.fn().mockReturnValue(of({ params: { status: 'successful' } })),
      sendEmailNotificationAPI: jest.fn().mockReturnValue(of({ ok: true })),
      newCreatedLexid: '',
    }
    storeService = {
      currentParentNode: 3,
      parentNode: [],
      parentData: null,
      changedHierarchy: {},
      flatNodeMap: new Map(),
      uniqueIdMap: new Map(),
      lexIdMap: new Map([['do_course', [1]]]),
      treeStructureChange: { next: jest.fn() },
      selectedNodeChange: { next: jest.fn() },
      getTreeHierarchy: jest.fn().mockReturnValue({}),
      getNewTreeHierarchy: jest.fn().mockReturnValue({}),
      validationCheck: jest.fn().mockReturnValue(null),
      deleteContentNode: jest.fn(),
    }
    configurationsService = {
      userProfile: { userId: 'u1', userName: 'User One', email: 'u1@x.com' },
      instanceConfig: { logos: { defaultContent: 'default.png' } },
    }
    resolverService = { buildTreeAndMap: jest.fn(), hasAccess: jest.fn().mockReturnValue(true) }
    headerService = { showCreatorHeader: jest.fn() }
    valueSvc = { isLtMedium$: of(false) }
    quizStoreSvc = { getQuizConfig: jest.fn().mockReturnValue({}) }
    quizResolverSvc = {}
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    progressSvc = { addComment: jest.fn().mockReturnValue(of({ ok: true })) }
    resourceDownloadSvc = {
      downloadResource: jest.fn().mockResolvedValue(undefined),
      downloadAllAsZip: jest.fn().mockResolvedValue(undefined),
      hasDownloadableResources: jest.fn().mockReturnValue(true),
    }
    ;(window as any).env = { azureBucket: 'bucket' }

    component = build()
    component.currentCourseId = 'do_course'
    component.currentParentId = 'do_course'
    component.versionKey = { versionKey: 'vkMeta' } as any
    component.courseData = { identifier: 'do_course', lang: 'en', children: [] } as any
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  // ---------------------------------------------------------------- saves() --

  describe('saves', () => {
    it('flushes a pending resource selection before saving', async () => {
      const updateSpy = jest.spyOn(component, 'update').mockResolvedValue(undefined as any)
      component.resourseSelected = 'do_res'
      await component.saves()
      expect(updateSpy).toHaveBeenCalled()
    })

    it('arms the quiz save trigger in assessment view', async () => {
      component.viewMode = 'assessment'
      await component.saves()
      expect(component.triggerQuizSave).toBe(true)
    })

    it('arms the upload save trigger in upload view', async () => {
      component.viewMode = 'upload'
      await component.saves()
      expect(component.triggerUploadSave).toBe(true)
    })

    it('reports the content as already up to date when nothing changed', async () => {
      await component.saves()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.UP_TO_DATE },
        duration: expect.any(Number),
      })
    })

    it('treats a change map whose only entry is empty as no change', async () => {
      contentService.upDatedContent = { do_course: {} }
      await component.saves()
      expect(editorService.updateContentV4).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.UP_TO_DATE },
        duration: expect.any(Number),
      })
    })

    it('jumps straight to the next action when there is nothing to save', async () => {
      const actionSpy = jest.spyOn(component, 'action').mockImplementation(() => {})
      await component.saves('push')
      expect(actionSpy).toHaveBeenCalledWith('push')
    })

    it('re-reads the course before pushing when it is on the settings page', async () => {
      const actionSpy = jest.spyOn(component, 'action').mockImplementation(() => {})
      component.isSettingsPage = true
      await component.saves('push')
      await Promise.resolve()
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expect(contentService.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
      expect(actionSpy).toHaveBeenCalledWith('push')
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('does not push from the settings page while an error dialog is open', async () => {
      const actionSpy = jest.spyOn(component, 'action').mockImplementation(() => {})
      component.isSettingsPage = true
      component.isError = true
      await component.saves('push')
      await Promise.resolve()
      expect(actionSpy).not.toHaveBeenCalled()
    })

    it('reads the current version before saving a non-CourseUnit', async () => {
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      jest.spyOn(component, 'triggerSaves').mockReturnValue(of({}) as any)
      await component.saves()
      expect(component.isChanged).toBe(true)
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expect(component.versionID).toEqual(expect.objectContaining({ versionKey: 'vkRead' }))
    })

    it('skips the version read for a CourseUnit', async () => {
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      contentService.getUpdatedMeta.mockReturnValue({ contentType: 'CourseUnit' })
      jest.spyOn(component, 'triggerSaves').mockReturnValue(of({}) as any)
      await component.saves()
      expect(editorService.readcontentV3).not.toHaveBeenCalled()
    })

    it('saves when only the hierarchy changed', async () => {
      storeService.changedHierarchy = { do_course: {} }
      const trigger = jest.spyOn(component, 'triggerSaves').mockReturnValue(of({}) as any)
      await component.saves()
      expect(trigger).toHaveBeenCalled()
    })

    it('notifies success and runs the next action once the save resolves', async () => {
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      jest.spyOn(component, 'triggerSaves').mockReturnValue(of({}) as any)
      const actionSpy = jest.spyOn(component, 'action').mockImplementation(() => {})
      await component.saves('push')
      expect(actionSpy).toHaveBeenCalledWith('push')
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SAVE_SUCCESS },
        duration: expect.any(Number),
      })
    })

    it('opens the error parser on a 409 conflict and clears the flag when it closes', async () => {
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      jest.spyOn(component, 'triggerSaves').mockReturnValue(throwError(() => ({ status: 409, error: { boom: true } })) as any)
      await component.saves()
      expect(component.isError).toBe(true)
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(undefined)
      expect(component.isError).toBe(false)
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SAVE_FAIL },
        duration: expect.any(Number),
      })
    })

    it('only notifies on a non-conflict save failure', async () => {
      contentService.upDatedContent = { do_course: { name: 'changed' } }
      jest.spyOn(component, 'triggerSaves').mockReturnValue(throwError(() => ({ status: 500 })) as any)
      await component.saves()
      expect(component.isError).toBe(false)
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SAVE_FAIL },
        duration: expect.any(Number),
      })
    })
  })

  // ---------------------------------------------------------- triggerSaves() --

  describe('triggerSaves', () => {
    it('adds a synthetic root node when no changed node is the root', async () => {
      // The selected content itself has no pending edits, so the save falls through
      // to the hierarchy endpoint.
      component.currentCourseId = 'do_selected'
      contentService.upDatedContent = { do_unit: { name: 'x' } }
      await component.triggerSaves().toPromise()
      expect(editorService.updateContentV4).toHaveBeenCalledWith({
        request: { data: { nodesModified: {}, hierarchy: {} } },
      })
    })

    it('marks the changed node as root when the store already knows it', async () => {
      component.currentCourseId = 'do_selected'
      storeService.parentNode = ['do_other']
      contentService.upDatedContent = { do_other: { name: 'x' } }
      await component.triggerSaves().toPromise()
      expect(editorService.updateContentV4).toHaveBeenCalled()
    })

    it('sends a CourseUnit through the hierarchy endpoint with Parent visibility', async () => {
      // The hierarchy tap empties upDatedContent, so keep the node reference.
      const node: any = { category: 'CourseUnit', name: 'unit' }
      contentService.upDatedContent = { do_course: node }
      await component.triggerSaves().toPromise()
      expect(node.visibility).toBe('Parent')
      expect(editorService.updateNewContentV3).not.toHaveBeenCalled()
      expect(editorService.updateContentV4).toHaveBeenCalled()
    })

    it('sends a Collection through the hierarchy endpoint with Parent visibility', async () => {
      const node: any = { category: 'Collection', name: 'coll' }
      contentService.upDatedContent = { do_course: node }
      await component.triggerSaves().toPromise()
      expect(node.visibility).toBe('Parent')
    })

    it('takes the version key from the freshly read version when present', async () => {
      component.versionID = { versionKey: 'vkFresh' }
      contentService.upDatedContent = { do_course: { category: 'Resource', name: 'r' } }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.versionKey).toBe('vkFresh')
    })

    it('falls back to the cached meta version key when no version was read', async () => {
      component.versionID = undefined
      component.versionKey = { versionKey: 'vkCached' } as any
      contentService.upDatedContent = { do_course: { category: 'Resource', name: 'r' } }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.versionKey).toBe('vkCached')
    })

    it('flattens the competency of a self assessment', async () => {
      component.isSelfAssessment = true
      contentService.upDatedContent = {
        do_course: { category: 'Resource', competencies_v1: { name: 'Comp', entityId: 42 } },
      }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.competencies_v1).toEqual([{ competencyName: 'Comp', competencyId: '42' }])
    })

    it('prefers the Hindi competency name on a Hindi course', async () => {
      component.isSelfAssessment = true
      component.courseData = { identifier: 'do_course', lang: 'hi' } as any
      contentService.upDatedContent = {
        do_course: { category: 'Resource', competencies_v1: { name: 'Comp', 'lang-hi-name': 'कॉम्प', entityId: 42 } },
      }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.competencies_v1[0].competencyName).toBe('कॉम्प')
    })

    it('falls back to the default competency name when no Hindi name exists', async () => {
      component.isSelfAssessment = true
      component.courseData = { identifier: 'do_course', lang: 'hi' } as any
      contentService.upDatedContent = {
        do_course: { category: 'Resource', competencies_v1: { name: 'Comp', entityId: 7 } },
      }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.competencies_v1[0].competencyName).toBe('Comp')
    })

    it('stringifies a numeric duration, including zero', async () => {
      contentService.upDatedContent = { do_course: { category: 'Resource', duration: 0 } }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.duration).toBe('0')
    })

    it('leaves an already-string duration alone', async () => {
      contentService.upDatedContent = { do_course: { category: 'Resource', duration: '120' } }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.duration).toBe('120')
    })

    it('drops the category from the outgoing payload', async () => {
      contentService.upDatedContent = { do_course: { category: 'Resource', name: 'r' } }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.category).toBeUndefined()
    })

    it('expands track contacts into reviewer ids', async () => {
      contentService.upDatedContent = {
        do_course: { category: 'Resource', trackContacts: [{ id: 'r1' }, { id: 'r2' }] },
      }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.reviewerIDs).toEqual(['r1', 'r2'])
      expect(body.request.content.reviewer).toBe(JSON.stringify([{ id: 'r1' }, { id: 'r2' }]))
      expect(body.request.content.trackContacts).toBeUndefined()
    })

    it('ignores an empty track contact list', async () => {
      contentService.upDatedContent = { do_course: { category: 'Resource', trackContacts: [] } }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.reviewerIDs).toBeUndefined()
    })

    it('expands publisher details into publisher ids', async () => {
      contentService.upDatedContent = {
        do_course: { category: 'Resource', publisherDetails: [{ id: 'p1' }] },
      }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.publisherIDs).toEqual(['p1'])
    })

    it('expands creator contacts into creator ids', async () => {
      contentService.upDatedContent = {
        do_course: { category: 'Resource', creatorContacts: [{ id: 'c1' }, { id: 'c2' }] },
      }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.creatorIDs).toEqual(['c1', 'c2'])
    })

    it('expands catalog paths into topics', async () => {
      contentService.upDatedContent = {
        do_course: { category: 'Resource', catalogPaths: [{ identifier: 't1' }] },
      }
      await component.triggerSaves().toPromise()
      const [body] = editorService.updateNewContentV3.mock.calls[0]
      expect(body.request.content.topics).toEqual(['t1'])
    })

    it('remembers the payload it sent as the current content', async () => {
      contentService.upDatedContent = { do_course: { category: 'Course', name: 'r' } }
      await component.triggerSaves().toPromise()
      expect(contentService.currentContentID).toBe('do_course')
      expect(contentService.currentContentData).toEqual(expect.objectContaining({ name: 'r' }))
    })

    it('sends a content with no category through the single-content endpoint', async () => {
      contentService.upDatedContent = { do_course: { name: 'r' } }
      await component.triggerSaves().toPromise()
      expect(editorService.updateNewContentV3).toHaveBeenCalled()
    })

    it('resets the change bookkeeping after a successful single-content save', async () => {
      contentService.upDatedContent = { do_course: { category: 'Course', name: 'r' } }
      storeService.changedHierarchy = { dirty: true }
      await component.triggerSaves().toPromise()
      expect(storeService.changedHierarchy).toEqual({})
      expect(contentService.resetOriginalMeta).toHaveBeenCalled()
      expect(contentService.upDatedContent).toEqual({})
    })

    it('pushes on from the settings page after a single-content save', async () => {
      const actionSpy = jest.spyOn(component, 'action').mockImplementation(() => {})
      component.isSettingsPage = true
      contentService.upDatedContent = { do_course: { category: 'Course', name: 'r' } }
      await component.triggerSaves().toPromise()
      await Promise.resolve()
      expect(actionSpy).toHaveBeenCalledWith('push')
    })

    it('resets the change bookkeeping after a hierarchy save', async () => {
      component.currentCourseId = 'do_selected'
      contentService.upDatedContent = { do_unit: { name: 'x' } }
      storeService.changedHierarchy = { dirty: true }
      await component.triggerSaves().toPromise()
      expect(storeService.changedHierarchy).toEqual({})
      expect(contentService.upDatedContent).toEqual({})
    })
  })

  // -------------------------------------------------------------- updates() --

  describe('updates', () => {
    it('clears the pending selection and pushes the hierarchy', async () => {
      component.resourseSelected = 'do_res'
      await component.updates()
      expect(component.resourseSelected).toBe('')
      expect(editorService.updateContentV4).toHaveBeenCalledWith({
        request: { data: { nodesModified: {}, hierarchy: {} } },
      })
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expect(contentService.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------- validationCheck --

  describe('validationCheck', () => {
    it('passes when the store reports no problems', () => {
      expect(component.validationCheck).toBe(true)
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('opens the error parser and fails when the store reports problems', () => {
      storeService.validationCheck.mockReturnValue([{ id: 'do_x', message: ['bad'] }])
      expect(component.validationCheck).toBe(false)
      expect(component.isError).toBe(true)
      expect(dialog.open).toHaveBeenCalled()
    })

    it('selects the offending node by lex id when the dialog returns a string', () => {
      storeService.validationCheck.mockReturnValue([{ id: 'do_x' }])
      storeService.lexIdMap.set('do_x', [9])
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      expect(component.validationCheck).toBe(false)
      afterClosed.next('do_x')
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(9)
      expect(activeSpy).toHaveBeenCalledWith('do_x')
      expect(component.isError).toBe(false)
    })

    it('selects the offending node by index when the dialog returns a number', () => {
      storeService.validationCheck.mockReturnValue([{ id: 'do_x' }])
      storeService.uniqueIdMap.set(4, 'do_y')
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      expect(component.validationCheck).toBe(false)
      afterClosed.next(4)
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(4)
      expect(activeSpy).toHaveBeenCalledWith('do_y')
    })

    it('just clears the error flag when the dialog is dismissed', () => {
      storeService.validationCheck.mockReturnValue([{ id: 'do_x' }])
      expect(component.validationCheck).toBe(false)
      afterClosed.next(undefined)
      expect(storeService.selectedNodeChange.next).not.toHaveBeenCalled()
      expect(component.isError).toBe(false)
    })
  })

  // ------------------------------------------------------------ takeAction --

  describe('takeAction', () => {
    beforeEach(() => {
      jest.spyOn(component, 'finalCall').mockResolvedValue(undefined as any)
    })

    it('does nothing when validation fails', () => {
      storeService.validationCheck.mockReturnValue([{ id: 'do_x' }])
      component.takeAction('acceptConent')
      expect(component.isSubmitPressed).toBe(true)
      expect(editorService.readcontentV3).not.toHaveBeenCalled()
    })

    it('normalises the stringified contact fields it reads back', () => {
      editorService.readcontentV3.mockReturnValue(
        of({
          identifier: 'do_course',
          creatorContacts: '[{"id":"c1"}]',
          reviewer: '[{"id":"r1"}]',
          gatingEnabled: 'true',
          creatorDetails: '[{"id":"cd"}]',
          publisherDetails: '[{"id":"p1"}]',
          children: [],
        }),
      )
      component.takeAction('acceptConent')
      const saved = contentService.setOriginalMeta.mock.calls[0][0]
      expect(saved.creatorContacts).toEqual([{ id: 'c1' }])
      expect(saved.trackContacts).toEqual([{ id: 'r1' }])
      expect(saved.publisherDetails).toEqual([{ id: 'p1' }])
    })

    it('defaults unparseable contact fields to empty lists', () => {
      editorService.readcontentV3.mockReturnValue(
        of({ identifier: 'do_course', creatorContacts: 'not json', reviewer: undefined, children: [] }),
      )
      component.takeAction('acceptConent')
      const saved = contentService.setOriginalMeta.mock.calls[0][0]
      expect(saved.creatorContacts).toEqual([])
      expect(saved.trackContacts).toEqual([])
    })

    it('normalises the children as well', () => {
      editorService.readcontentV3.mockReturnValue(
        of({
          identifier: 'do_course',
          children: [{ identifier: 'do_c1', creatorContacts: '[{"id":"c1"}]', reviewer: '[{"id":"r1"}]' }],
        }),
      )
      component.takeAction('acceptConent')
      const saved = contentService.setOriginalMeta.mock.calls[0][0]
      expect(saved.children[0].creatorContacts).toEqual([{ id: 'c1' }])
      expect(saved.children[0].trackContacts).toEqual([{ id: 'r1' }])
    })

    it('ignores an empty read', () => {
      editorService.readcontentV3.mockReturnValue(of({}))
      component.takeAction('acceptConent')
      expect(contentService.setOriginalMeta).not.toHaveBeenCalled()
    })

    it('opens the comments dialog for a review action', () => {
      component.takeAction('acceptConent')
      expect(component.isVisibleReviewDialog).toBe(true)
      expect(dialog.open).toHaveBeenCalled()
    })

    it('does not open a second comments dialog while one is already open', () => {
      component.isVisibleReviewDialog = true
      component.takeAction('acceptConent')
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('publishes resources directly without a comments dialog', () => {
      component.takeAction('publishResources')
      expect(dialog.open).not.toHaveBeenCalled()
      expect(component.finalCall).toHaveBeenCalledWith('publishResources')
    })

    it('records the comment and finalises an accepted content', () => {
      component.takeAction('acceptConent')
      afterClosed.next({ value: { action: 'accept', comments: 'looks good' } })
      expect(progressSvc.addComment).toHaveBeenCalledWith(
        expect.objectContaining({ comments: 'looks good', courseId: 'do_course', role: 'creator' }),
      )
      expect(component.finalCall).toHaveBeenCalledWith('acceptConent')
    })

    it('still finalises an accepted content when the comment call fails', () => {
      progressSvc.addComment.mockReturnValue(throwError(() => new Error('nope')))
      component.takeAction('acceptConent')
      afterClosed.next({ value: { action: 'accept', comments: 'c' } })
      expect(component.finalCall).toHaveBeenCalledWith('acceptConent')
    })

    it('does not finalise when the comment call resolves empty', () => {
      progressSvc.addComment.mockReturnValue(of(null))
      component.takeAction('acceptConent')
      afterClosed.next({ value: { action: 'accept', comments: 'c' } })
      expect(component.finalCall).not.toHaveBeenCalled()
    })

    it('turns a reviewer rejection into a rejectContent action', () => {
      contentService.originalContent = { do_course: { status: 'Draft' } }
      component.takeAction('acceptConent')
      afterClosed.next({ value: { action: 'reject', comments: 'needs work' } })
      expect(component.finalCall).toHaveBeenCalledWith('rejectContent')
    })

    it('still rejects when the comment call fails', () => {
      contentService.originalContent = { do_course: { status: 'Draft' } }
      progressSvc.addComment.mockReturnValue(throwError(() => new Error('nope')))
      component.takeAction('acceptConent')
      afterClosed.next({ value: { action: 'reject', comments: 'c' } })
      expect(component.finalCall).toHaveBeenCalledWith('rejectContent')
    })

    it('does nothing when the comments dialog is dismissed', () => {
      component.takeAction('acceptConent')
      afterClosed.next(undefined)
      expect(component.isVisibleReviewDialog).toBe(false)
      expect(component.finalCall).not.toHaveBeenCalled()
    })

    it('ignores an unrecognised action once the dialog closes', () => {
      component.takeAction('somethingElse')
      afterClosed.next({ value: { action: 'accept', comments: 'c' } })
      expect(progressSvc.addComment).not.toHaveBeenCalled()
      expect(component.finalCall).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------- finalCall --

  describe('finalCall', () => {
    const child = (over: any = {}) => ({
      name: 'Res',
      identifier: 'do_res',
      status: 'Draft',
      versionKey: 'vk',
      reviewStatus: 'Draft',
      contentType: 'Resource',
      children: [],
      ...over,
    })

    beforeEach(() => {
      jest.spyOn(component, 'finalSaveAndRedirect').mockImplementation(() => {})
      contentService.getUpdatedMeta.mockReturnValue({ identifier: 'do_course', status: 'Draft', versionKey: 'vk0' })
    })

    it('does nothing for an action that is not accept or publish', async () => {
      await component.finalCall('rejectContent')
      expect(editorService.sendToReview).not.toHaveBeenCalled()
    })

    it('does nothing when the course has no children', async () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'do_course', children: [] })
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).not.toHaveBeenCalled()
    })

    it('sends each resource to review and redirects once they all succeed', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Draft',
        reviewStatus: 'Draft',
        children: [child()],
      })
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).toHaveBeenCalledWith('do_res', 'Draft')
      expect(editorService.updateContentWithFewFields).toHaveBeenCalled()
      expect(dialog.closeAll).toHaveBeenCalled()
      expect(component.finalSaveAndRedirect).toHaveBeenCalled()
    })

    it('walks into a CourseUnit and reviews its children', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Draft',
        reviewStatus: 'Draft',
        children: [child({ contentType: 'CourseUnit', identifier: 'do_unit', children: [child()] })],
      })
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).toHaveBeenCalledWith('do_res', 'Draft')
      expect(editorService.updateContentV4).toHaveBeenCalled()
      expect(component.finalSaveAndRedirect).toHaveBeenCalled()
    })

    it('handles an empty CourseUnit', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Draft',
        reviewStatus: 'Draft',
        children: [child({ contentType: 'CourseUnit', identifier: 'do_unit', children: [] })],
      })
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).not.toHaveBeenCalled()
    })

    it('redirects without a hierarchy write when the course is past Draft', async () => {
      contentService.getUpdatedMeta.mockReturnValue({ identifier: 'do_course', status: 'Review', versionKey: 'vk0' })
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Draft',
        reviewStatus: 'Draft',
        children: [child({ contentType: 'CourseUnit', identifier: 'do_unit', children: [child()] })],
      })
      await component.finalCall('acceptConent')
      expect(editorService.updateContentV4).not.toHaveBeenCalled()
      expect(component.finalSaveAndRedirect).toHaveBeenCalled()
    })

    it('counts an already-Live resource as done without calling the API', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Draft',
        reviewStatus: 'Draft',
        children: [child({ status: 'Live' })],
      })
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).not.toHaveBeenCalled()
      expect(component.finalSaveAndRedirect).toHaveBeenCalled()
    })

    it('counts an already-Live resource as done when the course is in Review', async () => {
      contentService.getUpdatedMeta.mockReturnValue({ identifier: 'do_course', status: 'Review', versionKey: 'vk0' })
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Draft',
        reviewStatus: 'Draft',
        children: [child({ status: 'Live' })],
      })
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).not.toHaveBeenCalled()
      expect(component.finalSaveAndRedirect).toHaveBeenCalled()
    })

    it('stops and drops the loader when a resource fails review', async () => {
      editorService.sendToReview.mockReturnValue(of({ params: { status: 'failed' } }))
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Draft',
        reviewStatus: 'Draft',
        children: [child()],
      })
      await component.finalCall('acceptConent')
      expect(component.finalSaveAndRedirect).not.toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('stops when the follow-up field update fails', async () => {
      editorService.updateContentWithFewFields.mockReturnValue(of({ params: { status: 'failed' } }))
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Draft',
        reviewStatus: 'Draft',
        children: [child()],
      })
      await component.finalCall('acceptConent')
      expect(component.finalSaveAndRedirect).not.toHaveBeenCalled()
    })

    it('surfaces an upload error dialog when the review call rejects', async () => {
      editorService.sendToReview.mockReturnValue(throwError(() => ({ error: { params: { status: 'failed' } } })))
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Draft',
        reviewStatus: 'Draft',
        children: [child()],
      })
      await component.finalCall('acceptConent')
      expect(dialog.open).toHaveBeenCalled()
      expect(component.finalSaveAndRedirect).not.toHaveBeenCalled()
    })

    it('swallows a review rejection that is not a failed status', async () => {
      editorService.sendToReview.mockReturnValue(throwError(() => ({ error: { params: { status: 'other' } } })))
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Draft',
        reviewStatus: 'Draft',
        children: [child()],
      })
      await component.finalCall('acceptConent')
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('leaves an InReview course under review alone', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Review',
        reviewStatus: 'InReview',
        children: [child()],
      })
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).not.toHaveBeenCalled()
    })

    it('leaves a Reviewed course under review alone', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        status: 'Review',
        reviewStatus: 'Reviewed',
        children: [child()],
      })
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).not.toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------- finalSaveAndRedirect --

  describe('finalSaveAndRedirect', () => {
    const meta = { identifier: 'do_course', status: 'Draft', versionKey: 'vk0' }

    it('notifies, mails and opens the success dialog when nothing is left', async () => {
      component.contents = [{ identifier: 'do_course' }] as any
      component.finalSaveAndRedirect(meta)
      await Promise.resolve()
      await Promise.resolve()
      expect(editorService.sendToReview).toHaveBeenCalledWith('do_course', 'Draft')
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SEND_FOR_REVIEW_SUCCESS },
        duration: expect.any(Number),
      })
      expect(dialog.open).toHaveBeenCalled()
    })

    it('moves to the next remaining content instead of finishing', async () => {
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      component.contents = [{ identifier: 'do_course' }, { identifier: 'do_next' }] as any
      component.finalSaveAndRedirect(meta)
      await Promise.resolve()
      await Promise.resolve()
      expect(activeSpy).toHaveBeenCalledWith('do_next')
    })

    it('notifies a failure when the field update does not succeed', async () => {
      editorService.updateContentWithFewFields.mockReturnValue(of({ params: { status: 'failed' } }))
      component.contents = []
      component.finalSaveAndRedirect(meta)
      await Promise.resolve()
      await Promise.resolve()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SEND_FOR_REVIEW_FAIL },
        duration: expect.any(Number),
      })
    })

    it('notifies a failure when the field update rejects', async () => {
      editorService.updateContentWithFewFields.mockReturnValue(throwError(() => new Error('boom')))
      component.contents = []
      component.finalSaveAndRedirect(meta)
      await Promise.resolve()
      await Promise.resolve()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SEND_FOR_REVIEW_FAIL },
        duration: expect.any(Number),
      })
    })

    it('opens the error parser on a 409 and resolves the offending node by id', () => {
      editorService.sendToReview.mockReturnValue(throwError(() => ({ status: 409, error: { e: 1 } })))
      storeService.lexIdMap.set('do_x', [11])
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      component.finalSaveAndRedirect(meta)
      expect(component.isError).toBe(true)
      afterClosed.next('do_x')
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(11)
      expect(activeSpy).toHaveBeenCalledWith('do_x')
      expect(component.isError).toBe(false)
    })

    it('resolves the offending node by index on a 409', () => {
      editorService.sendToReview.mockReturnValue(throwError(() => ({ status: 409, error: { e: 1 } })))
      storeService.uniqueIdMap.set(2, 'do_y')
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      component.finalSaveAndRedirect(meta)
      afterClosed.next(2)
      expect(activeSpy).toHaveBeenCalledWith('do_y')
    })

    it('clears the error flag when the 409 dialog is dismissed', () => {
      editorService.sendToReview.mockReturnValue(throwError(() => ({ status: 409, error: { e: 1 } })))
      component.finalSaveAndRedirect(meta)
      afterClosed.next(undefined)
      expect(component.isError).toBe(false)
    })

    it('only notifies on a non-conflict failure', () => {
      editorService.sendToReview.mockReturnValue(throwError(() => ({ status: 500 })))
      component.finalSaveAndRedirect(meta)
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: Notify.SEND_FOR_REVIEW_FAIL },
        duration: expect.any(Number),
      })
    })
  })

  // ------------------------------------------------------ sendEmailNotification --

  describe('sendEmailNotification', () => {
    it('mails every reviewer parsed from a stringified list', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        reviewer: '[{"email":"r1@x.com"},{"email":"r2@x.com"}]',
      })
      await component.sendEmailNotification('sendForReview')
      expect(editorService.sendEmailNotificationAPI).toHaveBeenCalledWith(
        expect.objectContaining({ recipientEmails: ['r1@x.com', 'r2@x.com'], contentState: 'sendForReview' }),
      )
    })

    it('accepts an already-parsed reviewer list', async () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'do_course', reviewer: [{ email: 'r@x.com' }] })
      await component.sendEmailNotification('sendForReview')
      expect(editorService.sendEmailNotificationAPI).toHaveBeenCalled()
    })

    it('skips reviewers with no email address', async () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'do_course', reviewer: [{ id: 'r' }] })
      await component.sendEmailNotification('sendForReview')
      expect(editorService.sendEmailNotificationAPI).not.toHaveBeenCalled()
    })

    it('sends nothing when there are no reviewers at all', async () => {
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'do_course', reviewer: [] })
      await component.sendEmailNotification('sendForReview')
      expect(editorService.sendEmailNotificationAPI).not.toHaveBeenCalled()
    })

    it('mails the publishers for a publish request', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        publisherDetails: '[{"email":"p@x.com"}]',
      })
      await component.sendEmailNotification('sendForPublish')
      expect(editorService.sendEmailNotificationAPI).toHaveBeenCalledWith(expect.objectContaining({ recipientEmails: ['p@x.com'] }))
    })

    it('accepts an already-parsed publisher list', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        publisherDetails: [{ email: 'p@x.com' }],
      })
      await component.sendEmailNotification('sendForPublish')
      expect(editorService.sendEmailNotificationAPI).toHaveBeenCalled()
    })

    it('mails the creators when a review fails', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        creatorContacts: '[{"email":"c@x.com"}]',
      })
      await component.sendEmailNotification('reviewFailed')
      expect(editorService.sendEmailNotificationAPI).toHaveBeenCalledWith(expect.objectContaining({ recipientEmails: ['c@x.com'] }))
    })

    it('mails the creators when a publish fails', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        creatorContacts: [{ email: 'c@x.com' }],
      })
      await component.sendEmailNotification('publishFailed')
      expect(editorService.sendEmailNotificationAPI).toHaveBeenCalled()
    })

    it('mails the creators when a publish completes', async () => {
      contentService.getOriginalMeta.mockReturnValue({
        identifier: 'do_course',
        creatorContacts: [{ email: 'c@x.com' }],
      })
      await component.sendEmailNotification('publishCompleted')
      expect(editorService.sendEmailNotificationAPI).toHaveBeenCalled()
    })

    it('sends nothing for an unknown action type', async () => {
      await component.sendEmailNotification('somethingElse')
      expect(editorService.sendEmailNotificationAPI).not.toHaveBeenCalled()
    })

    it('falls back to empty sender fields with no user profile', async () => {
      configurationsService.userProfile = null
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'do_course', reviewer: [{ email: 'r@x.com' }] })
      await component.sendEmailNotification('sendForReview')
      expect(editorService.sendEmailNotificationAPI).toHaveBeenCalledWith(expect.objectContaining({ contentName: '', sender: '' }))
    })

    it('swallows a failure from the mail endpoint', async () => {
      editorService.sendEmailNotificationAPI.mockReturnValue(throwError(() => new Error('smtp down')))
      contentService.getOriginalMeta.mockReturnValue({ identifier: 'do_course', reviewer: [{ email: 'r@x.com' }] })
      await expect(component.sendEmailNotification('sendForReview')).resolves.toBeUndefined()
    })
  })

  // ------------------------------------------------------------ getMessage --

  describe('getMessage', () => {
    const withStatus = (status: string) => {
      contentService.originalContent = { do_course: { status } }
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
})
