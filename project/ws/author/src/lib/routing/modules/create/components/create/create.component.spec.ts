import { FormBuilder, FormControl } from '@angular/forms'
import { Subject, of, throwError } from 'rxjs'
import { CreateComponent } from './create.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('CreateComponent', () => {
  let component: CreateComponent
  let snackBar: any
  let svc: any
  let router: any
  let loaderService: any
  let accessControlSvc: any
  let authInitService: any
  let dialog: any
  let route: any
  let queryParams$: Subject<any>

  const entity = (id: string, over: any = {}) => ({
    id,
    name: id,
    available: true,
    contentType: 'Resource',
    mimeType: 'application/pdf',
    primaryCategory: 'Learning Resource',
    ...over,
  })

  const build = () =>
    new CreateComponent(snackBar, svc, router, loaderService, accessControlSvc, authInitService, dialog, route, new FormBuilder())

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  beforeEach(() => {
    queryParams$ = new Subject<any>()

    snackBar = { openFromComponent: jest.fn() }
    svc = { createV2: jest.fn().mockReturnValue(of('do_new1')) }
    router = { navigateByUrl: jest.fn() }
    loaderService = { changeLoadState: jest.fn(), changeLoad: { next: jest.fn() } }
    accessControlSvc = {
      locale: 'en',
      hasRole: jest.fn().mockReturnValue(false),
      authoringConfig: {
        allowRedo: true,
        allowRestore: true,
        allowExpiry: false,
        allowReview: true,
        allowPublish: true,
      },
    }
    authInitService = {
      creationEntity: [
        entity('resource'),
        entity('course'),
        entity('knowledgeArtifact'),
        entity('hidden', { available: false }),
        entity('child', { parent: 'course' }),
      ],
      ordinals: { subTitles: [{ srclang: 'en', label: 'English' }] },
    }
    dialog = { open: jest.fn() }
    route = { queryParams: queryParams$ }

    component = build()
  })

  it('should be created with the course stepper', () => {
    expect(component).toBeTruthy()
    expect(component.header).toBe('Course Details')
    expect(component.steps.length).toBe(4)
    expect(component.steps[0].activeStep).toBe(true)
    expect(component.isSelfAssessment).toBe(false)
  })

  describe('ngOnInit', () => {
    it('sorts the available top-level entities', () => {
      component.ngOnInit()

      expect(component.resourceEntity.id).toBe('resource')
      expect(component.courseEntity.id).toBe('course')
      expect(component.entity.map(e => e.id)).toEqual(['knowledgeArtifact'])
    })

    it('clears the loader and takes the language defaults', () => {
      component.ngOnInit()

      expect(loaderService.changeLoadState).toHaveBeenCalledWith(false)
      expect(component.allLanguages).toEqual([{ srclang: 'en', label: 'English' }])
      expect(component.language).toBe('en')
    })

    it('copes with an instance that publishes no subtitles', () => {
      authInitService.ordinals.subTitles = null
      const c = build()

      c.ngOnInit()

      expect(c.allLanguages).toEqual([])
    })

    it('switches to the self-assessment stepper', () => {
      component.ngOnInit()

      queryParams$.next({ status: 'selfAssessment' })

      expect(component.isSelfAssessment).toBe(true)
      expect(component.header).toBe('Self Assessment details')
      expect(component.steps.map((s: any) => s.key)).toEqual(['AssessmentDetails', 'AssessmentBuilder', 'AssessmentSettings'])
    })

    it('keeps the course stepper for any other query string', () => {
      component.ngOnInit()

      queryParams$.next({ status: 'other' })

      expect(component.isSelfAssessment).toBe(false)
      expect(component.steps.length).toBe(4)
    })

    it('takes the authoring toggles from the instance config', () => {
      component.ngOnInit()

      expect(component.allowRedo).toBe(true)
      expect(component.allowRestore).toBe(true)
      expect(component.allowExpiry).toBe(false)
    })

    it('grants review and publish to a user holding both roles', () => {
      accessControlSvc.hasRole.mockReturnValue(true)
      const c = build()

      c.ngOnInit()

      expect(c.allowReview).toBe(true)
      expect(c.allowPublish).toBe(true)
      expect(c.allowAuthor).toBe(true)
      expect(c.allowAuthorContentCreate).toBe(true)
    })

    it('withholds review and publish when the instance disables them', () => {
      accessControlSvc.hasRole.mockReturnValue(true)
      accessControlSvc.authoringConfig.allowReview = false
      accessControlSvc.authoringConfig.allowPublish = false
      const c = build()

      c.ngOnInit()

      expect(c.allowReview).toBe(false)
      expect(c.allowPublish).toBe(false)
    })
  })

  describe('canShow', () => {
    it.each(['review', 'publish', 'author', 'author_create'])('consults the access service for %s', permission => {
      accessControlSvc.hasRole.mockReturnValue(true)

      expect(component.canShow(permission)).toBe(true)
    })

    it('denies every permission to a user with no roles', () => {
      expect(component.canShow('review')).toBe(false)
      expect(component.canShow('publish')).toBe(false)
      expect(component.canShow('author')).toBe(false)
      expect(component.canShow('author_create')).toBe(false)
    })

    it('denies an unknown permission', () => {
      accessControlSvc.hasRole.mockReturnValue(true)

      expect(component.canShow('nonsense')).toBe(false)
    })
  })

  describe('contentClicked', () => {
    it('remembers the picked content type', () => {
      const picked = entity('resource')

      component.contentClicked(picked as any)

      expect(component.content).toBe(picked)
    })

    it('ignores an empty pick', () => {
      component.contentClicked(null as any)

      expect(component.content).toBeUndefined()
    })
  })

  describe('setCurrentLanguage', () => {
    it('records the chosen language', () => {
      component.setCurrentLanguage('hi')

      expect(component.language).toBe('hi')
    })
  })

  describe('onNext', () => {
    it('delegates to the course form', () => {
      const triggerNext = jest.fn()
      component.createCourseCmp = { triggerNext } as any

      component.onNext()

      expect(triggerNext).toHaveBeenCalled()
    })

    it('does nothing before the course form is rendered', () => {
      expect(() => component.onNext()).not.toThrow()
    })
  })

  describe('createForm', () => {
    it('builds the course name control', () => {
      component.createForm()

      expect(component.createCourseForm.value).toEqual({ name: '' })
    })
  })

  describe('createCourseClicked', () => {
    const withForm = (name = 'A course', purpose = 'Teaching') => {
      component.ngOnInit()
      component.contentClicked(entity('course', { additionalMeta: { framework: 'fw' } }) as any)
      component.createCourseForm = new FormBuilder().group({
        name: new FormControl(name),
        purpose: new FormControl(purpose),
      })
    }

    it('creates the course and opens the editor', () => {
      withForm()

      component.createCourseClicked()

      expect(svc.createV2).toHaveBeenCalledWith({
        name: 'A course',
        purpose: 'Teaching',
        contentType: 'Resource',
        mimeType: 'application/pdf',
        locale: 'en',
        primaryCategory: 'Learning Resource',
        framework: 'fw',
      })
      expect(lastNotify()).toBe(Notify.CONTENT_CREATE_SUCCESS)
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_new1')
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('creates a course whose type carries no extra metadata', () => {
      component.ngOnInit()
      component.contentClicked(entity('course') as any)
      component.createCourseForm = new FormBuilder().group({
        name: new FormControl('A course'),
        purpose: new FormControl('Teaching'),
      })

      component.createCourseClicked()

      expect(svc.createV2).toHaveBeenCalled()
    })

    it('does nothing without a name', () => {
      withForm('', 'Teaching')

      component.createCourseClicked()

      expect(svc.createV2).not.toHaveBeenCalled()
    })

    it('does nothing without a purpose', () => {
      withForm('A course', '')

      component.createCourseClicked()

      expect(svc.createV2).not.toHaveBeenCalled()
    })

    it('does nothing before a content type is picked', () => {
      component.ngOnInit()
      component.createCourseForm = new FormBuilder().group({
        name: new FormControl('A course'),
        purpose: new FormControl('Teaching'),
      })

      component.createCourseClicked()

      expect(svc.createV2).not.toHaveBeenCalled()
    })

    it('does nothing when the form has no name or purpose controls', () => {
      component.ngOnInit()
      component.contentClicked(entity('course') as any)
      component.createCourseForm = new FormBuilder().group({})

      component.createCourseClicked()

      expect(svc.createV2).not.toHaveBeenCalled()
    })

    it('shows the backend conflict details on a duplicate name', () => {
      svc.createV2.mockReturnValue(throwError(() => ({ status: 409, error: { msg: 'exists' } })))
      withForm()

      component.createCourseClicked()

      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        width: '80vw',
        height: '90vh',
        data: { errorFromBackendData: { msg: 'exists' } },
      })
      expect(lastNotify()).toBe(Notify.CONTENT_FAIL)
    })

    it('reports any other creation failure without the conflict dialog', () => {
      svc.createV2.mockReturnValue(throwError(() => ({ status: 500 })))
      withForm()

      component.createCourseClicked()

      expect(dialog.open).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.CONTENT_FAIL)
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  describe('createBtn', () => {
    it('sends the browser to the create page', () => {
      const location = window.location
      delete (window as any).location
      ;(window as any).location = { href: '' }

      component.createBtn()

      expect(window.location.href).toBe('/author/create')
      ;(window as any).location = location
    })
  })

  describe('ngOnDestroy', () => {
    it('clears the loader', () => {
      component.ngOnDestroy()

      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })
})
