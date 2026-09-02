import { of, throwError } from 'rxjs'
import { DiscussionForumComponent } from './discussion-forum.component'

describe('DiscussionForumComponent', () => {
  let snackBar: any
  let discussionSvc: any
  let configSvc: any

  const build = (widgetData: any = { id: 'src1', name: 'Source One' }) => {
    const c = new DiscussionForumComponent(snackBar, discussionSvc, configSvc)
    c.widgetData = widgetData
    return c
  }

  beforeEach(() => {
    snackBar = { open: jest.fn() }
    discussionSvc = {
      fetchTimelineData: jest.fn().mockReturnValue(of({ hits: 0, result: [] })),
      publishPost: jest.fn().mockReturnValue(of({})),
      fetchAllPosts: jest.fn().mockReturnValue(of({ p1: {}, p2: {} })),
    }
    configSvc = {
      userProfile: { userId: 'u1', email: 'u1@x.org', userName: 'user-one' },
      restrictedFeatures: new Set<string>(),
    }
  })

  it('should be created and seed the request user ids', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.userId).toBe('u1')
    expect(c.userEmail).toBe('u1@x.org')
    expect(c.userName).toBe('user-one')
    expect(c.discussionRequest.userId).toBe('u1')
    expect(c.conversationRequest.userId).toBe('u1')
  })

  it('tolerates a missing user profile', () => {
    configSvc.userProfile = null
    const c = build()
    expect(c.userId).toBe('')
  })

  describe('ngOnInit', () => {
    it('fetches discussion when unrestricted and enabled', () => {
      const c = build({ id: 'src1', name: 'Source One', initialPostCount: 6 })
      c.ngOnInit()
      expect(c.isRestricted).toBe(false)
      expect(c.discussionRequest.pgSize).toBe(6)
      expect(c.discussionRequest.source).toEqual({ id: 'src1', name: 'Source One' })
      expect(discussionSvc.fetchTimelineData).toHaveBeenCalled()
    })

    it('is restricted when the feature flag is present', () => {
      configSvc.restrictedFeatures = new Set(['disscussionForum'])
      const c = build()
      c.ngOnInit()
      expect(c.isRestricted).toBe(true)
      expect(discussionSvc.fetchTimelineData).not.toHaveBeenCalled()
    })

    it('does not fetch when the widget is disabled', () => {
      const c = build({ id: 'src1', name: 'Source One', isDisabled: true })
      c.ngOnInit()
      expect(discussionSvc.fetchTimelineData).not.toHaveBeenCalled()
    })
  })

  describe('fetchDiscussion', () => {
    it('marks hasMore and advances the page when more results exist', () => {
      discussionSvc.fetchTimelineData.mockReturnValue(of({ hits: 10, result: [{ id: 'a' }, { id: 'b' }] }))
      const c = build()
      c.fetchDiscussion()
      expect(c.discussionResult.hits).toBe(10)
      expect(c.discussionResult.result).toHaveLength(2)
      expect(c.discussionFetchStatus).toBe('hasMore')
      expect(c.discussionRequest.pgNo).toBe(1)
    })

    it('marks done when all results are loaded', () => {
      discussionSvc.fetchTimelineData.mockReturnValue(of({ hits: 2, result: [{ id: 'a' }, { id: 'b' }] }))
      const c = build()
      c.fetchDiscussion()
      expect(c.discussionFetchStatus).toBe('done')
    })

    it('resets results on a refresh', () => {
      const c = build()
      c.discussionResult = { hits: 5, result: [{ id: 'old' } as any] }
      discussionSvc.fetchTimelineData.mockReturnValue(of({ hits: 1, result: [{ id: 'new' }] }))
      c.fetchDiscussion(true)
      expect(c.discussionRequest.pgNo).toBe(0)
      expect(c.discussionResult.result.map((r: any) => r.id)).toEqual(['new'])
    })

    it('marks none when there are no hits and no existing results', () => {
      discussionSvc.fetchTimelineData.mockReturnValue(of({ hits: 0, result: [] }))
      const c = build()
      c.fetchDiscussion()
      expect(c.discussionFetchStatus).toBe('none')
    })

    it('marks error when the fetch fails', () => {
      discussionSvc.fetchTimelineData.mockReturnValue(throwError(() => 'boom'))
      const c = build()
      c.fetchDiscussion()
      expect(c.discussionFetchStatus).toBe('error')
    })
  })

  describe('publishConversation', () => {
    it('resets state and refreshes on success', () => {
      const c = build()
      c.editorText = 'my post'
      c.isValidPost = true
      const resetEditor = jest.fn()
      ;(c as any).editorQuill = { resetEditor }
      const refreshSpy = jest.spyOn(c, 'fetchDiscussion')
      c.publishConversation('failed')
      expect(discussionSvc.publishPost).toHaveBeenCalled()
      expect(c.editorText).toBeUndefined()
      expect(c.isValidPost).toBe(false)
      expect(c.isPostingDiscussion).toBe(false)
      expect(resetEditor).toHaveBeenCalled()
      expect(refreshSpy).toHaveBeenCalledWith(true)
    })

    it('shows a snackbar on failure', () => {
      discussionSvc.publishPost.mockReturnValue(throwError(() => 'boom'))
      const c = build()
      c.publishConversation('failed msg')
      expect(snackBar.open).toHaveBeenCalledWith('failed msg', 'X')
      expect(c.isPostingDiscussion).toBe(false)
    })
  })

  describe('onDeletePost', () => {
    it('removes the post and decrements hits', () => {
      const c = build()
      c.discussionResult = { hits: 2, result: [{ id: 'a' } as any, { id: 'b' } as any] }
      c.discussionFetchStatus = 'done'
      c.onDeletePost(0)
      expect(c.discussionResult.result.map((r: any) => r.id)).toEqual(['b'])
      expect(c.discussionResult.hits).toBe(1)
      expect(c.discussionFetchStatus).toBe('done')
    })

    it('sets status none when the last post is removed', () => {
      const c = build()
      c.discussionResult = { hits: 1, result: [{ id: 'a' } as any] }
      c.onDeletePost(0)
      expect(c.discussionResult.result).toHaveLength(0)
      expect(c.discussionFetchStatus).toBe('none')
    })
  })

  it('onTextChange stores validity and text', () => {
    const c = build()
    c.onTextChange({ isValid: true, htmlText: '<p>hi</p>' })
    expect(c.isValidPost).toBe(true)
    expect(c.editorText).toBe('<p>hi</p>')
  })

  describe('fetchAllPosts', () => {
    it('collects post ids and stores the conversation keys', () => {
      const c = build()
      c.discussionResult = { hits: 2, result: [{ id: 'a' } as any, { id: 'b' } as any] }
      c.fetchAllPosts()
      expect(c.conversationRequest.postId).toEqual(['a', 'b'])
      expect(discussionSvc.fetchAllPosts).toHaveBeenCalledWith(c.conversationRequest)
      expect(c.discussionConverstionResult).toEqual(['p1', 'p2'])
    })
  })
})
