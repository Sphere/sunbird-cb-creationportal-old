import { BehaviorSubject } from 'rxjs'
import { REVIEW_ROLE, PUBLISH_ROLE, CREATE_ROLE, EXTERNAL_CONTENT_REVIEWER_LIVE } from '@ws/author/src/lib/constants/content-role'
import { AuthHomeComponent } from './home.component'

describe('AuthHomeComponent', () => {
  let component: AuthHomeComponent
  let valueSvc: any
  let accessService: any
  let router: any
  let isLtMedium$: BehaviorSubject<boolean>

  const config = (over: any = {}) => ({
    allowRedo: false,
    allowRestore: false,
    allowExpiry: false,
    allowReview: true,
    allowPublish: true,
    newDesign: false,
    ...over,
  })

  /** Drives hasRole so only the listed role arrays resolve true. */
  const grant = (...roles: string[][]) => {
    accessService.hasRole = jest.fn().mockImplementation((role: string[]) => roles.includes(role))
  }

  const build = () => new AuthHomeComponent(valueSvc, accessService, router)

  beforeEach(() => {
    isLtMedium$ = new BehaviorSubject<boolean>(false)
    valueSvc = { isLtMedium$ }
    accessService = {
      hasRole: jest.fn().mockReturnValue(false),
      authoringConfig: config(),
    }
    router = { navigate: jest.fn() }
    component = build()
  })

  it('should be created and wire up the media stream', () => {
    expect(component).toBeTruthy()
    expect(component.isLtMedium$).toBe(isLtMedium$)
  })

  describe('canShow', () => {
    it('checks the review role', () => {
      grant(REVIEW_ROLE)
      expect(component.canShow('review')).toBe(true)
      expect(accessService.hasRole).toHaveBeenCalledWith(REVIEW_ROLE)
    })

    it('checks the publish role', () => {
      grant(PUBLISH_ROLE)
      expect(component.canShow('publish')).toBe(true)
    })

    it('author is true for any of create, review or publish', () => {
      grant(REVIEW_ROLE)
      expect(component.canShow('author')).toBe(true)
    })

    it('author_create requires the create role', () => {
      grant(CREATE_ROLE)
      expect(component.canShow('author_create')).toBe(true)
      grant(PUBLISH_ROLE)
      expect(component.canShow('author_create')).toBe(false)
    })

    it('external_content_reviewer checks the live reviewer role', () => {
      grant(EXTERNAL_CONTENT_REVIEWER_LIVE)
      expect(component.canShow('external_content_reviewer')).toBe(true)
    })

    it('returns false for an unknown role', () => {
      expect(component.canShow('nonsense')).toBe(false)
    })
  })

  describe('ngOnInit', () => {
    it('applies the authoring config flags', () => {
      accessService.authoringConfig = config({ allowRedo: true, allowRestore: true, allowExpiry: true, newDesign: true })
      grant(PUBLISH_ROLE)
      component.ngOnInit()
      expect(component.allowRedo).toBe(true)
      expect(component.allowRestore).toBe(true)
      expect(component.allowExpiry).toBe(true)
      expect(component.isNewDesign).toBe(true)
    })

    it('tracks the responsive breakpoint from the stream', () => {
      grant(PUBLISH_ROLE)
      component.ngOnInit()
      expect(component.sideNavBarOpened).toBe(true)
      expect(component.screenSizeIsLtMedium).toBe(false)
      isLtMedium$.next(true)
      expect(component.sideNavBarOpened).toBe(false)
      expect(component.screenSizeIsLtMedium).toBe(true)
    })

    it('navigates a publisher to reviewed content', () => {
      grant(PUBLISH_ROLE)
      component.ngOnInit()
      expect(router.navigate).toHaveBeenCalledWith(['/author/my-content'], { queryParams: { status: 'reviewed' } })
    })

    it('navigates a creator to draft content', () => {
      accessService.authoringConfig = config({ allowPublish: false })
      grant(CREATE_ROLE)
      component.ngOnInit()
      expect(router.navigate).toHaveBeenCalledWith(['/author/my-content'], { queryParams: { status: 'draft' } })
    })

    it('navigates an external reviewer to external review', () => {
      accessService.authoringConfig = config({ allowPublish: false })
      grant(EXTERNAL_CONTENT_REVIEWER_LIVE)
      component.ngOnInit()
      expect(router.navigate).toHaveBeenCalledWith(['/author/my-content'], {
        queryParams: { status: 'externalCourseReview' },
      })
    })

    it('falls back to in-review content otherwise', () => {
      accessService.authoringConfig = config({ allowPublish: false, allowReview: false })
      accessService.hasRole = jest.fn().mockReturnValue(false)
      component.ngOnInit()
      expect(router.navigate).toHaveBeenCalledWith(['/author/my-content'], { queryParams: { status: 'inreview' } })
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes from the media stream', () => {
      grant(PUBLISH_ROLE)
      component.ngOnInit()
      component.ngOnDestroy()
      isLtMedium$.next(true)
      // subscription torn down: the last-known value is not applied
      expect(component.screenSizeIsLtMedium).toBe(false)
    })

    it('is safe to call without an active subscription', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
