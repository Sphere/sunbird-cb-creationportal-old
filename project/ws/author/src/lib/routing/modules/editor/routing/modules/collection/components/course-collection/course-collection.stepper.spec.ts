import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'

import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

import { CourseCollectionComponent } from './course-collection.component'

/**
 * Covers the stepper-gating, validation and save paths the sibling
 * course-collection.direct.spec.ts leaves out: isNextDisabled, handleStepperNext,
 * the per-step validity sinks, the validationCheck getter, expandNodesById,
 * tempSave, update, getMessage and subAction.
 */
describe('CourseCollectionComponent (stepper + save)', () => {
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

  const meta = (over: any = {}) => ({
    identifier: 'do_course',
    status: 'Draft',
    contentType: 'Course',
    createdBy: 'u1',
    ...over,
  })

  const build = () =>
    new CourseCollectionComponent(
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

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
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
      getNodeModifyData: jest.fn().mockReturnValue({ do_course: { root: true } }),
      resetOriginalMetaWithHierarchy: jest.fn(),
      checkConditionV2: jest.fn().mockReturnValue(true),
      cleanProperties: jest.fn().mockImplementation((v: any) => v),
      resetStatus: jest.fn().mockReturnValue(false),
      changeStatusDraft: jest.fn(),
    }
    activateRoute = { parent: null }
    storeService = {
      parentNode: ['do_course'],
      currentParentNode: 1,
      currentSelectedNode: 1,
      lexIdMap: new Map<string, number[]>([
        ['do_course', [1]],
        ['do_other', [5]],
      ]),
      uniqueIdMap: new Map([[1, 'do_course']]),
      flatNodeMap: new Map(),
      selectedNodeChange: { next: jest.fn() },
      treeStructureChange: { next: jest.fn() },
      uploadFileType: { next: jest.fn() },
      validationCheck: jest.fn().mockReturnValue(null),
      createChildOrSibling: jest.fn().mockResolvedValue(true),
      getTreeHierarchy: jest.fn().mockReturnValue({ do_course: { root: true, children: [] } }),
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
      collectionConfig: { stepper: true, languageBar: true, actionButtons: { enabled: false, buttons: [] } },
      isEditMetaPageAction: jest.fn(),
      backToHome: jest.fn(),
      publishData: jest.fn(),
      isBackButtonClickedFromAssessmentAction: jest.fn(),
    }
    loaderService = { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }), closeAll: jest.fn() }
    snackBar = { open: jest.fn(), openFromComponent: jest.fn() }
    editorService = {
      newCreatedLexid: '',
      readcontentV3: jest.fn().mockReturnValue(of(meta())),
      deleteContent: jest.fn().mockReturnValue(of({})),
      sendEmailNotificationAPI: jest.fn().mockReturnValue(of({ ok: true })),
      updateContentV4: jest.fn().mockReturnValue(of({})),
    }
    router = { navigateByUrl: jest.fn(), url: '/author/editor/do_course/collection' }
    accessControlSvc = { userId: 'u1', hasRole: jest.fn().mockReturnValue(false) }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    headerService = { isSavePressed: false, headerSaveData: new Subject<any>(), showCreatorHeader: jest.fn() }
    rootSvc = { showNavbarDisplay$: { next: jest.fn() } }
    configurationsService = {
      userRoles: new Set(['content_creator']),
      userProfile: { userId: 'u1', userName: 'User One', email: 'u1@x.com' },
    }
    progressSvc = {}
    cdr = { detectChanges: jest.fn() }

    component = build()
    component.currentParentId = 'do_course'
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.restoreAllMocks()
  })

  describe('per-step validity sinks', () => {
    it('records the course details validity', () => {
      component.onCourseDetailsValidity(true)
      expect(component.isCourseDetailsValid).toBe(true)
      component.onCourseDetailsValidity(false)
      expect(component.isCourseDetailsValid).toBe(false)
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

  describe('isNextDisabled', () => {
    it('is enabled when no step is active', () => {
      component.steps = [{ key: 'CourseDetails', activeStep: false }] as any
      expect(component.isNextDisabled).toBe(false)
    })

    it('gates Course Details on its form validity', () => {
      component.steps = [{ key: 'CourseDetails', activeStep: true }] as any
      component.isCourseDetailsValid = false
      expect(component.isNextDisabled).toBe(true)
      component.isCourseDetailsValid = true
      expect(component.isNextDisabled).toBe(false)
    })

    it('gates Course Builder on having enough resources', () => {
      component.steps = [{ key: 'CourseBuilder', activeStep: true }] as any
      component.isCourseBuilderValid = false
      expect(component.isNextDisabled).toBe(true)
      component.isCourseBuilderValid = true
      expect(component.isNextDisabled).toBe(false)
    })

    it('gates Course Settings on its mandatory fields', () => {
      component.steps = [{ key: 'CourseSettings', activeStep: true }] as any
      component.isCourseSettingsValid = false
      expect(component.isNextDisabled).toBe(true)
      component.isCourseSettingsValid = true
      expect(component.isNextDisabled).toBe(false)
    })

    it('never blocks an unrecognised step', () => {
      component.steps = [{ key: 'SomethingElse', activeStep: true }] as any
      expect(component.isNextDisabled).toBe(false)
    })
  })

  describe('handleStepperNext', () => {
    it('does nothing when no step is active', () => {
      component.steps = [{ key: 'CourseDetails', activeStep: false }] as any
      component.handleStepperNext()
      expect(component.triggerEditMetaNext).toBeFalsy()
      expect(component.triggerModuleCreationNext).toBeFalsy()
    })

    it('pulses the edit-meta trigger from Course Details', () => {
      jest.useFakeTimers()
      component.steps = [{ key: 'CourseDetails', activeStep: true }] as any

      component.handleStepperNext()

      expect(component.isSubmitPressed).toBe(true)
      expect(component.triggerEditMetaNext).toBe(true)
      jest.advanceTimersByTime(50)
      expect(component.triggerEditMetaNext).toBe(false)
      jest.useRealTimers()
    })

    it('pulses the module-creation trigger from any other step', () => {
      jest.useFakeTimers()
      component.steps = [{ key: 'CourseBuilder', activeStep: true }] as any

      component.handleStepperNext()

      expect(component.triggerModuleCreationNext).toBe(true)
      jest.advanceTimersByTime(50)
      expect(component.triggerModuleCreationNext).toBe(false)
      jest.useRealTimers()
    })
  })

  describe('validationCheck getter', () => {
    it('passes when the store reports no errors', () => {
      storeService.validationCheck.mockReturnValue(null)
      expect(component.validationCheck).toBe(true)
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('opens the error parser and fails when the store reports errors', () => {
      storeService.validationCheck.mockReturnValue([{ id: 1, msg: 'bad' }])
      expect(component.validationCheck).toBe(false)
      expect(dialog.open).toHaveBeenCalled()
    })

    it('activates the node named by the error dialog', () => {
      storeService.validationCheck.mockReturnValue([{ id: 1 }])
      const spy = jest.spyOn(changeActiveCont, 'next')

      expect(component.validationCheck).toBe(false)
      afterClosed.next('do_other')

      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(5)
      expect(spy).toHaveBeenCalledWith('do_other')
    })

    it('activates the node id returned by the error dialog', () => {
      storeService.validationCheck.mockReturnValue([{ id: 1 }])
      const spy = jest.spyOn(changeActiveCont, 'next')

      expect(component.validationCheck).toBe(false)
      afterClosed.next(1)

      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(1)
      expect(spy).toHaveBeenCalledWith('do_course')
    })

    it('does nothing when the error dialog is dismissed', () => {
      storeService.validationCheck.mockReturnValue([{ id: 1 }])
      expect(component.validationCheck).toBe(false)
      afterClosed.next(undefined)
      expect(storeService.selectedNodeChange.next).not.toHaveBeenCalled()
    })
  })

  describe('expandNodesById', () => {
    const treeNode = (id: number, level: number) => ({ id, level, expandable: true })

    beforeEach(() => {
      component.treeControl = {
        dataNodes: [],
        expand: jest.fn(),
      } as any
    })

    it('expands the listed node and every ancestor', () => {
      const parent = treeNode(1, 0)
      const child = treeNode(2, 1)
      component.treeControl.dataNodes = [parent, child] as any

      component.expandNodesById([2])

      expect(component.treeControl.expand).toHaveBeenCalledWith(child)
      expect(component.treeControl.expand).toHaveBeenCalledWith(parent)
    })

    it('falls back to the remembered expansion set', () => {
      const node = treeNode(7, 0)
      component.treeControl.dataNodes = [node] as any
      component.expandedNodes = new Set([7])

      component.expandNodesById()

      expect(component.treeControl.expand).toHaveBeenCalledWith(node)
    })

    it('leaves unlisted nodes collapsed', () => {
      component.treeControl.dataNodes = [treeNode(1, 0)] as any
      component.expandNodesById([99])
      expect(component.treeControl.expand).not.toHaveBeenCalled()
    })
  })

  describe('getMessage', () => {
    const withStatus = (status: string) => {
      contentService.originalContent = { do_course: meta({ status }) }
      return component
    }

    it('maps draft and live to the send-for-review messages', () => {
      expect(withStatus('Draft').getMessage('success')).toBe(Notify.SEND_FOR_REVIEW_SUCCESS)
      expect(withStatus('Live').getMessage('failure')).toBe(Notify.SEND_FOR_REVIEW_FAIL)
    })

    it('maps in-review to the review messages', () => {
      expect(withStatus('InReview').getMessage('success')).toBe(Notify.REVIEW_SUCCESS)
      expect(withStatus('InReview').getMessage('failure')).toBe(Notify.REVIEW_FAIL)
    })

    it('maps reviewed to the publish messages', () => {
      expect(withStatus('Reviewed').getMessage('success')).toBe(Notify.PUBLISH_SUCCESS)
      expect(withStatus('Review').getMessage('failure')).toBe(Notify.PUBLISH_FAIL)
    })

    it('returns an empty message for an unknown status', () => {
      expect(withStatus('Weird').getMessage('success')).toBe('')
      expect(withStatus('Weird').getMessage('failure')).toBe('')
    })
  })

  describe('update', () => {
    it('pushes the node changes plus hierarchy and refreshes the local copy', async () => {
      component.resourseSelected = 'something'

      await component.update()

      expect(component.resourseSelected).toBe('')
      const body: any = editorService.updateContentV4.mock.calls[0][0]
      expect(body.request.data.nodesModified).toEqual({ do_course: { root: true } })
      expect(body.request.data.hierarchy).toEqual({ do_course: { root: true, children: [] } })
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expect(contentService.resetOriginalMetaWithHierarchy).toHaveBeenCalled()
    })
  })

  describe('tempSave', () => {
    beforeEach(() => {
      component.currentCourseId = 'do_course'
    })

    it('confirms a successful save', async () => {
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)

      await component.tempSave()

      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(true)
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('refreshes the version key before saving', async () => {
      editorService.readcontentV3.mockReturnValue(of({ versionKey: 'vk-2' }))
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)

      await component.tempSave()

      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_course')
      expect(component.versionKey).toEqual({ versionKey: 'vk-2' })
    })

    it('prefers a freshly created lex id for the version key read', async () => {
      editorService.newCreatedLexid = 'do_new'
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)

      await component.tempSave()

      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_new')
    })

    it('reports a plain save failure', async () => {
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 500 })) as any)

      await component.tempSave()

      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('opens the error parser on a 409 conflict', async () => {
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409, error: { x: 1 } })) as any)

      await component.tempSave()

      expect(dialog.open).toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('activates the node named by the conflict dialog', async () => {
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409, error: {} })) as any)
      const spy = jest.spyOn(changeActiveCont, 'next')

      await component.tempSave()
      afterClosed.next('do_other')

      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(5)
      expect(spy).toHaveBeenCalledWith('do_other')
    })

    it('activates the node id returned by the conflict dialog', async () => {
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409, error: {} })) as any)
      const spy = jest.spyOn(changeActiveCont, 'next')

      await component.tempSave()
      afterClosed.next(1)

      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(1)
      expect(spy).toHaveBeenCalledWith('do_course')
    })

    it('does nothing when the conflict dialog is dismissed', async () => {
      jest.spyOn(component, 'triggerSave').mockReturnValue(throwError(() => ({ status: 409, error: {} })) as any)

      await component.tempSave()
      afterClosed.next(null)

      expect(storeService.selectedNodeChange.next).not.toHaveBeenCalled()
    })

    it('skips the version-key read when there is no updated meta', async () => {
      contentService.getUpdatedMeta.mockReturnValue(undefined)
      jest.spyOn(component, 'triggerSave').mockReturnValue(of(true) as any)

      await component.tempSave()

      expect(editorService.readcontentV3).not.toHaveBeenCalled()
    })
  })

  describe('subAction', () => {
    it('broadcasts the newly active content', async () => {
      const spy = jest.spyOn(changeActiveCont, 'next')
      await component.subAction({ type: 'editMeta', identifier: 'do_x' })
      expect(spy).toHaveBeenCalledWith('do_x')
    })
  })
})
