import { of } from 'rxjs'
import { BtnSocialLikeComponent } from './btn-social-like.component'
import { NsDiscussionForum } from '../../ws-discussion-forum.model'

describe('BtnSocialLikeComponent', () => {
  let component: BtnSocialLikeComponent
  let configSvc: any
  let socialSvc: any
  let snackBar: any
  let dialog: any

  const build = () => new BtnSocialLikeComponent(configSvc, socialSvc, snackBar, dialog)

  const makeActivity = (): NsDiscussionForum.IPostActivity => ({
    activityData: { like: 5, upVote: 0, downVote: 0, flag: 0 },
    userActivity: { like: false, upVote: false, downVote: false, flag: false },
  })

  beforeEach(() => {
    configSvc = { userProfile: { userId: 'user-1' } }
    socialSvc = { updateActivity: jest.fn(() => of({})) }
    snackBar = { open: jest.fn() }
    dialog = { open: jest.fn() }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('constructor', () => {
    it('sets userId from the user profile', () => {
      expect(component.userId).toBe('user-1')
    })

    it('falls back to empty string when userId is missing on the profile', () => {
      configSvc = { userProfile: {} }
      const c = build()
      expect(c.userId).toBe('')
    })

    it('leaves userId empty when there is no user profile', () => {
      configSvc = { userProfile: null }
      const c = build()
      expect(c.userId).toBe('')
    })
  })

  describe('ngOnInit', () => {
    it('does not throw', () => {
      expect(() => component.ngOnInit()).not.toThrow()
    })
  })

  describe('updateLike', () => {
    it('shows a snackbar and aborts when the creator likes their own post', () => {
      component.postCreatorId = 'user-1'
      component.updateLike('cannot like own')
      expect(snackBar.open).toHaveBeenCalledWith('cannot like own', 'X')
      expect(socialSvc.updateActivity).not.toHaveBeenCalled()
      expect(component.isUpdating).toBe(false)
    })

    it('does nothing when an update is already in progress', () => {
      component.postCreatorId = 'other'
      component.isUpdating = true
      component.updateLike('msg')
      expect(socialSvc.updateActivity).not.toHaveBeenCalled()
    })

    it('sends the like request with the expected payload', () => {
      component.postCreatorId = 'other'
      component.postId = 'post-9'
      component.updateLike('msg')
      expect(socialSvc.updateActivity).toHaveBeenCalledWith({
        id: 'post-9',
        userId: 'user-1',
        activityType: NsDiscussionForum.EActivityType.LIKE,
      })
      expect(component.isUpdating).toBe(false)
    })

    it('increments the like count when the user had not liked yet', () => {
      component.postCreatorId = 'other'
      component.activity = makeActivity()
      component.updateLike('msg')
      expect(component.activity.userActivity.like).toBe(true)
      expect(component.activity.activityData.like).toBe(6)
    })

    it('decrements the like count when the user had already liked', () => {
      component.postCreatorId = 'other'
      const activity = makeActivity()
      activity.userActivity.like = true
      component.activity = activity
      component.updateLike('msg')
      expect(component.activity!.userActivity.like).toBe(false)
      expect(component.activity!.activityData.like).toBe(4)
    })

    it('completes without error when there is no activity object', () => {
      component.postCreatorId = 'other'
      component.activity = null
      expect(() => component.updateLike('msg')).not.toThrow()
      expect(component.isUpdating).toBe(false)
    })
  })

  describe('openLikesDialog', () => {
    it('opens the activity users dialog with the like context', () => {
      component.postId = 'post-3'
      component.openLikesDialog()
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        data: { postId: 'post-3', activityType: NsDiscussionForum.EActivityType.LIKE },
      })
    })
  })
})
