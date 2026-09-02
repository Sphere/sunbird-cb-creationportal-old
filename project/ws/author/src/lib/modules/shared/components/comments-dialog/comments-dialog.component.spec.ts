import { FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { CommentsDialogComponent } from './comments-dialog.component'

describe('CommentsDialogComponent', () => {
  let qualityService: any
  let dialogRef: any
  let authInitService: any
  let editorService: any
  let router: any
  let accessService: any
  let configurationsService: any
  let progressSvc: any
  let publishMessage: Subject<any>

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  const live = (over: any = {}) => ({ status: 'Live', contentType: 'Resource', ...over })
  const unit = (children: any[] = []) => ({ status: 'Draft', contentType: 'CourseUnit', children })

  const meta = (over: any = {}) =>
    ({
      identifier: 'do_1',
      status: 'Draft',
      children: [],
      comments: [],
      ...over,
    }) as any

  const build = (data: any = meta()) =>
    new CommentsDialogComponent(
      qualityService,
      new FormBuilder(),
      dialogRef,
      data,
      authInitService,
      editorService,
      router,
      accessService,
      configurationsService,
      progressSvc,
    )

  beforeEach(() => {
    publishMessage = new Subject<any>()
    qualityService = {
      fetchresult: jest.fn().mockReturnValue(of({ result: { resources: [] } })),
    }
    dialogRef = { close: jest.fn() }
    authInitService = {
      publishMessage,
      authAdditionalConfig: { allowActionHistory: true },
      changeMessage: jest.fn(),
    }
    editorService = {
      contentRead: jest.fn().mockReturnValue(of({ params: { status: 'successful' } })),
      readcontentV3: jest.fn().mockReturnValue(of(meta())),
    }
    router = { url: '/author/editor/do_1/collection', navigate: jest.fn() }
    accessService = { hasRole: jest.fn().mockReturnValue(false) }
    configurationsService = { userProfile: { userId: 'u1', userName: 'User One' } }
    progressSvc = { addComment: jest.fn().mockReturnValue(of({ ok: true })) }
  })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('seeds the comments form and the action-history flag', () => {
      const component = build()
      component.ngOnInit()
      expect(component.commentsForm.controls.comments).toBeDefined()
      expect(component.commentsForm.valid).toBe(false)
      expect(component.showNewFlow).toBe(true)
    })

    it('rejects a whitespace-only comment', () => {
      const component = build()
      component.ngOnInit()
      component.commentsForm.controls.comments.setValue('   ')
      expect(component.commentsForm.valid).toBe(false)
      component.commentsForm.controls.comments.setValue('looks good')
      expect(component.commentsForm.valid).toBe(true)
    })

    it('shows the newest comment first', () => {
      const component = build(meta({ comments: [{ id: 1 }, { id: 2 }] }))
      component.ngOnInit()
      expect(component.history).toEqual([{ id: 2 }, { id: 1 }])
    })

    it('tolerates content with no comment history', () => {
      const component = build(meta({ comments: undefined }))
      component.ngOnInit()
      expect(component.history).toEqual([])
    })

    it('loads the quality score for a publisher', () => {
      accessService.hasRole.mockReturnValue(true)
      qualityService.fetchresult.mockReturnValue(of({ result: { resources: [{ finalWeightedScore: 82.34 }] } }))
      const component = build()
      component.ngOnInit()
      expect(qualityService.fetchresult).toHaveBeenCalledWith({
        resourceId: 'do_1',
        resourceType: 'content',
        getLatestRecordEnabled: true,
      })
      expect(component.qualityResponse).toEqual({ finalWeightedScore: 82.34 })
    })

    it('skips the quality lookup for a non-publisher', () => {
      const component = build()
      component.ngOnInit()
      expect(qualityService.fetchresult).not.toHaveBeenCalled()
    })

    it('ignores a quality response with no resources', () => {
      accessService.hasRole.mockReturnValue(true)
      qualityService.fetchresult.mockReturnValue(of({}))
      const component = build()
      component.ngOnInit()
      expect(component.qualityResponse).toBeUndefined()
    })

    it('flags a course that has modules with children', () => {
      const component = build(meta({ children: [unit([live()])] }))
      component.ngOnInit()
      expect(component.isModule).toBe(true)
    })

    it('leaves isModule false for a flat course', () => {
      const component = build(meta({ children: [live()] }))
      component.ngOnInit()
      expect(component.isModule).toBe(false)
    })

    it('records that the course read succeeded', () => {
      const component = build()
      component.ngOnInit()
      expect(editorService.contentRead).toHaveBeenCalledWith('do_1')
      expect(component.courseEdited).toBe(true)
    })

    it('records an unsuccessful course read', () => {
      editorService.contentRead.mockReturnValue(of({ params: { status: 'failed' } }))
      const component = build()
      component.ngOnInit()
      expect(component.courseEdited).toBe(false)
    })

    it('records a failed course read', () => {
      editorService.contentRead.mockReturnValue(throwError(() => 'boom'))
      const component = build()
      component.ngOnInit()
      expect(component.courseEdited).toBe(false)
    })

    it('offers the publish buttons once every resource is live', () => {
      const component = build(meta({ children: [live(), unit([live()])] }))
      component.ngOnInit()
      expect(component.showPublishCBPBtn).toBe(true)
      expect(component.showPublishResourceBtn).toBe(true)
    })

    it('hides the publish buttons while a resource is still draft', () => {
      const component = build(meta({ children: [live(), unit([{ status: 'Draft' }])] }))
      component.ngOnInit()
      expect(component.showPublishCBPBtn).toBe(false)
    })

    it('hides the publish buttons for an empty course', () => {
      const component = build()
      component.ngOnInit()
      expect(component.showPublishCBPBtn).toBe(false)
    })
  })

  describe('updateUI', () => {
    it('offers the publish buttons once every resource is live', async () => {
      const component = build()
      await component.updateUI(meta({ children: [live(), unit([live()])] }))
      expect(component.showPublishCBPBtn).toBe(true)
      expect(component.showPublishResourceBtn).toBe(true)
    })

    it('refreshes the course while resources are still pending', async () => {
      const component = build()
      const spy = jest.spyOn(component, 'refreshCourse').mockImplementation(() => {})
      await component.updateUI(meta({ children: [{ status: 'Draft', contentType: 'Resource' }] }))
      expect(spy).toHaveBeenCalled()
      expect(component.showPublishCBPBtn).toBe(false)
    })

    it('does nothing for an empty payload', async () => {
      const component = build()
      const spy = jest.spyOn(component, 'refreshCourse').mockImplementation(() => {})
      await component.updateUI(null)
      expect(spy).not.toHaveBeenCalled()
    })

    it('runs from the publish message', async () => {
      const component = build()
      const spy = jest.spyOn(component, 'refreshCourse').mockImplementation(() => {})
      publishMessage.next(meta({ children: [{ status: 'Draft', contentType: 'Resource' }] }))
      await Promise.resolve()
      expect(spy).toHaveBeenCalled()
    })

    it('ignores a falsy publish message', async () => {
      const component = build()
      const spy = jest.spyOn(component, 'refreshCourse').mockImplementation(() => {})
      publishMessage.next(null)
      await Promise.resolve()
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('refreshCourse', () => {
    it('re-reads the course from the route id', () => {
      const component = build()
      component.contentMeta = meta()
      component.refreshCourse()
      expect(editorService.readcontentV3).toHaveBeenCalledWith('do_1')
    })

    // refreshCourse() replaces contentMeta with the re-read payload before counting,
    // so the tallies below are driven by what readcontentV3 returns.
    it('reveals the publish buttons once everything is live', () => {
      jest.useFakeTimers()
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [live(), unit([live()])] })))
      const component = build()
      component.contentMeta = meta()
      component.refreshCourse()
      jest.advanceTimersByTime(1100)
      expect(component.showPublishCBPBtn).toBe(true)
      jest.useRealTimers()
    })

    it('keeps the publish buttons hidden while work remains', () => {
      jest.useFakeTimers()
      editorService.readcontentV3.mockReturnValue(of(meta({ children: [unit([{ status: 'Review' }])] })))
      const component = build()
      component.contentMeta = meta()
      component.refreshCourse()
      jest.advanceTimersByTime(1100)
      expect(component.showPublishCBPBtn).toBe(false)
      jest.useRealTimers()
    })
  })

  describe('getQualityPercent', () => {
    it('formats the score to one decimal for a publisher', () => {
      const component = build()
      component.role = true
      component.qualityResponse = { finalWeightedScore: 82.38 } as any
      expect(component.getQualityPercent).toBe('82.4')
    })

    it('formats a missing score as zero', () => {
      const component = build()
      component.role = true
      component.qualityResponse = { finalWeightedScore: 0 } as any
      expect(component.getQualityPercent).toBe('0.0')
    })

    it('returns nothing for a non-publisher', () => {
      const component = build()
      component.role = false
      expect(component.getQualityPercent).toBeUndefined()
    })
  })

  describe('showError', () => {
    it('is false for a pristine control', () => {
      const component = build()
      component.ngOnInit()
      expect(component.showError(component.commentsForm.controls.comments)).toBe(false)
    })

    it('is true for a dirty invalid control after submit', () => {
      const component = build()
      component.ngOnInit()
      component.isSubmitPressed = true
      component.commentsForm.controls.comments.markAsDirty()
      expect(component.showError(component.commentsForm.controls.comments)).toBe(true)
    })

    it('is false for a dirty invalid control before submit', () => {
      const component = build()
      component.ngOnInit()
      component.commentsForm.controls.comments.markAsDirty()
      expect(component.showError(component.commentsForm.controls.comments)).toBe(false)
    })

    it('is false once the control is valid', () => {
      const component = build()
      component.ngOnInit()
      component.isSubmitPressed = true
      component.commentsForm.controls.comments.setValue('ok')
      expect(component.showError(component.commentsForm.controls.comments)).toBe(false)
    })
  })

  describe('submitData', () => {
    it('closes the dialog with the form once a comment is entered', () => {
      const component = build()
      component.ngOnInit()
      component.commentsForm.controls.comments.setValue('looks good')
      component.submitData()
      expect(dialogRef.close).toHaveBeenCalledWith(component.commentsForm)
    })

    it('marks the field touched when no comment was entered', () => {
      const component = build()
      component.ngOnInit()
      component.submitData()
      expect(dialogRef.close).not.toHaveBeenCalled()
      expect(component.commentsForm.controls.comments.touched).toBe(true)
    })
  })

  describe('actions', () => {
    it('viewDetails closes the dialog and opens the checklist', () => {
      const component = build()
      component.ngOnInit()
      component.viewDetails()
      expect(dialogRef.close).toHaveBeenCalled()
      expect(router.navigate).toHaveBeenCalledWith(['/author/reviewerChecklist/do_1'])
    })

    it('publishCourse broadcasts the publish message', () => {
      const component = build()
      component.publishCourse()
      expect(authInitService.changeMessage).toHaveBeenCalledWith('PublishCBP')
    })

    it('click relays an arbitrary action', () => {
      const component = build()
      component.click('publishResources')
      expect(authInitService.changeMessage).toHaveBeenCalledWith('publishResources')
    })
  })

  describe('moveCourseToDraft', () => {
    it('records a publisher rejection and moves the course to draft', () => {
      accessService.hasRole.mockImplementation((r: string[]) => r[0] === 'content_publisher')
      const component = build()
      component.ngOnInit()
      component.commentsForm.controls.comments.setValue('needs work')
      component.moveCourseToDraft()
      const payload = progressSvc.addComment.mock.calls[0][0]
      expect(payload.role).toBe('publisher')
      expect(payload.currentStatus).toBe('Sent for Publish')
      expect(payload.nextStatus).toBe('Draft')
      expect(payload.comments).toBe('needs work')
      expect(payload.courseId).toBe('do_1')
      expect(authInitService.changeMessage).toHaveBeenCalledWith('MoveCourseToDraft')
    })

    it('records a reviewer rejection', () => {
      accessService.hasRole.mockImplementation((r: string[]) => r[0] === 'content_reviewer')
      const component = build()
      component.ngOnInit()
      component.moveCourseToDraft()
      const payload = progressSvc.addComment.mock.calls[0][0]
      expect(payload.role).toBe('reviewer')
      expect(payload.currentStatus).toBe('Sent for Review')
    })

    it('falls back to the creator role', () => {
      const component = build()
      component.ngOnInit()
      component.moveCourseToDraft()
      expect(progressSvc.addComment.mock.calls[0][0].role).toBe('creator')
    })

    it('substitutes a default comment when none was typed', () => {
      const component = build()
      component.ngOnInit()
      component.commentsForm.controls.comments.setValue('')
      component.moveCourseToDraft()
      expect(progressSvc.addComment.mock.calls[0][0].comments).toBe('Sending the course back to draft status from creator')
    })

    it('still moves the course to draft when the comment fails to save', () => {
      progressSvc.addComment.mockReturnValue(throwError(() => 'boom'))
      const component = build()
      component.ngOnInit()
      component.moveCourseToDraft()
      expect(authInitService.changeMessage).toHaveBeenCalledWith('MoveCourseToDraft')
    })

    it('does not move the course when the comment save reports nothing', () => {
      progressSvc.addComment.mockReturnValue(of(null))
      const component = build()
      component.ngOnInit()
      component.moveCourseToDraft()
      expect(authInitService.changeMessage).not.toHaveBeenCalled()
    })

    it('does nothing without content metadata', () => {
      const component = build()
      component.contentMeta = undefined as any
      component.moveCourseToDraft()
      expect(progressSvc.addComment).not.toHaveBeenCalled()
    })
  })
})
