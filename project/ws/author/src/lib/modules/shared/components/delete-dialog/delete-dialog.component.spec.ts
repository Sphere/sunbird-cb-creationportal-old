import { FormBuilder } from '@angular/forms'
import { of, throwError, Subject } from 'rxjs'
import { DeleteDialogComponent } from './delete-dialog.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('DeleteDialogComponent', () => {
  let component: DeleteDialogComponent
  let snackBar: any
  let dialog: any
  let dialogRef: any
  let accessService: any
  let apiService: any
  let valueSvc: any
  let notificationSvc: any
  let isXSmall$: Subject<boolean>

  const content = (over: any = {}): any => ({
    identifier: 'do_123',
    status: 'Draft',
    children: [],
    ...over,
  })

  const build = (data: any = content()) =>
    new DeleteDialogComponent(new FormBuilder(), snackBar, dialog, dialogRef, accessService, data, apiService, valueSvc, notificationSvc)

  beforeEach(() => {
    isXSmall$ = new Subject<boolean>()
    snackBar = { openFromComponent: jest.fn() }
    dialog = { open: jest.fn() }
    dialogRef = { close: jest.fn(), disableClose: false }
    accessService = {
      userId: 'user-1',
      userName: 'User One',
      orgRootOrgAsQuery: '?rootOrg=org1',
      hasRole: jest.fn().mockReturnValue(false),
      getCategory: jest.fn().mockReturnValue('Course'),
    }
    apiService = {
      post: jest.fn().mockReturnValue(of('OK')),
      delete: jest.fn().mockReturnValue(of('OK')),
    }
    valueSvc = { isXSmall$ }
    notificationSvc = { deleteContent: jest.fn().mockReturnValue(of({})) }

    component = build()
  })

  it('is created and disables dialog close', () => {
    expect(component).toBeTruthy()
    expect(dialogRef.disableClose).toBe(true)
  })

  describe('ngOnInit', () => {
    it('tracks the mobile breakpoint', () => {
      component.ngOnInit()

      isXSmall$.next(true)

      expect(component.isMobile).toBe(true)
    })

    it('populates content meta and children count', () => {
      component = build(content({ children: [{}, {}] }))

      component.ngOnInit()

      expect(component.contentMeta.identifier).toBe('do_123')
      expect(component.children).toBe(2)
    })

    it('treats a fresh draft as new', () => {
      component.ngOnInit()

      expect(component.isNew).toBe('Yes')
    })

    it('treats a live content as not new', () => {
      component = build(content({ status: 'Live' }))

      component.ngOnInit()

      expect(component.isNew).toBe('No')
    })

    it('builds the comments form', () => {
      component.ngOnInit()

      expect(component.commentsForm.contains('comments')).toBe(true)
      expect(component.commentsForm.valid).toBe(false)
    })
  })

  describe('submitData', () => {
    beforeEach(() => component.ngOnInit())

    it('deletes when the form is valid', () => {
      const spy = jest.spyOn(component, 'deleteContent')
      component.commentsForm.setValue({ comments: 'why', action: 'delete' })

      component.submitData()

      expect(spy).toHaveBeenCalled()
    })

    it('flags the submit press when invalid', () => {
      component.submitData()

      expect(component.isSubmitPressed).toBe(true)
    })
  })

  describe('deleteContent', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.commentsForm.setValue({ comments: 'a reason', action: 'delete' })
    })

    it('posts for a regular content and closes on success', () => {
      component.deleteContent()

      expect(apiService.post).toHaveBeenCalled()
      expect(apiService.delete).not.toHaveBeenCalled()
      expect(notificationSvc.deleteContent).toHaveBeenCalled()
      expect(dialogRef.close).toHaveBeenCalledWith(true)
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.SUCCESS } }),
      )
    })

    it('uses the delete endpoint for a Knowledge Board', () => {
      accessService.getCategory.mockReturnValue('Knowledge Board')

      component.deleteContent()

      expect(apiService.delete).toHaveBeenCalled()
      expect(apiService.post).not.toHaveBeenCalled()
      expect(dialogRef.close).toHaveBeenCalledWith(true)
    })

    it('shows a failure snackbar on a non-conflict error', () => {
      apiService.post.mockReturnValue(throwError(() => ({ status: 500 })))

      component.deleteContent()

      expect(component.onAction).toBe(false)
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.CONTENT_FAIL } }),
      )
    })

    it('opens the error parser dialog on a 409 conflict', () => {
      apiService.post.mockReturnValue(throwError(() => ({ status: 409, error: { some: 'thing' } })))

      component.deleteContent()

      expect(dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ width: '600px', data: { errorFromBackendData: { some: 'thing' } } }),
      )
    })
  })
})
