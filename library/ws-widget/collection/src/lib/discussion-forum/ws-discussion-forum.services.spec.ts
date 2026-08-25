import { of } from 'rxjs'
import { WsDiscussionForumService } from './ws-discussion-forum.services'

const PROTECTED_SLAG_V8 = '/apis/protected/v8'

describe('WsDiscussionForumService', () => {
  let service: WsDiscussionForumService
  let http: { post: jest.Mock; put: jest.Mock }

  beforeEach(() => {
    http = {
      post: jest.fn().mockReturnValue(of({ ok: true })),
      put: jest.fn().mockReturnValue(of({ ok: true })),
    }
    service = new WsDiscussionForumService(http as any)
  })

  it('should be created', () => {
    expect(service).toBeTruthy()
  })

  it('deletePost posts the delete request with userId and id', done => {
    service.deletePost('post-1', 'user-1').subscribe(res => {
      expect(res).toEqual({ ok: true })
      done()
    })
    expect(http.post).toHaveBeenCalledWith(`${PROTECTED_SLAG_V8}/social/post/delete`, {
      userId: 'user-1',
      id: 'post-1',
    })
  })

  it('updateActivity posts to the activity create endpoint', done => {
    const request: any = { postId: 'p1', activity: 'like' }
    service.updateActivity(request).subscribe(res => {
      expect(res).toEqual({ ok: true })
      done()
    })
    expect(http.post).toHaveBeenCalledWith(`${PROTECTED_SLAG_V8}/social/post/activity/create`, request)
  })

  it('fetchActivityUsers posts to the activity users endpoint', done => {
    const request: any = { postId: 'p1' }
    http.post.mockReturnValueOnce(of({ result: [] }))
    service.fetchActivityUsers(request).subscribe(res => {
      expect(res).toEqual({ result: [] })
      done()
    })
    expect(http.post).toHaveBeenCalledWith(`${PROTECTED_SLAG_V8}/social/post/activity/users`, request)
  })

  it('fetchTimelineData posts to the timeline endpoint', done => {
    const request: any = { count: 10 }
    http.post.mockReturnValueOnce(of({ result: { posts: [] } }))
    service.fetchTimelineData(request).subscribe(res => {
      expect(res).toEqual({ result: { posts: [] } })
      done()
    })
    expect(http.post).toHaveBeenCalledWith(`${PROTECTED_SLAG_V8}/social/post/timeline`, request)
  })

  it('publishPost posts to the publish endpoint', done => {
    const request: any = { postContent: 'hello' }
    service.publishPost(request).subscribe(res => {
      expect(res).toEqual({ ok: true })
      done()
    })
    expect(http.post).toHaveBeenCalledWith(`${PROTECTED_SLAG_V8}/social/post/publish`, request)
  })

  it('updatePost puts to the edit meta endpoint', done => {
    const request: any = { postId: 'p1', title: 'new title' }
    service.updatePost(request).subscribe(res => {
      expect(res).toEqual({ ok: true })
      done()
    })
    expect(http.put).toHaveBeenCalledWith(`${PROTECTED_SLAG_V8}/social/edit/meta`, request)
  })

  it('fetchPost posts to the view conversation endpoint', done => {
    const request: any = { postId: 'p1' }
    http.post.mockReturnValueOnce(of({ result: { post: {} } }))
    service.fetchPost(request).subscribe(res => {
      expect(res).toEqual({ result: { post: {} } })
      done()
    })
    expect(http.post).toHaveBeenCalledWith(`${PROTECTED_SLAG_V8}/social/post/viewConversation`, request)
  })

  it('fetchAllPosts posts to the view conversation v2 endpoint', done => {
    const request: any = { postId: 'p1', hierarchyPath: [] }
    http.post.mockReturnValueOnce(of({ result: { mainPost: {} } }))
    service.fetchAllPosts(request).subscribe(res => {
      expect(res).toEqual({ result: { mainPost: {} } })
      done()
    })
    expect(http.post).toHaveBeenCalledWith(`${PROTECTED_SLAG_V8}/social/post/viewConversationV2`, request)
  })
})
