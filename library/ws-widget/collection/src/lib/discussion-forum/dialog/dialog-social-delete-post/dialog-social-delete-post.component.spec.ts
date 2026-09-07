import { of, throwError } from 'rxjs'
import { DialogSocialDeletePostComponent } from './dialog-social-delete-post.component'

describe('DialogSocialDeletePostComponent', () => {
  let dialogRef: any
  let socialSvc: any
  let configSvc: any

  const build = (data: any = { postId: 'p1' }) => new DialogSocialDeletePostComponent(dialogRef, data, socialSvc, configSvc)

  beforeEach(() => {
    dialogRef = { close: jest.fn() }
    socialSvc = {
      deletePost: jest.fn().mockReturnValue(of({})),
    }
    configSvc = {
      userProfile: { userId: 'u1' },
    }
  })

  it('is created and seeds the user id', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.userId).toBe('u1')
    expect(c.isDeleting).toBe(false)
    expect(c.errorInDeleting).toBe(false)
  })

  it('tolerates a missing user profile', () => {
    configSvc.userProfile = null
    const c = build()
    expect(c.userId).toBe('')
  })

  it('tolerates a user profile without a userId', () => {
    configSvc.userProfile = {}
    const c = build()
    expect(c.userId).toBe('')
  })

  it('ngOnInit runs without error', () => {
    const c = build()
    expect(() => c.ngOnInit()).not.toThrow()
  })

  describe('deletePost', () => {
    it('deletes the post and closes the dialog with true on success', () => {
      const c = build()
      c.deletePost()
      expect(socialSvc.deletePost).toHaveBeenCalledWith('p1', 'u1')
      expect(c.isDeleting).toBe(false)
      expect(dialogRef.close).toHaveBeenCalledWith(true)
    })

    it('flags an error and does not close the dialog on failure', () => {
      socialSvc.deletePost.mockReturnValue(throwError(() => ({ status: 500 })))
      const c = build()
      c.deletePost()
      expect(c.isDeleting).toBe(false)
      expect(c.errorInDeleting).toBe(true)
      expect(dialogRef.close).not.toHaveBeenCalled()
    })

    it('does not call the service when there is no user id', () => {
      configSvc.userProfile = null
      const c = build()
      c.deletePost()
      expect(c.isDeleting).toBe(true)
      expect(socialSvc.deletePost).not.toHaveBeenCalled()
    })
  })
})
