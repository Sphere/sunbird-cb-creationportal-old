import { of, throwError } from 'rxjs'
import { CertificateDialogComponent } from './certificate-upload-dialog.component'

describe('CertificateDialogComponent', () => {
  let sanitizer: any
  let dialogRef: any
  let loader: any
  let uploadService: any
  let editorService: any
  let dialog: any
  let cdr: any
  let blobs: Blob[]
  let createObjectURL: jest.Mock
  let revokeObjectURL: jest.Mock

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })
  afterAll(() => {
    ;(console.log as jest.Mock).mockRestore()
  })

  /** A minimal SVG with none of the placeholder ids present. */
  const bareSvg = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

  /** An SVG that already carries every placeholder the component fills in. */
  const templatedSvg = `<svg xmlns="http://www.w3.org/2000/svg">
      <text id="\${recipientName}"><tspan>x</tspan></text>
      <image id="QrCode" />
      <text id="\${rmNumber}"><tspan>x</tspan></text>
      <text id="\${issuedDate}"><tspan>x</tspan></text>
      <text id="\${maxScore}"><tspan>x</tspan></text>
      <text id="\${courseName}"><tspan>x</tspan></text>
    </svg>`

  const build = (data: any = { identifier: 'do_1' }) =>
    new CertificateDialogComponent(cdr, sanitizer, dialogRef, loader, uploadService, editorService, dialog, data)

  beforeEach(() => {
    sanitizer = {
      bypassSecurityTrustResourceUrl: jest.fn().mockImplementation((v: string) => `safe:${v}`),
    }
    dialogRef = { close: jest.fn() }
    loader = { changeLoad: { next: jest.fn() } }
    uploadService = {
      upload: jest
        .fn()
        .mockReturnValue(of({ status: 'successful', artifactUrl: 'cert.svg', artifactURL: 'preview.svg', identifier: 'tpl_1' })),
      templateToBatch: jest.fn().mockReturnValue(of({ ok: true })),
    }
    editorService = {
      createTemplate: jest.fn().mockReturnValue(of({ params: { status: 'successful' }, result: { identifier: 'tpl_1' } })),
    }
    dialog = { open: jest.fn() }
    cdr = { detectChanges: jest.fn() }
    ;(window as any).env = { sitePath: 'https://host' }
    // The preview is an object URL now, not a base64 data URI: certificate
    // templates inline their images and run to several MB, which a data URI
    // cannot carry. Capture the Blob so the tests can read what was rendered.
    blobs = []
    createObjectURL = jest.fn((b: Blob) => {
      blobs.push(b)
      return `blob:preview-${blobs.length}`
    })
    revokeObjectURL = jest.fn()
    ;(global as any).URL.createObjectURL = createObjectURL
    ;(global as any).URL.revokeObjectURL = revokeObjectURL
  })

  /** The markup behind the most recent preview. jsdom's Blob has no text(). */
  const renderedSvg = () =>
    new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsText(blobs[blobs.length - 1])
    })

  it('should be created', () => {
    expect(build()).toBeTruthy()
  })

  it('ngOnInit is a no-op that keeps the injected data', () => {
    const component = build({ identifier: 'do_9' })
    component.ngOnInit()
    expect(component.data).toEqual({ identifier: 'do_9' })
  })

  describe('onFileSelected', () => {
    it('reads an SVG file and renders the preview', () => {
      const component = build()
      const spy = jest.spyOn(component, 'extractSvgAttributes').mockImplementation(() => {})
      const readAsText = jest.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: any) {
        this.onload({ target: { result: bareSvg } })
      })
      component.onFileSelected({
        target: { files: [new File([bareSvg], 'cert.svg', { type: 'image/svg+xml' })] },
      })
      expect(component.file).toBeTruthy()
      // The preview is set by extractSvgAttributes, from the markup it has
      // stamped the placeholders into -- not twice, once from here as well.
      expect(spy).toHaveBeenCalledWith(bareSvg)
      expect(createObjectURL).not.toHaveBeenCalled()
      readAsText.mockRestore()
    })

    it('creates exactly one object URL for the preview', () => {
      const component = build()
      const readAsText = jest.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: any) {
        this.onload({ target: { result: bareSvg } })
      })
      component.onFileSelected({
        target: { files: [new File([bareSvg], 'cert.svg', { type: 'image/svg+xml' })] },
      })
      // Two URLs would mean the second revoking the first mid-fetch, which
      // aborts the <object> load and leaves the preview blank.
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('blob:preview-1')
      expect(revokeObjectURL).not.toHaveBeenCalled()
      readAsText.mockRestore()
    })

    it('revokes the preview URLs when the dialog closes', () => {
      const component = build()
      component.extractSvgAttributes(bareSvg)
      expect(createObjectURL).toHaveBeenCalledTimes(1)
      component.ngOnDestroy()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1')
    })

    it('clears the preview for a non-SVG file', () => {
      const component = build()
      component.svgContent = 'stale'
      component.onFileSelected({
        target: { files: [new File(['x'], 'cert.png', { type: 'image/png' })] },
      })
      expect(component.svgContent).toBeNull()
    })

    it('clears the preview when no file was chosen', () => {
      const component = build()
      component.svgContent = 'stale'
      component.onFileSelected({ target: { files: [] } })
      expect(component.svgContent).toBeNull()
    })
  })

  describe('extractSvgAttributes', () => {
    it('does nothing for empty content', () => {
      const component = build()
      component.extractSvgAttributes('')
      expect(component.svgContent).toBeUndefined()
    })

    it('injects every placeholder into a bare template', async () => {
      const component = build()
      component.extractSvgAttributes(bareSvg)
      expect(component.newRecipientName).toBe('Test User')
      const uri = sanitizer.bypassSecurityTrustResourceUrl.mock.calls[0][0] as string
      expect(uri.startsWith('blob:')).toBe(true)
      const rendered = await renderedSvg()
      expect(rendered).toContain('id="recipientName"')
      expect(rendered).toContain('id="QrCode"')
      expect(rendered).toContain('id="rmNumber"')
      expect(rendered).toContain('id="issuedDate"')
      expect(rendered).toContain('id="maxScore"')
      expect(rendered).toContain('id="courseName"')
    })

    it('points the QR code at the configured site path', async () => {
      const component = build()
      component.extractSvgAttributes(bareSvg)
      const rendered = await renderedSvg()
      expect(rendered).toContain('https://host/cbp-assets/images/qrCode.png')
    })

    it('fills the existing placeholders in a prepared template', async () => {
      const component = build()
      component.extractSvgAttributes(templatedSvg)
      const rendered = await renderedSvg()
      expect(rendered).toContain('Test User')
      expect(rendered).toContain('#09123')
      expect(rendered).toContain('100%')
      expect(rendered).toContain('Normal Labour Course')
      // The placeholder ids stay; no duplicate elements are appended.
      expect(rendered).not.toContain('id="recipientName"')
    })

    it('stamps today as the issued date', async () => {
      const component = build()
      component.extractSvgAttributes(bareSvg)
      const rendered = await renderedSvg()
      const now = new Date()
      const expected = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`
      expect(rendered).toContain(expected)
    })
  })

  describe('createTemplate', () => {
    const withFile = (data: any = { identifier: 'do_1', batches: [{ batchId: 'b1' }] }) => {
      const component = build(data)
      component.file = new File(['x'], 'my cert!.svg')
      return component
    }

    it('does nothing until a certificate has been chosen', () => {
      const component = build()
      component.createTemplate()
      expect(editorService.createTemplate).not.toHaveBeenCalled()
      expect(uploadService.upload).not.toHaveBeenCalled()
      // No spinner either -- the old code started the loader and then threw on
      // the missing file, leaving it spinning.
      expect(loader.changeLoad.next).not.toHaveBeenCalled()
    })

    it('creates the template, uploads it and attaches it to the batch', () => {
      const component = withFile()
      component.createTemplate()
      expect(editorService.createTemplate).toHaveBeenCalledWith({
        name: 'Sunbird rc certificate test',
      })
      expect(uploadService.upload).toHaveBeenCalledWith(expect.any(FormData), {
        contentId: 'tpl_1',
        contentType: '/artifacts',
      })
      expect(uploadService.templateToBatch).toHaveBeenCalled()
      expect(dialogRef.close).toHaveBeenCalled()
      expect(dialog.open).toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('builds the batch payload from the uploaded artifact', () => {
      const component = withFile()
      component.createTemplate()
      const batch = uploadService.templateToBatch.mock.calls[0][0].request.batch
      expect(batch.batchId).toBe('b1')
      expect(batch.courseId).toBe('do_1')
      expect(batch.template.template).toBe('cert.svg')
      expect(batch.template.previewUrl).toBe('preview.svg')
      expect(batch.template.identifier).toBe('tpl_1')
      expect(batch.template.criteria.enrollment.status).toBe(2)
    })

    it('sanitises the uploaded file name', () => {
      const component = withFile()
      component.createTemplate()
      const form = uploadService.upload.mock.calls[0][0] as FormData
      expect(form.get('content')).toBeTruthy()
    })

    it('clears the loader when creating the template fails', () => {
      editorService.createTemplate.mockReturnValue(throwError(() => new Error('boom')))
      const component = withFile()
      component.createTemplate()
      expect(loader.changeLoad.next).toHaveBeenNthCalledWith(1, true)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(dialog.open).toHaveBeenCalled()
    })

    it('clears the loader when the upload fails', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('boom')))
      const component = withFile()
      component.createTemplate()
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(dialogRef.close).not.toHaveBeenCalled()
    })

    it('clears the loader when attaching to the batch fails', () => {
      uploadService.templateToBatch.mockReturnValue(throwError(() => new Error('boom')))
      const component = withFile()
      component.createTemplate()
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(dialogRef.close).not.toHaveBeenCalled()
    })

    it('clears the loader when the template response is not successful', () => {
      editorService.createTemplate.mockReturnValue(of({ params: { status: 'failed' } }))
      const component = withFile()
      component.createTemplate()
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('stops with the loader cleared when the course has no batch', () => {
      const component = withFile({ identifier: 'do_1' })
      component.createTemplate()
      expect(uploadService.templateToBatch).not.toHaveBeenCalled()
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      expect(dialogRef.close).not.toHaveBeenCalled()
    })

    it('does nothing when the upload is not successful', () => {
      uploadService.upload.mockReturnValue(of({ status: 'failed' }))
      const component = withFile()
      component.createTemplate()
      expect(uploadService.templateToBatch).not.toHaveBeenCalled()
    })

    it('does nothing when the template creation is not successful', () => {
      editorService.createTemplate.mockReturnValue(of({ params: { status: 'failed' } }))
      const component = withFile()
      component.createTemplate()
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('swallows a failed template creation', () => {
      editorService.createTemplate.mockReturnValue(throwError(() => 'boom'))
      const component = withFile()
      expect(() => component.createTemplate()).not.toThrow()
      expect(uploadService.upload).not.toHaveBeenCalled()
    })
  })
})
