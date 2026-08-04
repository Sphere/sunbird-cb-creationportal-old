import { Subject } from 'rxjs'
import { CourseHeaderComponent } from './course-header.component'

describe('CourseHeaderComponent', () => {
  let component: CourseHeaderComponent
  let configSvc: any
  let domSanitizer: any
  let headerService: any
  let initService: any
  let store: any
  let showCourseHeader$: Subject<string>
  let editMetaClicked$: Subject<string | boolean>
  let logSpy: jest.SpyInstance

  const button = (over: any = {}) => ({ title: 'Save', event: 'save', ...over })

  const build = (over: any = {}) => {
    const c = new CourseHeaderComponent(configSvc, domSanitizer, headerService, initService, store)
    Object.assign(c, over)
    return c
  }

  beforeEach(() => {
    sessionStorage.clear()
    showCourseHeader$ = new Subject<string>()
    editMetaClicked$ = new Subject<string | boolean>()
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)

    configSvc = {
      instanceConfig: { logos: { app: 'app.svg' } },
      primaryNavBar: { color: 'primary' },
      userRoles: new Set<string>(),
    }
    domSanitizer = { bypassSecurityTrustResourceUrl: jest.fn((u: string) => `safe:${u}`) }
    headerService = { showCourseHeader: showCourseHeader$ }
    initService = {
      isEditMetaPageClickedClickedMessage: editMetaClicked$,
      isBackButtonClickedAction: jest.fn(),
    }
    store = { parentNode: ['do_course'] }

    component = build()
  })

  afterEach(() => {
    logSpy.mockRestore()
    sessionStorage.clear()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.isEditMetaPage).toBe(false)
    expect(component.backNav).toBe(false)
    expect(component.requiredConfig).toEqual([])
  })

  it('tracks the course name published by the header service', () => {
    showCourseHeader$.next('Intro to Angular')

    expect(component.courseNameHeader).toBe('Intro to Angular')
  })

  it('clears a stale preview flag left over from the settings page', () => {
    sessionStorage.setItem('isSettingsPageFromPreview', '1')

    const c = build()

    expect(sessionStorage.getItem('isSettingsPageFromPreview')).toBeNull()
    expect(c.isEditMetaPage).toBe(false)
  })

  describe('ngOnInit', () => {
    it('trusts the instance app icon and takes the nav background', () => {
      component.ngOnInit()

      // bound straight to <img [src]>: Angular's URL sanitizer already allows this
      expect(component.appIcon).toBe('app.svg')
      expect(component.primaryNavbarBackground).toEqual({ color: 'primary' })
    })

    it('leaves the icon unset without an instance config', () => {
      configSvc.instanceConfig = null
      const c = build()

      c.ngOnInit()

      expect(c.appIcon).toBeNull()
      expect(c.primaryNavbarBackground).toBeNull()
    })

    it('shows the meta page when returning to the dashboard', () => {
      const c = build({ backToDashboard: true })

      c.ngOnInit()

      expect(c.isEditMetaPage).toBe(true)
    })

    it('still shows the meta page after next has been clicked', () => {
      const c = build({ backToDashboard: true, clickedNext: true })

      c.ngOnInit()

      expect(c.isEditMetaPage).toBe(true)
    })

    it('hides the meta page for a plain builder view', () => {
      component.ngOnInit()

      expect(component.isEditMetaPage).toBe(false)
    })

    it('clears the preview flag on init, then still honours the dashboard return', () => {
      const c = build({ backToDashboard: true })
      sessionStorage.setItem('isSettingsPageFromPreview', '1')

      c.ngOnInit()

      expect(sessionStorage.getItem('isSettingsPageFromPreview')).toBeNull()
      expect(c.isEditMetaPage).toBe(true)
    })

    it('clears the preview flag and stays on the builder without a dashboard return', () => {
      const c = build()
      sessionStorage.setItem('isSettingsPageFromPreview', '1')

      c.ngOnInit()

      expect(sessionStorage.getItem('isSettingsPageFromPreview')).toBeNull()
      expect(c.isEditMetaPage).toBe(false)
    })

    describe('edit-meta notifications', () => {
      beforeEach(() => component.ngOnInit())

      it('shows the meta page for a truthy message', () => {
        editMetaClicked$.next('anything')

        expect(component.isEditMetaPage).toBe(true)
      })

      it('hides the meta page for a falsy message', () => {
        editMetaClicked$.next(false)

        expect(component.isEditMetaPage).toBe(false)
      })

      it('hides the meta page on the settings step', () => {
        editMetaClicked$.next('isSettingsPage')

        expect(component.isEditMetaPage).toBe(false)
      })

      it('shows the meta page when coming back from settings', () => {
        editMetaClicked$.next('backFromSettings')

        expect(component.isEditMetaPage).toBe(true)
      })

      it('clears a preview flag instead of acting on the message', () => {
        sessionStorage.setItem('isSettingsPageFromPreview', '1')

        editMetaClicked$.next('backFromSettings')

        expect(sessionStorage.getItem('isSettingsPageFromPreview')).toBeNull()
        expect(component.isEditMetaPage).toBe(true)
      })
    })

    describe('action buttons', () => {
      const withButtons = (buttons: any[], roles: string[] = []) => {
        configSvc.userRoles = new Set(roles)
        const c = build({ buttonConfig: { buttons } })
        c.ngOnInit()
        return c
      }

      it('does nothing without a button config', () => {
        component.ngOnInit()

        expect(component.requiredConfig).toEqual([])
        expect(component.backNav).toBe(false)
      })

      it.each(['save', 'push'])('treats a plain %s button as a back navigation', event => {
        const c = withButtons([button({ event })])

        expect(c.backNav).toBe(true)
        expect(c.requiredConfig).toEqual([])
      })

      it('treats a saveAndNext button as a back navigation', () => {
        const c = withButtons([button({ title: 'saveAndNext', event: 'other' })])

        expect(c.backNav).toBe(true)
      })

      it('shows the review button to a reviewer', () => {
        const review = button({ title: 'Review' })
        const c = withButtons([review], ['content_reviewer'])

        expect(c.requiredConfig).toEqual([review])
        expect(c.backNav).toBe(false)
      })

      it('hides the review button from a non-reviewer', () => {
        const c = withButtons([button({ title: 'Review' })])

        expect(c.requiredConfig).toEqual([])
      })

      it('shows the publish button to a publisher', () => {
        const publish = button({ title: 'Publish' })
        const c = withButtons([publish], ['content_publisher'])

        expect(c.requiredConfig).toEqual([publish])
      })

      it('hides the publish button from a non-publisher', () => {
        const c = withButtons([button({ title: 'Publish' })])

        expect(c.requiredConfig).toEqual([])
      })

      it('ignores a button that is neither a save nor a workflow action', () => {
        const c = withButtons([button({ title: 'Cancel', event: 'cancel' })])

        expect(c.backNav).toBe(false)
        expect(c.requiredConfig).toEqual([])
      })
    })
  })

  describe('backNavLabel', () => {
    it('names the course details step from the builder', () => {
      expect(component.backNavLabel).toBe('Back to Course Details')
    })

    it('names the course builder step from settings', () => {
      sessionStorage.setItem('isSettingsPage', '1')

      expect(component.backNavLabel).toBe('Back to Course Builder')
    })

    it('names the dashboard from the self-assessment builder', () => {
      const c = build({ isSelfAssessment: true })

      expect(c.backNavLabel).toBe('Back to dashboard')
    })

    it('names the self-assessment builder from its settings step', () => {
      sessionStorage.setItem('isSettingsPage', '1')
      const c = build({ isSelfAssessment: true })

      expect(c.backNavLabel).toBe('Back to Self Assessment Builder')
    })
  })

  describe('backNavigation', () => {
    it('tells the editor the back button was pressed', () => {
      component.backNavigation()

      expect(initService.isBackButtonClickedAction).toHaveBeenCalledWith('backButtonClicked')
    })
  })

  describe('showCourseSettings', () => {
    it('asks the editor to open the root node', () => {
      const spy = jest.fn()
      component.subAction.subscribe(spy)

      component.showCourseSettings()

      expect(spy).toHaveBeenCalledWith({
        type: 'editContent',
        identifier: 'do_course',
        nodeClicked: true,
      })
    })
  })

  describe('ngOnDestroy', () => {
    it('stops listening for edit-meta notifications', () => {
      component.ngOnInit()
      component.ngOnDestroy()

      editMetaClicked$.next('backFromSettings')

      expect(component.isEditMetaPage).toBe(false)
    })

    it('is safe before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
