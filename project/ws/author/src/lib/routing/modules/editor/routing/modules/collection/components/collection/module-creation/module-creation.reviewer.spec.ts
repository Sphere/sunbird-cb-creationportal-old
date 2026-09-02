import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { ModuleCreationComponent } from './module-creation.component'

/**
 * Wave 18 — the reviewer-side workflow of ModuleCreationComponent:
 * `changeStatusToDraft` (reject back to the creator), `contentPublish` and
 * `reviewerApproved`. Direct instantiation, as with the sibling specs.
 */
describe('ModuleCreationComponent (reviewer workflow)', () => {
  let component: ModuleCreationComponent
  let dialog: any
  let contentService: any
  let router: any
  let snackBar: any
  let loader: any
  let initService: any
  let editorService: any
  let storeService: any
  let configurationsService: any

  let backToHomeMessage: Subject<any>
  let updateResourceMessage: Subject<any>
  let afterClosed: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const ok = () => of({ params: { status: 'successful' } })
  const failed = () => of({ params: { status: 'failed' } })

  /** A course child as it comes back from readcontentV3. */
  const child = (over: any = {}) => ({
    identifier: 'do_res',
    name: 'Res',
    status: 'Review',
    versionKey: 'vkRes',
    contentType: 'Resource',
    children: [],
    ...over,
  })

  const course = (over: any = {}) => ({
    identifier: 'do_course',
    versionKey: 'vkCourse',
    status: 'Review',
    reviewStatus: 'InReview',
    children: [],
    ...over,
  })

  beforeEach(() => {
    backToHomeMessage = new Subject<any>()
    updateResourceMessage = new Subject<any>()
    afterClosed = new Subject<any>()

    dialog = {
      open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }),
      closeAll: jest.fn(),
    }
    contentService = {
      changeActiveCont: new Subject<string>(),
      parentContent: 'do_course',
      upDatedContent: {},
      originalContent: { do_course: { status: 'Review' } },
      getUpdatedMeta: jest.fn().mockReturnValue({ contentType: 'Course', status: 'Review' }),
      getOriginalMeta: jest.fn().mockReturnValue(course()),
      setOriginalMeta: jest.fn(),
      setUpdatedMeta: jest.fn(),
      cleanProperties: jest.fn((c: any) => ({ ...c })),
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
    initService = {
      backToHomeMessage,
      updateResourceMessage,
      ordinals: { subTitles: ['en'] },
      authConfig: new Proxy({}, { get: () => ({ type: 'string', defaultValue: { Resource: [{ value: '' }] } }) }),
      collectionConfig: { childrenConfig: {}, maxDepth: 4 },
      publishData: jest.fn(),
    }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of(course())),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      updateContentForReviwer: jest.fn().mockReturnValue(ok()),
      rejectContentApi: jest.fn().mockReturnValue(ok()),
      updateHierarchyForReviwer: jest.fn().mockReturnValue(ok()),
      publishContent: jest.fn().mockReturnValue(ok()),
      sendEmailNotificationAPI: jest.fn().mockReturnValue(of({})),
      sendToReview: jest.fn().mockReturnValue(ok()),
      updateContentWithFewFields: jest.fn().mockReturnValue(ok()),
      newCreatedLexid: '',
    }
    storeService = {
      currentParentNode: 3,
      parentNode: [],
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
      { userId: 'u1', userName: 'User One', hasRole: jest.fn().mockReturnValue(false) } as any,
      { upload: jest.fn().mockReturnValue(of({})) } as any,
      { post: jest.fn().mockReturnValue(of({})) } as any,
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
    component.courseData = course() as any
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

  // -------------------------------------------------------- changeStatusToDraft --

  describe('changeStatusToDraft', () => {
    beforeEach(() => {
      jest.spyOn(component, 'sendEmailNotification').mockResolvedValue(undefined)
    })

    it('rejects every in-review resource and sends the course back to draft', async () => {
      // The component reuses (and mutates) one request object across every call, so
      // record the version key at call time rather than reading it back afterwards.
      const seen: Array<[string, string]> = []
      editorService.updateContentForReviwer.mockImplementation((req: any, id: string) => {
        seen.push([id, req.request.content.versionKey])
        return ok()
      })
      editorService.readcontentV3.mockReturnValue(of(course({ children: [child()] })))
      await component.changeStatusToDraft('not good enough')
      expect(dialog.closeAll).toHaveBeenCalled()
      expect(seen).toEqual([
        ['do_res', 'vkRes'],
        ['do_course', 'vkCourse'],
      ])
      expect(editorService.rejectContentApi).toHaveBeenCalledWith({ request: { content: { rejectComment: 'not good enough' } } }, 'do_res')
      expect(editorService.updateHierarchyForReviwer).toHaveBeenCalled()
      expectNotified(Notify.SAVE_SUCCESS)
      expect(dialog.open).toHaveBeenCalled()
      expect(router.navigate).toHaveBeenCalledWith(['author', 'cbp'])
    })

    it('descends into a CourseUnit to find in-review resources', async () => {
      editorService.readcontentV3.mockReturnValue(
        of(course({ children: [child({ contentType: 'CourseUnit', identifier: 'do_unit', children: [child()] })] })),
      )
      await component.changeStatusToDraft('c')
      expect(editorService.rejectContentApi).toHaveBeenCalledWith(expect.anything(), 'do_res')
    })

    it('skips a unit child that is not in review', async () => {
      editorService.readcontentV3.mockReturnValue(
        of(
          course({
            status: 'Draft',
            children: [{ ...child({ contentType: 'CourseUnit', identifier: 'do_unit' }), children: [child({ status: 'Draft' })] }],
          }),
        ),
      )
      await component.changeStatusToDraft('c')
      expect(editorService.rejectContentApi).not.toHaveBeenCalled()
      expectNotified(Notify.SAVE_FAIL)
    })

    it('handles an empty CourseUnit', async () => {
      editorService.readcontentV3.mockReturnValue(
        of(course({ status: 'Draft', children: [child({ contentType: 'CourseUnit', children: [] })] })),
      )
      await component.changeStatusToDraft('c')
      expect(editorService.rejectContentApi).not.toHaveBeenCalled()
    })

    it('emails the creator when a review is rejected', async () => {
      editorService.readcontentV3.mockReturnValue(of(course({ reviewStatus: 'InReview', status: 'Review', children: [child()] })))
      await component.changeStatusToDraft('c')
      expect(component.sendEmailNotification).toHaveBeenCalledWith('reviewFailed')
    })

    it('emails the creator when a publish is rejected', async () => {
      editorService.readcontentV3.mockReturnValue(of(course({ reviewStatus: 'Reviewed', status: 'Review', children: [child()] })))
      await component.changeStatusToDraft('c')
      expect(component.sendEmailNotification).toHaveBeenCalledWith('publishFailed')
    })

    it('stays on the page when the move was triggered from the course itself', async () => {
      component.isMoveCourseToDraft = true
      editorService.readcontentV3.mockReturnValue(of(course({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expect(router.navigate).not.toHaveBeenCalled()
      expect(component.isMoveCourseToDraft).toBe(false)
    })

    it('reports a failure when a resource meta update fails', async () => {
      editorService.updateContentForReviwer.mockReturnValue(failed())
      editorService.readcontentV3.mockReturnValue(of(course({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
      expect(editorService.updateHierarchyForReviwer).not.toHaveBeenCalled()
    })

    it('reports a failure when a resource meta update rejects', async () => {
      editorService.updateContentForReviwer.mockReturnValue(throwError(() => new Error('boom')))
      editorService.readcontentV3.mockReturnValue(of(course({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when rejecting a resource fails', async () => {
      editorService.rejectContentApi.mockReturnValue(failed())
      editorService.readcontentV3.mockReturnValue(of(course({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the hierarchy update fails', async () => {
      editorService.updateHierarchyForReviwer.mockReturnValue(failed())
      editorService.readcontentV3.mockReturnValue(of(course({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the parent meta update fails', async () => {
      editorService.updateContentForReviwer.mockReturnValueOnce(ok()).mockReturnValueOnce(failed())
      editorService.readcontentV3.mockReturnValue(of(course({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when rejecting the parent fails', async () => {
      editorService.rejectContentApi.mockReturnValueOnce(ok()).mockReturnValueOnce(failed())
      editorService.readcontentV3.mockReturnValue(of(course({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('rejects a childless course that is still in review', async () => {
      editorService.readcontentV3.mockReturnValue(of(course({ status: 'Review', children: [] })))
      await component.changeStatusToDraft('c')
      expect(editorService.updateContentForReviwer).toHaveBeenCalledWith(
        { request: { content: { reviewStatus: 'InReview', versionKey: 'vkCourse' } } },
        'do_course',
      )
      expectNotified(Notify.SAVE_SUCCESS)
      expect(router.navigate).toHaveBeenCalledWith(['author', 'cbp'])
    })

    it('keeps a childless course in place when the move came from the course', async () => {
      component.isMoveCourseToDraft = true
      editorService.readcontentV3.mockReturnValue(of(course({ status: 'Review', children: [] })))
      await component.changeStatusToDraft('c')
      expect(router.navigate).not.toHaveBeenCalled()
    })

    it('reports a failure when the childless reject returns an error status', async () => {
      editorService.rejectContentApi.mockReturnValue(failed())
      editorService.readcontentV3.mockReturnValue(of(course({ status: 'Review', children: [] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the childless reject call errors', async () => {
      editorService.rejectContentApi.mockReturnValue(throwError(() => new Error('boom')))
      editorService.readcontentV3.mockReturnValue(of(course({ status: 'Review', children: [] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the childless meta update fails', async () => {
      editorService.updateContentForReviwer.mockReturnValue(failed())
      editorService.readcontentV3.mockReturnValue(of(course({ status: 'Review', children: [] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
      expect(editorService.rejectContentApi).not.toHaveBeenCalled()
    })

    it('refuses to reject a course that is not in review', async () => {
      editorService.readcontentV3.mockReturnValue(of(course({ status: 'Draft', children: [] })))
      await component.changeStatusToDraft('c')
      expect(editorService.updateContentForReviwer).not.toHaveBeenCalled()
      expectNotified(Notify.SAVE_FAIL)
    })
  })

  // -------------------------------------------------------------- contentPublish --

  describe('contentPublish', () => {
    const resource = (over: any = {}) => ({
      identifier: 'do_res',
      status: 'Review',
      parentStatus: 'Review',
      reviewerStatus: 'Reviewed',
      versionKey: 'vkRes',
      ...over,
    })

    it('does nothing for an empty resource list', async () => {
      await component.contentPublish([])
      expect(editorService.publishContent).not.toHaveBeenCalled()
    })

    it('does nothing when no resource list is supplied', async () => {
      await component.contentPublish(undefined)
      expect(editorService.publishContent).not.toHaveBeenCalled()
    })

    it('publishes each reviewed resource and refreshes the course', async () => {
      await component.contentPublish([resource()])
      expect(editorService.publishContent).toHaveBeenCalledWith('do_res')
      expect(contentService.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
      expect(initService.publishData).toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('counts an already-live resource without republishing it', async () => {
      await component.contentPublish([resource({ status: 'Live' })])
      expect(editorService.publishContent).not.toHaveBeenCalled()
      expect(initService.publishData).toHaveBeenCalled()
    })

    it('warns when a resource is in an unpublishable state', async () => {
      await component.contentPublish([resource({ status: 'Draft', reviewerStatus: 'Draft' })])
      expect(snackBar.open).toHaveBeenCalledWith(expect.stringContaining('not correct'), undefined, { duration: 3000 })
    })

    it('warns when the publish call reports a failure', async () => {
      editorService.publishContent.mockReturnValue(failed())
      await component.contentPublish([resource()])
      expect(snackBar.open).toHaveBeenCalledWith(expect.stringContaining('not correct'), undefined, { duration: 3000 })
    })

    it('surfaces the transport error when the publish call rejects', async () => {
      editorService.publishContent.mockReturnValue(throwError(() => ({ statusText: 'Gateway Timeout' })))
      await component.contentPublish([resource()])
      expect(dialog.closeAll).toHaveBeenCalled()
      expect(snackBar.open).toHaveBeenCalledWith('Gateway Timeout', undefined, { duration: 1000 })
    })
  })

  // ------------------------------------------------------------ reviewerApproved --

  describe('reviewerApproved', () => {
    const meta = { identifier: 'do_course', versionKey: 'vkCourse' } as any
    const resource = (over: any = {}) => ({
      identifier: 'do_res',
      status: 'Review',
      parentStatus: 'Review',
      reviewerStatus: 'InReview',
      versionKey: 'vkRes',
      ...over,
    })

    beforeEach(() => {
      jest.spyOn(component, 'sendEmailNotification').mockResolvedValue(undefined)
    })

    it('does nothing for an empty resource list', async () => {
      await component.reviewerApproved(meta, [])
      expect(editorService.updateContentForReviwer).not.toHaveBeenCalled()
    })

    it('does nothing when no resource list is supplied', async () => {
      await component.reviewerApproved(meta, undefined)
      expect(editorService.updateContentForReviwer).not.toHaveBeenCalled()
    })

    it('marks every resource reviewed then notifies the publisher', async () => {
      // One mutated request object is reused across calls — capture as it goes.
      const seen: Array<[string, string]> = []
      editorService.updateContentForReviwer.mockImplementation((req: any, id: string) => {
        seen.push([id, req.request.content.versionKey])
        return ok()
      })
      await component.reviewerApproved(meta, [resource()])
      expect(seen).toEqual([
        ['do_res', 'vkRes'],
        ['do_course', 'vkCourse'],
      ])
      expectNotified(Notify.SAVE_SUCCESS)
      expect(component.sendEmailNotification).toHaveBeenCalledWith('sendForPublish')
      expect(dialog.open).toHaveBeenCalled()
    })

    it('counts an already-live resource without touching it', async () => {
      await component.reviewerApproved(meta, [resource({ status: 'Live' })])
      expect(editorService.updateContentForReviwer).toHaveBeenCalledTimes(1)
      expectNotified(Notify.SAVE_SUCCESS)
    })

    it('reports a failure when a resource cannot be marked reviewed', async () => {
      editorService.updateContentForReviwer.mockReturnValue(failed())
      await component.reviewerApproved(meta, [resource()])
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when marking a resource reviewed rejects', async () => {
      editorService.updateContentForReviwer.mockReturnValue(throwError(() => new Error('boom')))
      await component.reviewerApproved(meta, [resource()])
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the parent update fails', async () => {
      editorService.updateContentForReviwer.mockReturnValueOnce(ok()).mockReturnValueOnce(failed())
      await component.reviewerApproved(meta, [resource()])
      expectNotified(Notify.SAVE_FAIL)
      expect(component.sendEmailNotification).not.toHaveBeenCalled()
    })

    it('reports a failure when a resource is in an unexpected state', async () => {
      await component.reviewerApproved(meta, [resource({ status: 'Draft', reviewerStatus: 'Draft' })])
      expectNotified(Notify.SAVE_FAIL)
    })
  })
})
