import { hasPermissions, hasUnitPermission } from './widget-resolver.permissions'

describe('widget-resolver.permissions', () => {
  describe('hasUnitPermission', () => {
    it('returns true when no permission is required (undefined/null/empty)', () => {
      expect(hasUnitPermission(undefined)).toBe(true)
      expect(hasUnitPermission(null as any)).toBe(true)
      expect(hasUnitPermission('')).toBe(true)
      expect(hasUnitPermission([])).toBe(true)
    })

    it('matches a required string array against a Set (all present)', () => {
      expect(hasUnitPermission(['a', 'b'], new Set(['a', 'b', 'c']))).toBe(true)
    })

    it('fails when not all of a required string array are present', () => {
      expect(hasUnitPermission(['a', 'z'], new Set(['a', 'b']))).toBe(false)
    })

    it('accepts matchAgainst as a string array', () => {
      expect(hasUnitPermission(['a'], ['a', 'b'])).toBe(true)
    })

    it('accepts matchAgainst as a single string', () => {
      expect(hasUnitPermission(['a'], 'a')).toBe(true)
      expect(hasUnitPermission(['a'], 'b')).toBe(false)
    })

    it('treats null/undefined matchAgainst as an empty Set', () => {
      expect(hasUnitPermission(['a'], null)).toBe(false)
      expect(hasUnitPermission(['a'], undefined)).toBe(false)
    })

    it('handles the object form with all/some/none', () => {
      const perm: any = { all: ['a', 'b'], some: ['c', 'z'], none: ['x'] }
      expect(hasUnitPermission(perm, new Set(['a', 'b', 'c']))).toBe(true)
    })

    it('object form fails when a "none" value is present', () => {
      const perm: any = { all: ['a'], some: null, none: ['x'] }
      expect(hasUnitPermission(perm, new Set(['a', 'x']))).toBe(false)
    })

    it('object form with only "some" — passes when at least one present', () => {
      const perm: any = { some: ['a', 'z'] }
      expect(hasUnitPermission(perm, new Set(['a']))).toBe(true)
      expect(hasUnitPermission(perm, new Set(['y']))).toBe(false)
    })

    it('object form with a required string primitive on "all"', () => {
      const perm: any = { all: 'admin' }
      expect(hasUnitPermission(perm, new Set(['admin']))).toBe(true)
      expect(hasUnitPermission(perm, new Set(['user']))).toBe(false)
    })

    it('applies isRestrictive (flip) for a single string', () => {
      const perm: any = { all: 'blocked' }
      // restrictive: presence flips the boolean, so having it => false
      expect(hasUnitPermission(perm, new Set(['blocked']), true)).toBe(false)
      expect(hasUnitPermission(perm, new Set(['ok']), true)).toBe(true)
    })

    it('returns false for a non-object, non-null primitive number path', () => {
      // A required permission that is a truthy non-string/array/object slips to the final return false
      expect(hasUnitPermission(5 as any, new Set(['a']))).toBe(false)
    })
  })

  describe('hasPermissions', () => {
    it('returns true when no requiredPermission is supplied', () => {
      expect(hasPermissions(undefined)).toBe(true)
    })

    it('returns false when not available or not enabled', () => {
      expect(hasPermissions({ available: false, enabled: true } as any)).toBe(false)
      expect(hasPermissions({ available: true, enabled: false } as any)).toBe(false)
    })

    it('checks roles, groups and restricted features together', () => {
      const perm: any = {
        available: true,
        enabled: true,
        roles: ['author'],
        groups: ['g1'],
        features: ['banned'],
      }
      // has role + group, does NOT have the restricted feature => allowed
      expect(hasPermissions(perm, new Set(['author']), new Set(['g1']), new Set())).toBe(true)
      // has the restricted feature => blocked
      expect(hasPermissions(perm, new Set(['author']), new Set(['g1']), new Set(['banned']))).toBe(false)
    })

    it('fails when a required role is missing', () => {
      const perm: any = { available: true, enabled: true, roles: ['author'] }
      expect(hasPermissions(perm, new Set(['viewer']))).toBe(false)
    })

    it('passes when only enabled/available with no role/group/feature constraints', () => {
      const perm: any = { available: true, enabled: true }
      expect(hasPermissions(perm)).toBe(true)
    })
  })
})
