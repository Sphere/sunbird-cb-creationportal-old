import { of, throwError } from 'rxjs'

import { AppTocCertificateModalComponent } from './app-toc-certificate-modal.component'

jest.mock('file-saver', () => ({ saveAs: jest.fn() }))
// eslint-disable-next-line @typescript-eslint/no-var-requires
const FileSaver = require('file-saver')

describe('AppTocCertificateModalComponent', () => {
  let dialogRef: any
  let sanitizer: any
  let editorService: any
  let loader: any

  const template = (url: string) => ({ cert_templates: { t1: { url } } })

  const build = (batchResponse: any, data: any = {}) => {
    dialogRef = { close: jest.fn() }
    sanitizer = { bypassSecurityTrustUrl: jest.fn((u: string) => `safe:${u}`) }
    editorService = { getBatchforCert: jest.fn().mockReturnValue(batchResponse) }
    loader = { changeLoad: { next: jest.fn() } }
    return new AppTocCertificateModalComponent(dialogRef, { content: { identifier: 'do_1' }, ...data }, sanitizer, editorService, loader)
  }

  describe('loading the certificate', () => {
    it('asks for the batches of this course, newest first', () => {
      const c = build(of([template('http://x/cert.svg')]))
      c.ngOnInit()

      expect(editorService.getBatchforCert).toHaveBeenCalledWith({
        request: {
          filters: { courseId: 'do_1', status: ['0', '1', '2'] },
          sort_by: { createdDate: 'desc' },
        },
      })
    })

    it('shows the loader while fetching', () => {
      const c = build(of([template('http://x/cert.svg')]))
      c.ngOnInit()

      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
    })

    it('takes the certificate url from the first template and sanitises it', () => {
      const c = build(of([template('http://x/cert.svg')]))
      c.ngOnInit()

      expect(c.url).toBe('http://x/cert.svg')
      expect(sanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith('http://x/cert.svg')
      expect(c.img).toBe('safe:http://x/cert.svg')
      expect(c.isLoading).toBe(false)
    })

    it.each([
      ['no templates on the batch', [{ cert_templates: null }]],
      ['no batches at all', []],
    ])('stops loading without a url when there are %s', (_label, response) => {
      const c = build(of(response))
      c.ngOnInit()

      expect(c.url).toBe('')
      expect(c.isLoading).toBe(false)
    })
  })

  describe('downloading', () => {
    const okFetch = () => jest.fn().mockResolvedValue({ ok: true, text: jest.fn().mockResolvedValue('<svg/>') })

    beforeEach(() => {
      ;(FileSaver.saveAs as jest.Mock).mockClear()
      ;(global as any).URL.createObjectURL = jest.fn(() => 'blob:1')
      ;(global as any).URL.revokeObjectURL = jest.fn()
      ;(global as any).alert = jest.fn()
    })

    it('saves the fetched svg under the configured name', async () => {
      ;(global as any).fetch = okFetch()
      const c = build(of([template('http://x/cert.svg')]), { tocConfig: 'my-course' })
      c.ngOnInit()

      await c.downloadCertificate()

      expect(FileSaver.saveAs).toHaveBeenCalledWith('blob:1', 'my-course.svg')
      expect(c.isLoading).toBe(false)
    })

    it('falls back to "certificate" when no name is configured', async () => {
      ;(global as any).fetch = okFetch()
      const c = build(of([template('http://x/cert.svg')]))
      c.ngOnInit()

      await c.downloadCertificate()

      expect(FileSaver.saveAs).toHaveBeenCalledWith('blob:1', 'certificate.svg')
    })

    it('releases the object url once saved', async () => {
      ;(global as any).fetch = okFetch()
      const c = build(of([template('http://x/cert.svg')]))
      c.ngOnInit()

      await c.downloadCertificate()

      expect((global as any).URL.revokeObjectURL).toHaveBeenCalledWith('blob:1')
    })

    it.each([
      ['the response is not ok', jest.fn().mockResolvedValue({ ok: false })],
      ['the request throws', jest.fn().mockRejectedValue(new Error('offline'))],
    ])('tells the user and stops loading when %s', async (_label, fetchImpl) => {
      ;(global as any).fetch = fetchImpl
      const c = build(of([template('http://x/cert.svg')]))
      c.ngOnInit()

      await c.downloadCertificate()

      expect((global as any).alert).toHaveBeenCalled()
      expect(FileSaver.saveAs).not.toHaveBeenCalled()
      expect(c.isLoading).toBe(false)
    })
  })

  describe('when the batch lookup fails', () => {
    it('stops the dialog spinner instead of hanging on it', () => {
      const c = build(throwError(() => new Error('500')))
      c.ngOnInit()

      expect(c.isLoading).toBe(false)
    })

    it('clears the global loader, which used to stay up for the rest of the session', () => {
      const c = build(throwError(() => new Error('500')))
      c.ngOnInit()

      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  it('clears the global loader on success too', () => {
    const c = build(of([template('http://x/cert.svg')]))
    c.ngOnInit()

    expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
  })
})
