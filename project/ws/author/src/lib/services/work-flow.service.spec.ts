// Stub the dependency modules so importing the service doesn't pull in the real
// (heavy) services — we inject hand-built stubs into the constructor anyway.
jest.mock('@ws/author/src/lib/modules/shared/services/access-control.service', () => ({
  AccessControlService: class {},
}))
jest.mock('@ws/author/src/lib/modules/shared/services/condition-check.service', () => ({
  ConditionCheckService: class {},
}))
jest.mock('@ws/author/src/lib/services/init.service', () => ({ AuthInitService: class {} }))

import { WorkFlowService } from './work-flow.service'

const OWNER_DETAILS = [
  { status: ['Draft', 'Live'], owner: 'creatorContacts', name: 'Creator', actionName: undefined },
  { status: ['InReview'], owner: 'trackContacts', name: 'Reviewer', actionName: 'Review' },
  { status: ['Reviewed'], owner: 'publisherDetails', name: 'Publisher', actionName: 'Publish' },
]

function make(opts: {
  workFlow?: string[]
  allowOptimised?: boolean
  conditionResult?: boolean
  userId?: string
} = {}) {
  const initStub: any = {
    workFlowTable: [{ conditions: {}, workFlow: opts.workFlow ?? ['Draft', 'InReview', 'Reviewed', 'Processing', 'Live'] }],
    optimizedWorkFlow: { allow: opts.allowOptimised ?? false, conditions: {} },
    ownerDetails: OWNER_DETAILS,
  }
  const conditionStub: any = { checkConditionV2: jest.fn().mockReturnValue(opts.conditionResult ?? true) }
  const accessStub: any = { userId: opts.userId ?? 'u1' }
  return new WorkFlowService(initStub, conditionStub, accessStub)
}

describe('WorkFlowService', () => {
  describe('owner lookups', () => {
    const svc = make()
    it('getOwner returns the owner field for a status', () => {
      expect(svc.getOwner('InReview')).toBe('trackContacts')
      expect(svc.getOwner('Reviewed')).toBe('publisherDetails')
    })
    it('getActionName returns the action label for a status', () => {
      expect(svc.getActionName('Reviewed')).toBe('Publish')
    })
    it('getOwnerName returns the human owner name', () => {
      expect(svc.getOwnerName('Draft')).toBe('Creator')
    })
  })

  describe('getWorkFlow', () => {
    it('returns the workflow of the first matching table entry', () => {
      const svc = make({ workFlow: ['Draft', 'InReview', 'Live'] })
      expect(svc.getWorkFlow({ status: 'Draft' } as any)).toEqual(['Draft', 'InReview', 'Live'])
    })
  })

  describe('isOptimised', () => {
    it('is true only when allowed AND the condition matches', () => {
      expect(make({ allowOptimised: true, conditionResult: true }).isOptimised({} as any)).toBe(true)
      expect(make({ allowOptimised: false, conditionResult: true }).isOptimised({} as any)).toBe(false)
      expect(make({ allowOptimised: true, conditionResult: false }).isOptimised({} as any)).toBe(false)
    })
  })

  describe('getNextStatus', () => {
    it('returns "Live" for a short (<= 3 step) workflow', () => {
      const svc = make({ workFlow: ['Draft', 'InReview', 'Live'] })
      expect(svc.getNextStatus({ status: 'Draft' } as any)).toBe('Live')
    })

    it('returns the literal next step when the workflow is not optimised', () => {
      const svc = make({ allowOptimised: false })
      expect(svc.getNextStatus({ status: 'Draft' } as any)).toBe('InReview')
      expect(svc.getNextStatus({ status: 'InReview' } as any)).toBe('Reviewed')
    })

    it('optimised: stops at the first stage the user does not own', () => {
      // From Draft (index 0 -> reset to 1 = InReview). User does not own InReview
      // (trackContacts empty), so it stops there.
      const svc = make({ allowOptimised: true, userId: 'u1' })
      expect(svc.getNextStatus({ status: 'Draft', trackContacts: [] } as any)).toBe('InReview')
    })

    it('optimised: skips a stage the user owns and advances to the next', () => {
      // User owns InReview (trackContacts), so it skips past it to Reviewed.
      const svc = make({ allowOptimised: true, userId: 'u1' })
      const content = { status: 'Draft', trackContacts: [{ id: 'u1' }], publisherDetails: [] }
      expect(svc.getNextStatus(content as any)).toBe('Reviewed')
    })
  })
})
