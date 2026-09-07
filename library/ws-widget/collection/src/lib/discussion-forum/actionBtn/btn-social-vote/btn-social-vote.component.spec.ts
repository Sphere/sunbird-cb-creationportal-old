import { of, throwError } from 'rxjs'
import { BtnSocialVoteComponent } from './btn-social-vote.component'
import { NsDiscussionForum } from '../../ws-discussion-forum.model'

describe('BtnSocialVoteComponent', () => {
  let configSvc: any
  let socialSvc: any
  let snackBar: any
  let dialog: any

  const build = () => new BtnSocialVoteComponent(configSvc, socialSvc, snackBar, dialog)

  const makeActivity = (over: Partial<NsDiscussionForum.IPostActivity['userActivity']> = {}): NsDiscussionForum.IPostActivity => ({
    activityData: { like: 0, upVote: 2, downVote: 3, flag: 0 },
    userActivity: { like: false, upVote: false, downVote: false, flag: false, ...over },
  })

  beforeEach(() => {
    configSvc = { userProfile: { userId: 'u1' } }
    socialSvc = { updateActivity: jest.fn().mockReturnValue(of({})) }
    snackBar = { open: jest.fn() }
    dialog = { open: jest.fn() }
  })

  it('is created and seeds the user id from the profile', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.userId).toBe('u1')
  })

  it('tolerates a missing user profile', () => {
    configSvc.userProfile = null
    const c = build()
    expect(c.userId).toBe('')
  })

  it('defaults userId to empty string when profile has no userId', () => {
    configSvc.userProfile = {}
    const c = build()
    expect(c.userId).toBe('')
  })

  it('ngOnInit does not throw', () => {
    const c = build()
    expect(() => c.ngOnInit()).not.toThrow()
  })

  describe('upVote', () => {
    it('blocks self-voting and shows a snackbar', () => {
      const c = build()
      c.postCreatorId = 'u1'
      c.upVote('cannot vote own post')
      expect(snackBar.open).toHaveBeenCalledWith('cannot vote own post', 'X')
      expect(socialSvc.updateActivity).not.toHaveBeenCalled()
    })

    it('delegates to downVote when already up-voted', () => {
      const c = build()
      c.postId = 'p1'
      c.activity = makeActivity({ upVote: true })
      c.invalidUser = { nativeElement: { value: 'msg' } } as any
      const downSpy = jest.spyOn(c, 'downVote')
      c.upVote('msg')
      expect(downSpy).toHaveBeenCalledWith('msg')
    })

    it('increments upVote and calls the service on a fresh vote', () => {
      const c = build()
      c.postId = 'p1'
      c.activity = makeActivity()
      c.upVote('msg')
      expect(socialSvc.updateActivity).toHaveBeenCalledWith({
        activityType: NsDiscussionForum.EActivityType.UPVOTE,
        id: 'p1',
        userId: 'u1',
      })
      expect(c.activity!.userActivity.upVote).toBe(true)
      expect(c.activity!.activityData.upVote).toBe(3)
      expect(c.isUpdating).toBe(false)
    })

    it('reverses an existing downVote instead of adding an upVote', () => {
      const c = build()
      c.postId = 'p1'
      c.activity = makeActivity({ downVote: true })
      c.upVote('msg')
      expect(c.activity!.userActivity.downVote).toBe(false)
      expect(c.activity!.activityData.downVote).toBe(2)
    })

    it('resets isUpdating on service error', () => {
      socialSvc.updateActivity.mockReturnValue(throwError(() => 'boom'))
      const c = build()
      c.postId = 'p1'
      c.activity = makeActivity()
      c.upVote('msg')
      expect(c.isUpdating).toBe(false)
    })
  })

  describe('downVote', () => {
    it('blocks self-voting and shows a snackbar', () => {
      const c = build()
      c.postCreatorId = 'u1'
      c.downVote('cannot vote own post')
      expect(snackBar.open).toHaveBeenCalledWith('cannot vote own post', 'X')
      expect(socialSvc.updateActivity).not.toHaveBeenCalled()
    })

    it('delegates to upVote when already down-voted', () => {
      const c = build()
      c.postId = 'p1'
      c.activity = makeActivity({ downVote: true })
      c.invalidUser = { nativeElement: { value: 'msg' } } as any
      const upSpy = jest.spyOn(c, 'upVote')
      c.downVote('msg')
      expect(upSpy).toHaveBeenCalledWith('msg')
    })

    it('increments downVote and calls the service on a fresh vote', () => {
      const c = build()
      c.postId = 'p1'
      c.activity = makeActivity()
      c.downVote('msg')
      expect(socialSvc.updateActivity).toHaveBeenCalledWith({
        activityType: NsDiscussionForum.EActivityType.DOWNVOTE,
        id: 'p1',
        userId: 'u1',
      })
      expect(c.activity!.userActivity.downVote).toBe(true)
      expect(c.activity!.activityData.downVote).toBe(4)
      expect(c.isUpdating).toBe(false)
    })

    it('reverses an existing upVote instead of adding a downVote', () => {
      const c = build()
      c.postId = 'p1'
      c.activity = makeActivity({ upVote: true })
      c.downVote('msg')
      expect(c.activity!.userActivity.upVote).toBe(false)
      expect(c.activity!.activityData.upVote).toBe(1)
    })

    it('resets isUpdating on service error', () => {
      socialSvc.updateActivity.mockReturnValue(throwError(() => 'boom'))
      const c = build()
      c.postId = 'p1'
      c.activity = makeActivity()
      c.downVote('msg')
      expect(c.isUpdating).toBe(false)
    })
  })

  describe('openVotesDialog', () => {
    it('opens the dialog with the post id and vote type', () => {
      const c = build()
      c.postId = 'p1'
      c.openVotesDialog(NsDiscussionForum.EActivityType.UPVOTE)
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        data: { postId: 'p1', activityType: NsDiscussionForum.EActivityType.UPVOTE },
      })
    })
  })
})
