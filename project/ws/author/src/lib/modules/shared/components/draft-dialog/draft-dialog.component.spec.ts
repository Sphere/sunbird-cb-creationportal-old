import { FormBuilder } from '@angular/forms'
import { of, throwError } from 'rxjs'
import { DraftDialogComponent } from './draft-dialog.component'

describe('DraftDialogComponent', () => {
  let formBuilder: FormBuilder
  let snackBar: any
  let dialog: any
  let dialogRef: any
  let accessService: any
  let apiService: any
  let valueSvc: any
  let notificationSvc: any

  const data = (over: any = {}) =>
    ({
      identifier: 'do_1',
      status: 'Draft',
      children: [],
      ...over,
    }) as any

  const build = (payload: any = data()) =>
    new DraftDialogComponent(formBuilder, snackBar, dialog, dialogRef, accessService, payload, apiService, valueSvc, notificationSvc)

  beforeEach(() => {
    formBuilder = new FormBuilder()
    snackBar = { openFromComponent: jest.fn() }
    dialog = { open: jest.fn() }
    dialogRef = { close: jest.fn(), disableClose: false }
    accessService = {
      userId: 'u1',
      org: 'org1',
      rootOrg: 'rootOrg1',
      appName: 'app',
      userName: 'User One',
      orgRootOrgAsQuery: '?org=org1',
      hasRole: jest.fn().mockReturnValue(false),
    }
    apiService = { post: jest.fn().mockReturnValue(of(null)) }
    valueSvc = { isXSmall$: of(false) }
    notificationSvc = { moveToDraft: jest.fn().mockReturnValue(of({})) }
  })

  it('should be created and disable close', () => {
    const component = build()
    expect(component).toBeTruthy()
    expect(dialogRef.disableClose).toBe(true)
  })

  describe('ngOnInit', () => {
    it('seeds the form, content meta and mobile flag', () => {
      const component = build()
      component.ngOnInit()
      expect(component.contentMeta.identifier).toBe('do_1')
      expect(component.children).toBe(0)
      expect(component.isMobile).toBe(false)
      expect(component.commentsForm.get('comments')).toBeDefined()
      expect(component.commentsForm.valid).toBe(false)
    })

    it('counts children when present', () => {
      const component = build(data({ children: [{}, {}, {}] }))
      component.ngOnInit()
      expect(component.children).toBe(3)
    })

    it('marks content new for a fresh draft', () => {
      const component = build(data({ identifier: 'do_1', status: 'Draft' }))
      component.ngOnInit()
      expect(component.isNew).toBe('Yes')
    })

    it('marks content not new for a live item', () => {
      const component = build(data({ status: 'Live' }))
      component.ngOnInit()
      expect(component.isNew).toBe('No')
    })

    it('marks content not new for an image identifier', () => {
      const component = build(data({ identifier: 'do_1.img' }))
      component.ngOnInit()
      expect(component.isNew).toBe('No')
    })

    it('marks mobile when the viewport is XSmall', () => {
      valueSvc.isXSmall$ = of(true)
      const component = build()
      component.ngOnInit()
      expect(component.isMobile).toBe(true)
    })
  })

  describe('submitData', () => {
    it('unpublishes when the form is valid with an action', () => {
      const component = build()
      component.ngOnInit()
      const spy = jest.spyOn(component, 'unpublish').mockImplementation(() => {})
      component.commentsForm.get('comments')!.setValue('please pull back')
      component.commentsForm.get('action')!.setValue('pullback')
      component.submitData()
      expect(spy).toHaveBeenCalled()
    })

    it('flags the submit when the form is invalid', () => {
      const component = build()
      component.ngOnInit()
      const spy = jest.spyOn(component, 'unpublish').mockImplementation(() => {})
      component.submitData()
      expect(spy).not.toHaveBeenCalled()
      expect(component.isSubmitPressed).toBe(true)
    })
  })

  describe('unpublish', () => {
    it('posts a pull-back for a non-unpublished item and closes on success', () => {
      const component = build(data({ status: 'Draft' }))
      component.ngOnInit()
      component.commentsForm.get('comments')!.setValue('back to draft')
      component.unpublish()
      expect(component.onAction).toBe(true)
      const [, payload] = apiService.post.mock.calls[0]
      expect(payload.action).toBe('pulledBack')
      expect(payload.comment).toBe('back to draft')
      expect(notificationSvc.moveToDraft).toHaveBeenCalled()
      expect(dialogRef.close).toHaveBeenCalledWith(true)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('posts a retrieve for an already-unpublished item', () => {
      const component = build(data({ status: 'Unpublished' }))
      component.ngOnInit()
      component.commentsForm.get('comments')!.setValue('retrieve it')
      component.unpublish()
      const [, payload] = apiService.post.mock.calls[0]
      expect(payload.action).toBe('retrieved')
      expect(payload.identifier).toBe('do_1')
      expect(dialogRef.close).toHaveBeenCalledWith(true)
    })

    it('opens the error parser on a 409 conflict', () => {
      apiService.post.mockReturnValue(throwError(() => ({ status: 409, error: { msg: 'conflict' } })))
      const component = build()
      component.ngOnInit()
      component.unpublish()
      expect(component.onAction).toBe(false)
      expect(dialog.open).toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('shows a failure snackbar for a non-409 error without opening the dialog', () => {
      apiService.post.mockReturnValue(throwError(() => ({ status: 500 })))
      const component = build()
      component.ngOnInit()
      component.unpublish()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('recovers when the draft notification fails', () => {
      notificationSvc.moveToDraft.mockReturnValue(throwError(() => 'boom'))
      const component = build()
      component.ngOnInit()
      component.unpublish()
      expect(dialogRef.close).toHaveBeenCalledWith(true)
    })
  })
})
