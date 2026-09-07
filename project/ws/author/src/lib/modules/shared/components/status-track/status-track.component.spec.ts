import { StatusTrackComponent } from './status-track.component'

// Direct-instantiation spec (house convention): the component depends on the access-control,
// auth-init and workflow services plus a MatDialog ref — build it with jest.fn() stubs and
// exercise ngOnInit and the pure helpers directly.
describe('StatusTrackComponent', () => {
  let accessSvc: any
  let initService: any
  let dialogRef: any
  let workFlowService: any

  const ownerDetails = [
    { status: ['Draft'], relatedActions: ['created'], name: 'Creator', owner: 'creators' },
    { status: ['InReview'], relatedActions: ['approved', 'rejected'], name: 'Reviewer', owner: 'reviewers' },
    { status: ['Reviewed'], relatedActions: ['published'], name: 'Publisher', owner: 'publishers' },
  ]

  const build = (data: any = null) => new StatusTrackComponent(accessSvc, initService, dialogRef, data, workFlowService)

  beforeEach(() => {
    accessSvc = {
      rootOrg: 'aastrika',
      convertToISODate: jest.fn((d: string) => new Date(d)),
    }
    initService = { ownerDetails }
    dialogRef = { close: jest.fn() }
    workFlowService = {
      getWorkFlow: jest.fn().mockReturnValue(['Draft', 'InReview', 'Reviewed', 'Live']),
      getOwner: jest.fn().mockReturnValue(null),
    }
  })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit - client flag', () => {
    it('sets isClient1 true when the root org is client1 (case-insensitive)', () => {
      accessSvc.rootOrg = 'Client1'
      const component = build()
      component.content = { status: 'Draft', comments: [] } as any
      component.ngOnInit()
      expect(component.isClient1).toBe(true)
    })

    it('leaves isClient1 false for other orgs', () => {
      const component = build()
      component.content = { status: 'Draft', comments: [] } as any
      component.ngOnInit()
      expect(component.isClient1).toBe(false)
    })
  })

  describe('ngOnInit - MAT_DIALOG_DATA', () => {
    it('adopts the injected dialog data as content', () => {
      const data = { status: 'Draft', comments: [] } as any
      const component = build(data)
      component.ngOnInit()
      expect(component.content).toBe(data)
    })
  })

  describe('ngOnInit - history and workflow log', () => {
    it('reverses comment history and builds a loggable workflow log', () => {
      const component = build()
      component.content = {
        status: 'InReview',
        comments: [
          { action: 'created', name: 'Alice', date: '2024-01-01', comment: 'drafted' },
          { action: 'approved', name: 'Bob', date: '2024-01-02', comment: 'looks good' },
        ],
      } as any
      component.ngOnInit()
      // reversed: newest (approved) first
      expect(component.history[0].name).toBe('Bob')
      // both actions are loggable (present in ownerDetails.relatedActions)
      expect(component.workFlowLog.length).toBe(2)
      const approvedLog = component.workFlowLog.find(l => l.name === 'Bob')
      expect(approvedLog!.action).toBe('approved')
      expect(approvedLog!.owner).toBe('Reviewer')
      expect(accessSvc.convertToISODate).toHaveBeenCalled()
    })

    it('normalises a rejected action label', () => {
      const component = build()
      component.content = {
        status: 'InReview',
        comments: [{ action: 'rejected', name: 'Bob', date: '2024-01-02', comment: 'no' }],
      } as any
      component.ngOnInit()
      expect(component.workFlowLog[0].action).toBe('rejected')
    })

    it('tolerates content without comments', () => {
      const component = build()
      component.content = { status: 'Draft', comments: undefined } as any
      component.ngOnInit()
      expect(component.history).toEqual([])
      expect(component.workFlowLog).toEqual([])
    })
  })

  describe('ngOnInit - stepper stages', () => {
    it('resolves the current stage and builds the workflow steps', () => {
      const component = build()
      component.content = { status: 'InReview', comments: [] } as any
      component.ngOnInit()
      expect(component.currentStage).toBe(1) // index of InReview
      // Live is included but Processing (not in flow) excluded; 4 flow entries -> 4 steps
      expect(component.workFlow.length).toBe(4)
      const draftStep = component.workFlow.find(s => s.processName === 'Draft')!
      expect(draftStep.isCompleted).toBe(true) // index 0 < currentStage 1
      const reviewStep = component.workFlow.find(s => s.processName === 'InReview')!
      expect(reviewStep.isActive).toBe(true)
    })

    it('maps a Review status with reviewStatus Reviewed to the Reviewed stage', () => {
      const component = build()
      component.content = { status: 'Review', reviewStatus: 'Reviewed', comments: [] } as any
      component.ngOnInit()
      expect(component.currentStage).toBe(2) // index of Reviewed
    })

    it('maps a Review status without a reviewed flag to InReview', () => {
      const component = build()
      component.content = { status: 'Review', reviewStatus: 'InReview', comments: [] } as any
      component.ngOnInit()
      expect(component.currentStage).toBe(1) // index of InReview
    })

    it('does not build steps when the status is not in the workflow', () => {
      const component = build()
      component.content = { status: 'Unknown', comments: [] } as any
      component.ngOnInit()
      expect(component.currentStage).toBe(-1)
      expect(component.workFlow).toEqual([])
    })

    it('marks the Live step active while Processing', () => {
      workFlowService.getWorkFlow.mockReturnValue(['Draft', 'InReview', 'Reviewed', 'Processing', 'Live'])
      const component = build()
      // status Processing is in the flow at index 3
      component.content = { status: 'Processing', comments: [] } as any
      component.ngOnInit()
      const liveStep = component.workFlow.find(s => s.processName === 'Live')!
      expect(liveStep.isActive).toBe(true)
    })

    it('marks the Live step completed when the content is Live', () => {
      const component = build()
      component.content = { status: 'Live', comments: [] } as any
      component.ngOnInit()
      const liveStep = component.workFlow.find(s => s.processName === 'Live')!
      expect(liveStep.isCompleted).toBe(true)
      expect(liveStep.isActive).toBe(false)
    })

    it('fills a completed step name/comment from a matching accepted action', () => {
      const component = build()
      component.content = {
        status: 'InReview',
        comments: [{ action: 'created', name: 'Alice', date: '2024-01-01', comment: 'drafted' }],
      } as any
      component.ngOnInit()
      const draftStep = component.workFlow.find(s => s.processName === 'Draft')!
      expect(draftStep.name).toBe('Alice')
      expect(draftStep.comment).toBe('drafted')
    })
  })

  describe('getOwnerName', () => {
    it('returns the owner name for a related action', () => {
      const component = build()
      expect(component.getOwnerName('approved')).toBe('Reviewer')
    })

    it('returns empty string for an unknown action', () => {
      const component = build()
      expect(component.getOwnerName('nope')).toBe('')
    })

    it('returns empty string when the action is falsy', () => {
      const component = build()
      expect(component.getOwnerName('')).toBe('')
    })
  })

  describe('getActionMembers', () => {
    it('joins the member names of the owner group for a status', () => {
      workFlowService.getOwner.mockReturnValue('reviewers')
      const component = build()
      component.content = { reviewers: [{ name: 'Bob' }, { name: 'Carol' }] } as any
      expect(component.getActionMembers('InReview')).toBe('Bob,Carol')
    })

    it('returns empty string when there is no owner meta', () => {
      workFlowService.getOwner.mockReturnValue(null)
      const component = build()
      component.content = {} as any
      expect(component.getActionMembers('InReview')).toBe('')
    })

    it('returns empty string when the owner group is missing on content', () => {
      workFlowService.getOwner.mockReturnValue('reviewers')
      const component = build()
      component.content = {} as any
      expect(component.getActionMembers('InReview')).toBe('')
    })
  })

  describe('isActionLoggable', () => {
    it('is true for an action present in owner details', () => {
      const component = build()
      expect(component.isActionLoggable('approved')).toBe(true)
    })

    it('is false for an action absent from owner details', () => {
      const component = build()
      expect(component.isActionLoggable('unknown')).toBe(false)
    })

    it('is true when the action is falsy', () => {
      const component = build()
      expect(component.isActionLoggable('')).toBe(true)
    })
  })
})
