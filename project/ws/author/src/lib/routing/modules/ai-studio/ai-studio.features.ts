/**
 * The AI Studio features, in one place.
 *
 * The id is the whole contract: it is the URL segment
 * (/author/my-content/ai-studio/contentStudio), the `?status=` value the
 * sidebar already uses, and the key the dashboard switches on. One list means a
 * new feature is added here and nowhere else — the ids used to be written out
 * again in the dashboard template, in the routing redirect and in my-content,
 * which is four copies free to drift apart.
 *
 * The roles live here for the same reason. Who may see a feature is a property
 * of the feature, so the menu, the route guard and the tabs all read the one
 * answer instead of each testing a role name of its own.
 */

/**
 * The roles, by the name the user service sends.
 *
 * Named constants rather than strings at the call sites: the value has to match
 * what the token carries exactly, and a typo in one of four copies fails open
 * or closed silently. ASSESTEMENT is spelled as the role is actually issued —
 * it is a wire value, not ours to correct.
 */
export const AI_STUDIO_ROLES = {
  /** Content Creation only. */
  content: 'AI_STUDIO_CONTENT',
  /** Assessment Creation only. */
  assessment: 'AI_STUDIO_ASSESTEMENT',
  /** Content Creation and Assessment Creation. */
  creator: 'AI_STUDIO_CREATOR',
  /** Everything, including Reports. */
  admin: 'AI_STUDIO_ADMIN',
} as const

/** Every AI Studio role. Used to tell "no role issued yet" from "not allowed". */
export const ALL_AI_STUDIO_ROLES: string[] = Object.values(AI_STUDIO_ROLES)

export interface AIStudioFeature {
  /** URL segment, ?status= value and dashboard key. */
  id: string
  /** What a person sees in the heading, the menu and the tabs. */
  label: string
  /**
   * SVG path data for the menu glyph.
   *
   * A path rather than an asset: it costs no request, takes `currentColor` so
   * it follows the active state by itself, and cannot 404.
   */
  icon: string
  /**
   * The roles that may open this feature. Any one of them is enough.
   *
   * Empty would mean "nobody", not "everybody" — a feature with no roles is a
   * feature no one can reach, which is the safe way for the field to be wrong.
   */
  roles: string[]
}

export const AI_STUDIO_FEATURES: AIStudioFeature[] = [
  {
    id: 'contentStudio',
    label: 'Content Creation',
    // A film camera — what this feature produces.
    icon: 'M23 7l-7 5 7 5V7z M14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z',
    roles: [AI_STUDIO_ROLES.content, AI_STUDIO_ROLES.creator, AI_STUDIO_ROLES.admin],
  },
  {
    id: 'assessment',
    label: 'Assessment Creation',
    // A checked box — a marked answer.
    icon: 'M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
    roles: [AI_STUDIO_ROLES.assessment, AI_STUDIO_ROLES.creator, AI_STUDIO_ROLES.admin],
  },
  {
    id: 'reports',
    label: 'Reports',
    // Three bars — the figures.
    icon: 'M18 20V10 M12 20V4 M6 20v-6',
    // Admin only. Reports carries spend and per-creator usage for the whole
    // org, which is not a creator's to see.
    roles: [AI_STUDIO_ROLES.admin],
  },
]

/** The feature a bare or unknown path lands on. */
export const AI_STUDIO_DEFAULT_FEATURE = AI_STUDIO_FEATURES[0].id

/** Whether a string names a feature. Used to reject an unknown URL segment. */
export function isAIStudioFeature(id: string | null | undefined): boolean {
  return !!id && AI_STUDIO_FEATURES.some(f => f.id === id)
}

/**
 * The features this user may open, in menu order.
 *
 * Takes the role test rather than a service, so the rule can be read and tested
 * without Angular and every caller — the menu, the guard, the tabs — gets the
 * same answer from the same function.
 *
 * A user holding NO AI Studio role at all keeps the whole list. The roles are
 * issued by the user service, and until they are, gating on them would hide the
 * feature from everyone who has it today. Once any AI Studio role is present,
 * the roles decide and the fallback is not consulted — so provisioning a single
 * user switches gating on for that user and nobody else.
 */
export function aiStudioFeaturesFor(hasRole: (roles: string[]) => boolean): AIStudioFeature[] {
  const holds = eitherCase(hasRole)
  if (!holds(ALL_AI_STUDIO_ROLES)) {
    return AI_STUDIO_FEATURES
  }
  return AI_STUDIO_FEATURES.filter(f => holds(f.roles))
}

/** Whether the user holds any AI Studio role, i.e. whether the roles decide. */
export function hasAnyAIStudioRole(hasRole: (roles: string[]) => boolean): boolean {
  return eitherCase(hasRole)(ALL_AI_STUDIO_ROLES)
}

/**
 * Asks the role test in the casing the role is provisioned in AND the casing
 * the portal stores it in.
 *
 * init.service lowercases every role as it loads the profile, and
 * AccessControlService then does an exact Set.has() — so asking for
 * 'AI_STUDIO_ADMIN' never matches, however the role is spelled in Keycloak.
 * Nobody hit this before because every existing role name is already lowercase.
 *
 * Asking for both lets the names above stay as they are actually issued, which
 * is what an administrator types, and means a deployment that stops lowercasing
 * does not silently lock everyone out instead.
 */
function eitherCase(hasRole: (roles: string[]) => boolean) {
  return (roles: string[]) => hasRole([...roles, ...roles.map(r => r.toLowerCase())])
}
