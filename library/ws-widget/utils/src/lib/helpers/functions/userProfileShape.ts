/**
 * Normalisers for the two shapes of Sunbird's user-read response.
 *
 * `/apis/proxies/v8/api/user/v2/read` does not return the same document on old Sunbird and
 * on Sunbird Spark, and the differences are silent -- fields are absent rather than empty,
 * so code reading them gets `undefined` instead of an error and the failure surfaces
 * somewhere unrelated. Both differences are handled here so call sites need not know.
 *
 * Verified against a live Spark environment (2026-08-24) and against the equivalent fix in
 * the sibling learner portal (Sphere/eagle-fusion, commits ba3932dab and 5b0fae7da).
 *
 * The parameters are `unknown` rather than `any` because this is an unvalidated API
 * document: every field is narrowed before use, so a malformed response yields an empty
 * result instead of a thrown TypeError deep inside a caller.
 */

/** Fields read off the profile. Everything is `unknown` -- the response is untrusted. */
interface ProfileLike {
  roles?: unknown
  organisations?: unknown
  userId?: unknown
  id?: unknown
  identifier?: unknown
}

function asObject(value: unknown): ProfileLike | undefined {
  return typeof value === 'object' && value !== null ? (value as ProfileLike) : undefined
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * A single role entry, which is either a plain name (old Sunbird, and
 * `organisations[].roles` on Spark) or a role record `{ role, scope, ... }` (Spark's V5
 * read). Returns undefined for anything else so it can be filtered out.
 */
function roleName(entry: unknown): string | undefined {
  if (typeof entry === 'string') {
    return entry.length > 0 ? entry : undefined
  }
  if (typeof entry === 'object' && entry !== null) {
    const role = (entry as { role?: unknown }).role
    if (typeof role === 'string' && role.length > 0) {
      return role
    }
  }
  return undefined
}

/**
 * The role names for a user, from wherever this Sunbird version puts them.
 *
 * Old Sunbird flattened roles into a top-level `roles` array of plain strings. Sunbird
 * Spark's V3 read leaves that array empty (or omits it) and nests the real roles under
 * `organisations[].roles`; Spark's V5 read does populate the top level, but with raw role
 * records rather than names.
 *
 * So: prefer the top-level array when it yields usable names, else flatten the
 * per-organisation lists. Roles are de-duplicated, because a user belonging to two
 * organisations commonly holds the same role in both.
 *
 * Returns `[]` for a missing or unrecognised profile rather than throwing. The caller
 * decides what "no roles" means -- previously a null `roles` made a spread throw, which
 * reached the user as a bare "INVALID USER" page with no diagnosis.
 */
export function getRolesFromProfile(userPidProfile: unknown): string[] {
  const profile = asObject(userPidProfile)

  const topLevel = asArray(profile && profile.roles)
    .map(roleName)
    .filter((role): role is string => role !== undefined)
  if (topLevel.length > 0) {
    return topLevel
  }

  const roles = new Set<string>()
  asArray(profile && profile.organisations).forEach(org => {
    const orgRecord = asObject(org)
    asArray(orgRecord && orgRecord.roles).forEach(entry => {
      const name = roleName(entry)
      if (name !== undefined) {
        roles.add(name)
      }
    })
  })
  return Array.from(roles)
}

/**
 * The user's id, from whichever field this Sunbird version provides.
 *
 * Old Sunbird carried a top-level `userId` redundantly alongside `id` and `identifier`.
 * Sunbird Spark never sets `userId` for any read version, so anything reading it directly
 * silently became `undefined` -- worse than failing, because `undefined` stringifies to the
 * literal text "undefined" and then travels on through storage and API payloads looking
 * like data.
 *
 * `userId` is still preferred first, so behaviour on old Sunbird is unchanged.
 */
export function getUserIdFromProfile(userPidProfile: unknown): string | undefined {
  const profile = asObject(userPidProfile)
  if (!profile) {
    return undefined
  }
  const candidates = [profile.userId, profile.id, profile.identifier]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate
    }
  }
  return undefined
}
