import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { CourseCollectionComponent } from './course-collection.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

/**
 * CourseCollectionComponent is a heavy component (18 injected collaborators, a very
 * large template). Per the project testing convention it is instantiated directly
 * with mocked collaborators. The sibling course-collection.component.spec.ts keeps
 * the shallow TestBed render test.
 */
describe('CourseCollectionComponent (direct instantiation)', () => {
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
  let currentMessage: Subject<any>
  let currentNavigationMessage: Subject<any>
  let isBackButtonClickedMessage: Subject<any>
  let publishMessage: Subject<any>
  let isBackButtonFromAssessmentClickedMessage: Subject<any>
  let uploadMessage: Subject<any>
  let saveContentMessage: Subject<any>
  let createModuleMessage: Subject<any>
  let updateAssessmentMessage: Subject<any>
  let headerSaveData: Subject<any>
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
    createdBy: 'u1',
    creatorContacts: [{ id: 'u1', email: 'creator@x.com' }],
    reviewer: [{ email: 'reviewer@x.com' }],
    publisherDetails: [{ email: 'publisher@x.com' }],
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
    sessionStorage.clear()
    changeActiveCont = new Subject<string>()
    currentMessage = new Subject<any>()
    currentNavigationMessage = new Subject<any>()
    isBackButtonClickedMessage = new Subject<any>()
    publishMessage = new Subject<any>()
    isBackButtonFromAssessmentClickedMessage = new Subject<any>()
    uploadMessage = new Subject<any>()
    saveContentMessage = new Subject<any>()
    createModuleMessage = new Subject<any>()
    updateAssessmentMessage = new Subject<any>()
    headerSaveData = new Subject<any>()
    afterClosed = new Subject<any>()

    contentService = {
      changeActiveCont,
      parentContent: 'do_course',
      currentContent: 'do_course',
      originalContent: { do_course: meta() },
      upDatedContent: {},
      getUpdatedMeta: jest.fn().mockReturnValue(meta()),
      getOriginalMeta: jest.fn().mockReturnValue(meta()),
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
        ['do_new', [9]],
      ]),
      uniqueIdMap: new Map([[1, 'do_course']]),
      flatNodeMap: new Map(),
      selectedNodeChange: { next: jest.fn() },
      treeStructureChange: { next: jest.fn() },
      uploadFileType: { next: jest.fn() },
      validationCheck: jest.fn().mockReturnValue(null),
      createChildOrSibling: jest.fn().mockResolvedValue(true),
    }
    resolverService = { buildTreeAndMap: jest.fn() }
    initService = {
      currentMessage,
      currentNavigationMessage,
      isBackButtonClickedMessage,
      publishMessage,
      isBackButtonFromAssessmentClickedMessage,
      uploadMessage,
      saveContentMessage,
      createModuleMessage,
      updateAssessmentMessage,
      collectionConfig: {
        stepper: true,
        languageBar: true,
        actionButtons: { enabled: true, buttons: [{ title: 'Save', icon: 'save', event: 'save', conditions: {} }] },
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
    }
    router = { navigateByUrl: jest.fn(), url: '/author/editor/do_course/collection' }
    accessControlSvc = { userId: 'u1', hasRole: jest.fn().mockReturnValue(false) }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: false })) }
    headerService = {
      isSavePressed: false,
      headerSaveData,
      showCreatorHeader: jest.fn(),
    }
    rootSvc = { showNavbarDisplay$: { next: jest.fn() } }
    configurationsService = {
      userRoles: new Set(['content_creator']),
      userProfile: { userId: 'u1', userName: 'User One', email: 'u1@x.com' },
    }
    progressSvc = {}
    cdr = { detectChanges: jest.fn() }

    component = build()
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('constructor wiring', () => {
    it('hides the navbar and adopts the header save flag', () => {
      expect(rootSvc.showNavbarDisplay$.next).toHaveBeenCalledWith(false)
      expect(component.callSaveFn).toBe(false)
    })

    it('closes the dialogs when returning from the review checklist', () => {
      sessionStorage.setItem('isReviewChecklist', '1')
      const c = build()
      expect(dialog.closeAll).toHaveBeenCalled()
      expect(c.isReviewChecklistEnabled).toBe(true)
      expect(sessionStorage.getItem('isReviewChecklist')).toBeNull()
    })

    it('saves when the header save button is pressed', () => {
      const spy = jest.spyOn(component, 'save').mockResolvedValue(undefined as any)
      headerSaveData.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('ignores a falsy header save signal', () => {
      const spy = jest.spyOn(component, 'save').mockResolvedValue(undefined as any)
      headerSaveData.next(false)
      expect(spy).not.toHaveBeenCalled()
    })

    it('publishes resources on the publishResources message', () => {
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      currentMessage.next('publishResources')
      expect(spy).toHaveBeenCalledWith('publishResources')
    })

    it('publishes the CBP on the PublishCBP message', () => {
      const spy = jest.spyOn(component, 'PublishCBP').mockResolvedValue(undefined as any)
      currentMessage.next('PublishCBP')
      expect(spy).toHaveBeenCalled()
    })

    it('moves the course to draft on the MoveCourseToDraft message', () => {
      const spy = jest.spyOn(component, 'changeStatusToDraft').mockResolvedValue(undefined as any)
      currentMessage.next('MoveCourseToDraft')
      expect(component.isMoveCourseToDraft).toBe(true)
      expect(spy).toHaveBeenCalledWith('Content Rejected')
    })

    it('returns to the course details page on its message', () => {
      component.isModulePageEnabled = true
      component.showAddchapter = true
      component.clickedNext = true
      currentMessage.next('backToCourseDetailsPage')
      expect(component.isModulePageEnabled).toBe(false)
      expect(component.showAddchapter).toBe(false)
      expect(component.viewMode).toBe('meta')
      expect(component.clickedNext).toBe(false)
    })

    it('navigating to CourseDetails resets the builder state', () => {
      currentNavigationMessage.next('CourseDetails')
      expect(component.viewMode).toBe('meta')
      expect(component.clickedNext).toBe(false)
      expect(initService.publishData).toHaveBeenCalledWith('backToCourseDetailsPage')
    })

    it('navigating to CourseBuilder opens the builder', () => {
      currentNavigationMessage.next('CourseBuilder')
      expect(component.clickedNext).toBe(true)
      expect(component.showAddchapter).toBe(false)
    })

    it('navigating to AssessmentBuilder opens the assessment builder', () => {
      currentNavigationMessage.next('AssessmentBuilder')
      expect(component.clickedNext).toBe(true)
    })

    it('navigating away from the settings page returns home first', () => {
      sessionStorage.setItem('isSettingsPage', '1')
      currentNavigationMessage.next('CourseBuilder')
      expect(initService.backToHome).toHaveBeenCalledWith('fromSettings')
      expect(sessionStorage.getItem('isSettingsPage')).toBe('0')
    })

    it('leaves the assessment view when navigating to CourseDetails', () => {
      component.viewMode = 'assessment'
      currentNavigationMessage.next('CourseDetails')
      expect(initService.isEditMetaPageAction).toHaveBeenCalledWith('backFromModulePage')
      expect(component.viewMode).toBe('meta')
    })

    it('back from the settings page returns to the course builder step', () => {
      sessionStorage.setItem('isSettingsPage', '1')
      isBackButtonClickedMessage.next(true)
      expect(component.currentSteps).toBe('CourseBuilder')
      expect(initService.backToHome).toHaveBeenCalledWith('fromSettings')
    })

    it('back from the settings page returns to the assessment builder for a self assessment', () => {
      sessionStorage.setItem('isSettingsPage', '1')
      component.isSelfAssessment = true
      isBackButtonClickedMessage.next(true)
      expect(component.currentSteps).toBe('AssessmentBuilder')
    })

    it('back from the assessment view returns to the builder step', () => {
      component.viewMode = 'assessment'
      isBackButtonClickedMessage.next(true)
      expect(component.currentSteps).toBe('CourseBuilder')
      expect(initService.isBackButtonClickedFromAssessmentAction).toHaveBeenCalledWith('backFromAssessmentDetails')
    })

    it('back from the chapter view returns to the course details step', () => {
      component.showAddchapter = true
      component.viewMode = 'meta'
      component.clickedNext = true
      isBackButtonClickedMessage.next(true)
      expect(component.currentSteps).toBe('CourseDetails')
      expect(component.clickedNext).toBe(false)
      expect(component.showAddchapter).toBe(false)
    })

    it('back from an empty view mode restores the meta view', () => {
      component.showAddchapter = true
      component.viewMode = ''
      isBackButtonClickedMessage.next(true)
      expect(component.viewMode).toBe('meta')
      expect(initService.publishData).toHaveBeenCalledWith('backToCourseDetailsPage')
    })

    it('back from the top-level meta view returns to the course details step', () => {
      component.viewMode = 'meta'
      component.clickedNext = true
      isBackButtonClickedMessage.next(true)
      expect(component.currentSteps).toBe('CourseDetails')
    })

    it('back from the start of a course returns to the author home', () => {
      component.viewMode = ''
      component.clickedNext = false
      isBackButtonClickedMessage.next(true)
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('back from a self assessment returns to the author home', () => {
      component.isSelfAssessment = true
      component.clickedNext = true
      isBackButtonClickedMessage.next(true)
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('the publish message returns to the course details page', () => {
      jest.useFakeTimers()
      component.viewMode = 'meta'
      publishMessage.next('backToCourseDetailsPage')
      expect(component.isModulePageEnabled).toBe(false)
      expect(component.showAddchapter).toBe(false)
      jest.advanceTimersByTime(600)
      expect(component.isLoading).toBe(false)
      jest.useRealTimers()
    })

    it('back from an assessment reopens the chapter view with the course steps', () => {
      jest.useFakeTimers()
      component.viewMode = 'assessment'
      isBackButtonFromAssessmentClickedMessage.next('backFromAssessmentDetails')
      expect(component.showAddchapter).toBe(true)
      expect(component.viewMode).toBe('')
      expect(component.clickedNext).toBe(true)
      expect(component.steps[2].activeStep).toBe(true)
      jest.advanceTimersByTime(600)
      jest.useRealTimers()
    })

    it('back from a self assessment uses the assessment steps', () => {
      jest.useFakeTimers()
      component.viewMode = 'assessment'
      component.isSelfAssessment = true
      isBackButtonFromAssessmentClickedMessage.next('backFromAssessmentDetails')
      expect(component.header).toBe('Self Assessment Details')
      expect(component.steps.length).toBe(3)
      jest.advanceTimersByTime(600)
      jest.useRealTimers()
    })

    it('the upload message saves with the upload action', () => {
      const spy = jest.spyOn(component, 'save').mockResolvedValue(undefined as any)
      uploadMessage.next(true)
      expect(spy).toHaveBeenCalledWith('upload')
    })

    it('the save-content message opens the module page and saves', () => {
      const spy = jest.spyOn(component, 'save').mockResolvedValue(undefined as any)
      saveContentMessage.next(true)
      expect(component.isModulePageEnabled).toBe(true)
      expect(component.showAddchapter).toBe(true)
      expect(component.viewMode).toBe('')
      expect(spy).toHaveBeenCalled()
    })

    it('the create-module message creates the requested content type', () => {
      const spy = jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      createModuleMessage.next({ type: 'collection', name: 'Module 1' })
      expect(component.createModule).toEqual({ type: 'collection', name: 'Module 1' })
      expect(spy).toHaveBeenCalledWith('collection')
      expect(component.showAddchapter).toBe(true)
    })

    it('the create-module message keeps an assessment on the details step', () => {
      jest.spyOn(component, 'setContentType').mockResolvedValue(undefined as any)
      component.clickedNext = true
      createModuleMessage.next({ type: 'assessment' })
      expect(component.clickedNext).toBe(false)
    })

    it('the update-assessment message opens the assessment view', () => {
      updateAssessmentMessage.next({ identifier: 'do_a', mimeType: 'application/json' })
      expect(component.viewMode).toBe('assessment')
      expect(component.showAddchapter).toBe(true)
      expect(component.clickedNext).toBe(false)
      expect(sessionStorage.getItem('assessment')).toBe(JSON.stringify('do_a'))
    })

    it('the update-assessment message clears the stored id for a non-assessment', () => {
      updateAssessmentMessage.next({ identifier: 'do_a', mimeType: 'application/pdf' })
      expect(sessionStorage.getItem('assessment')).toBeNull()
    })
  })

  describe('receiveSteps', () => {
    it('activates the course details step', () => {
      component.receiveSteps('CourseDetails')
      expect(component.currentSteps).toBe('CourseDetails')
      expect(component.steps[1].activeStep).toBe(true)
    })

    it('activates the course builder step', () => {
      component.receiveSteps('CourseBuilder')
      expect(component.steps[2].activeStep).toBe(true)
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('activates the course settings step', () => {
      component.receiveSteps('CourseSettings')
      expect(component.steps[3].activeStep).toBe(true)
    })

    it('activates the assessment builder step for a self assessment', () => {
      component.isSelfAssessment = true
      component.receiveSteps('AssessmentBuilder')
      expect(component.header).toBe('Self Assessment Details')
      expect(component.steps[1].activeStep).toBe(true)
      expect(component.steps.length).toBe(3)
    })

    it('activates the assessment settings step for a self assessment', () => {
      component.isSelfAssessment = true
      component.receiveSteps('AssessmentSettings')
      expect(component.steps[2].activeStep).toBe(true)
    })
  })

  describe('canShow', () => {
    const withRoles = (roles: string[]) => {
      configurationsService.userRoles = new Set(roles)
      return build()
    }

    it('gates review, publish, author and author_create on the roles', () => {
      expect(withRoles(['content_reviewer']).canShow('review')).toBe(true)
      expect(withRoles(['content_publisher']).canShow('publish')).toBe(true)
      expect(withRoles(['content_creator']).canShow('author_create')).toBe(true)
      expect(withRoles(['content_creator']).canShow('author')).toBe(true)
      expect(withRoles(['content_reviewer']).canShow('author')).toBe(true)
      expect(withRoles(['content_publisher']).canShow('author')).toBe(true)
      expect(withRoles(['public']).canShow('author')).toBe(false)
    })

    it('refuses an unknown role', () => {
      expect(component.canShow('whatever')).toBe(false)
    })
  })

  describe('ngOnInit', () => {
    it('builds the topic form and reads the stepper config', () => {
      component.ngOnInit()
      expect(component.createTopicForm.controls.topicName).toBeDefined()
      expect(component.stepper).toBe(true)
      expect(component.showLanguageBar).toBe(true)
      expect(component.courseId).toBe('do_course')
      expect(component.parentNodeId).toBe(1)
    })

    it('marks the signed-in creator as the course owner', () => {
      component.ngOnInit()
      expect(component.checkCreator).toBe(true)
    })

    it('does not mark another user as the course owner', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ createdBy: 'someone-else' }))
      component.ngOnInit()
      expect(component.checkCreator).toBe(false)
    })

    it('keeps only the action buttons whose conditions pass', () => {
      component.ngOnInit()
      expect(component.actionButton.enabled).toBe(true)
      expect(component.actionButton.buttons.length).toBe(1)
    })

    it('drops the action buttons whose conditions fail', () => {
      contentService.checkConditionV2.mockReturnValue(false)
      component.ngOnInit()
      expect(component.actionButton.buttons).toEqual([])
    })

    it('opens the sidebar on a wide screen', () => {
      component.ngOnInit()
      expect(component.mediumScreen).toBe(false)
      expect(component.sideBarOpened).toBe(true)
    })

    it('collapses the sidebar on a narrow screen', () => {
      breakpointObserver.observe.mockReturnValue(of({ matches: true }))
      const c = build()
      c.ngOnInit()
      expect(c.sideBarOpened).toBe(false)
    })

    it('jumps to the settings step when returning from a review click', () => {
      sessionStorage.setItem('isReviewClicked', '1')
      const c = build()
      c.ngOnInit()
      expect(c.clickedNext).toBe(true)
      expect(c.showAddchapter).toBe(true)
      expect(c.steps[3].activeStep).toBe(true)
    })

    it('uses the assessment steps when returning from review on a self assessment', () => {
      sessionStorage.setItem('isReviewClicked', '1')
      const c = build()
      c.isSelfAssessment = true
      c.ngOnInit()
      expect(c.header).toBe('Self Assessment Details')
      expect(c.steps.length).toBe(3)
    })

    it('pushes straight through when the review checklist was skipped', () => {
      sessionStorage.setItem('isReviewChecklistSkip', '1')
      const c = build()
      const spy = jest.spyOn(c, 'action').mockImplementation(() => {})
      c.ngOnInit()
      expect(spy).toHaveBeenCalledWith('push')
      expect(sessionStorage.getItem('isReviewChecklistSkip')).toBeNull()
    })

    it('starts on the course details step', () => {
      component.ngOnInit()
      expect(component.steps[1].activeStep).toBe(true)
    })
  })

  describe('routerValuesCall', () => {
    it('tracks the active content and resets the view mode for a collection', () => {
      component.routerValuesCall()
      changeActiveCont.next('do_mod')
      expect(component.currentContent).toBe('do_mod')
      expect(component.currentCourseId).toBe('do_mod')
      expect(component.viewMode).toBe('meta')
    })

    it('ignores the empty seed so a valid course id is not clobbered', () => {
      component.routerValuesCall()
      component.currentCourseId = 'do_course'
      changeActiveCont.next('')
      expect(component.currentCourseId).toBe('do_course')
    })

    it('leaves the view mode alone for a resource', () => {
      contentService.getUpdatedMeta.mockReturnValue(meta({ contentType: 'Resource' }))
      component.viewMode = 'upload'
      component.routerValuesCall()
      changeActiveCont.next('do_res')
      expect(component.viewMode).toBe('upload')
    })
  })

  describe('tree helpers', () => {
    beforeEach(() => {
      component.treeControl = {
        dataNodes: [],
        expand: jest.fn(),
      } as any
    })

    it('getParentNode returns null for a root node', () => {
      expect(component.getParentNode({ level: 0 } as any)).toBeNull()
    })

    it('getParentNode finds the nearest shallower node', () => {
      const parent = { level: 0, id: 1 } as any
      const child = { level: 1, id: 2 } as any
      component.treeControl.dataNodes = [parent, child]
      expect(component.getParentNode(child)).toBe(parent)
    })

    it('getParentNode returns null when no shallower node exists', () => {
      const child = { level: 1, id: 2 } as any
      component.treeControl.dataNodes = [{ level: 1, id: 1 } as any, child]
      expect(component.getParentNode(child)).toBeNull()
    })

    it('expandNodesById expands the node and its ancestors', () => {
      const parent = { level: 0, id: 1 } as any
      const child = { level: 1, id: 2 } as any
      component.treeControl.dataNodes = [parent, child]
      component.expandNodesById([2])
      expect(component.treeControl.expand).toHaveBeenCalledWith(child)
      expect(component.treeControl.expand).toHaveBeenCalledWith(parent)
    })

    it('expandNodesById falls back to the remembered set', () => {
      const node = { level: 0, id: 1 } as any
      component.treeControl.dataNodes = [node]
      component.expandedNodes = new Set([1])
      component.expandNodesById()
      expect(component.treeControl.expand).toHaveBeenCalledWith(node)
    })
  })

  describe('ngOnDestroy', () => {
    it('releases the subscriptions and restores the shell chrome', () => {
      component.ngOnDestroy()
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
      expect(headerService.showCreatorHeader).toHaveBeenCalledWith('showlogo')
      expect(rootSvc.showNavbarDisplay$.next).toHaveBeenCalledWith(true)
      expect(component.changeMessageSubscription!.closed).toBe(true)
      expect(component.backToCourse!.closed).toBe(true)
      expect(component.navigationMessageSub!.closed).toBe(true)
    })
  })

  describe('setContentType', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.createModule = { name: 'Module 1', description: 'about' }
    })

    it('creates the child node and confirms', async () => {
      const spy = jest.spyOn(component, 'subAction').mockResolvedValue(undefined as any)
      await component.setContentType('collection')
      expect(storeService.createChildOrSibling).toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(component.showAddchapter).toBe(true)
      expect(spy).toHaveBeenCalled()
    })

    it('records the upload file type when one is given', async () => {
      jest.spyOn(component, 'subAction').mockResolvedValue(undefined as any)
      await component.setContentType('upload', 'pdf')
      expect(storeService.uploadFileType.next).toHaveBeenCalledWith('pdf')
    })

    it('marks a web resource as a link', async () => {
      jest.spyOn(component, 'subAction').mockResolvedValue(undefined as any)
      await component.setContentType('web')
      expect(storeService.createChildOrSibling).toHaveBeenCalledWith(
        'web',
        expect.anything(),
        undefined,
        'below',
        { topicDescription: 'about', topicName: 'Module 1' },
        'link',
      )
    })

    it('selects the newly created node', async () => {
      jest.spyOn(component, 'subAction').mockResolvedValue(undefined as any)
      await component.setContentType('collection')
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(9)
      expect(component.currentContent).toBe('do_new')
    })

    it('reports a failed creation', async () => {
      storeService.createChildOrSibling.mockResolvedValue(false)
      jest.spyOn(component, 'subAction').mockResolvedValue(undefined as any)
      await component.setContentType('collection')
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ data: { type: Notify.FAIL } }))
    })
  })

  describe('validationCheck', () => {
    it('passes when the store reports no problems', () => {
      component.currentParentId = 'do_course'
      expect(component.validationCheck).toBe(true)
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('opens the error parser when the store reports problems', () => {
      storeService.validationCheck.mockReturnValue([{ id: 1, name: 'x', message: ['bad'] }])
      component.currentParentId = 'do_course'
      expect(component.validationCheck).toBe(false)
      expect(dialog.open).toHaveBeenCalled()
    })

    it('activates the node named by the error dialog', () => {
      jest.spyOn(changeActiveCont, 'next')
      storeService.validationCheck.mockReturnValue([{ id: 1 }])
      component.currentParentId = 'do_course'
      void component.validationCheck
      afterClosed.next('do_course')
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(1)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_course')
    })

    it('activates the node id returned by the error dialog', () => {
      jest.spyOn(changeActiveCont, 'next')
      storeService.validationCheck.mockReturnValue([{ id: 1 }])
      component.currentParentId = 'do_course'
      void component.validationCheck
      afterClosed.next(1)
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(1)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_course')
    })
  })

  describe('getMessage', () => {
    const cases: Array<[string, string, string]> = [
      ['Draft', Notify.SEND_FOR_REVIEW_SUCCESS, Notify.SEND_FOR_REVIEW_FAIL],
      ['Live', Notify.SEND_FOR_REVIEW_SUCCESS, Notify.SEND_FOR_REVIEW_FAIL],
      ['InReview', Notify.REVIEW_SUCCESS, Notify.REVIEW_FAIL],
      ['Reviewed', Notify.PUBLISH_SUCCESS, Notify.PUBLISH_FAIL],
      ['Review', Notify.PUBLISH_SUCCESS, Notify.PUBLISH_FAIL],
    ]

    cases.forEach(([status, success, failure]) => {
      it(`maps ${status} to its success and failure messages`, () => {
        contentService.originalContent = { do_course: meta({ status }) }
        component.currentParentId = 'do_course'
        expect(component.getMessage('success')).toBe(success)
        expect(component.getMessage('failure')).toBe(failure)
      })
    })

    it('returns an empty message for an unknown status', () => {
      contentService.originalContent = { do_course: meta({ status: 'Nope' }) }
      component.currentParentId = 'do_course'
      expect(component.getMessage('success')).toBe('')
      expect(component.getMessage('failure')).toBe('')
    })
  })

  describe('stepper validity', () => {
    beforeEach(() => {
      component.receiveSteps('CourseDetails')
    })

    it('records each step validity', () => {
      component.onCourseDetailsValidity(true)
      component.onCourseBuilderValidity(true)
      component.onCourseSettingsValidity(true)
      expect(component.isCourseDetailsValid).toBe(true)
      expect(component.isCourseBuilderValid).toBe(true)
      expect(component.isCourseSettingsValid).toBe(true)
    })

    it('disables Next until the course details form is valid', () => {
      component.onCourseDetailsValidity(false)
      expect(component.isNextDisabled).toBe(true)
      component.onCourseDetailsValidity(true)
      expect(component.isNextDisabled).toBe(false)
    })

    it('disables Next until the builder has enough resources', () => {
      component.receiveSteps('CourseBuilder')
      component.onCourseBuilderValidity(false)
      expect(component.isNextDisabled).toBe(true)
      component.onCourseBuilderValidity(true)
      expect(component.isNextDisabled).toBe(false)
    })

    it('disables Next until the settings form is valid', () => {
      component.receiveSteps('CourseSettings')
      component.onCourseSettingsValidity(false)
      expect(component.isNextDisabled).toBe(true)
    })

    it('enables Next when no step is active', () => {
      component.steps = []
      expect(component.isNextDisabled).toBe(false)
    })

    it('handleStepperNext submits the course details form', () => {
      jest.useFakeTimers()
      component.handleStepperNext()
      expect(component.isSubmitPressed).toBe(true)
      expect(component.triggerEditMetaNext).toBe(true)
      jest.advanceTimersByTime(100)
      expect(component.triggerEditMetaNext).toBe(false)
      jest.useRealTimers()
    })

    it('handleStepperNext relays Next to the builder on later steps', () => {
      jest.useFakeTimers()
      component.receiveSteps('CourseBuilder')
      component.handleStepperNext()
      expect(component.triggerModuleCreationNext).toBe(true)
      jest.advanceTimersByTime(100)
      expect(component.triggerModuleCreationNext).toBe(false)
      jest.useRealTimers()
    })

    it('handleStepperNext does nothing with no active step', () => {
      component.steps = []
      component.handleStepperNext()
      expect(component.triggerModuleCreationNext).toBe(false)
    })
  })

  describe('action', () => {
    beforeEach(() => {
      component.currentParentId = 'do_course'
    })

    it('next returns to the meta view', () => {
      component.action('next')
      expect(component.viewMode).toBe('meta')
    })

    it('scroll brings the edit-meta panel into view', () => {
      const el = document.createElement('div')
      el.id = 'edit-meta'
      ;(el as any).scrollIntoView = jest.fn()
      document.body.appendChild(el)
      component.action('scroll')
      expect((el as any).scrollIntoView).toHaveBeenCalled()
      el.remove()
    })

    it('scroll is safe when the panel is absent', () => {
      expect(() => component.action('scroll')).not.toThrow()
    })

    it('save persists and reveals the resource panel', () => {
      const spy = jest.spyOn(component, 'save').mockResolvedValue(undefined as any)
      component.action('save')
      expect(spy).toHaveBeenCalledWith('save')
      expect(component.showResource).toBe(true)
    })

    it('saveAndNext persists and advances', () => {
      const spy = jest.spyOn(component, 'save').mockResolvedValue(undefined as any)
      component.action('saveAndNext')
      expect(spy).toHaveBeenCalledWith('next')
    })

    it('preview opens the current content', () => {
      const spy = jest.spyOn(component, 'preview').mockResolvedValue(undefined as any)
      component.currentContent = 'do_res'
      component.action('preview')
      expect(spy).toHaveBeenCalledWith('do_res')
    })

    it('push confirms before publishing', () => {
      contentService.originalContent = { do_course: meta({ status: 'Reviewed' }) }
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      expect(dialog.open).toHaveBeenCalled()
      afterClosed.next(true)
      expect(spy).toHaveBeenCalled()
    })

    it('push sends for review without a dialog when not publishable', () => {
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('push')
      expect(dialog.open).not.toHaveBeenCalled()
      expect(spy).toHaveBeenCalledWith('acceptConent')
    })

    it('delete drops the content and returns home once confirmed', () => {
      component.contents = [meta() as any]
      component.action('delete')
      afterClosed.next(true)
      expect(component.contents).toEqual([])
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('delete activates the next document when others remain', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.contents = [meta() as any, meta({ identifier: 'do_2' }) as any]
      component.action('delete')
      afterClosed.next(true)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('delete keeps the content when dismissed', () => {
      component.contents = [meta() as any]
      component.action('delete')
      afterClosed.next(false)
      expect(component.contents.length).toBe(1)
    })

    it('close returns to the author home', () => {
      component.action('close')
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('acceptConent and rejectContent delegate to takeAction', () => {
      const spy = jest.spyOn(component, 'takeAction').mockImplementation(() => {})
      component.action('acceptConent')
      expect(spy).toHaveBeenCalledWith('acceptConent')
      component.action('rejectContent')
      expect(spy).toHaveBeenCalledWith('rejectContent')
    })

    it('fullscreen toggles the toc container', () => {
      const el = document.createElement('div')
      el.id = 'auth-toc'
      ;(el as any).requestFullscreen = jest.fn()
      document.body.appendChild(el)
      component.action('fullscreen')
      expect((el as any).requestFullscreen).toHaveBeenCalled()
      el.remove()
    })

    it('ignores an unknown action', () => {
      component.viewMode = 'upload'
      component.action('nope')
      expect(component.viewMode).toBe('upload')
    })
  })

  describe('delete', () => {
    beforeEach(() => {
      component.currentParentId = 'do_course'
    })

    it('removes the content and returns home', () => {
      component.contents = [meta() as any]
      component.delete()
      expect(editorService.deleteContent).toHaveBeenCalledWith('do_course')
      expect(component.contents).toEqual([])
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/home')
    })

    it('activates the next document when others remain', () => {
      jest.spyOn(changeActiveCont, 'next')
      component.contents = [meta() as any, meta({ identifier: 'do_2' }) as any]
      component.delete()
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_2')
    })

    it('opens the error parser on a 409 conflict', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.delete()
      expect(dialog.open).toHaveBeenCalled()
    })

    it('activates the node named by the error dialog', () => {
      jest.spyOn(changeActiveCont, 'next')
      editorService.deleteContent.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.delete()
      afterClosed.next('do_course')
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(1)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_course')
    })

    it('activates the node id returned by the error dialog', () => {
      jest.spyOn(changeActiveCont, 'next')
      editorService.deleteContent.mockReturnValue(throwError(() => ({ status: 409, error: 'x' })))
      component.delete()
      afterClosed.next(1)
      expect(changeActiveCont.next).toHaveBeenCalledWith('do_course')
    })

    it('only notifies on a non-conflict failure', () => {
      editorService.deleteContent.mockReturnValue(throwError(() => ({ status: 500 })))
      component.delete()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('getAction and permissions', () => {
    beforeEach(() => {
      component.currentParentId = 'do_course'
    })

    it('offers review for draft and live content', () => {
      expect(component.getAction()).toBe('sendForReview')
      contentService.originalContent = { do_course: meta({ status: 'Live' }) }
      expect(component.getAction()).toBe('sendForReview')
    })

    it('offers review actions while in review', () => {
      contentService.originalContent = { do_course: meta({ status: 'InReview' }) }
      expect(component.getAction()).toBe('review')
    })

    it('offers publish once reviewed with no draft children', () => {
      contentService.originalContent = { do_course: meta({ status: 'Reviewed' }) }
      expect(component.getAction()).toBe('publish')
    })

    it('drops back to review when a child is still draft', () => {
      contentService.originalContent = { do_course: meta({ status: 'Reviewed' }) }
      contentService.resetStatus.mockReturnValue(true)
      expect(component.getAction()).toBe('sendForReview')
      expect(contentService.changeStatusDraft).toHaveBeenCalled()
    })

    it('defaults to review for an unknown status', () => {
      contentService.originalContent = { do_course: meta({ status: 'Nope' }) }
      expect(component.getAction()).toBe('sendForReview')
    })

    it('canDelete allows an editor or admin', () => {
      accessControlSvc.hasRole.mockReturnValue(true)
      expect(component.canDelete()).toBeTruthy()
    })

    it('canDelete allows the creator of a draft', () => {
      expect(component.canDelete()).toBeTruthy()
    })

    it('canDelete refuses another author', () => {
      contentService.originalContent = { do_course: meta({ creatorContacts: [{ id: 'other' }] }) }
      expect(component.canDelete()).toBeFalsy()
    })

    it('canDelete refuses once the content is under review', () => {
      contentService.originalContent = { do_course: meta({ status: 'InReview' }) }
      expect(component.canDelete()).toBeFalsy()
    })
  })

  describe('checkForEmptyData', () => {
    it('is false when nothing changed', () => {
      expect(component.checkForEmptyData).toBe(false)
    })

    it('is false when only the version key changed', () => {
      contentService.upDatedContent = { do_course: { versionKey: 'vk1' } }
      expect(component.checkForEmptyData).toBe(false)
    })

    it('is true when real fields changed', () => {
      contentService.upDatedContent = { do_course: { versionKey: 'vk1', name: 'New' } }
      expect(component.checkForEmptyData).toBe(true)
    })
  })

  describe('sendEmailNotification', () => {
    it('emails the reviewers when sending for review', async () => {
      await component.sendEmailNotification('sendForReview')
      const payload = editorService.sendEmailNotificationAPI.mock.calls[0][0]
      expect(payload.recipientEmails).toEqual(['reviewer@x.com'])
      expect(payload.contentState).toBe('sendForReview')
    })

    it('parses a stringified reviewer list', async () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ reviewer: JSON.stringify([{ email: 'r2@x.com' }]) }))
      await component.sendEmailNotification('sendForReview')
      expect(editorService.sendEmailNotificationAPI.mock.calls[0][0].recipientEmails).toEqual(['r2@x.com'])
    })

    it('emails the publishers when sending for publish', async () => {
      await component.sendEmailNotification('sendForPublish')
      expect(editorService.sendEmailNotificationAPI.mock.calls[0][0].recipientEmails).toEqual(['publisher@x.com'])
    })

    it('parses a stringified publisher list', async () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ publisherDetails: JSON.stringify([{ email: 'p2@x.com' }]) }))
      await component.sendEmailNotification('sendForPublish')
      expect(editorService.sendEmailNotificationAPI.mock.calls[0][0].recipientEmails).toEqual(['p2@x.com'])
    })

    it('emails the creators on a review or publish outcome', async () => {
      for (const action of ['reviewFailed', 'publishFailed', 'publishCompleted']) {
        editorService.sendEmailNotificationAPI.mockClear()
        await component.sendEmailNotification(action)
        expect(editorService.sendEmailNotificationAPI.mock.calls[0][0].recipientEmails).toEqual(['creator@x.com'])
      }
    })

    it('parses a stringified creator list', async () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ creatorContacts: JSON.stringify([{ email: 'c2@x.com' }]) }))
      await component.sendEmailNotification('publishCompleted')
      expect(editorService.sendEmailNotificationAPI.mock.calls[0][0].recipientEmails).toEqual(['c2@x.com'])
    })

    it('sends nothing when there are no recipients', async () => {
      contentService.getOriginalMeta.mockReturnValue(meta({ reviewer: [] }))
      await component.sendEmailNotification('sendForReview')
      expect(editorService.sendEmailNotificationAPI).not.toHaveBeenCalled()
    })

    it('sends nothing for an unrecognised action', async () => {
      await component.sendEmailNotification('whatever')
      expect(editorService.sendEmailNotificationAPI).not.toHaveBeenCalled()
    })

    it('swallows a failing email call', async () => {
      editorService.sendEmailNotificationAPI.mockReturnValue(throwError(() => 'boom'))
      await expect(component.sendEmailNotification('sendForReview')).resolves.toBeUndefined()
    })
  })

  describe('small helpers', () => {
    it('jsonVerify accepts valid JSON and rejects the rest', () => {
      expect(component.jsonVerify('{"a":1}')).toBe(true)
      expect(component.jsonVerify('nope')).toBe(false)
    })

    it('courseEditFormSubmit records the header view state', () => {
      component.courseEditFormSubmit(true)
      expect(component.isModelHeaderView).toBe(true)
    })

    it('closePreview clears the previewed identifier', () => {
      component.previewIdentifier = 'do_res'
      component.closePreview()
      expect(component.previewIdentifier).toBeNull()
    })

    it('addChapterName is retained for the template binding', () => {
      expect(() => component.addChapterName()).not.toThrow()
    })

    it('sidenavClose restores the arrow after the animation', () => {
      jest.useFakeTimers()
      component.leftArrow = false
      component.sidenavClose()
      jest.advanceTimersByTime(600)
      expect(component.leftArrow).toBe(true)
      jest.useRealTimers()
    })
  })
})
