import { FormBuilder } from '@angular/forms'
import { BehaviorSubject, of, Subject } from 'rxjs'
import { CourseCollectionComponent } from './course-collection.component'

/**
 * Wave 18 — `routerValuesCall`: the active-content guard and the tree build from
 * the resolved route data of CourseCollectionComponent.
 */
describe('CourseCollectionComponent (route wiring)', () => {
  let component: CourseCollectionComponent
  let contentService: any
  let storeService: any
  let resolverService: any
  let editorService: any
  let headerService: any
  let changeActiveCont: BehaviorSubject<string>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const meta = (over: any = {}) => ({
    identifier: 'do_course',
    name: 'Course A',
    contentType: 'Course',
    children: [],
    ...over,
  })

  /** The resolved route data the editor hands the collection view. */
  const routeWith = (content: any) => ({
    parent: {
      parent: { data: of({ contents: [{ content, data: {} }] }) },
      url: of([{ path: 'collection' }]),
    },
  })

  beforeEach(() => {
    sessionStorage.clear()
    changeActiveCont = new BehaviorSubject<string>('')
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
      cleanProperties: jest.fn((v: any) => v),
      resetStatus: jest.fn().mockReturnValue(false),
      changeStatusDraft: jest.fn(),
    }
    storeService = {
      parentNode: [],
      currentParentNode: 0,
      currentSelectedNode: 0,
      changedHierarchy: {},
      lexIdMap: new Map<string, number[]>([['do_course', [1]]]),
      uniqueIdMap: new Map([[1, 'do_course']]),
      flatNodeMap: new Map([[1, { id: 1, identifier: 'do_course' }]]),
      selectedNodeChange: { next: jest.fn() },
      treeStructureChange: { next: jest.fn() },
      uploadFileType: { next: jest.fn() },
      getTreeHierarchy: jest.fn().mockReturnValue({}),
      validationCheck: jest.fn().mockReturnValue(null),
      createChildOrSibling: jest.fn().mockResolvedValue(true),
    }
    resolverService = { buildTreeAndMap: jest.fn() }
    editorService = {
      newCreatedLexid: '',
      readcontentV3: jest.fn().mockReturnValue(of(meta())),
      deleteContent: jest.fn().mockReturnValue(of({})),
      sendEmailNotificationAPI: jest.fn().mockReturnValue(of({})),
    }
    headerService = { isSavePressed: false, headerSaveData: new Subject<any>(), showCreatorHeader: jest.fn() }

    component = new CourseCollectionComponent(
      contentService,
      { parent: null } as any,
      storeService,
      resolverService,
      {
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
      } as any,
      { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() } as any,
      { open: jest.fn().mockReturnValue({ afterClosed: () => of(false) }), closeAll: jest.fn() } as any,
      { open: jest.fn(), openFromComponent: jest.fn() } as any,
      editorService,
      { navigate: jest.fn(), navigateByUrl: jest.fn(), url: '/author/editor/do_course/collection' } as any,
      { userId: 'u1', hasRole: jest.fn().mockReturnValue(false) } as any,
      { observe: jest.fn().mockReturnValue(of({ matches: false })) } as any,
      new FormBuilder(),
      headerService,
      { showNavbarDisplay$: { next: jest.fn() } } as any,
      { userRoles: new Set(['content_creator']), userProfile: { userId: 'u1' } } as any,
      { addComment: jest.fn().mockReturnValue(of({})) } as any,
      { detectChanges: jest.fn() } as any,
    )
    component.currentContent = 'do_course'
  })

  afterEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  describe('the active-content guard', () => {
    it('ignores the empty seed so the course id survives', () => {
      component.currentCourseId = 'do_course'
      component.routerValuesCall()
      expect(component.currentCourseId).toBe('do_course')
    })

    it('follows a real content change', () => {
      component.routerValuesCall()
      changeActiveCont.next('do_unit')
      expect(component.currentContent).toBe('do_unit')
      expect(component.currentCourseId).toBe('do_unit')
    })

    it('drops a non-resource into the meta view', () => {
      component.routerValuesCall()
      contentService.getUpdatedMeta.mockReturnValue(meta({ contentType: 'CourseUnit' }))
      changeActiveCont.next('do_unit')
      expect(component.viewMode).toBe('meta')
    })

    it('leaves the view alone for a resource', () => {
      component.viewMode = 'upload'
      component.routerValuesCall()
      contentService.getUpdatedMeta.mockReturnValue(meta({ contentType: 'Resource' }))
      changeActiveCont.next('do_res')
      expect(component.viewMode).toBe('upload')
    })
  })

  describe('the resolved route data', () => {
    it('does nothing more without a grandparent route', () => {
      component.routerValuesCall()
      expect(resolverService.buildTreeAndMap).not.toHaveBeenCalled()
    })

    it('builds the tree and selects the course', () => {
      jest.spyOn(component, 'subAction').mockResolvedValue(undefined)
      component.activateRoute = routeWith(meta({ children: [{ identifier: 'do_c1' }] })) as any
      component.routerValuesCall()
      expect(component.courseName).toBe('Course A')
      expect(storeService.parentNode).toContain('do_course')
      expect(resolverService.buildTreeAndMap).toHaveBeenCalled()
      expect(contentService.setOriginalMeta).not.toHaveBeenCalled()
      expect(component.currentParentId).toBe('do_course')
      expect(storeService.currentParentNode).toBe(1)
      expect(component.subAction).toHaveBeenCalledWith({
        type: 'editContent',
        identifier: 'do_course',
        nodeClicked: true,
      })
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith('do_course')
      expect(headerService.showCreatorHeader).toHaveBeenCalledWith('Course A')
    })

    it('marks a competency course as a self assessment', () => {
      jest.spyOn(component, 'subAction').mockResolvedValue(undefined)
      component.activateRoute = routeWith(meta({ competency: true, children: [{ identifier: 'do_c1' }] })) as any
      component.routerValuesCall()
      expect(component.isSelfAssessment).toBe(true)
      expect(component.clickedNext).toBe(true)
    })

    it('selects a freshly created node when there is one', () => {
      jest.spyOn(component, 'subAction').mockResolvedValue(undefined)
      editorService.newCreatedLexid = 'do_new'
      storeService.lexIdMap.set('do_new', [9])
      component.activateRoute = routeWith(meta()) as any
      component.routerValuesCall()
      expect(storeService.selectedNodeChange.next).toHaveBeenCalledWith(9)
    })

    it('opens nothing when the course has no children yet', () => {
      const subAction = jest.spyOn(component, 'subAction').mockResolvedValue(undefined)
      component.activateRoute = routeWith(meta({ children: [] })) as any
      component.routerValuesCall()
      expect(subAction).not.toHaveBeenCalled()
    })

    it('leaves the header alone outside the collection route', () => {
      jest.spyOn(component, 'subAction').mockResolvedValue(undefined)
      component.activateRoute = {
        parent: {
          parent: { data: of({ contents: [{ content: meta(), data: {} }] }) },
          url: of([{ path: 'settings' }]),
        },
      } as any
      component.routerValuesCall()
      expect(headerService.showCreatorHeader).not.toHaveBeenCalled()
    })
  })
})
