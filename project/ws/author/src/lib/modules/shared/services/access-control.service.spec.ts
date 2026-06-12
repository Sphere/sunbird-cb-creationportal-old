// The service only uses ConfigurationsService/NsInstanceConfig as types, so stub the
// heavy @ws-widget/utils barrel to keep this a fast, isolated unit test.
jest.mock('@ws-widget/utils', () => ({ ConfigurationsService: class {} }))

import { AccessControlService } from './access-control.service'

describe('AccessControlService', () => {
  function make(userRoles: string[] = []): AccessControlService {
    const configStub = {
      userRoles: new Set(userRoles),
      userProfile: { userId: 'u1', userName: 'User One' },
    } as any
    return new AccessControlService(configStub, '/en/')
  }

  describe('hasRole', () => {
    it('is true when the user has any of the requested roles', () => {
      const svc = make(['content_creator', 'editor'])
      expect(svc.hasRole(['content_creator'])).toBe(true)
      expect(svc.hasRole(['admin', 'editor'])).toBe(true)
    })

    it('is false when the user has none of the requested roles', () => {
      const svc = make(['content_creator'])
      expect(svc.hasRole(['content_reviewer', 'content_publisher'])).toBe(false)
    })

    it('is false when the user has no roles at all', () => {
      const svc = make([])
      expect(svc.hasRole(['content_creator'])).toBe(false)
    })
  })

  describe('getAction', () => {
    let svc: AccessControlService
    beforeEach(() => (svc = make()))

    it('maps Draft/Live to "submitted"', () => {
      expect(svc.getAction('Draft')).toBe('submitted')
      expect(svc.getAction('Live')).toBe('submitted')
    })

    it('maps InReview to approve/reject based on the operation flag', () => {
      expect(svc.getAction('InReview', 1)).toBe('reviewerApproved')
      expect(svc.getAction('InReview', 0)).toBe('reviewerRejected')
    })

    it('maps Reviewed to publisher approve/reject', () => {
      expect(svc.getAction('Reviewed', 1)).toBe('publisherApproved')
      expect(svc.getAction('Reviewed', 0)).toBe('publisherRejected')
    })

    it('maps QualityReview to quality approve/reject', () => {
      expect(svc.getAction('QualityReview', 1)).toBe('qualityApproved')
      expect(svc.getAction('QualityReview', 0)).toBe('qualityRejected')
    })

    it('falls back to "submitted" for unknown statuses', () => {
      expect(svc.getAction('Processing')).toBe('submitted')
    })
  })

  describe('getCategory', () => {
    let svc: AccessControlService
    beforeEach(() => (svc = make()))

    it('prefers category over contentType', () => {
      expect(svc.getCategory({ category: 'Course', contentType: 'Resource' } as any)).toBe('Course')
    })

    it('falls back to contentType for legacy content with no category', () => {
      expect(svc.getCategory({ contentType: 'Resource' } as any)).toBe('Resource')
    })
  })

  describe('getCategoryType', () => {
    let svc: AccessControlService
    beforeEach(() => (svc = make()))

    it('returns the explicit categoryType when present', () => {
      expect(svc.getCategoryType({ category: 'Course', categoryType: 'Curated Program' } as any)).toBe(
        'Curated Program',
      )
    })

    it('derives a default per category when categoryType is absent', () => {
      expect(svc.getCategoryType({ category: 'Course' } as any)).toBe('Course')
      expect(svc.getCategoryType({ category: 'Collection' } as any)).toBe('Module')
      expect(svc.getCategoryType({ category: 'Learning Path' } as any)).toBe('Program')
    })

    it('uses resourceType for a Resource with no categoryType', () => {
      expect(svc.getCategoryType({ category: 'Resource', resourceType: 'Video' } as any)).toBe('Video')
    })
  })
})
