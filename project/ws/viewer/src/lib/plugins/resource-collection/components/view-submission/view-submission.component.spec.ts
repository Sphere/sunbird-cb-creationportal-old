import { of } from 'rxjs'
import { ViewSubmissionComponent } from './view-submission.component'

describe('ViewSubmissionComponent', () => {
  let dialogRef: { close: jest.Mock }
  let resourceSvc: { readContentTextFile: jest.Mock }
  let snackBar: { open: jest.Mock }

  const makeComp = (data: { url: string; type: string }) => {
    dialogRef = { close: jest.fn() }
    resourceSvc = { readContentTextFile: jest.fn() }
    snackBar = { open: jest.fn() }
    return new ViewSubmissionComponent(dialogRef as any, resourceSvc as any, snackBar as any, data)
  }

  describe('constructor', () => {
    it('should set submissionUrl and map type via supportedFormatsHash', () => {
      const comp = makeComp({ url: 'http://x/file.pdf', type: 'application/pdf' })
      expect(comp.submissionUrl).toBe('http://x/file.pdf')
      expect(comp.submissionType).toBe('pdf')
    })

    it('should leave defaults when data has no url/type', () => {
      const comp = makeComp({ url: '', type: '' })
      expect(comp.submissionUrl).toBe('')
      expect(comp.submissionType).toBe('')
    })

    it('should map video and input types', () => {
      expect(makeComp({ url: 'u', type: 'video/mp4' }).submissionType).toBe('mp4')
      expect(makeComp({ url: 'u', type: 'input' }).submissionType).toBe('txt')
    })
  })

  describe('ngOnInit', () => {
    it('should read text file and filter empty lines for txt', () => {
      const comp = makeComp({ url: 'http://x/a.txt', type: 'input' })
      resourceSvc.readContentTextFile.mockReturnValue(of('line1\n\nline2\n'))
      comp.ngOnInit()
      expect(resourceSvc.readContentTextFile).toHaveBeenCalledWith('http://x/a.txt')
      expect(comp.submissionAnswerText).toEqual(['line1', 'line2'])
    })

    it('should set videoData for mp4', () => {
      const comp = makeComp({ url: 'http://x/a.mp4', type: 'video/mp4' })
      comp.ngOnInit()
      expect(comp.videoData).toEqual({ url: 'http://x/a.mp4', disableTelemetry: true })
    })

    it('should set pdfData for pdf', () => {
      const comp = makeComp({ url: 'http://x/a.pdf', type: 'application/pdf' })
      comp.ngOnInit()
      expect(comp.pdfData).toEqual({ pdfUrl: 'http://x/a.pdf', hideControls: true })
    })

    it('should snackbar Invalid Type and close for unknown supported type', () => {
      const comp = makeComp({ url: 'http://x/a', type: 'application/zip' })
      // submissionType is undefined (not in hash) but url present -> else branch
      comp.ngOnInit()
      expect(snackBar.open).toHaveBeenCalledWith('Invalid Type', 'X', { duration: 1000 })
      expect(dialogRef.close).toHaveBeenCalled()
    })

    it('should snackbar Invalid Content and close when no url', () => {
      const comp = makeComp({ url: '', type: '' })
      comp.ngOnInit()
      expect(snackBar.open).toHaveBeenCalledWith('Invalid Content', 'X', { duration: 1000 })
      expect(dialogRef.close).toHaveBeenCalled()
    })
  })

  describe('close', () => {
    it('should reset data and close dialog', () => {
      const comp = makeComp({ url: 'http://x/a.pdf', type: 'application/pdf' })
      comp.pdfData = { pdfUrl: 'u', hideControls: true }
      comp.videoData = { url: 'u', disableTelemetry: true }
      comp.close()
      expect(comp.pdfData).toBeNull()
      expect(comp.videoData).toBeNull()
      expect(dialogRef.close).toHaveBeenCalled()
    })
  })
})
