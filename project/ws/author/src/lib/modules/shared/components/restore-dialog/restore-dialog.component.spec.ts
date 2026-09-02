import { FormBuilder } from '@angular/forms'
import { of, throwError, Subject } from 'rxjs'
import { RestoreDialogComponent } from './restore-dialog.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('RestoreDialogComponent', () => {
  let component: RestoreDialogComponent
  let snackBar: any
  let dialog: any
  let dialogRef: any
  let accessService: any
  let apiService: any
  let notificationSvc: any
  let valueSvc: any
  let isXSmall$: Subject<boolean>
  let data: any

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  const build = () => {
    return new RestoreDialogComponent(
      new FormBuilder(),
      snackBar,
      dialog,
      dialogRef,
      accessService,
      data,
      apiService,
      notificationSvc,
      valueSvc,
    )
  }

  beforeEach(() => {
    isXSmall$ = new Subject<boolean>()
    snackBar = { openFromComponent: jest.fn() }
    dialog = { open: jest.fn() }
    dialogRef = { disableClose: false, close: jest.fn() }
    accessService = {
      orgRootOrgAsQuery: '?org=o&rootOrg=r',
      userId: 'u1',
      userName: 'User One',
      hasRole: jest.fn().mockReturnValue(true),
    }
    apiService = { post: jest.fn().mockReturnValue(of({})) }
    notificationSvc = { moveToDraft: jest.fn().mockReturnValue(of({})) }
    valueSvc = { isXSmall$ }
    data = { identifier: 'do_1', status: 'Draft', children: [{ id: 'c1' }, { id: 'c2' }] }
    component = build()
  })

  it('should be created and disable close', () => {
    expect(component).toBeTruthy()
    expect(dialogRef.disableClose).toBe(true)
  })

  describe('ngOnInit', () => {
    it('tracks the mobile flag from the value service', () => {
      component.ngOnInit()
      isXSmall$.next(true)
      expect(component.isMobile).toBe(true)
    })

    it('captures the content meta and children count', () => {
      component.ngOnInit()
      expect(component.contentMeta).toBe(data)
      expect(component.children).toBe(2)
    })

    it('defaults the children count to zero', () => {
      data = { identifier: 'do_1', status: 'Draft' }
      component = build()
      component.ngOnInit()
      expect(component.children).toBe(0)
    })

    it('marks a fresh draft as new', () => {
      component.ngOnInit()
      expect(component.isNew).toBe('Yes')
    })

    it('marks an image content as not new', () => {
      data = { identifier: 'do_1.img', status: 'Draft' }
      component = build()
      component.ngOnInit()
      expect(component.isNew).toBe('No')
    })

    it('marks a live content as not new', () => {
      data = { identifier: 'do_1', status: 'Live' }
      component = build()
      component.ngOnInit()
      expect(component.isNew).toBe('No')
    })

    it('builds the comments form', () => {
      component.ngOnInit()
      expect(component.commentsForm.contains('comments')).toBe(true)
      expect(component.commentsForm.contains('action')).toBe(true)
      expect(component.commentsForm.valid).toBe(false)
    })
  })

  describe('submitData', () => {
    beforeEach(() => component.ngOnInit())

    it('restores when the form is valid and an action is chosen', () => {
      const spy = jest.spyOn(component, 'restore').mockImplementation(() => undefined)
      component.commentsForm.setValue({ comments: 'ok', action: 'restored' })
      component.submitData()
      expect(spy).toHaveBeenCalled()
    })

    it('flags submit when the form is invalid', () => {
      const spy = jest.spyOn(component, 'restore').mockImplementation(() => undefined)
      component.submitData()
      expect(component.isSubmitPressed).toBe(true)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('restore', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.commentsForm.setValue({ comments: 'note', action: 'restored' })
    })

    it('posts the restore payload with access details', () => {
      component.restore()
      expect(apiService.post).toHaveBeenCalled()
      const payload = apiService.post.mock.calls[0][1]
      expect(payload.identifier).toBe('do_1')
      expect(payload.author).toBe('u1')
      expect(payload.actorName).toBe('User One')
      expect(payload.action).toBe('restored')
      expect(payload.comment).toBe('note')
    })

    it('closes the dialog and notifies success', () => {
      component.restore()
      expect(notificationSvc.moveToDraft).toHaveBeenCalled()
      expect(dialogRef.close).toHaveBeenCalledWith(true)
      expect(lastNotify()).toBe(Notify.SUCCESS)
    })

    it('still succeeds when move-to-draft fails', () => {
      notificationSvc.moveToDraft.mockReturnValue(throwError(() => 'boom'))
      component.restore()
      expect(dialogRef.close).toHaveBeenCalledWith(true)
      expect(lastNotify()).toBe(Notify.SUCCESS)
    })

    it('reports a failed restore', () => {
      apiService.post.mockReturnValue(throwError(() => ({ status: 500 })))
      component.restore()
      expect(component.onAction).toBe(false)
      expect(dialog.open).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.CONTENT_FAIL)
    })

    it('opens the error parser on a 409 conflict', () => {
      component.isMobile = true
      apiService.post.mockReturnValue(throwError(() => ({ status: 409, error: { messages: ['x'] } })))
      component.restore()
      expect(dialog.open).toHaveBeenCalled()
      const config = dialog.open.mock.calls[0][1]
      expect(config.width).toBe('90vw')
      expect(config.data.errorFromBackendData).toEqual({ messages: ['x'] })
      expect(lastNotify()).toBe(Notify.CONTENT_FAIL)
    })

    it('sizes the error parser for desktop', () => {
      component.isMobile = false
      apiService.post.mockReturnValue(throwError(() => ({ status: 409, error: {} })))
      component.restore()
      expect(dialog.open.mock.calls[0][1].width).toBe('600px')
    })
  })
})
