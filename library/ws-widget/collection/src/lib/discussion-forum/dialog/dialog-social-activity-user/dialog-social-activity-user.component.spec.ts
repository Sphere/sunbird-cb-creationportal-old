import { of, throwError } from 'rxjs'
import { DialogSocialActivityUserComponent } from './dialog-social-activity-user.component'
import { NsDiscussionForum } from '../../ws-discussion-forum.model'

describe('DialogSocialActivityUserComponent', () => {
  let dialogRef: any
  let socialSvc: any
  let configSvc: any
  let userSvc: any

  const build = (data: any = { postId: 'p1', activityType: NsDiscussionForum.EActivityType.LIKE }) =>
    new DialogSocialActivityUserComponent(dialogRef, data, socialSvc, configSvc, userSvc)

  beforeEach(() => {
    dialogRef = { close: jest.fn() }
    socialSvc = {
      fetchActivityUsers: jest.fn().mockReturnValue(of({ total: 0, users: [] })),
    }
    configSvc = {
      userProfile: { userId: 'u1' },
    }
    userSvc = {
      fetchUserFollow: jest.fn().mockReturnValue(of({ followers: [], following: [] })),
      followUser: jest.fn().mockReturnValue(of({})),
      unFollowUser: jest.fn().mockReturnValue(of({})),
    }
  })

  it('is created and seeds the user id + request post id', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.userId).toBe('u1')
    expect(c.commonRequestForActivityUsers.postId).toBe('p1')
    expect(c.activityUsersFetchRequest.like.postId).toBe('p1')
  })

  it('tolerates a missing user profile', () => {
    configSvc.userProfile = null
    const c = build()
    expect(c.userId).toBe('')
  })

  describe('ngOnInit', () => {
    it('selects the tab matching the activity type and triggers fetches', () => {
      const c = build({ postId: 'p1', activityType: NsDiscussionForum.EActivityType.UPVOTE })
      c.ngOnInit()
      expect(c.selectedTabIndex).toBe(1)
      expect(userSvc.fetchUserFollow).toHaveBeenCalledWith('u1')
      expect(socialSvc.fetchActivityUsers).toHaveBeenCalled()
    })

    it('selects the downvote tab (index 2) for a downvote activity type', () => {
      const c = build({ postId: 'p1', activityType: NsDiscussionForum.EActivityType.DOWNVOTE })
      c.ngOnInit()
      expect(c.selectedTabIndex).toBe(2)
    })

    it('keeps the default tab index 0 for a like activity type', () => {
      const c = build({ postId: 'p1', activityType: NsDiscussionForum.EActivityType.LIKE })
      c.ngOnInit()
      expect(c.selectedTabIndex).toBe(0)
    })
  })

  describe('fetchActivityUsers', () => {
    it('marks hasMore and advances the page when more results exist', () => {
      socialSvc.fetchActivityUsers.mockReturnValue(of({ total: 5, users: [{ id: 'a' }] }))
      const c = build()
      c.fetchActivityUsers(NsDiscussionForum.EActivityType.LIKE)
      expect(c.activityUsersResult.like.data!.users).toHaveLength(1)
      expect(c.activityUsersResult.like.fetchStatus).toBe('hasMore')
      expect(c.activityUsersFetchRequest.like.pgNo).toBe(1)
    })

    it('marks done when all results are loaded', () => {
      socialSvc.fetchActivityUsers.mockReturnValue(of({ total: 1, users: [{ id: 'a' }] }))
      const c = build()
      c.fetchActivityUsers(NsDiscussionForum.EActivityType.LIKE)
      expect(c.activityUsersResult.like.fetchStatus).toBe('done')
    })

    it('appends to existing data on a subsequent page', () => {
      const c = build()
      c.activityUsersResult.like.data = { total: 5, users: [{ id: 'a', name: 'A', email: 'a@x' }] }
      socialSvc.fetchActivityUsers.mockReturnValue(of({ total: 5, users: [{ id: 'b' }] }))
      c.fetchActivityUsers(NsDiscussionForum.EActivityType.LIKE)
      expect(c.activityUsersResult.like.data!.users.map((u: any) => u.id)).toEqual(['a', 'b'])
    })

    it('marks none when the response has no total', () => {
      socialSvc.fetchActivityUsers.mockReturnValue(of({ total: 0, users: [] }))
      const c = build()
      c.fetchActivityUsers(NsDiscussionForum.EActivityType.LIKE)
      expect(c.activityUsersResult.like.fetchStatus).toBe('none')
    })

    it('does not re-fetch when already fetching or done', () => {
      const c = build()
      c.activityUsersResult.like.fetchStatus = 'done'
      c.fetchActivityUsers(NsDiscussionForum.EActivityType.LIKE)
      expect(socialSvc.fetchActivityUsers).not.toHaveBeenCalled()
    })

    it('marks none on a 404 error', () => {
      socialSvc.fetchActivityUsers.mockReturnValue(throwError(() => ({ status: 404 })))
      const c = build()
      c.fetchActivityUsers(NsDiscussionForum.EActivityType.LIKE)
      expect(c.activityUsersResult.like.fetchStatus).toBe('none')
    })

    it('marks error on a non-404 error', () => {
      socialSvc.fetchActivityUsers.mockReturnValue(throwError(() => ({ status: 500 })))
      const c = build()
      c.fetchActivityUsers(NsDiscussionForum.EActivityType.LIKE)
      expect(c.activityUsersResult.like.fetchStatus).toBe('error')
    })
  })

  describe('follow helpers', () => {
    it('ifFollowing returns true when the id is in the following list', () => {
      const c = build()
      c.userFollowData = { followers: [], following: [{ id: 'x', email: 'x@x', firstname: 'X' }] }
      expect(c.ifFollowing('x')).toBe(true)
      expect(c.ifFollowing('y')).toBe(false)
    })

    it('ifFollowing returns false when there is no follow data', () => {
      const c = build()
      c.userFollowData = null
      expect(c.ifFollowing('x')).toBe(false)
    })

    it('follow adds the user and calls the service', () => {
      const c = build()
      c.userFollowData = { followers: [], following: [] }
      const user = { id: 'x', email: 'x@x', firstname: 'X' }
      c.follow(user)
      expect(c.userFollowData.following).toContain(user)
      expect(userSvc.followUser).toHaveBeenCalledWith({ followsourceid: 'u1', followtargetid: 'x' })
    })

    it('unFollow removes the user and calls the service', () => {
      const c = build()
      c.userFollowData = { followers: [], following: [{ id: 'x', email: 'x@x', firstname: 'X' }] }
      c.unFollow({ id: 'x', email: 'x@x', firstname: 'X' })
      expect(c.userFollowData.following).toHaveLength(0)
      expect(userSvc.unFollowUser).toHaveBeenCalledWith({ followsourceid: 'u1', followtargetid: 'x' })
    })

    it('toggleFollow follows when not following', () => {
      const c = build()
      c.userFollowData = { followers: [], following: [] }
      const followSpy = jest.spyOn(c, 'follow')
      c.toggleFollow({ id: 'x', email: 'x@x', firstname: 'X' })
      expect(followSpy).toHaveBeenCalled()
    })

    it('toggleFollow unfollows when already following', () => {
      const c = build()
      c.userFollowData = { followers: [], following: [{ id: 'x', email: 'x@x', firstname: 'X' }] }
      const unFollowSpy = jest.spyOn(c, 'unFollow')
      c.toggleFollow({ id: 'x', email: 'x@x', firstname: 'X' })
      expect(unFollowSpy).toHaveBeenCalled()
    })
  })

  describe('tabChange', () => {
    it('fetches for the newly selected tab when its data is empty', () => {
      const c = build()
      const fetchSpy = jest.spyOn(c, 'fetchActivityUsers')
      c.tabChange({ index: 1 } as any)
      expect(fetchSpy).toHaveBeenCalledWith(NsDiscussionForum.EActivityType.UPVOTE)
    })

    it('does not fetch when the tab already has data', () => {
      const c = build()
      c.activityUsersResult.upvote.data = { total: 1, users: [] }
      const fetchSpy = jest.spyOn(c, 'fetchActivityUsers')
      c.tabChange({ index: 1 } as any)
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('fetchUserFollowers (via ngOnInit)', () => {
    it('stores follow data on success', () => {
      userSvc.fetchUserFollow.mockReturnValue(of({ followers: [{ id: 'f' }], following: [] }))
      const c = build()
      c.ngOnInit()
      expect(c.userFollowData).toEqual({ followers: [{ id: 'f' }], following: [] })
      expect(c.userFollowFetchStatus).toBe('done')
    })

    it('falls back to empty follow data on error', () => {
      userSvc.fetchUserFollow.mockReturnValue(throwError(() => 'boom'))
      const c = build()
      c.ngOnInit()
      expect(c.userFollowData).toEqual({ followers: [], following: [] })
      expect(c.userFollowFetchStatus).toBe('error')
    })
  })
})
