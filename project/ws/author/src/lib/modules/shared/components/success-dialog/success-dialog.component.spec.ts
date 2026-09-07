import { of } from 'rxjs'
import { SuccessDialogComponent } from './success-dialog.component'

describe('SuccessDialogComponent', () => {
  let dialogRef: any
  let router: any
  let dialog: any
  let editorService: any
  let configSvc: any
  let progressSvc: any
  let data: any

  const build = () => new SuccessDialogComponent(dialogRef, data, router, dialog, editorService, configSvc, progressSvc)

  beforeEach(() => {
    dialogRef = { disableClose: false, close: jest.fn() }
    router = { navigate: jest.fn() }
    dialog = { closeAll: jest.fn() }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of({ status: 'Draft', batches: undefined })),
      createBatch: jest.fn().mockReturnValue(of({ ok: true })),
    }
    configSvc = { userProfile: { userId: 'u-1', userName: 'author' } }
    progressSvc = { addComment: jest.fn().mockReturnValue(of({ done: true })) }
    data = { id: 'do_123', cert_upload: '' }
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('should be created and disable close on the dialog ref', () => {
    const component = build()
    expect(component).toBeTruthy()
    expect(dialogRef.disableClose).toBe(true)
  })

  describe('ngOnInit', () => {
    it('reads the content after the 500ms delay', () => {
      jest.useFakeTimers()
      const component = build()
      component.ngOnInit()
      expect(editorService.readcontentV3).not.toHaveBeenCalled()
      jest.advanceTimersByTime(500)
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_123')
    })
  })

  describe('routeToDashboard', () => {
    it('closes all dialogs and navigates to the cbp dashboard', () => {
      const component = build()
      component.routeToDashboard()
      expect(dialog.closeAll).toHaveBeenCalled()
      expect(router.navigate).toHaveBeenCalledWith(['author', 'cbp'])
    })

    it('skips the content read when cert_upload is "Yes"', () => {
      data.cert_upload = 'Yes'
      const component = build()
      component.routeToDashboard()
      expect(editorService.readcontentV3).not.toHaveBeenCalled()
      expect(dialog.closeAll).toHaveBeenCalled()
    })

    it('does not create a batch when the content is a draft', () => {
      editorService.readcontentV3.mockReturnValue(of({ status: 'Draft', batches: undefined }))
      const component = build()
      component.routeToDashboard()
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_123')
      expect(progressSvc.addComment).not.toHaveBeenCalled()
      expect(editorService.createBatch).not.toHaveBeenCalled()
    })

    it('adds a publish comment and creates a batch when the content is Live', async () => {
      editorService.readcontentV3.mockReturnValue(of({ status: 'Live', batches: undefined }))
      const component = build()
      component.routeToDashboard()
      expect(progressSvc.addComment).toHaveBeenCalled()
      expect(editorService.createBatch).toHaveBeenCalled()
      const batchArg = editorService.createBatch.mock.calls[0][0]
      expect(batchArg.request.courseId).toBe('do_123')
      expect(batchArg.request.createdBy).toBe('u-1')
    })

    it('tolerates an addComment error path', () => {
      editorService.readcontentV3.mockReturnValue(of({ status: 'Live', batches: undefined }))
      progressSvc.addComment.mockReturnValue({
        subscribe: (_next: any, _err: any) => {
          _err('boom')
        },
      })
      const component = build()
      expect(() => component.routeToDashboard()).not.toThrow()
    })
  })
})
