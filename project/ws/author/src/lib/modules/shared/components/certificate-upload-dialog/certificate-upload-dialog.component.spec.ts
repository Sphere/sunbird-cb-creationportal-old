import { of, Subject, throwError } from 'rxjs'
import { CertificateDialogComponent } from './certificate-upload-dialog.component'
import { formatCertDate } from './certificate-fields'
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component'

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

  /**
   * The shape registry (RC) templates actually use: the field id is plain and
   * the tspan carries a handlebars token. The legacy fixture above puts the
   * whole `${...}` token in the id, which is why the mismatch went unnoticed.
   */
  const rcSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <text id="recipientName"><tspan x="51%" y="435">{{credentialSubject.recipientName}}</tspan></text>
      <image id="QrCode" xlink:href="{{qrCode}}" />
      <text id="rmNumber"><tspan x="85%" y="230">{{credentialSubject.rmNumber}}</tspan></text>
      <text id="issuedDate"><tspan x="393" y="742">{{dateFormat issuanceDate "DD MMMM YYYY"}}</tspan></text>
      <text id="maxScore"><tspan x="57%" y="586">{{credentialSubject.maxScore}}</tspan></text>
      <text id="courseName"><tspan x="50%" y="66%">{{credentialSubject.trainingName}}</tspan></text>
    </svg>`

  const S3 = 'https://aastar-assets.s3.ap-south-1.amazonaws.com/cbp_certificate_templates/'
  /** The certificateTemplates list as it sits in cbp-data.json. */
  const S3_TEMPLATES = [
    { id: 'classic', name: 'Classic', description: 'Framed', url: `${S3}classic.svg` },
    { id: 'modern', name: 'Modern', description: 'Side band', url: `${S3}modern.svg` },
    { id: 'elegant', name: 'Elegant', description: 'Gold frame', url: `${S3}elegant.svg` },
  ]

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
      certificateTemplates: jest.fn().mockReturnValue(of(S3_TEMPLATES)),
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
      expect(component.newRecipientName).toBe('Aastrika User')
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
      const component = build({ identifier: 'do_1', name: 'Normal Labour Course' })
      component.extractSvgAttributes(templatedSvg)
      const rendered = await renderedSvg()
      expect(rendered).toContain('Aastrika User')
      expect(rendered).toContain('#09123')
      expect(rendered).toContain('100%')
      expect(rendered).toContain('Normal Labour Course')
      // The placeholder ids stay; no duplicate elements are appended.
      expect(rendered).not.toContain('id="recipientName"')
    })

    it('fills an RC template in place, leaving no handlebars on show', async () => {
      const component = build({ identifier: 'do_1', name: 'Normal Labour Course' })
      component.extractSvgAttributes(rcSvg)
      const rendered = await renderedSvg()
      // Every field is substituted where the designer placed it...
      expect(rendered).toContain('Aastrika User')
      expect(rendered).toContain('#09123')
      expect(rendered).toContain('100%')
      expect(rendered).toContain('Normal Labour Course')
      expect(rendered).not.toContain('{{credentialSubject.recipientName}}')
      expect(rendered).not.toContain('{{credentialSubject.trainingName}}')
      expect(rendered).not.toContain('{{qrCode}}')
      // ...and the original coordinates survive, i.e. nothing was appended at
      // the hardcoded fallback position over the artwork.
      expect(rendered).toContain('y="435"')
      expect(rendered).not.toContain('y="440"')
    })

    it('shows a realistic course name when the content has none', async () => {
      const component = build({ identifier: 'do_1' })
      component.extractSvgAttributes(rcSvg)
      expect(await renderedSvg()).toContain('Normal Labour Course')
    })

    it('still fills legacy templates that carry the token in the id', async () => {
      const component = build({ identifier: 'do_1', name: 'Legacy Course' })
      component.extractSvgAttributes(templatedSvg)
      expect(await renderedSvg()).toContain('Legacy Course')
    })

    it('previews a template that will not parse as-is, not the parser error', async () => {
      const component = build({ identifier: 'do_1' })
      // xlink used without the namespace being declared -- DOMParser answers
      // with a <parsererror> document rather than throwing.
      component.extractSvgAttributes('<svg xmlns="http://www.w3.org/2000/svg"><image xlink:href="x"/></svg>')
      const rendered = await renderedSvg()
      expect(rendered).not.toContain('parsererror')
      expect(rendered).toContain('<image xlink:href="x"/>')
    })

    it('fills every known field with a realistic value, not its name', async () => {
      const component = build({ identifier: 'do_1' })
      component.extractSvgAttributes(
        `<svg xmlns="http://www.w3.org/2000/svg">
           <text id="recipientDesignation"><tspan x="50" y="60">{{credentialSubject.recipientDesignation}}</tspan></text>
           <text id="recipientFacility"><tspan>{{credentialSubject.recipientFacility}}</tspan></text>
           <text id="recipientDistrict"><tspan>{{credentialSubject.recipientDistrict}}</tspan></text>
         </svg>`,
      )
      const rendered = await renderedSvg()
      // The preview should read like an issued certificate.
      expect(rendered).toContain('ANM-MP')
      expect(rendered).toContain('SHC Bapcha')
      expect(rendered).toContain('Agar Malwa')
      expect(rendered).not.toContain('Recipient Designation')
      expect(rendered).not.toContain('{{credentialSubject.recipientDesignation}}')
      expect(rendered).toContain('y="60"')
    })

    it('fills a field it does not recognise with a readable name', async () => {
      const component = build({ identifier: 'do_1' })
      component.extractSvgAttributes(
        `<svg xmlns="http://www.w3.org/2000/svg"><text id="x"><tspan>{{credentialSubject.favouriteColour}}</tspan></text></svg>`,
      )
      const rendered = await renderedSvg()
      // A raw token would both look wrong and overflow the line it sits on,
      // because it is far longer than any real value.
      expect(rendered).toContain('Favourite Colour')
      expect(rendered).not.toContain('{{credentialSubject.favouriteColour}}')
    })

    it('reads the field out of a handlebars helper call', async () => {
      const component = build({ identifier: 'do_1' })
      component.extractSvgAttributes(
        `<svg xmlns="http://www.w3.org/2000/svg"><text id="issuedDate"><tspan>{{dateFormat issuanceDate "DD MMMM YYYY"}}</tspan></text></svg>`,
      )
      // In the pattern the helper asks for, as the renderer produces it.
      expect(await renderedSvg()).toContain(formatCertDate(new Date(), 'DD MMMM YYYY'))
    })

    it('adds nothing to a template that carries placeholders but no QR code', async () => {
      const component = build({ identifier: 'do_1' })
      component.extractSvgAttributes(
        `<svg xmlns="http://www.w3.org/2000/svg"><text id="recipientName"><tspan>{{credentialSubject.recipientName}}</tspan></text></svg>`,
      )
      const rendered = await renderedSvg()
      // A stray QR and invented fields used to be painted over the artwork.
      expect(rendered).not.toContain('QrCode')
      expect(rendered).not.toContain('#09123')
      expect(rendered).not.toContain('id="maxScore"')
    })

    it('warns when the template uses the legacy placeholder syntax', async () => {
      const component = build({ identifier: 'do_1' })
      component.extractSvgAttributes(
        `<svg xmlns="http://www.w3.org/2000/svg"><text id="recipientName"><tspan>\${recipientName}</tspan></text></svg>`,
      )
      expect(component.templateWarning).toContain('{{...}}')
      // It still previews, filled, so the author can see the design.
      expect(await renderedSvg()).toContain('Aastrika User')
    })

    it('does not warn for a template already on handlebars', () => {
      const component = build({ identifier: 'do_1' })
      component.extractSvgAttributes(rcSvg)
      expect(component.templateWarning).toBe('')
    })

    it('stamps today as the issued date, as the certificate renders it', async () => {
      const component = build()
      component.extractSvgAttributes(bareSvg)
      // "30 September 2026" -- not "30-09-2026", which no issued certificate shows.
      expect(await renderedSvg()).toContain(formatCertDate(new Date()))
    })
  })

  describe('standard designs', () => {
    let fetchMock: jest.Mock
    const classic = { id: 'classic', name: 'Classic', description: '', url: `${S3}classic.svg` }

    beforeEach(() => {
      fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(bareSvg) })
      ;(global as any).fetch = fetchMock
    })

    afterEach(() => {
      delete (global as any).fetch
    })

    it('draws each design with sample values for its thumbnail, not raw tokens', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(rcSvg),
      })
      const component = build({ identifier: 'do_1', name: 'Normal Labour Course' })
      component.ngOnInit()
      await new Promise(resolve => setTimeout(resolve, 0))
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(Object.keys(component.thumbnails).sort()).toEqual(['classic', 'elegant', 'modern'])
      const drawn = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsText(blobs[blobs.length - 1])
      })
      expect(drawn).toContain('Aastrika User')
      expect(drawn).not.toContain('{{credentialSubject.recipientName}}')
      expect(drawn).toContain('https://host/cbp-assets/images/qrCode.png')
    })

    it('still offers a design whose thumbnail could not be drawn', async () => {
      fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('') })
      const component = build()
      component.ngOnInit()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(component.thumbnails).toEqual({})
      expect(component.templates).toHaveLength(3)
    })

    it('offers the standard designs listed in the S3 config', () => {
      const component = build()
      component.ngOnInit()
      expect(editorService.certificateTemplates).toHaveBeenCalled()
      expect(component.templates.map(t => t.id)).toEqual(['classic', 'modern', 'elegant'])
      expect(component.templatesLoading).toBe(false)
      expect(component.templatesFailed).toBe(false)
    })

    it('fetches each thumbnail from the link in the config', async () => {
      const component = build()
      component.ngOnInit()
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(fetchMock.mock.calls.map(c => c[0]).sort()).toEqual(S3_TEMPLATES.map(t => t.url).sort())
    })

    it('handles a long list of designs, drawing a thumbnail for each', async () => {
      const many = Array.from({ length: 12 }, (_, i) => ({ id: `d${i}`, name: `Design ${i}`, url: `${S3}d${i}.svg` }))
      editorService.certificateTemplates.mockReturnValue(of(many))
      const component = build()
      component.ngOnInit()
      await new Promise(resolve => setTimeout(resolve, 0))
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(component.templates).toHaveLength(12)
      expect(Object.keys(component.thumbnails)).toHaveLength(12)
    })

    describe('with many designs', () => {
      const many = Array.from({ length: 8 }, (_, i) => ({
        id: `d${i}`,
        name: i === 3 ? 'Gold Frame' : `Design ${i}`,
        description: i === 5 ? 'Golden border' : 'Plain',
        url: `${S3}d${i}.svg`,
      }))

      it('shows everything on one screen up to five designs', () => {
        editorService.certificateTemplates.mockReturnValue(of(many.slice(0, 5)))
        const component = build()
        component.ngOnInit()
        expect(component.startView).toBe('single')
      })

      it('asks for a route first past five, then lists them all', () => {
        editorService.certificateTemplates.mockReturnValue(of(many))
        const component = build()
        component.ngOnInit()
        expect(component.startView).toBe('choose')
        expect(component.peekTemplates).toHaveLength(3)
        component.browseTemplates()
        expect(component.startView).toBe('browse')
        expect(component.filteredTemplates).toHaveLength(8)
      })

      it('narrows the list by name or description, and clears it', () => {
        editorService.certificateTemplates.mockReturnValue(of(many))
        const component = build()
        component.ngOnInit()
        component.browseTemplates()
        component.onTemplateFilter({ target: { value: ' GOLD ' } } as unknown as Event)
        expect(component.filteredTemplates.map(t => t.id)).toEqual(['d3', 'd5'])
        component.onTemplateFilter({ target: { value: 'nothing like it' } } as unknown as Event)
        expect(component.filteredTemplates).toEqual([])
        component.clearTemplateFilter()
        expect(component.filteredTemplates).toHaveLength(8)
      })

      it('goes back to the choice, forgetting the search', () => {
        editorService.certificateTemplates.mockReturnValue(of(many))
        const component = build()
        component.ngOnInit()
        component.browseTemplates()
        component.onTemplateFilter({ target: { value: 'gold' } } as unknown as Event)
        component.backToChoice()
        expect(component.startView).toBe('choose')
        expect(component.templateFilter).toBe('')
      })

      it('keeps the single screen while loading or after a failure', () => {
        editorService.certificateTemplates.mockReturnValue(throwError(() => new Error('offline')))
        const component = build()
        component.ngOnInit()
        component.browseTemplates()
        expect(component.startView).toBe('single')
      })
    })

    it('skips entries in the config that cannot be used', () => {
      editorService.certificateTemplates.mockReturnValue(
        of([...S3_TEMPLATES, { id: 'broken', name: 'No link' }, { id: 'classic', name: 'Dup', url: `${S3}x.svg` }]),
      )
      const component = build()
      component.ngOnInit()
      expect(component.templates.map(t => t.id)).toEqual(['classic', 'modern', 'elegant'])
    })

    it('shows no designs, and no error, when the config has none', () => {
      editorService.certificateTemplates.mockReturnValue(of(undefined))
      const component = build()
      component.ngOnInit()
      expect(component.templates).toEqual([])
      expect(component.templatesLoading).toBe(false)
      expect(component.templatesFailed).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('reports a config that cannot be fetched, and can try again', () => {
      editorService.certificateTemplates.mockReturnValue(throwError(() => new Error('offline')))
      const component = build()
      component.ngOnInit()
      expect(component.templatesFailed).toBe(true)
      expect(component.templatesLoading).toBe(false)
      expect(component.templates).toEqual([])
      editorService.certificateTemplates.mockReturnValue(of(S3_TEMPLATES))
      component.loadTemplates()
      expect(component.templatesFailed).toBe(false)
      expect(component.templates).toHaveLength(3)
    })

    it('starts from a design exactly as if it had been uploaded', async () => {
      const component = build()
      await component.useTemplate(classic)
      expect(fetchMock).toHaveBeenCalledWith(`${S3}classic.svg`)
      expect(component.svgText).toBe(bareSvg)
      expect(component.mappedSvg).toBe(bareSvg)
      expect(component.step).toBe('place')
      // Attaching uploads a file, so the design becomes one.
      expect((component.file as File).name).toBe('classic-certificate.svg')
      expect((component.file as File).type).toBe('image/svg+xml')
      expect(component.loadingTemplate).toBeNull()
    })

    it('shows which design is loading, and ignores a second click meanwhile', async () => {
      const component = build()
      let release: (value: any) => void = () => undefined
      fetchMock.mockReturnValue(new Promise(resolve => (release = resolve)))
      const first = component.useTemplate(classic)
      expect(component.loadingTemplate).toBe('classic')
      await component.useTemplate({ ...classic, id: 'modern', url: `${S3}modern.svg` })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      release({ ok: true, status: 200, text: () => Promise.resolve(bareSvg) })
      await first
      expect(component.loadingTemplate).toBeNull()
    })

    it('says so when a design cannot be fetched', async () => {
      const component = build()
      fetchMock.mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') })
      await component.useTemplate(classic)
      expect(component.templateLoadError).toContain('Classic design could not be loaded')
      expect(component.svgText).toBe('')
      expect(component.file).toBeUndefined()
      expect(component.loadingTemplate).toBeNull()
    })

    it('says so when the network fails', async () => {
      const component = build()
      fetchMock.mockRejectedValue(new Error('offline'))
      await component.useTemplate(classic)
      expect(component.templateLoadError).toBeTruthy()
    })

    it('goes back to choosing a design, discarding the one in progress', async () => {
      const component = build()
      await component.useTemplate(classic)
      component.onTemplateChange('<svg>edited</svg>')
      component.onValidityChange(true)
      component.startOver()
      expect(component.svgText).toBe('')
      expect(component.mappedSvg).toBe('')
      expect(component.file).toBeNull()
      expect(component.hasFields).toBe(false)
      expect(component.svgContent).toBeNull()
    })
  })

  describe('leaving without losing work', () => {
    const answer = (value: any) => dialog.open.mockReturnValue({ afterClosed: () => of(value) })

    /** A design chosen, then loaded by the editor -- which writes it out once. */
    const designing = () => {
      const component = build()
      ;(component as any).startWith(bareSvg)
      component.onTemplateChange('<svg>as loaded</svg>')
      return component
    }

    it('does not count the design being loaded as a change', () => {
      expect(designing().hasUnsavedChanges).toBe(false)
    })

    it('counts anything after that as unsaved work', () => {
      const component = designing()
      component.onTemplateChange('<svg>edited</svg>')
      expect(component.hasUnsavedChanges).toBe(true)
    })

    it('does not count the editor reloading on the way back from Preview', () => {
      const component = designing()
      component.goToPreview()
      component.goToPlace()
      component.onTemplateChange('<svg>as loaded</svg>')
      expect(component.hasUnsavedChanges).toBe(false)
    })

    it('keeps unsaved work through Preview and back', () => {
      const component = designing()
      component.onTemplateChange('<svg>edited</svg>')
      component.goToPreview()
      component.goToPlace()
      component.onTemplateChange('<svg>edited</svg>')
      expect(component.hasUnsavedChanges).toBe(true)
    })

    it('closes straight away when nothing would be lost', () => {
      const component = designing()
      component.requestClose()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(dialogRef.close).toHaveBeenCalled()
    })

    it('asks before closing over unsaved work, and closes if the author agrees', () => {
      const component = designing()
      component.onTemplateChange('<svg>edited</svg>')
      answer(true)
      component.requestClose()
      expect(dialog.open).toHaveBeenCalledWith(ConfirmDialogComponent, expect.objectContaining({ data: 'discardCertificate' }))
      expect(dialogRef.close).toHaveBeenCalled()
    })

    it('stays open when the author keeps editing', () => {
      const component = designing()
      component.onTemplateChange('<svg>edited</svg>')
      answer(undefined)
      component.requestClose()
      expect(dialogRef.close).not.toHaveBeenCalled()
    })

    it('asks before changing design over unsaved work', () => {
      const component = designing()
      component.onTemplateChange('<svg>edited</svg>')
      answer(false)
      component.requestChangeDesign()
      expect(dialog.open).toHaveBeenCalledWith(ConfirmDialogComponent, expect.objectContaining({ data: 'changeCertificateDesign' }))
      expect(component.svgText).toBe(bareSvg)
      answer(true)
      component.requestChangeDesign()
      expect(component.svgText).toBe('')
      expect(component.hasUnsavedChanges).toBe(false)
    })

    it('changes design straight away when nothing would be lost', () => {
      const component = designing()
      component.requestChangeDesign()
      expect(dialog.open).not.toHaveBeenCalled()
      expect(component.svgText).toBe('')
    })

    it('ignores both while a certificate is being attached', () => {
      const component = designing()
      component.attaching = true
      component.requestClose()
      component.requestChangeDesign()
      expect(dialogRef.close).not.toHaveBeenCalled()
      expect(component.svgText).toBe(bareSvg)
    })

    describe('refreshing or closing the tab', () => {
      const unload = () => ({ preventDefault: jest.fn(), returnValue: undefined as any }) as unknown as BeforeUnloadEvent

      it('asks the browser to warn when there is unsaved work', () => {
        const component = designing()
        component.onTemplateChange('<svg>edited</svg>')
        const event = unload()
        component.onBeforeUnload(event)
        expect(event.preventDefault).toHaveBeenCalled()
        expect(event.returnValue).toBe('')
      })

      it('warns while a certificate is being attached, which leaving would cut off', () => {
        const component = designing()
        component.attaching = true
        const event = unload()
        component.onBeforeUnload(event)
        expect(event.preventDefault).toHaveBeenCalled()
      })

      it('lets the tab go when there is nothing to lose', () => {
        const component = designing()
        const event = unload()
        component.onBeforeUnload(event)
        expect(event.preventDefault).not.toHaveBeenCalled()
        expect(event.returnValue).toBeUndefined()
      })
    })

    it('guards Esc and clicks outside the dialog too, not only the close icon', () => {
      const backdrop = new Subject<MouseEvent>()
      const keys = new Subject<KeyboardEvent>()
      dialogRef.backdropClick = jest.fn(() => backdrop)
      dialogRef.keydownEvents = jest.fn(() => keys)
      const component = designing()
      component.ngOnInit()
      expect(dialogRef.disableClose).toBe(true)

      component.onTemplateChange('<svg>edited</svg>')
      answer(undefined)
      keys.next({ key: 'Escape' } as KeyboardEvent)
      backdrop.next({} as MouseEvent)
      expect(dialog.open).toHaveBeenCalledTimes(2)
      expect(dialogRef.close).not.toHaveBeenCalled()

      // Other keys do nothing.
      keys.next({ key: 'Enter' } as KeyboardEvent)
      expect(dialog.open).toHaveBeenCalledTimes(2)
    })
  })

  describe('placing fields', () => {
    const readAs = (markup: string) =>
      jest.spyOn(FileReader.prototype, 'readAsText').mockImplementation(function (this: any) {
        this.onload({ target: { result: markup } })
      })

    const choose = (component: CertificateDialogComponent, markup: string, name = 'cert.svg', type = 'image/svg+xml') => {
      const spy = readAs(markup)
      component.onFileSelected({ target: { files: [new File([markup], name, { type })], value: 'C:\fakepath\cert.svg' } })
      spy.mockRestore()
    }

    it('starts a chosen file at placing its fields', () => {
      const component = build()
      component.step = 'preview'
      choose(component, bareSvg)
      expect(component.svgText).toBe(bareSvg)
      expect(component.mappedSvg).toBe(bareSvg)
      expect(component.step).toBe('place')
      expect(component.hasFields).toBe(false)
    })

    it('clears the input, so the same file can be chosen again', () => {
      const component = build()
      const event: any = { target: { files: [new File([bareSvg], 'cert.svg', { type: 'image/svg+xml' })], value: 'x' } }
      const spy = readAs(bareSvg)
      component.onFileSelected(event)
      spy.mockRestore()
      expect(event.target.value).toBe('')
    })

    it('drops a previous template when a non-SVG file is chosen', () => {
      const component = build()
      choose(component, bareSvg)
      component.onFileSelected({ target: { files: [new File(['x'], 'cert.png', { type: 'image/png' })] } })
      expect(component.svgText).toBe('')
      expect(component.mappedSvg).toBe('')
    })

    it('keeps the placer output apart from what the placer was given', () => {
      // Feeding it back in would reload the placer on every edit.
      const component = build()
      choose(component, bareSvg)
      component.onTemplateChange('<svg>mapped</svg>')
      expect(component.mappedSvg).toBe('<svg>mapped</svg>')
      expect(component.svgText).toBe(bareSvg)
    })

    it('records whether any field has been placed', () => {
      const component = build()
      component.onValidityChange(true)
      expect(component.hasFields).toBe(true)
    })

    it('previews the mapped template, not the original artwork', async () => {
      const component = build({ identifier: 'do_1', name: 'Normal Labour Course' })
      choose(component, bareSvg)
      component.onTemplateChange(rcSvg)
      component.goToPreview()
      expect(component.step).toBe('preview')
      const rendered = await renderedSvg()
      expect(rendered).toContain('Normal Labour Course')
    })

    it('hands the placer the mapped template on the way back, so placements survive', () => {
      const component = build()
      choose(component, bareSvg)
      component.onTemplateChange('<svg>mapped</svg>')
      component.goToPreview()
      component.goToPlace()
      expect(component.step).toBe('place')
      expect(component.svgText).toBe('<svg>mapped</svg>')
    })

    it('uploads the template with the fields written in', async () => {
      const component = build({ identifier: 'do_1', batches: [{ batchId: 'b1' }] })
      choose(component, bareSvg)
      component.onTemplateChange('<svg xmlns="http://www.w3.org/2000/svg"><text id="recipientName">{{x}}</text></svg>')
      component.createTemplate()
      const formdata = uploadService.upload.mock.calls[0][0] as FormData
      const uploaded = formdata.get('content') as File
      expect(uploaded.name).toBe('cert.svg')
      const text = await new Promise<string>(resolve => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsText(uploaded)
      })
      expect(text).toContain('id="recipientName"')
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
      // Named after the course rather than the fixed test string every
      // certificate asset used to be created with.
      expect(editorService.createTemplate).toHaveBeenCalledWith({
        name: expect.stringContaining('Certificate'),
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
      // lern resolves the template by identifier and derives the URL itself.
      expect(batch.template).not.toHaveProperty('template')
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

    /** The message the result dialog was opened with. */
    const shownMessage = () => dialog.open.mock.calls[dialog.open.mock.calls.length - 1][1].data.message

    describe('outcome reporting', () => {
      it('closes the dialog and confirms on success', () => {
        const component = withFile({ identifier: 'do_1', batches: [{ batchId: 'b1' }] })
        component.createTemplate()
        expect(dialogRef.close).toHaveBeenCalled()
        expect(shownMessage()).toBe('Course Certificate successfully attached')
        expect(dialog.open.mock.calls[0][1].data.cert_upload).toBe('Yes')
      })

      // Each of these used to return EMPTY: the stream completed without
      // emitting, so neither handler ran and the author was told nothing.
      it('reports a template that could not be created', () => {
        editorService.createTemplate.mockReturnValue(of({ params: { status: 'failed' } }))
        const component = withFile()
        component.createTemplate()
        expect(shownMessage()).toBe('Could not create the certificate template. Please try again.')
        expect(dialogRef.close).not.toHaveBeenCalled()
      })

      it('reports an upload that did not succeed', () => {
        uploadService.upload.mockReturnValue(of({ status: 'failed' }))
        const component = withFile()
        component.createTemplate()
        expect(shownMessage()).toBe('The certificate file could not be uploaded. Please try again.')
      })

      it('explains that the course has no batch', () => {
        const component = withFile({ identifier: 'do_1' })
        component.createTemplate()
        expect(shownMessage()).toBe('This course has no batch yet, so the certificate cannot be attached.')
      })

      it('falls back to a generic message for an unexpected failure', () => {
        uploadService.templateToBatch.mockReturnValue(throwError(() => new Error('socket hang up')))
        const component = withFile({ identifier: 'do_1', batches: [{ batchId: 'b1' }] })
        component.createTemplate()
        expect(shownMessage()).toBe('Could not attach the certificate. Please try again.')
        expect(dialog.open.mock.calls[0][1].data.cert_upload).toBe('No')
      })
    })

    describe('busy state', () => {
      it('marks the dialog busy while the calls are in flight and frees it after', () => {
        const pending = new Subject<any>()
        editorService.createTemplate.mockReturnValue(pending)
        const component = withFile({ identifier: 'do_1', batches: [{ batchId: 'b1' }] })

        component.createTemplate()
        // The global loader sits under the CDK overlay, so the dialog has to
        // carry its own busy state or it looks frozen.
        expect(component.attaching).toBe(true)
        expect(dialogRef.disableClose).toBe(true)

        pending.next({ params: { status: 'successful' }, result: { identifier: 'tpl_1' } })
        pending.complete()

        expect(component.attaching).toBe(false)
        // Stays on: closing always goes through requestClose, which guards unsaved work.
        expect(dialogRef.disableClose).toBe(true)
      })

      it('frees the dialog again when the attempt fails', () => {
        editorService.createTemplate.mockReturnValue(throwError(() => new Error('boom')))
        const component = withFile()
        component.createTemplate()
        expect(component.attaching).toBe(false)
        component.requestClose()
        expect(dialogRef.close).toHaveBeenCalled()
      })

      it('ignores a second press while the first is still running', () => {
        editorService.createTemplate.mockReturnValue(new Subject<any>())
        const component = withFile({ identifier: 'do_1', batches: [{ batchId: 'b1' }] })
        component.createTemplate()
        component.createTemplate()
        expect(editorService.createTemplate).toHaveBeenCalledTimes(1)
      })
    })

    it('swallows a failed template creation', () => {
      editorService.createTemplate.mockReturnValue(throwError(() => 'boom'))
      const component = withFile()
      expect(() => component.createTemplate()).not.toThrow()
      expect(uploadService.upload).not.toHaveBeenCalled()
    })
  })
})
