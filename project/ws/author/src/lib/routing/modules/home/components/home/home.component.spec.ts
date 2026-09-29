import { BehaviorSubject } from 'rxjs'
import { REVIEW_ROLE, PUBLISH_ROLE, CREATE_ROLE, EXTERNAL_CONTENT_REVIEWER_LIVE } from '@ws/author/src/lib/constants/content-role'
import { AuthHomeComponent } from './home.component'
import { AI_STUDIO_ROLES } from '../../../ai-studio/ai-studio.features'

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

  /**
   * The landing page for the AI Studio roles, and — the point of most of these
   * — proof that adding it moves nobody who already had a landing page.
   *
   * The catch-all this sits in front of never tested allowReview: it sent
   * ANYONE who was not a publisher, creator or external reviewer to the review
   * queue. That is what an AI Studio user was hitting.
   */
  describe('the AI Studio landing', () => {
    /** hasRole by membership, the way AccessControlService actually resolves it. */
    const holding = (...names: string[]) => {
      accessService.hasRole = jest.fn((asked: string[]) => asked.some(r => names.includes(r)))
    }
    const landedOn = () => router.navigate.mock.calls[0][1].queryParams.status

    it('opens AI Studio for a user whose only grant is an AI Studio role', () => {
      accessService.authoringConfig = config({ allowPublish: false })
      holding(AI_STUDIO_ROLES.admin)
      component.ngOnInit()
      expect(landedOn()).toBe('contentStudio')
    })

    it('opens assessment for an assessment-only user, not content creation', () => {
      accessService.authoringConfig = config({ allowPublish: false })
      holding(AI_STUDIO_ROLES.assessment)
      component.ngOnInit()
      expect(landedOn()).toBe('assessment')
    })

    it('still sends a publisher to reviewed, AI Studio role or not', () => {
      holding('content_publisher', AI_STUDIO_ROLES.admin)
      component.ngOnInit()
      expect(landedOn()).toBe('reviewed')
    })

    it('still sends a creator to draft, AI Studio role or not', () => {
      accessService.authoringConfig = config({ allowPublish: false })
      holding('content_creator', AI_STUDIO_ROLES.admin)
      component.ngOnInit()
      expect(landedOn()).toBe('draft')
    })

    it('still sends an external reviewer to external review', () => {
      accessService.authoringConfig = config({ allowPublish: false })
      holding('external_content_reviewer_live', AI_STUDIO_ROLES.creator)
      component.ngOnInit()
      expect(landedOn()).toBe('externalCourseReview')
    })

    it('still sends a user with every CBP role to reviewed', () => {
      holding('content_creator', 'content_reviewer', 'content_publisher', AI_STUDIO_ROLES.admin)
      component.ngOnInit()
      expect(landedOn()).toBe('reviewed')
    })

    it('leaves the in-review catch-all in place for a reviewer with no AI role', () => {
      accessService.authoringConfig = config({ allowPublish: false })
      holding('content_reviewer')
      component.ngOnInit()
      expect(landedOn()).toBe('inreview')
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
