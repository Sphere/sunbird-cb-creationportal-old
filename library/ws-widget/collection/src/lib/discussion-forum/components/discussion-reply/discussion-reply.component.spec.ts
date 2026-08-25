import { of, throwError } from 'rxjs'
import { DiscussionReplyComponent } from './discussion-reply.component'
import { NsDiscussionForum } from '../../ws-discussion-forum.model'

describe('DiscussionReplyComponent', () => {
  let dialog: any
  let snackBar: any
  let configSvc: any
  let discussionSvc: any

  const reply = (): any => ({
    id: 'reply-1',
    postContent: { title: 'T', abstract: '', body: 'body' },
    lastEdited: { dtLastEdited: '0', editorId: 'e' },
    dtLastModified: '0',
  })

  const build = () => {
    const c = new DiscussionReplyComponent(dialog, snackBar, configSvc, discussionSvc)
    c.reply = reply()
    return c
  }

  beforeEach(() => {
    dialog = { open: jest.fn() }
    snackBar = { open: jest.fn() }
    configSvc = { userProfile: { userId: 'u1' } }
    discussionSvc = { updatePost: jest.fn().mockReturnValue(of({})) }
  })

  it('is created and seeds the user id', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.userId).toBe('u1')
  })

  it('tolerates a missing user profile', () => {
    configSvc.userProfile = null
    const c = build()
    expect(c.userId).toBe('')
  })

  it('tolerates a profile without a userId', () => {
    configSvc.userProfile = {}
    const c = build()
    expect(c.userId).toBe('')
  })

  it('ngOnInit does not throw', () => {
    const c = build()
    expect(() => c.ngOnInit()).not.toThrow()
  })

  describe('deletePost', () => {
    it('emits deleteSuccess when the dialog confirms', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      const c = build()
      const emitSpy = jest.spyOn(c.deleteSuccess, 'emit')
      c.deletePost('failed')
      expect(dialog.open).toHaveBeenCalled()
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

  describe('editReply', () => {
    it('updates the reply body and clears edit state on success', () => {
      const c = build()
      c.editMode = true
      c.updatedBody = 'new body'
      c.editReply('failed')
      expect(c.reply.postContent.body).toBe('new body')
      expect(c.editMode).toBe(false)
      expect(discussionSvc.updatePost).toHaveBeenCalled()
      const arg = discussionSvc.updatePost.mock.calls[0][0]
      expect(arg.editor).toBe('u1')
      expect(arg.postKind).toBe(NsDiscussionForum.EPostKind.REPLY)
      expect(c.updatedBody).toBeUndefined()
      expect(c.reply.lastEdited.dtLastEdited).not.toBe('0')
    })

    it('handles a reply without lastEdited on success', () => {
      const c = build()
      c.reply.lastEdited = undefined
      c.updatedBody = 'x'
      expect(() => c.editReply('failed')).not.toThrow()
      expect(c.reply.dtLastModified).not.toBe('0')
    })

    it('defaults the body to empty string when updatedBody is undefined', () => {
      const c = build()
      c.updatedBody = undefined
      c.editReply('failed')
      expect(c.reply.postContent.body).toBe('')
    })

    it('re-enables edit mode and shows a snackbar on failure', () => {
      discussionSvc.updatePost.mockReturnValue(throwError(() => 'boom'))
      const c = build()
      c.updatedBody = 'new body'
      c.editReply('failed msg')
      expect(c.editMode).toBe(true)
      expect(snackBar.open).toHaveBeenCalledWith('failed msg', 'X')
    })
  })

  it('onReplyTextChange stores validity and body', () => {
    const c = build()
    c.onReplyTextChange({ isValid: true, htmlText: '<p>hi</p>' })
    expect(c.replyPostEnabled).toBe(true)
    expect(c.updatedBody).toBe('<p>hi</p>')
  })
})
