import { of, Subject } from 'rxjs'

import { CourseCollectionComponent } from './course-collection.component'

/**
 * This is a heavy component (18 injected deps, large template), so per the
 * project testing guidance we instantiate the class directly with mocked
 * collaborators and exercise its logic rather than rendering it via TestBed.
 *
 * These tests pin the "blank page until you move the mouse" fix: when the user
 * clicks Next on Course Details and there is nothing to save ("Content is
 * up-to-date"), save() swaps the view to Course Builder. That swap runs
 * synchronously inside edit-meta's ngOnChanges — during a change-detection pass
 * that has already checked this component — so it must trigger change detection
 * itself, otherwise the view never repaints until the next event ticks CD.
 */
describe('CourseCollectionComponent — Course Details → Course Builder view swap', () => {
  let component: CourseCollectionComponent

  let cdr: { detectChanges: jest.Mock }
  let loaderService: { changeLoad: { next: jest.Mock } }
  let snackBar: { openFromComponent: jest.Mock }
  let contentService: any
  let storeService: any
  let router: any

  const neverEmits = () => new Subject<any>()

  beforeEach(() => {
    cdr = { detectChanges: jest.fn() }
    loaderService = { changeLoad: { next: jest.fn() } }
    snackBar = { openFromComponent: jest.fn() }

    contentService = {
      upDatedContent: {},
      getUpdatedMeta: jest.fn().mockReturnValue({ contentType: 'Course' }),
    }
    storeService = { changedHierarchy: {}, parentNode: [] }
    router = { url: '/author/collection/course-1/node-1', navigateByUrl: jest.fn() }

    // initService exposes the many Subjects the constructor subscribes to; using
    // Subjects that never emit keeps construction side-effect free.
    const initService: any = {
      currentMessage: neverEmits(),
      currentNavigationMessage: neverEmits(),
      isBackButtonClickedMessage: neverEmits(),
      publishMessage: neverEmits(),
      isBackButtonFromAssessmentClickedMessage: neverEmits(),
      uploadMessage: neverEmits(),
      saveContentMessage: neverEmits(),
      createModuleMessage: neverEmits(),
      updateAssessmentMessage: neverEmits(),
      isEditMetaPageAction: jest.fn(),
      publishData: jest.fn(),
      backToHome: jest.fn(),
      isBackButtonClickedFromAssessmentAction: jest.fn(),
    }

    const headerService: any = {
      isSavePressed: false,
      headerSaveData: neverEmits(),
      showCreatorHeader: jest.fn(),
    }
    const rootSvc: any = { showNavbarDisplay$: { next: jest.fn() } }
    // observe() feeds the mediumSizeBreakpoint$ field initializer, which runs
    // before the constructor body.
    const breakpointObserver: any = { observe: jest.fn().mockReturnValue(of({ matches: false })) }

    component = new CourseCollectionComponent(
      contentService as any,
      { parent: null } as any, // ActivatedRoute
      storeService as any,
      {} as any, // resolverService
      initService,
      loaderService as any,
      {} as any, // dialog
      snackBar as any,
      {} as any, // editorService
      router as any,
      {} as any, // accessControlSvc
      breakpointObserver,
      {} as any, // fb
      headerService,
      rootSvc,
      {} as any, // _configurationsService
      {} as any, // progressSvc
      cdr as any,
    )
  })

  it('triggers change detection when swapping to Course Builder on the up-to-date path', async () => {
    // Arrange: on Course Details, module page enabled, nothing pending to save.
    component.isModulePageEnabled = true
    component.viewMode = 'meta'
    component.clickedNext = false
    contentService.upDatedContent = {}
    storeService.changedHierarchy = {}

    // Act: Next with no changes → "Content is up-to-date" branch.
    await component.save()

    // Assert: view state advanced to Course Builder AND change detection ran,
    // so the swap actually repaints (the regression this fix addresses).
    expect(component.clickedNext).toBe(true)
    const activeStep = component.steps.find((s: any) => s.activeStep)
    expect(activeStep.key).toBe('CourseBuilder')
    expect(cdr.detectChanges).toHaveBeenCalled()
    expect(snackBar.openFromComponent).toHaveBeenCalled()
  })

  it('does not swap views when a nextAction is supplied (defers to action())', async () => {
    component.isModulePageEnabled = true
    component.viewMode = 'meta'
    component.clickedNext = false

    await component.save('next')

    // The nextAction path delegates to action(); it must not run the
    // up-to-date view-swap block.
    expect(component.clickedNext).toBe(false)
  })
})
