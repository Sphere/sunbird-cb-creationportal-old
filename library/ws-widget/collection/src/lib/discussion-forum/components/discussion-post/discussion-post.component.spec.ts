import { of, throwError } from 'rxjs'
import { DiscussionPostComponent } from './discussion-post.component'
import { NsDiscussionForum } from '../../ws-discussion-forum.model'

describe('DiscussionPostComponent', () => {
  let dialog: any
  let snackBar: any
  let configSvc: any
  let discussionSvc: any

  const post = (): any => ({
    id: 'post-1',
    postContent: { title: 'T', abstract: '', body: 'B' },
    source: { id: 'src', name: NsDiscussionForum.EDiscussionType.SOCIAL },
    lastEdited: { dtLastEdited: '0', editorId: 'e' },
    dtLastModified: '0',
  })

  const build = () => {
    const c = new DiscussionPostComponent(dialog, snackBar, configSvc, discussionSvc)
    c.post = post()
    return c
  }

  beforeEach(() => {
    dialog = { open: jest.fn() }
    snackBar = { open: jest.fn() }
    configSvc = { userProfile: { userId: 'u1', email: 'u1@x.org', userName: 'user-one' } }
    discussionSvc = {
      fetchPost: jest.fn().mockReturnValue(of({ newPostCount: 0, replyPost: [], postCount: 0 })),
      publishPost: jest.fn().mockReturnValue(of({})),
      updatePost: jest.fn().mockReturnValue(of({})),
    }
  })

  it('is created and seeds the user identity', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.userId).toBe('u1')
    expect(c.userEmail).toBe('u1@x.org')
    expect(c.userName).toBe('user-one')
    expect(c.conversationRequest.userId).toBe('u1')
  })

  it('tolerates a missing user profile', () => {
    configSvc.userProfile = null
    const c = build()
    expect(c.userId).toBe('')
  })

  describe('ngOnInit', () => {
    it('sets the request post id and fetches replies', () => {
      const c = build()
      const spy = jest.spyOn(c, 'fetchPostReplies')
      c.ngOnInit()
      expect(c.conversationRequest.postId).toBe('post-1')
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('deletePost', () => {
    it('emits deleteSuccess when the dialog confirms', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      const c = build()
      const emitSpy = jest.spyOn(c.deleteSuccess, 'emit')
      c.deletePost('failed')
      expect(emitSpy).toHaveBeenCalledWith(true)
    })

    it('does not emit when the dialog is dismissed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(false) })
      const c = build()
      const emitSpy = jest.spyOn(c.deleteSuccess, 'emit')
      c.deletePost('failed')
      expect(emitSpy).not.toHaveBeenCalled()
    })

    it('shows a snackbar when the dialog stream errors', () => {
      dialog.open.mockReturnValue({ afterClosed: () => throwError(() => 'boom') })
      const c = build()
      c.deletePost('failed msg')
      expect(snackBar.open).toHaveBeenCalledWith('failed msg', 'X')
    })
  })

  describe('editPost', () => {
    it('updates the post and clears the edit state on success', () => {
      const c = build()
      c.updatedBody = 'new title'
      c.editPost('failed')
      expect(c.post.postContent.title).toBe('new title')
      expect(c.editMode).toBe(false)
      expect(discussionSvc.updatePost).toHaveBeenCalled()
      expect(c.updatedBody).toBeUndefined()
    })

    it('re-enables edit mode and shows a snackbar on failure', () => {
      discussionSvc.updatePost.mockReturnValue(throwError(() => 'boom'))
      const c = build()
      c.updatedBody = 'new title'
      c.editPost('failed msg')
      expect(c.editMode).toBe(true)
      expect(snackBar.open).toHaveBeenCalledWith('failed msg', 'X')
    })
  })

  it('onTextChange stores validity and body', () => {
    const c = build()
    c.onTextChange({ isValid: true, htmlText: '<p>hi</p>' })
    expect(c.postPublishEnabled).toBe(true)
    expect(c.updatedBody).toBe('<p>hi</p>')
  })

  it('onReplyTextChange stores reply validity and body', () => {
    const c = build()
    c.onReplyTextChange({ isValid: true, htmlText: '<p>reply</p>' })
    expect(c.isValidReply).toBe(true)
    expect(c.replyBody).toBe('<p>reply</p>')
  })

  describe('publishReply', () => {
    it('resets reply state and refreshes on success', () => {
      const c = build()
      c.replyBody = 'my reply'
      c.isValidReply = true
      const resetEditor = jest.fn()
      c.discussionReplyEditor = { resetEditor } as any
      const refreshSpy = jest.spyOn(c, 'fetchPostReplies')
      c.publishReply('failed')
      expect(discussionSvc.publishPost).toHaveBeenCalled()
      expect(refreshSpy).toHaveBeenCalledWith(true)
      expect(c.isPostingReply).toBe(false)
      expect(resetEditor).toHaveBeenCalled()
      expect(c.isValidReply).toBe(false)
      expect(c.replyBody).toBeUndefined()
    })

    it('shows a snackbar on failure', () => {
      discussionSvc.publishPost.mockReturnValue(throwError(() => 'boom'))
      const c = build()
      c.publishReply('failed msg')
      expect(snackBar.open).toHaveBeenCalledWith('failed msg', 'X')
      expect(c.isPostingReply).toBe(false)
    })
  })

  describe('fetchPostReplies', () => {
    it('marks hasMore and advances the page when more replies exist', () => {
      discussionSvc.fetchPost.mockReturnValue(of({ newPostCount: 1, replyPost: [{ id: 'r1' }], postCount: 5 }))
      const c = build()
      c.fetchPostReplies()
      expect(c.isNewRepliesAvailable).toBe(true)
      expect(c.postReplies).toHaveLength(1)
      expect(c.replyFetchStatus).toBe('hasMore')
      expect(c.conversationRequest.pgNo).toBe(1)
    })

    it('marks done when replies are loaded and no more remain', () => {
      discussionSvc.fetchPost.mockReturnValue(of({ newPostCount: 0, replyPost: [{ id: 'r1' }], postCount: 0 }))
      const c = build()
      c.fetchPostReplies()
      expect(c.replyFetchStatus).toBe('done')
    })

    it('marks none when there are no replies', () => {
      discussionSvc.fetchPost.mockReturnValue(of({ newPostCount: 0, replyPost: [], postCount: 0 }))
      const c = build()
      c.fetchPostReplies()
      expect(c.replyFetchStatus).toBe('none')
    })

    it('resets replies and page on a forced refresh', () => {
      discussionSvc.fetchPost.mockReturnValue(of({ newPostCount: 0, replyPost: [{ id: 'new' }], postCount: 0 }))
      const c = build()
      c.postReplies = [{ id: 'old' } as any]
      c.conversationRequest.pgNo = 3
      c.fetchPostReplies(true)
      expect(c.postReplies.map((r: any) => r.id)).toEqual(['new'])
    })

    it('returns early when a fetch is already in flight', () => {
      const c = build()
      c.replyFetchStatus = 'fetching'
      c.fetchPostReplies()
      expect(discussionSvc.fetchPost).not.toHaveBeenCalled()
    })

    it('marks error when the fetch fails', () => {
      discussionSvc.fetchPost.mockReturnValue(throwError(() => 'boom'))
      const c = build()
      c.fetchPostReplies()
      expect(c.replyFetchStatus).toBe('error')
    })
  })

  it('onDeleteReply removes the reply at the given index', () => {
    const c = build()
    c.postReplies = [{ id: 'a' } as any, { id: 'b' } as any]
    c.onDeleteReply(0)
    expect(c.postReplies.map((r: any) => r.id)).toEqual(['b'])
  })
})
