import { AI_STUDIO_FEATURES, AI_STUDIO_ROLES, ALL_AI_STUDIO_ROLES, aiStudioFeaturesFor, hasAnyAIStudioRole } from './ai-studio.features'

/**
 * The role test as AccessControlService implements it: true if the user holds
 * ANY of the roles asked about. Built from a set so a test reads as "this is
 * who the user is" rather than as a list of expected questions.
 */
const userWith =
  (...held: string[]) =>
  (asked: string[]) =>
    asked.some(r => held.includes(r))

const idsFor = (...held: string[]) => aiStudioFeaturesFor(userWith(...held)).map(f => f.id)

describe('AI Studio feature roles', () => {
  it('gives AI_STUDIO_CONTENT content creation only', () => {
    expect(idsFor(AI_STUDIO_ROLES.content)).toEqual(['contentStudio'])
  })

  it('gives AI_STUDIO_ASSESTEMENT assessment only', () => {
    expect(idsFor(AI_STUDIO_ROLES.assessment)).toEqual(['assessment'])
  })

  it('gives AI_STUDIO_CREATOR content creation and assessment, but not reports', () => {
    expect(idsFor(AI_STUDIO_ROLES.creator)).toEqual(['contentStudio', 'assessment'])
  })

  it('gives AI_STUDIO_ADMIN all three, including reports', () => {
    expect(idsFor(AI_STUDIO_ROLES.admin)).toEqual(['contentStudio', 'assessment', 'reports'])
  })

  it('keeps reports away from every role but admin', () => {
    const reports = AI_STUDIO_FEATURES.find(f => f.id === 'reports')
    expect(reports!.roles).toEqual([AI_STUDIO_ROLES.admin])
    expect(idsFor(AI_STUDIO_ROLES.content)).not.toContain('reports')
    expect(idsFor(AI_STUDIO_ROLES.assessment)).not.toContain('reports')
    expect(idsFor(AI_STUDIO_ROLES.creator)).not.toContain('reports')
  })

  it('unions the features when a user holds more than one role', () => {
    expect(idsFor(AI_STUDIO_ROLES.content, AI_STUDIO_ROLES.assessment)).toEqual(['contentStudio', 'assessment'])
  })

  it('keeps the menu order of the catalogue rather than the order of the roles', () => {
    expect(idsFor(AI_STUDIO_ROLES.assessment, AI_STUDIO_ROLES.content)).toEqual(['contentStudio', 'assessment'])
  })

  /**
   * The roles ARE the grant. content_creator lets somebody author a course,
   * which is a different thing from generating one; it never implied AI Studio
   * and must not open it.
   *
   * This returned the whole list while the roles were still unissued, so that
   * turning gating on did not take the feature from everyone at once.
   */
  it('gives a user with no AI Studio role nothing at all', () => {
    expect(idsFor()).toEqual([])
    expect(idsFor('content_creator', 'admin', 'editor')).toEqual([])
  })

  it('stops falling back the moment any AI Studio role is present', () => {
    expect(hasAnyAIStudioRole(userWith())).toBe(false)
    expect(hasAnyAIStudioRole(userWith('content_creator'))).toBe(false)
    ALL_AI_STUDIO_ROLES.forEach(role => {
      expect(hasAnyAIStudioRole(userWith(role))).toBe(true)
    })
  })

  it('names every role in ALL_AI_STUDIO_ROLES, so the fallback test is complete', () => {
    const declared = new Set(AI_STUDIO_FEATURES.flatMap(f => f.roles))
    declared.forEach(role => expect(ALL_AI_STUDIO_ROLES).toContain(role))
  })

  /**
   * The portal lowercases every role as it loads the profile
   * (init.service: `new Set((details.roles || []).map(v => v.toLowerCase()))`)
   * and AccessControlService then does an exact Set.has(). So the roles reach
   * us lowercased however they are spelled in Keycloak, and matching on the
   * declared casing alone silently grants nobody anything.
   */
  describe('the casing the portal actually stores roles in', () => {
    /** hasRole over a role set built the way init.service builds it. */
    const asStored = (...issued: string[]) => {
      const stored = new Set(issued.map(r => r.toLowerCase()))
      return (asked: string[]) => asked.some(r => stored.has(r))
    }

    it('matches a role that arrived lowercased', () => {
      expect(hasAnyAIStudioRole(asStored('AI_STUDIO_ADMIN'))).toBe(true)
      expect(aiStudioFeaturesFor(asStored('AI_STUDIO_ADMIN')).map(f => f.id)).toEqual(['contentStudio', 'assessment', 'reports'])
    })

    it('gates the narrow roles correctly once lowercased', () => {
      expect(aiStudioFeaturesFor(asStored('AI_STUDIO_CREATOR')).map(f => f.id)).toEqual(['contentStudio', 'assessment'])
      expect(aiStudioFeaturesFor(asStored('AI_STUDIO_ASSESTEMENT')).map(f => f.id)).toEqual(['assessment'])
    })

    it('still gives nothing to a user with no AI Studio role at all', () => {
      expect(hasAnyAIStudioRole(asStored('content_creator'))).toBe(false)
      expect(aiStudioFeaturesFor(asStored('content_creator')).map(f => f.id)).toEqual([])
    })

    it('matches whichever casing the role is issued in', () => {
      const exact =
        (...held: string[]) =>
        (asked: string[]) =>
          asked.some(r => held.includes(r))
      expect(hasAnyAIStudioRole(exact('AI_STUDIO_ADMIN'))).toBe(true)
      expect(hasAnyAIStudioRole(exact('ai_studio_admin'))).toBe(true)
    })
  })

  it('gives every feature at least one role, so none is unreachable by accident', () => {
    AI_STUDIO_FEATURES.forEach(f => expect(f.roles.length).toBeGreaterThan(0))
  })
})
