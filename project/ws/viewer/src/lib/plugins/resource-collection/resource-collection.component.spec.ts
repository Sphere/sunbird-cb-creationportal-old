import { of, throwError } from 'rxjs'
import { ResourceCollectionComponent } from './resource-collection.component'

describe('ResourceCollectionComponent', () => {
  let component: ResourceCollectionComponent
  let snackBar: any
  let resourceSvc: any
  let dialog: any

  const submissions = [{ url: 'a.pdf', submission_type: 'application/pdf', submission_time: '2026-07-01' }]

  const pdf = () => new File(['x'], 'answer.pdf', { type: 'application/pdf' })
  const mp4 = () => new File(['x'], 'answer.mp4', { type: 'video/mp4' })
  const png = () => new File(['x'], 'answer.png', { type: 'image/png' })

  const snackMessages = () => snackBar.open.mock.calls.map((c: any[]) => c[0])

  beforeEach(() => {
    snackBar = { open: jest.fn() }
    resourceSvc = {
      getAllSubmission: jest.fn().mockReturnValue(of({ response: submissions })),
      createContentDirectory: jest.fn().mockReturnValue(of({})),
      uploadFile: jest.fn().mockReturnValue(of({ contentUrl: 'https://cdn/a.pdf' })),
      postSubmission: jest.fn().mockReturnValue(of({ response: 'Success' })),
    }
    dialog = { open: jest.fn() }

    component = new ResourceCollectionComponent(snackBar, resourceSvc, dialog)
    component.resourceCollectionData = { identifier: 'do_res1' } as any
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.answerControl.value).toBe('')
    expect(component.currentTabIndex).toBe(0)
    expect(component.type).toBe('all')
    expect(component.fetchingStatus).toBe('fetched')
    expect(component.submitData).toEqual({ isSubmit: false, value: 0 })
  })

  describe('ngOnInit', () => {
    it('loads the existing submissions into the table', () => {
      component.ngOnInit()

      expect(resourceSvc.getAllSubmission).toHaveBeenCalledWith('all', 'do_res1')
      expect(component.submissionData).toEqual(submissions)
      expect(component.dataSource.data).toEqual(submissions)
      expect(component.fetchingStatus).toBe('fetched')
    })

    it('leaves the table empty when there is nothing submitted yet', () => {
      resourceSvc.getAllSubmission.mockReturnValue(of({ response: [] }))

      component.ngOnInit()

      expect(component.submissionData).toEqual([])
      expect(component.fetchingStatus).toBe('fetched')
    })

    it('wires the paginator onto the table', () => {
      const paginator = {} as any
      component.paginator = paginator

      component.ngOnInit()

      expect(component.dataSource.paginator).toBe(paginator)
    })
  })

  describe('changeFile', () => {
    it('takes the first picked file', () => {
      component.changeFile([pdf(), mp4()])

      expect(component.selectedFile!.name).toBe('answer.pdf')
    })

    it('replaces a previously picked file', () => {
      component.changeFile([pdf()])

      component.changeFile([mp4()])

      expect(component.selectedFile!.name).toBe('answer.mp4')
    })
  })

  describe('submit from the text tab', () => {
    it('rejects an answer that is too short', () => {
      component.answerControl.setValue('too short')

      component.submit()

      expect(resourceSvc.createContentDirectory).not.toHaveBeenCalled()
      expect(component.submitData.isSubmit).toBe(false)
      expect(component.fetchingStatus).toBe('fetched')
      expect(snackMessages()).toContain('Please enter your answer')
    })

    it('uploads a long enough answer as a text file', () => {
      component.answerControl.setValue('a long enough answer')

      component.submit()

      expect(resourceSvc.createContentDirectory).toHaveBeenCalledWith('do_res1')
      expect(resourceSvc.uploadFile).toHaveBeenCalled()
      expect(component.answerControl.value).toBeNull()
      expect(snackMessages()).toContain('Submitted Successfully')
    })
  })

  describe('submit from the upload tab', () => {
    beforeEach(() => {
      component.currentTabIndex = 1
    })

    it('asks for a file when none was picked', () => {
      component.submit()

      expect(resourceSvc.createContentDirectory).not.toHaveBeenCalled()
      expect(component.submitData.isSubmit).toBe(false)
      expect(snackMessages()).toContain('Please upload your answer')
    })

    it.each([
      ['pdf', pdf],
      ['mp4', mp4],
    ])('uploads a %s answer', (_label, make) => {
      component.selectedFile = make()

      component.submit()

      expect(resourceSvc.createContentDirectory).toHaveBeenCalledWith('do_res1')
      expect(resourceSvc.uploadFile).toHaveBeenCalled()
    })

    it('rejects an unsupported file type and clears the picker', () => {
      component.selectedFile = png()

      component.submit()

      expect(resourceSvc.createContentDirectory).not.toHaveBeenCalled()
      expect(component.selectedFile).toBeNull()
      expect(snackMessages()).toContain('Invalid File Type')
    })
  })

  describe('createContentDirectory', () => {
    it('carries on uploading when the directory already exists', () => {
      resourceSvc.createContentDirectory.mockReturnValue(throwError(() => ({ status: 409 })))

      component.createContentDirectory(pdf())

      expect(resourceSvc.uploadFile).toHaveBeenCalled()
    })

    it('reports any other directory failure', () => {
      resourceSvc.createContentDirectory.mockReturnValue(throwError(() => ({ status: 500 })))

      component.createContentDirectory(pdf())

      expect(resourceSvc.uploadFile).not.toHaveBeenCalled()
      expect(component.message).toBe('Error creating content directory')
      expect(component.submitData).toEqual({ isSubmit: false, value: 0 })
    })
  })

  describe('uploadFile', () => {
    it('names the upload with its expected extension and posts the submission', () => {
      component.uploadFile(pdf())

      const [formData, identifier] = resourceSvc.uploadFile.mock.calls[0]
      expect(identifier).toBe('do_res1')
      expect((formData.get('file') as File).name).toMatch(/^Submission_\d+\.pdf$/)
      expect(resourceSvc.postSubmission).toHaveBeenCalledWith({ submission_type: 'application/pdf', url: 'https://cdn/a.pdf' }, 'do_res1')
      expect(component.message).toBe('Submitted Successfully')
      expect(component.submitData).toEqual({ isSubmit: false, value: 0 })
    })

    it('falls back to the text extension for a file with no type', () => {
      component.uploadFile(new File(['x'], 'answer'))

      const formData = resourceSvc.uploadFile.mock.calls[0][0]
      expect((formData.get('file') as File).name).toMatch(/\.txt$/)
      expect(resourceSvc.postSubmission).toHaveBeenCalledWith(expect.objectContaining({ submission_type: 'input' }), 'do_res1')
    })

    it('refreshes the submission list after a successful post', () => {
      component.uploadFile(pdf())

      expect(resourceSvc.getAllSubmission).toHaveBeenCalled()
    })

    it('does nothing further when the upload returns no url', () => {
      resourceSvc.uploadFile.mockReturnValue(of({}))

      component.uploadFile(pdf())

      expect(resourceSvc.postSubmission).not.toHaveBeenCalled()
    })

    it('reports an upload failure', () => {
      resourceSvc.uploadFile.mockReturnValue(throwError(() => new Error('boom')))

      component.uploadFile(pdf())

      expect(component.message).toBe('Error uploading file')
      expect(component.fetchingStatus).toBe('fetched')
      expect(component.submitData.isSubmit).toBe(false)
    })

    it('reports a submission failure', () => {
      resourceSvc.postSubmission.mockReturnValue(throwError(() => new Error('boom')))

      component.uploadFile(pdf())

      expect(component.message).toBe('Error submitting file')
      expect(component.fetchingStatus).toBe('fetched')
      expect(component.submitData).toEqual({ isSubmit: false, value: 0 })
    })

    it('leaves the state alone when the submission is not acknowledged', () => {
      resourceSvc.postSubmission.mockReturnValue(of({ response: 'Nope' }))

      component.uploadFile(pdf())

      expect(component.message).toBeNull()
    })
  })

  describe('reset', () => {
    it('clears the picked file on the upload tab', () => {
      component.currentTabIndex = 1
      component.selectedFile = pdf()

      component.reset()

      expect(component.selectedFile).toBeNull()
    })

    it('clears the typed answer on the text tab', () => {
      component.answerControl.setValue('some answer')

      component.reset()

      expect(component.answerControl.value).toBeNull()
    })

    it('does nothing on any other tab', () => {
      component.currentTabIndex = 5
      component.answerControl.setValue('some answer')

      component.reset()

      expect(component.answerControl.value).toBe('some answer')
    })
  })

  describe('openDialog', () => {
    it('opens a submission at its natural height', () => {
      component.openDialog('a.pdf', 'application/pdf', '2026-07-01')

      expect(component.dialogHeight).toBe('auto')
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        width: '100vw',
        height: 'auto',
        data: { url: 'a.pdf', type: 'application/pdf', date: '2026-07-01' },
      })
    })

    it('gives a video submission a taller dialog', () => {
      component.openDialog('a.mp4', 'video/mp4', '2026-07-01')

      expect(component.dialogHeight).toBe('80%')
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ height: '80%' }))
    })
  })
})
