import { ConditionCheckService } from './condition-check.service'

describe('ConditionCheckService', () => {
  let service: ConditionCheckService

  beforeEach(() => (service = new ConditionCheckService()))

  it('is created', () => {
    expect(service).toBeTruthy()
  })

  describe('checkConditionV2', () => {
    it('returns true when no conditions are supplied', () => {
      expect(service.checkConditionV2({ status: 'Draft' } as any)).toBe(true)
    })

    it('passes a wildcard "fit" condition', () => {
      expect(service.checkConditionV2({ status: 'Draft' } as any, { fit: ['*'] } as any)).toBe(true)
    })

    it('matches a single "fit" condition on a field', () => {
      const conditions = { fit: [{ status: ['Draft', 'Live'] }] } as any
      expect(service.checkConditionV2({ status: 'Draft' } as any, conditions)).toBe(true)
      expect(service.checkConditionV2({ status: 'InReview' } as any, conditions)).toBe(false)
    })

    it('treats multiple "fit" entries as OR', () => {
      const conditions = { fit: [{ status: ['Draft'] }, { status: ['Live'] }] } as any
      expect(service.checkConditionV2({ status: 'Live' } as any, conditions)).toBe(true)
    })

    it('treats multiple keys within one entry as AND', () => {
      const conditions = { fit: [{ status: ['Draft'], contentType: ['Course'] }] } as any
      expect(service.checkConditionV2({ status: 'Draft', contentType: 'Course' } as any, conditions)).toBe(true)
      expect(service.checkConditionV2({ status: 'Draft', contentType: 'Resource' } as any, conditions)).toBe(false)
    })

    it('rejects content matching a "notFit" condition', () => {
      const conditions = { notFit: [{ status: ['Deleted'] }] } as any
      expect(service.checkConditionV2({ status: 'Deleted' } as any, conditions)).toBe(false)
      expect(service.checkConditionV2({ status: 'Draft' } as any, conditions)).toBe(true)
    })

    it('requires both: not in notFit AND in fit', () => {
      const conditions = { fit: [{ status: ['Draft', 'Live'] }], notFit: [{ status: ['Live'] }] } as any
      expect(service.checkConditionV2({ status: 'Draft' } as any, conditions)).toBe(true)
      // Live satisfies fit but is excluded by notFit
      expect(service.checkConditionV2({ status: 'Live' } as any, conditions)).toBe(false)
    })
  })

  describe('checkUniqueCondition', () => {
    it('short-circuits to true on a wildcard list', () => {
      expect(service.checkUniqueCondition({ status: 'Anything' } as any, ['*'] as any)).toBe(true)
    })

    it('returns false when no condition entry fully matches', () => {
      expect(service.checkUniqueCondition({ status: 'X' } as any, [{ status: ['Y'] }] as any)).toBe(false)
    })
  })
})
