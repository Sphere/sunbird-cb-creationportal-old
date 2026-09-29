import { of } from 'rxjs'
import { MyContentComponent } from './my-content.component'
import { AI_STUDIO_ROLES } from '../../../ai-studio/ai-studio.features'

/**
 * The AI Studio role gating, and — the larger half of this file — proof that it
 * leaves every other role exactly where it was.
 *
 * The AI Studio roles are not issued by the user service yet, so the rule is
 * written to be inert until they are: no AI Studio role means the screen behaves
 * as it did before any of this existed. That is a promise about people who are
 * using the portal today, so it is tested rather than asserted.
 */
describe('MyContentComponent (AI Studio roles)', () => {
  let router: { navigate: jest.Mock; navigateByUrl: jest.Mock }

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  /**
   * Builds the component for a user holding exactly `roles`, arriving on
   * `status`. Both role seams are driven from the one set: canShow() reads
   * configService.userRoles and the AI Studio rule reads accessService.hasRole,
   * and a test where those two disagree would be testing nothing real.
   */
  const initWith = (roles: string[], status?: string) => {
    const userRoles = new Set(roles)
    router = { navigate: jest.fn(), navigateByUrl: jest.fn() }
    const component = new MyContentComponent(
      {
        getSearchBody: jest.fn().mockReturnValue({ filters: [{ andFilters: [{}] }] }),
        fetchFromSearchV6: jest.fn().mockReturnValue(of({ content: [], count: 0, facets: [] })),
        fetchContent: jest.fn().mockReturnValue(of({ result: { content: [], count: 0 } })),
      } as any,
      { queryParams: of({ status }) } as any,
      router as any,
      { changeLoad: { next: jest.fn() } } as any,
      {
        userId: 'user-1',
        hasRole: jest.fn((asked: string[]) => asked.some(r => userRoles.has(r))),
        authoringConfig: {
          newDesign: true,
          allowRedo: true,
          allowRestore: true,
          allowExpiry: true,
          allowReview: true,
          allowPublish: true,
        },
      } as any,
      { openFromComponent: jest.fn() } as any,
      { open: jest.fn().mockReturnValue({ afterClosed: () => of(true) }) } as any,
      { ordinals: { subTitles: [{ name: 'English', value: 'en' }] } } as any,
      { unMappedUser: { roles }, userRoles, userProfile: { userId: 'user-1' } } as any,
      {
        languageList: jest.fn().mockReturnValue(of([{ name: 'English', value: 'en' }])),
        sourceNames: jest.fn().mockReturnValue(of(['SourceA'])),
        getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })),
      } as any,
      {
        getFilters: jest.fn().mockReturnValue([]),
        getSourceName: jest.fn().mockReturnValue(''),
        getLanguage: jest.fn().mockReturnValue(''),
        setFilters: jest.fn(),
        setSourceName: jest.fn(),
        setLanguage: jest.fn(),
        clearFilters: jest.fn(),
      } as any,
      { detectChanges: jest.fn() } as any,
    )
    component.pagination = { offset: 0, limit: 24 }
    jest.spyOn(component, 'fetchContent').mockImplementation(() => undefined)
    component.ngOnInit()
    return component
  }

  /** The status the component redirected a bare URL to, or null if it stayed put. */
  const landedOn = () => {
    const call = router.navigate.mock.calls.find(c => c[0]?.[0] === '/author/my-content' && c[1]?.queryParams?.status)
    return call ? call[1].queryParams.status : null
  }

  const menuIds = (c: MyContentComponent) => c.aiStudioFeatures.map(f => f.id)

  // ---- the promise: nobody else moves -------------------------------------

  describe('roles that are in use today', () => {
    it('still sends a reviewer to the review queue', () => {
      initWith(['content_reviewer'])
      expect(landedOn()).toBe('inreview')
    })

    it('still sends a publisher to the courses-to-publish queue', () => {
      initWith(['content_publisher'])
      expect(landedOn()).toBe('reviewed')
    })

    it('still leaves a creator on Draft', () => {
      initWith(['content_creator'])
      expect(landedOn()).toBeNull()
    })

    it('still remaps a reviewer arriving on the self-assessment draft tab', () => {
      initWith(['content_reviewer'], 'selfAssessmentDraft')
      expect(landedOn()).toBe('selfSentForReview')
    })

    it('hides the AI Studio menu from a plain content creator', () => {
      // Authoring a course and generating one are different grants. This showed
      // the whole menu while the AI Studio roles were still unissued.
      const component = initWith(['content_creator'])
      expect(component.showAiStudio).toBe(false)
      expect(menuIds(component)).toEqual([])
    })

    it('still hides the AI Studio menu from a reviewer who cannot create', () => {
      expect(initWith(['content_reviewer']).showAiStudio).toBe(false)
    })

    it('treats a user with no AI Studio role as holding none of the new rules', () => {
      expect(initWith(['content_creator']).hasAiStudioRole).toBe(false)
    })
  })

  // ---- AI Studio alongside the existing CBP roles --------------------------
  //
  // The roles are additive: someone can be a creator AND an AI Studio admin, or
  // hold every feature in the portal. Adding AI Studio must not take anything
  // away from what they could already do, or move where they land.

  describe('a user who holds AI Studio AND the old authoring roles', () => {
    it('keeps a content creator on Draft, not on an AI Studio feature', () => {
      initWith(['content_creator', AI_STUDIO_ROLES.admin])
      expect(landedOn()).toBeNull()
    })

    it('keeps a reviewer on the review queue', () => {
      initWith(['content_reviewer', AI_STUDIO_ROLES.admin])
      expect(landedOn()).toBe('inreview')
    })

    it('keeps a publisher on the publish queue', () => {
      initWith(['content_publisher', AI_STUDIO_ROLES.creator])
      expect(landedOn()).toBe('reviewed')
    })

    it('lands a user with every CBP role on Draft, exactly as before', () => {
      initWith(['content_creator', 'content_reviewer', 'content_publisher', AI_STUDIO_ROLES.admin])
      expect(landedOn()).toBeNull()
    })

    it('still gives a user with every role the whole AI Studio menu', () => {
      const component = initWith(['content_creator', 'content_reviewer', 'content_publisher', AI_STUDIO_ROLES.admin])
      expect(menuIds(component)).toEqual(['contentStudio', 'assessment', 'reports'])
      expect(component.showAiStudio).toBe(true)
    })

    it('narrows the menu to the AI Studio role even for a full content creator', () => {
      // The AI Studio role decides AI Studio. content_creator governs the
      // course tabs and does not widen the AI menu back out.
      const component = initWith(['content_creator', AI_STUDIO_ROLES.content])
      expect(menuIds(component)).toEqual(['contentStudio'])
    })

    it('leaves the old content creation tabs reachable for such a user', () => {
      const component = initWith(['content_creator', AI_STUDIO_ROLES.content], 'draft')
      expect(component.isAiStudio).toBe(false)
      expect(component.allowAuthorContentCreate).toBe(true)
    })
  })

  // ---- the new rule --------------------------------------------------------

  describe('the AI Studio roles', () => {
    it('shows an assessment-only user just that one feature', () => {
      const component = initWith([AI_STUDIO_ROLES.assessment])
      expect(menuIds(component)).toEqual(['assessment'])
      expect(component.showAiStudio).toBe(true)
    })

    it('shows a creator content and assessment, and keeps Reports out', () => {
      expect(menuIds(initWith([AI_STUDIO_ROLES.creator]))).toEqual(['contentStudio', 'assessment'])
    })

    it('shows an admin all three', () => {
      expect(menuIds(initWith([AI_STUDIO_ROLES.admin]))).toEqual(['contentStudio', 'assessment', 'reports'])
    })

    it('opens the menu for an AI Studio role even without author_create', () => {
      expect(initWith([AI_STUDIO_ROLES.content]).showAiStudio).toBe(true)
    })

    /**
     * The combination that shipped an empty sidebar: the AI Studio panel lived
     * inside the accordion gated on allowAuthor, which is
     * content_creator/reviewer/publisher. Someone whose only grant is an AI
     * Studio role holds none of those, so the menu existed and nothing drew it.
     * The panel now has its own accordion; this pins the state that exposed it.
     */
    it('shows the menu to a user who has an AI Studio role and no authoring role', () => {
      const component = initWith([AI_STUDIO_ROLES.admin])
      expect(component.allowAuthor).toBe(false)
      expect(component.allowAuthorContentCreate).toBe(false)
      expect(component.showAiStudio).toBe(true)
    })

    it('lands an AI Studio user on their feature rather than a review queue', () => {
      initWith([AI_STUDIO_ROLES.content])
      expect(landedOn()).toBe('contentStudio')
    })

    it('lands an assessment-only user on assessment, not on content creation', () => {
      initWith([AI_STUDIO_ROLES.assessment])
      expect(landedOn()).toBe('assessment')
    })

    it('sends a link to a feature the user may not open to one they can', () => {
      const component = initWith([AI_STUDIO_ROLES.assessment], 'reports')
      expect(component.aiStudioFeature).toBe('assessment')
    })

    it('keeps a permitted feature exactly as linked', () => {
      const component = initWith([AI_STUDIO_ROLES.admin], 'reports')
      expect(component.aiStudioFeature).toBe('reports')
    })

    it('still resolves the legacy AIHub link, to a feature the user may open', () => {
      const component = initWith([AI_STUDIO_ROLES.assessment], 'AIHub')
      expect(component.aiStudioFeature).toBe('assessment')
    })
  })
})
