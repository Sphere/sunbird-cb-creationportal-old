import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { CourseCollectionComponent } from './course-collection.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

/**
 * Wave 18 — the reviewer / publisher workflow of CourseCollectionComponent:
 * `takeAction`, `finalCall`, `contentPublish`, `PublishCBP`, `reviewerApproved`,
 * `editPublishCourse`, `changeStatusToDraft`, `sendModuleToReviewOrPublish`,
 * `finalSaveAndRedirect`, `preview` and `closePreview`.
 * Direct instantiation, as with the sibling specs.
 */
describe('CourseCollectionComponent (review and publish workflow)', () => {
  let component: CourseCollectionComponent
  let contentService: any
  let activateRoute: any
  let storeService: any
  let resolverService: any
  let initService: any
  let loaderService: any
  let dialog: any
  let snackBar: any
  let editorService: any
  let router: any
  let accessControlSvc: any
  let breakpointObserver: any
  let headerService: any
  let rootSvc: any
  let configurationsService: any
  let progressSvc: any
  let cdr: any

  let changeActiveCont: Subject<string>
  let afterClosed: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const ok = () => of({ params: { status: 'successful' } })
  const failed = () => of({ params: { status: 'failed' } })

  const meta = (over: any = {}) => ({
    identifier: 'do_course',
    status: 'Draft',
    contentType: 'Course',
    versionKey: 'vkCourse',
    createdBy: 'u1',
    children: [],
    ...over,
  })

  /** A course child as it comes back from readcontentV3. */
  const child = (over: any = {}) => ({
    identifier: 'do_res',
    status: 'Review',
    versionKey: 'vkRes',
    reviewStatus: 'InReview',
    contentType: 'Resource',
    children: [],
    ...over,
  })

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
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      getOriginalMeta: jest.fn().mockReturnValue(meta()),
      setOriginalMeta: jest.fn(),
      checkConditionV2: jest.fn().mockReturnValue(true),
      cleanProperties: jest.fn().mockImplementation((v: any) => v),
      resetStatus: jest.fn().mockReturnValue(false),
      changeStatusDraft: jest.fn(),
      resetOriginalMetaWithHierarchy: jest.fn(),
      getNodeModifyData: jest.fn().mockReturnValue({}),
    }
    activateRoute = { parent: null }
    storeService = {
      parentNode: ['do_course'],
      parentData: null,
      currentParentNode: 1,
      currentSelectedNode: 1,
      changedHierarchy: {},
      lexIdMap: new Map<string, number[]>([['do_course', [1]]]),
      uniqueIdMap: new Map([[1, 'do_course']]),
      flatNodeMap: new Map(),
      selectedNodeChange: { next: jest.fn() },
      treeStructureChange: { next: jest.fn() },
      uploadFileType: { next: jest.fn() },
      getTreeHierarchy: jest.fn().mockReturnValue({}),
      validationCheck: jest.fn().mockReturnValue(null),
      createChildOrSibling: jest.fn().mockResolvedValue(true),
    }
    resolverService = { buildTreeAndMap: jest.fn() }
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
      collectionConfig: {
        stepper: true,
        languageBar: true,
        actionButtons: { enabled: true, buttons: [] },
      },
      isEditMetaPageAction: jest.fn(),
      backToHome: jest.fn(),
      publishData: jest.fn(),
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
      readcontentV3: jest.fn().mockReturnValue(of(meta())),
      deleteContent: jest.fn().mockReturnValue(of({})),
      sendEmailNotificationAPI: jest.fn().mockReturnValue(of({ ok: true })),
      sendToReview: jest.fn().mockReturnValue(ok()),
      updateContentWithFewFields: jest.fn().mockReturnValue(ok()),
      updateContentForReviwer: jest.fn().mockReturnValue(ok()),
      updateHierarchyForReviwer: jest.fn().mockReturnValue(ok()),
      rejectContentApi: jest.fn().mockReturnValue(ok()),
      publishContent: jest.fn().mockReturnValue(ok()),
      updateNewContentV3: jest.fn().mockReturnValue(of({ ok: true })),
      updateContentV4: jest.fn().mockReturnValue(of({ ok: true })),
      createBatch: jest.fn().mockReturnValue(of({ ok: true })),
    }
    router = { navigate: jest.fn(), navigateByUrl: jest.fn(), url: '/author/editor/do_course/collection' }
    accessControlSvc = { userId: 'u1', hasRole: jest.fn().mockReturnValue(false) }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    headerService = { isSavePressed: false, headerSaveData: new Subject<any>(), showCreatorHeader: jest.fn() }
    rootSvc = { showNavbarDisplay$: { next: jest.fn() } }
    configurationsService = {
      userRoles: new Set(['content_creator']),
      userProfile: { userId: 'u1', userName: 'User One', email: 'u1@x.com' },
    }
    progressSvc = { addComment: jest.fn().mockReturnValue(of({ ok: true })) }
    cdr = { detectChanges: jest.fn() }

    component = new CourseCollectionComponent(
      contentService,
      activateRoute,
      storeService,
      resolverService,
      initService,
      loaderService,
      dialog,
      snackBar,
      editorService,
      router,
      accessControlSvc,
      breakpointObserver,
      new FormBuilder(),
      headerService,
      rootSvc,
      configurationsService,
      progressSvc,
      cdr,
    )
    component.currentParentId = 'do_course'
    component.currentCourseId = 'do_course'
    component.courseData = meta() as any
    component.contents = [{ identifier: 'do_course' }] as any
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

  const flush = async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  }

  // ------------------------------------------------------------ takeAction --

  describe('takeAction', () => {
    beforeEach(() => {
      jest.spyOn(component, 'finalCall').mockResolvedValue(undefined)
    })

    it('does nothing when validation fails', () => {
      storeService.validationCheck.mockReturnValue([{ id: 'do_x' }])
      component.takeAction('acceptConent')
      expect(component.isSubmitPressed).toBe(true)
      expect(editorService.readcontentV3).not.toHaveBeenCalled()
    })

    it('normalises the stringified contact fields it reads back', () => {
      editorService.readcontentV3.mockReturnValue(
        of(
          meta({
            creatorContacts: '[{"id":"c1"}]',
            reviewer: '[{"id":"r1"}]',
            creatorDetails: '[{"id":"cd"}]',
            publisherDetails: '[{"id":"p1"}]',
          }),
        ),
      )
      component.takeAction('acceptConent')
      const saved = contentService.setOriginalMeta.mock.calls[0][0]
      expect(saved.creatorContacts).toEqual([{ id: 'c1' }])
      expect(saved.trackContacts).toEqual([{ id: 'r1' }])
      expect(saved.publisherDetails).toEqual([{ id: 'p1' }])
    })

    it('defaults unparseable contact fields to empty lists', () => {
      editorService.readcontentV3.mockReturnValue(of(meta({ creatorContacts: 'not json', reviewer: undefined })))
      component.takeAction('acceptConent')
      const saved = contentService.setOriginalMeta.mock.calls[0][0]
      expect(saved.creatorContacts).toEqual([])
      expect(saved.trackContacts).toEqual([])
    })

    it('normalises the children as well', () => {
      editorService.readcontentV3.mockReturnValue(
        of(meta({ children: [{ identifier: 'do_c1', creatorContacts: '[{"id":"c1"}]', reviewer: '[{"id":"r1"}]' }] })),
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
      expect(dialog.open).toHaveBeenCalled()
    })

    it('publishes resources directly without a comments dialog', () => {
      component.takeAction('publishResources')
      expect(dialog.open).not.toHaveBeenCalled()
      expect(component.finalCall).toHaveBeenCalledWith('publishResources')
    })

    it('records the reviewer comment and finalises the acceptance', () => {
      component.takeAction('acceptConent')
      afterClosed.next({ value: { action: 'accept', comments: 'looks good' } })
      expect(progressSvc.addComment).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'reviewer', comments: 'looks good', nextStatus: 'Sent for Publish' }),
      )
      expect(component.finalCall).toHaveBeenCalledWith('acceptConent')
    })

    it('still finalises when recording the comment fails', () => {
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

    it('turns a rejection into a rejectContent action', () => {
      contentService.originalContent = { do_course: meta({ status: 'Draft' }) }
      component.takeAction('acceptConent')
      afterClosed.next({ value: { action: 'reject', comments: 'needs work' } })
      expect(progressSvc.addComment).toHaveBeenCalledWith(expect.objectContaining({ nextStatus: 'Draft', comments: 'needs work' }))
      expect(component.finalCall).toHaveBeenCalledWith('rejectContent')
    })

    it('still rejects when recording the comment fails', () => {
      contentService.originalContent = { do_course: meta({ status: 'Draft' }) }
      progressSvc.addComment.mockReturnValue(throwError(() => new Error('nope')))
      component.takeAction('acceptConent')
      afterClosed.next({ value: { action: 'reject', comments: 'c' } })
      expect(component.finalCall).toHaveBeenCalledWith('rejectContent')
    })

    it('does nothing when the comments dialog is dismissed', () => {
      component.takeAction('acceptConent')
      afterClosed.next(undefined)
      expect(progressSvc.addComment).not.toHaveBeenCalled()
      expect(component.finalCall).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------- finalCall --

  describe('finalCall', () => {
    beforeEach(() => {
      jest.spyOn(component, 'finalSaveAndRedirect').mockImplementation(() => {})
      jest.spyOn(component, 'reviewerApproved').mockResolvedValue(undefined)
      jest.spyOn(component, 'contentPublish').mockResolvedValue(undefined)
      jest.spyOn(component, 'changeStatusToDraft').mockResolvedValue(undefined)
      contentService.getUpdatedMeta.mockReturnValue(meta({ status: 'Draft' }))
    })

    it('sends a rejection back to draft', async () => {
      await component.finalCall('rejectContent')
      expect(component.changeStatusToDraft).toHaveBeenCalledWith('Content Rejected')
    })

    it('does nothing when the course has no children', async () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ children: [] }))
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).not.toHaveBeenCalled()
    })

    it('hands an in-review course to the reviewer approval flow', async () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ status: 'Review', reviewStatus: 'InReview', children: [child()] }))
      await component.finalCall('acceptConent')
      expect(component.reviewerApproved).toHaveBeenCalled()
    })

    it('hands a reviewed course to the publish flow', async () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ status: 'Review', reviewStatus: 'Reviewed', children: [child()] }))
      await component.finalCall('acceptConent')
      expect(component.contentPublish).toHaveBeenCalled()
    })

    it('sends each resource to review then redirects', async () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ reviewStatus: 'Draft', children: [child({ status: 'Draft' })] }))
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).toHaveBeenCalledWith('do_res', 'Draft')
      expect(editorService.updateContentWithFewFields).toHaveBeenCalled()
      expect(component.finalSaveAndRedirect).toHaveBeenCalled()
    })

    it('walks into a module and reviews its children', async () => {
      contentService.getOriginalMeta.mockReturnValue(
        meta({
          reviewStatus: 'Draft',
          children: [child({ identifier: 'do_unit', contentType: 'CourseUnit', children: [child({ status: 'Draft' })] })],
        }),
      )
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).toHaveBeenCalledWith('do_res', 'Draft')
      expect(editorService.updateContentV4).toHaveBeenCalled()
      expect(component.finalSaveAndRedirect).toHaveBeenCalled()
      expect(storeService.parentData).toBeTruthy()
    })

    it('handles an empty module', async () => {
      contentService.getOriginalMeta.mockReturnValue(
        meta({ reviewStatus: 'Draft', children: [child({ contentType: 'CourseUnit', children: [] })] }),
      )
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).not.toHaveBeenCalled()
    })

    it('skips the hierarchy write when the course is past draft', async () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ status: 'Review' }))
      contentService.getOriginalMeta.mockReturnValue(
        meta({
          reviewStatus: 'Draft',
          children: [child({ identifier: 'do_unit', contentType: 'CourseUnit', children: [child({ status: 'Live' })] })],
        }),
      )
      await component.finalCall('acceptConent')
      expect(editorService.updateContentV4).not.toHaveBeenCalled()
      expect(component.finalSaveAndRedirect).toHaveBeenCalled()
    })

    it('counts a live resource as done without calling the API', async () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ reviewStatus: 'Draft', children: [child({ status: 'Live' })] }))
      await component.finalCall('acceptConent')
      expect(editorService.sendToReview).not.toHaveBeenCalled()
      expect(component.finalSaveAndRedirect).toHaveBeenCalled()
    })

    it('counts a live resource as done while the course is in review', async () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ status: 'Review' }))
      contentService.getOriginalMeta.mockReturnValue(meta({ reviewStatus: 'Draft', children: [child({ status: 'Live' })] }))
      await component.finalCall('acceptConent')
      expect(component.finalSaveAndRedirect).toHaveBeenCalled()
    })

    it('stops when a resource fails review', async () => {
      editorService.sendToReview.mockReturnValue(failed())
      contentService.getOriginalMeta.mockReturnValue(meta({ reviewStatus: 'Draft', children: [child({ status: 'Draft' })] }))
      await component.finalCall('acceptConent')
      expect(component.finalSaveAndRedirect).not.toHaveBeenCalled()
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('stops when the follow-up field update fails', async () => {
      editorService.updateContentWithFewFields.mockReturnValue(failed())
      contentService.getOriginalMeta.mockReturnValue(meta({ reviewStatus: 'Draft', children: [child({ status: 'Draft' })] }))
      await component.finalCall('acceptConent')
      expect(component.finalSaveAndRedirect).not.toHaveBeenCalled()
    })

    it('stops when the review call rejects', async () => {
      editorService.sendToReview.mockReturnValue(throwError(() => new Error('boom')))
      contentService.getOriginalMeta.mockReturnValue(meta({ reviewStatus: 'Draft', children: [child({ status: 'Draft' })] }))
      await component.finalCall('acceptConent')
      expect(component.finalSaveAndRedirect).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------- contentPublish --

  describe('contentPublish', () => {
    const resource = (over: any = {}) => ({
      identifier: 'do_res',
      status: 'Review',
      parentStatus: 'Review',
      reviewerStatus: 'Reviewed',
      versionKey: 'vkRes',
      ...over,
    })

    it('does nothing for an empty list', async () => {
      await component.contentPublish([])
      expect(editorService.publishContent).not.toHaveBeenCalled()
    })

    it('does nothing when no list is supplied', async () => {
      await component.contentPublish(undefined)
      expect(editorService.publishContent).not.toHaveBeenCalled()
    })

    it('publishes each reviewed resource then refreshes', async () => {
      await component.contentPublish([resource()])
      expect(editorService.publishContent).toHaveBeenCalledWith('do_res')
      expect(contentService.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
      expect(initService.publishData).toHaveBeenCalled()
    })

    it('counts an already-live resource without republishing', async () => {
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

  // ------------------------------------------------------------- PublishCBP --

  describe('PublishCBP', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      jest.spyOn(component, 'sendEmailNotification').mockResolvedValue(undefined)
    })
    afterEach(() => jest.useRealTimers())

    it('publishes the course from the route id and celebrates', async () => {
      await component.PublishCBP()
      expect(editorService.publishContent).toHaveBeenCalledWith('do_course')
      expect(dialog.closeAll).toHaveBeenCalled()
      expectNotified(Notify.SAVE_SUCCESS)
      expect(component.sendEmailNotification).toHaveBeenCalledWith('publishCompleted')
      expect(dialog.open).toHaveBeenCalled()
    })

    it('creates an open batch the first time a course goes live', async () => {
      editorService.readcontentV3.mockReturnValue(of(meta({ lastPublishedBy: undefined })))
      await component.PublishCBP()
      jest.advanceTimersByTime(700)
      await flush()
      expect(progressSvc.addComment).toHaveBeenCalledWith(expect.objectContaining({ role: 'publisher', nextStatus: 'Course Published' }))
      expect(editorService.createBatch).toHaveBeenCalledWith(
        expect.objectContaining({ request: expect.objectContaining({ courseId: 'do_course', enrollmentType: 'open' }) }),
      )
    })

    it('does not create a second batch for an already-published course', async () => {
      editorService.readcontentV3.mockReturnValue(of(meta({ lastPublishedBy: 'u9' })))
      await component.PublishCBP()
      jest.advanceTimersByTime(700)
      await flush()
      expect(editorService.createBatch).not.toHaveBeenCalled()
    })

    it('still publishes when recording the comment fails', async () => {
      progressSvc.addComment.mockReturnValue(throwError(() => new Error('nope')))
      editorService.readcontentV3.mockReturnValue(of(meta({ lastPublishedBy: undefined })))
      await component.PublishCBP()
      jest.advanceTimersByTime(700)
      await flush()
      expect(editorService.createBatch).toHaveBeenCalled()
    })

    it('still publishes when the batch call fails', async () => {
      editorService.createBatch.mockReturnValue(throwError(() => new Error('nope')))
      editorService.readcontentV3.mockReturnValue(of(meta({ lastPublishedBy: undefined })))
      await component.PublishCBP()
      jest.advanceTimersByTime(700)
      await expect(flush()).resolves.toBeUndefined()
    })

    it('reports a failure when the publish call does not succeed', async () => {
      editorService.publishContent.mockReturnValue(failed())
      await component.PublishCBP()
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the publish call rejects', async () => {
      editorService.publishContent.mockReturnValue(throwError(() => new Error('boom')))
      await component.PublishCBP()
      expectNotified(Notify.SAVE_FAIL)
    })
  })

  // ------------------------------------------------------- reviewerApproved --

  describe('reviewerApproved', () => {
    const parent = meta({ versionKey: 'vkCourse' }) as any
    const resource = (over: any = {}) => ({
      identifier: 'do_res',
      status: 'Review',
      parentStatus: 'Review',
      reviewerStatus: 'InReview',
      versionKey: 'vkRes',
      ...over,
    })

    it('does nothing for an empty list', async () => {
      await component.reviewerApproved(parent, [])
      expect(editorService.updateContentForReviwer).not.toHaveBeenCalled()
    })

    it('does nothing when no list is supplied', async () => {
      await component.reviewerApproved(parent, undefined)
      expect(editorService.updateContentForReviwer).not.toHaveBeenCalled()
    })

    it('marks every resource reviewed then notifies the publisher', async () => {
      const seen: Array<[string, string]> = []
      editorService.updateContentForReviwer.mockImplementation((req: any, id: string) => {
        seen.push([id, req.request.content.versionKey])
        return ok()
      })
      await component.reviewerApproved(parent, [resource()])
      expect(seen).toEqual([
        ['do_res', 'vkRes'],
        ['do_course', 'vkCourse'],
      ])
      expectNotified(Notify.SAVE_SUCCESS)
      expect(dialog.open).toHaveBeenCalled()
    })

    it('counts an already-live resource without touching it', async () => {
      await component.reviewerApproved(parent, [resource({ status: 'Live' })])
      expect(editorService.updateContentForReviwer).toHaveBeenCalledTimes(1)
      expectNotified(Notify.SAVE_SUCCESS)
    })

    it('counts an already-reviewed resource without touching it', async () => {
      await component.reviewerApproved(parent, [resource({ reviewerStatus: 'Reviewed' })])
      expect(editorService.updateContentForReviwer).toHaveBeenCalledTimes(1)
      expectNotified(Notify.SAVE_SUCCESS)
    })

    it('reports a failure when a resource cannot be marked reviewed', async () => {
      editorService.updateContentForReviwer.mockReturnValue(failed())
      await component.reviewerApproved(parent, [resource()])
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when marking a resource reviewed rejects', async () => {
      editorService.updateContentForReviwer.mockReturnValue(throwError(() => new Error('boom')))
      await component.reviewerApproved(parent, [resource()])
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the parent update fails', async () => {
      editorService.updateContentForReviwer.mockReturnValueOnce(ok()).mockReturnValueOnce(failed())
      await component.reviewerApproved(parent, [resource()])
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure for a resource in an unexpected state', async () => {
      await component.reviewerApproved(parent, [resource({ status: 'Draft', reviewerStatus: 'Draft' })])
      expectNotified(Notify.SAVE_FAIL)
    })
  })

  // ------------------------------------------------------ editPublishCourse --

  describe('editPublishCourse', () => {
    it('bumps the version of the course and every resource', async () => {
      editorService.readcontentV3.mockReturnValue(
        of(meta({ children: [child({ contentType: 'CourseUnit', identifier: 'do_unit', children: [child()] })] })),
      )
      await component.editPublishCourse()
      expect(editorService.updateNewContentV3).toHaveBeenCalledTimes(2)
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })

    it('bumps a course-level resource too', async () => {
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [child()] })))
      await component.editPublishCourse()
      expect(editorService.updateNewContentV3).toHaveBeenCalledTimes(2)
    })

    it('skips an empty module', async () => {
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [child({ contentType: 'CourseUnit', children: [] })] })))
      await component.editPublishCourse()
      expect(editorService.updateNewContentV3).toHaveBeenCalledTimes(1)
    })

    it('reports a failure when a version bump fails', async () => {
      editorService.updateNewContentV3.mockReturnValue(throwError(() => new Error('boom')))
      await component.editPublishCourse()
      expectNotified(Notify.SAVE_FAIL)
    })
  })

  // ----------------------------------------------------- changeStatusToDraft --

  describe('changeStatusToDraft', () => {
    beforeEach(() => {
      jest.spyOn(component, 'sendEmailNotification').mockResolvedValue(undefined)
    })

    it('rejects every in-review resource and sends the course back', async () => {
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [child()] })))
      await component.changeStatusToDraft('not good')
      expect(dialog.closeAll).toHaveBeenCalled()
      expect(editorService.rejectContentApi).toHaveBeenCalledWith({ request: { content: { rejectComment: 'not good' } } }, 'do_res')
      expect(editorService.updateHierarchyForReviwer).toHaveBeenCalled()
      expectNotified(Notify.SAVE_SUCCESS)
      expect(router.navigate).toHaveBeenCalledWith(['author', 'cbp'])
    })

    it('descends into a module for in-review resources', async () => {
      editorService.readcontentV3.mockReturnValue(
        of(meta({ children: [child({ contentType: 'CourseUnit', identifier: 'do_unit', children: [child()] })] })),
      )
      await component.changeStatusToDraft('c')
      expect(editorService.rejectContentApi).toHaveBeenCalledWith(expect.anything(), 'do_res')
    })

    it('skips a module child that is not in review', async () => {
      editorService.readcontentV3.mockReturnValue(
        of(
          meta({
            status: 'Draft',
            children: [child({ contentType: 'CourseUnit', identifier: 'do_unit', children: [child({ status: 'Draft' })] })],
          }),
        ),
      )
      await component.changeStatusToDraft('c')
      expect(editorService.rejectContentApi).not.toHaveBeenCalled()
      expectNotified(Notify.SAVE_FAIL)
    })

    it('emails the creator when a review is rejected', async () => {
      editorService.readcontentV3.mockReturnValue(of(meta({ status: 'Review', reviewStatus: 'InReview', children: [child()] })))
      await component.changeStatusToDraft('c')
      expect(component.sendEmailNotification).toHaveBeenCalledWith('reviewFailed')
    })

    it('emails the creator when a publish is rejected', async () => {
      editorService.readcontentV3.mockReturnValue(of(meta({ status: 'Review', reviewStatus: 'Reviewed', children: [child()] })))
      await component.changeStatusToDraft('c')
      expect(component.sendEmailNotification).toHaveBeenCalledWith('publishFailed')
    })

    it('stays put when the move came from the course itself', async () => {
      component.isMoveCourseToDraft = true
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expect(router.navigate).not.toHaveBeenCalled()
      expect(component.isMoveCourseToDraft).toBe(false)
    })

    it('reports a failure when a resource meta update fails', async () => {
      editorService.updateContentForReviwer.mockReturnValue(failed())
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
      expect(editorService.updateHierarchyForReviwer).not.toHaveBeenCalled()
    })

    it('reports a failure when rejecting a resource fails', async () => {
      editorService.rejectContentApi.mockReturnValue(failed())
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the hierarchy update fails', async () => {
      editorService.updateHierarchyForReviwer.mockReturnValue(failed())
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the parent meta update fails', async () => {
      editorService.updateContentForReviwer.mockReturnValueOnce(ok()).mockReturnValueOnce(failed())
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when rejecting the parent fails', async () => {
      editorService.rejectContentApi.mockReturnValueOnce(ok()).mockReturnValueOnce(failed())
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [child()] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('rejects a childless course that is still in review', async () => {
      editorService.readcontentV3.mockReturnValue(of(meta({ status: 'Review', children: [] })))
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
      editorService.readcontentV3.mockReturnValue(of(meta({ status: 'Review', children: [] })))
      await component.changeStatusToDraft('c')
      expect(router.navigate).not.toHaveBeenCalled()
    })

    it('reports a failure when the childless reject returns an error status', async () => {
      editorService.rejectContentApi.mockReturnValue(failed())
      editorService.readcontentV3.mockReturnValue(of(meta({ status: 'Review', children: [] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the childless reject call errors', async () => {
      editorService.rejectContentApi.mockReturnValue(throwError(() => new Error('boom')))
      editorService.readcontentV3.mockReturnValue(of(meta({ status: 'Review', children: [] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
    })

    it('reports a failure when the childless meta update fails', async () => {
      editorService.updateContentForReviwer.mockReturnValue(failed())
      editorService.readcontentV3.mockReturnValue(of(meta({ status: 'Review', children: [] })))
      await component.changeStatusToDraft('c')
      expectNotified(Notify.SAVE_FAIL)
      expect(editorService.rejectContentApi).not.toHaveBeenCalled()
    })

    it('refuses to reject a course that is not in review', async () => {
      editorService.readcontentV3.mockReturnValue(of(meta({ status: 'Draft', children: [] })))
      await component.changeStatusToDraft('c')
      expect(editorService.updateContentForReviwer).not.toHaveBeenCalled()
      expectNotified(Notify.SAVE_FAIL)
    })
  })

  // ------------------------------------------- sendModuleToReviewOrPublish --

  describe('sendModuleToReviewOrPublish', () => {
    it('redirects once every module has been sent', () => {
      const redirect = jest.spyOn(component, 'finalSaveAndRedirect').mockImplementation(() => {})
      component.sendModuleToReviewOrPublish(
        [
          { identifier: 'do_m1', parentStatus: 'Draft' },
          { identifier: 'do_m2', parentStatus: 'Draft' },
        ],
        meta(),
      )
      expect(editorService.sendToReview).toHaveBeenCalledTimes(2)
      expect(redirect).toHaveBeenCalledTimes(1)
    })

    it('does nothing for an empty module list', () => {
      const redirect = jest.spyOn(component, 'finalSaveAndRedirect').mockImplementation(() => {})
      component.sendModuleToReviewOrPublish([], meta())
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------- finalSaveAndRedirect --

  describe('finalSaveAndRedirect', () => {
    const updated = { identifier: 'do_course', status: 'Draft', versionKey: 'vk0' }

    beforeEach(() => {
      jest.spyOn(component, 'sendEmailNotification').mockResolvedValue(undefined)
      jest.spyOn(component, 'getMessage').mockImplementation((t: any) => (t === 'success' ? 'OK' : 'FAIL') as any)
    })

    it('notifies, mails and celebrates when nothing is left', async () => {
      component.contents = [{ identifier: 'do_course' }] as any
      component.finalSaveAndRedirect(updated)
      await flush()
      expect(editorService.sendToReview).toHaveBeenCalledWith('do_course', 'Draft')
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: 'OK' },
        duration: expect.any(Number),
      })
      expect(component.sendEmailNotification).toHaveBeenCalledWith('sendForReview')
      expect(dialog.open).toHaveBeenCalled()
    })

    it('moves to the next remaining content instead of finishing', async () => {
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      component.contents = [{ identifier: 'do_course' }, { identifier: 'do_next' }] as any
      component.finalSaveAndRedirect(updated)
      await flush()
      expect(activeSpy).toHaveBeenCalledWith('do_next')
    })

    it('notifies a failure when the field update does not succeed', async () => {
      editorService.updateContentWithFewFields.mockReturnValue(failed())
      component.contents = []
      component.finalSaveAndRedirect(updated)
      await flush()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: 'FAIL' },
        duration: expect.any(Number),
      })
    })

    it('notifies a failure when the field update rejects', async () => {
      editorService.updateContentWithFewFields.mockReturnValue(throwError(() => new Error('boom')))
      component.contents = []
      component.finalSaveAndRedirect(updated)
      await flush()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: 'FAIL' },
        duration: expect.any(Number),
      })
    })

    it('opens the error parser on a 409 and resolves the node by id', () => {
      editorService.sendToReview.mockReturnValue(throwError(() => ({ status: 409, error: { e: 1 } })))
      storeService.lexIdMap.set('do_x', [11])
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      component.finalSaveAndRedirect(updated)
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next('do_x')
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(11)
      expect(activeSpy).toHaveBeenCalledWith('do_x')
    })

    it('resolves the node by index on a 409', () => {
      editorService.sendToReview.mockReturnValue(throwError(() => ({ status: 409, error: { e: 1 } })))
      const activeSpy = jest.spyOn(changeActiveCont, 'next')
      component.finalSaveAndRedirect(updated)
      afterClosed.next(1)
      expect(activeSpy).toHaveBeenCalledWith('do_course')
    })

    it('ignores a dismissed 409 dialog', () => {
      editorService.sendToReview.mockReturnValue(throwError(() => ({ status: 409, error: { e: 1 } })))
      component.finalSaveAndRedirect(updated)
      afterClosed.next(undefined)
      expect(storeService.selectedNodeChange.next).not.toHaveBeenCalled()
    })

    it('only notifies on a non-conflict failure', () => {
      editorService.sendToReview.mockReturnValue(throwError(() => ({ status: 500 })))
      component.finalSaveAndRedirect(updated)
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), {
        data: { type: 'FAIL' },
        duration: expect.any(Number),
      })
    })
  })

  // --------------------------------------------------------------- preview --

  describe('preview', () => {
    beforeEach(() => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ mimeType: 'application/pdf' }))
      component.courseId = 'do_course'
    })

    it('navigates to the viewer without saving when nothing changed', async () => {
      await component.preview('do_res')
      expect(router.navigateByUrl).toHaveBeenCalledWith(expect.stringContaining('author/viewer/'))
      expect(router.navigateByUrl).toHaveBeenCalledWith(expect.stringContaining('do_res?collectionId=do_course&collectionType=Course'))
    })

    // `checkForEmptyData` is derived: it is only true when the pending edit carries
    // more than one property (a lone versionKey does not count as a real change).
    const realEdit = { do_res: { name: 'changed', description: 'also changed' } }

    it('saves the pending edits before previewing', async () => {
      const trigger = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)
      contentService.upDatedContent = realEdit
      await component.preview('do_res')
      expect(trigger).toHaveBeenCalled()
      expect(router.navigateByUrl).toHaveBeenCalled()
    })

    it('does not save for a hierarchy change with no real content edit', async () => {
      const trigger = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)
      storeService.changedHierarchy = { do_course: {} }
      await component.preview('do_res')
      expect(trigger).not.toHaveBeenCalled()
      expect(router.navigateByUrl).toHaveBeenCalled()
    })

    it('skips the save when the only pending change is a version key', async () => {
      const trigger = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)
      contentService.upDatedContent = { do_res: { versionKey: 'vk1' } }
      await component.preview('do_res')
      expect(trigger).not.toHaveBeenCalled()
      expect(router.navigateByUrl).toHaveBeenCalled()
    })

    it('ignores an empty pending change', async () => {
      const trigger = jest.spyOn(component, 'triggerSave').mockReturnValue(of({}) as any)
      contentService.upDatedContent = { do_res: {} }
      await component.preview('do_res')
      expect(trigger).not.toHaveBeenCalled()
    })

    it('hands a save conflict to the conflict handler', async () => {
      const handle = jest.spyOn(component, 'handleSaveConflict').mockImplementation(() => {})
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409 })) as any)
      contentService.upDatedContent = realEdit
      await component.preview('do_res')
      expect(handle).toHaveBeenCalledWith({ status: 409 }, { width: '750px', height: '450px' })
    })

    it('closes the preview', () => {
      component.previewIdentifier = 'do_res' as any
      component.closePreview()
      expect(component.previewIdentifier).toBeNull()
    })
  })
})
