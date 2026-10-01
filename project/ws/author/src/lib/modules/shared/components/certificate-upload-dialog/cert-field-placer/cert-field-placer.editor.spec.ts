import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { parseCertificateSvg, readDecorations } from '../certificate-svg'
import { CERT_IMAGE_MAX_BYTES, CertFieldPlacerComponent } from './cert-field-placer.component'

/** The editing side of the certificate editor: text, lines and pictures. */
describe('CertFieldPlacerComponent editing', () => {
  let fixture: ComponentFixture<CertFieldPlacerComponent>
  let component: CertFieldPlacerComponent
  let emitted: string[]

  /** A standard-template shape: fixed artwork plus marked, editable pieces. */
  const template = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808">
      <rect id="frame" data-cert-bg="true" width="1350" height="808" fill="#fdfaf3"/>
      <text data-cert="text" id="cert-text-1" font-family="Georgia, Garamond, serif" font-size="56" font-weight="bold" text-anchor="middle" fill="#1c3d5a"><tspan x="675" y="170">CERTIFICATE</tspan></text>
      <line data-cert="line" id="cert-line-1" x1="400" y1="330" x2="950" y2="330" stroke="#8a9bb0" stroke-width="1"/>
    </svg>`

  const lastTemplate = () => emitted[emitted.length - 1]
  const decoration = (id: string) => component.decorations().find(d => d.id === id)

  const build = (markup: string) => {
    fixture = TestBed.createComponent(CertFieldPlacerComponent)
    component = fixture.componentInstance
    component.templateChange.subscribe(value => emitted.push(value))
    fixture.componentRef.setInput('svgMarkup', markup)
    fixture.detectChanges()
    component.renderedWidth.set(675)
  }

  const pointer = (clientX: number, clientY: number, extra: any = {}) =>
    ({
      button: 0,
      pointerId: 1,
      clientX,
      clientY,
      altKey: false,
      preventDefault: jest.fn(),
      currentTarget: { setPointerCapture: jest.fn() },
      ...extra,
    }) as unknown as PointerEvent

  beforeEach(() => {
    emitted = []
    ;(global as any).URL.createObjectURL = jest.fn(() => 'blob:art')
    ;(global as any).URL.revokeObjectURL = jest.fn()
    TestBed.configureTestingModule({
      declarations: [CertFieldPlacerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('a standard template', () => {
    it("opens with the template's own text and lines editable", () => {
      build(template)
      expect(component.decorations().map(d => d.id)).toEqual(['cert-text-1', 'cert-line-1'])
      expect(decoration('cert-text-1')).toEqual(expect.objectContaining({ text: 'CERTIFICATE', fontWeight: 'bold', fontSize: 56 }))
    })

    it('keeps the editable pieces out of the background, so none is drawn twice', () => {
      build(template)
      expect(lastTemplate().match(/id="cert-text-1"/g)).toHaveLength(1)
      expect(lastTemplate()).toContain('id="frame"')
    })

    it("offers the template's own lines as snap targets", () => {
      build(template)
      expect(component.snapLines()).toEqual([{ y: 330, x1: 400, x2: 950, centre: 675 }])
    })

    it('gives new text the font the template uses', () => {
      build(template)
      component.addText()
      expect(component.selectedDecoration()!.fontFamily).toBe('Georgia, Garamond, serif')
    })
  })

  describe('text', () => {
    beforeEach(() => build(template))

    it('adds text in the middle, selected and ready to edit', () => {
      component.addText()
      const added = component.selectedDecoration()!
      expect(added).toEqual(expect.objectContaining({ kind: 'text', text: 'Your text', x: 675, y: 404, anchor: 'middle' }))
      // A fresh id that does not clash with the template's own.
      expect(added.id).toBe('cert-text-2')
      expect(lastTemplate()).toContain('Your text')
    })

    it('edits the words, and writes the template once typing pauses', () => {
      jest.useFakeTimers()
      component.selectedKey.set('cert-text-1')
      const before = emitted.length
      component.updateDecorationText('CERTIFICATE OF MERIT')
      component.updateDecorationText('CERTIFICATE OF MERIT!')
      // The chip follows every keystroke...
      expect(decoration('cert-text-1')!.text).toBe('CERTIFICATE OF MERIT!')
      // ...but the whole SVG is only rewritten after the pause, once.
      expect(emitted.length).toBe(before)
      jest.advanceTimersByTime(300)
      expect(emitted.length).toBe(before + 1)
      expect(lastTemplate()).toContain('CERTIFICATE OF MERIT!')
    })

    it('writes a pending edit as soon as the text box loses focus', () => {
      jest.useFakeTimers()
      component.selectedKey.set('cert-text-1')
      component.updateDecorationText('Typed, then Preview clicked at once')
      // Blur fires before the click on the button that took focus.
      component.commitText()
      expect(lastTemplate()).toContain('Typed, then Preview clicked at once')
    })

    it('does nothing on blur when there is nothing pending', () => {
      const before = emitted.length
      component.commitText()
      expect(emitted.length).toBe(before)
    })

    it('keeps a pending edit when the editor closes mid-pause', () => {
      jest.useFakeTimers()
      component.selectedKey.set('cert-text-1')
      component.updateDecorationText('Changed at the last moment')
      fixture.destroy()
      expect(lastTemplate()).toContain('Changed at the last moment')
    })

    it('writes multi-line text as separate lines', () => {
      component.selectedKey.set('cert-text-1')
      component.updateDecoration({ text: 'Line one\nLine two' })
      const reread = readDecorations(parseCertificateSvg(lastTemplate()).doc as Document, { width: 1350, height: 808 })
      expect(reread.find(d => d.id === 'cert-text-1')!.text).toBe('Line one\nLine two')
    })

    it('changes style from the settings panel', () => {
      component.selectedKey.set('cert-text-1')
      component.updateDecoration({ fontStyle: 'italic', fill: '#aa0000' })
      component.updateDecorationNumber('fontSize', '64')
      expect(decoration('cert-text-1')).toEqual(expect.objectContaining({ fontStyle: 'italic', fill: '#aa0000', fontSize: 64 }))
      expect(lastTemplate()).toContain('font-style="italic"')
    })

    it('ignores a size that would make the text vanish', () => {
      component.selectedKey.set('cert-text-1')
      component.updateDecorationNumber('fontSize', '0')
      component.updateDecorationNumber('fontSize', 'big')
      expect(decoration('cert-text-1')!.fontSize).toBe(56)
    })

    it('snaps onto a rule while dragging, like a learner detail', () => {
      component.addText()
      const id = component.selectedKey()!
      component.updateDecoration({ x: 600, y: 200 })
      component.onChipPointerDown(pointer(0, 0), id)
      // Half scale: lands at (660, 320), just above the rule at 330.
      component.onChipPointerMove(pointer(30, 60))
      expect(decoration(id)).toEqual(expect.objectContaining({ x: 675, y: 319 }))
      expect(component.guide()).toEqual(expect.objectContaining({ y: 330 }))
    })

    it('centres itself on the nearest line from the panel', () => {
      component.addText()
      component.updateDecoration({ x: 500, y: 300, anchor: 'start' })
      component.snapSelectedToLine()
      expect(component.selectedDecoration()).toEqual(expect.objectContaining({ x: 675, y: 319, anchor: 'middle' }))
    })
  })

  describe('lines', () => {
    beforeEach(() => build(template))

    it('adds a horizontal rule that other text can snap to', () => {
      component.addLine()
      const line = component.selectedDecoration()!
      expect(line).toEqual(expect.objectContaining({ kind: 'line', length: 320, vertical: false }))
      expect(component.snapLines().some(l => l.y === line.y && l.x1 === line.x)).toBe(true)
    })

    it('does not snap while being dragged', () => {
      component.addLine()
      const id = component.selectedKey()!
      const start = { ...component.selectedDecoration()! }
      component.onChipPointerDown(pointer(0, 0), id)
      component.onChipPointerMove(pointer(10, 10))
      expect(decoration(id)).toEqual(expect.objectContaining({ x: start.x + 20, y: start.y + 20 }))
      expect(component.guide()).toBeNull()
    })

    it('turns dashed and vertical from the panel', () => {
      component.selectedKey.set('cert-line-1')
      component.updateDecoration({ dashed: true, vertical: true })
      component.updateDecorationNumber('strokeWidth', '3')
      expect(lastTemplate()).toContain('stroke-dasharray')
      expect(lastTemplate()).toContain('stroke-width="3"')
      // Vertical lines are not snap targets.
      expect(component.snapLines()).toEqual([])
    })

    it('warns when a line runs off the certificate', () => {
      component.selectedKey.set('cert-line-1')
      component.updateDecorationNumber('length', '2000')
      expect(component.warnings().some(w => w.key === 'cert-line-1' && w.message.includes('off the edge'))).toBe(true)
    })
  })

  describe('pictures', () => {
    const png = (name = 'logo.png', type = 'image/png') => new File(['x'], name, { type })

    beforeEach(() => build(template))

    it('embeds a picture, fitted to a sensible starting size', async () => {
      jest.spyOn(component as any, 'readImageFile').mockResolvedValue({ href: 'data:image/png;base64,AAAA', width: 400, height: 200 })
      await component.addImage(png())
      const image = component.selectedDecoration()!
      expect(image).toEqual(expect.objectContaining({ kind: 'image', width: 200, height: 100, href: 'data:image/png;base64,AAAA' }))
      // The result parses: the xlink namespace was declared for it.
      expect(parseCertificateSvg(lastTemplate()).error).toBe('')
    })

    it('refuses a file that is not a picture', async () => {
      await component.addImage(png('notes.pdf', 'application/pdf'))
      expect(component.imageError()).toContain('PNG, JPEG or SVG')
      expect(component.decorations().some(d => d.kind === 'image')).toBe(false)
    })

    it('refuses a picture too large to embed', async () => {
      jest
        .spyOn(component as any, 'readImageFile')
        .mockResolvedValue({ href: 'data:image/png;base64,' + 'A'.repeat(CERT_IMAGE_MAX_BYTES), width: 600, height: 600 })
      await component.addImage(png())
      expect(component.imageError()).toContain('too large')
    })

    it('says so when a picture cannot be read', async () => {
      jest.spyOn(component as any, 'readImageFile').mockRejectedValue(new Error('bad'))
      await component.addImage(png())
      expect(component.imageError()).toContain('could not be read')
    })

    it('keeps proportions when the width changes', async () => {
      jest.spyOn(component as any, 'readImageFile').mockResolvedValue({ href: 'data:x', width: 400, height: 200 })
      await component.addImage(png())
      component.updateImageWidth('300')
      expect(component.selectedDecoration()).toEqual(expect.objectContaining({ width: 300, height: 150 }))
    })

    it('clears the file input so the same picture can be picked again', () => {
      const spy = jest.spyOn(component, 'addImage').mockResolvedValue(undefined)
      const target = { files: [png()], value: 'C:\\fakepath\\logo.png' }
      component.onImagePicked({ target } as unknown as Event)
      expect(spy).toHaveBeenCalled()
      expect(target.value).toBe('')
    })
  })

  describe('duplicating, moving and removing', () => {
    beforeEach(() => build(template))

    it('duplicates the selection, offset so both can be seen', () => {
      component.selectedKey.set('cert-text-1')
      component.duplicateSelected()
      const copy = component.selectedDecoration()!
      expect(copy.id).not.toBe('cert-text-1')
      expect(copy).toEqual(expect.objectContaining({ text: 'CERTIFICATE', x: 695, y: 190 }))
    })

    it('nudges the selection with the arrow keys', () => {
      component.onChipKeydown({ key: 'ArrowLeft', shiftKey: true, preventDefault: jest.fn() } as any, 'cert-line-1')
      expect(decoration('cert-line-1')!.x).toBe(390)
    })

    it('removes the selection with Delete', () => {
      component.onChipKeydown({ key: 'Delete', shiftKey: false, preventDefault: jest.fn() } as any, 'cert-text-1')
      expect(decoration('cert-text-1')).toBeUndefined()
      expect(lastTemplate()).not.toContain('CERTIFICATE')
    })

    it('does not treat decorations as learner details', () => {
      component.addText()
      // Attach is gated on learner details, not on the author's own text.
      let valid: boolean | undefined
      component.validityChange.subscribe(v => (valid = v))
      component.updateDecoration({ text: 'x' })
      expect(valid).toBe(false)
    })

    it('labels each kind readably', () => {
      component.addLine()
      expect(component.labelFor('cert-text-1')).toBe('Text')
      expect(component.labelFor(component.selectedKey()!)).toBe('Line')
      expect(component.labelFor('recipientName')).toBe('Recipient name')
    })
  })

  describe('background colour', () => {
    it("reads the design's background colour", () => {
      build(template)
      expect(component.backgroundColour()).toBe('#fdfaf3')
      expect(component.originalBackgroundColour()).toBe('#fdfaf3')
    })

    it('recolours the background in the template and on screen', () => {
      build(template)
      const urls = (URL.createObjectURL as jest.Mock).mock.calls.length
      component.setBackgroundColour('#E8F1FA')
      expect(component.backgroundColour()).toBe('#e8f1fa')
      expect(lastTemplate()).toContain('fill="#e8f1fa"')
      // The background is part of the artwork image, which is redrawn.
      expect((URL.createObjectURL as jest.Mock).mock.calls.length).toBe(urls + 1)
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:art')
    })

    it("puts the design's own colour back", () => {
      build(template)
      component.setBackgroundColour('#000000')
      component.resetBackground()
      expect(lastTemplate()).toContain('fill="#fdfaf3"')
    })

    it('ignores anything that is not a colour', () => {
      build(template)
      const before = emitted.length
      component.setBackgroundColour('red; stroke: url(x)')
      expect(component.backgroundColour()).toBe('#fdfaf3')
      expect(emitted.length).toBe(before)
    })

    it('does not offer the option when the artwork has no plain background', () => {
      build('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808"><rect width="1350" height="808" fill="url(#p)"/></svg>')
      expect(component.backgroundColour()).toBeNull()
      component.setBackgroundColour('#ffffff')
      expect(lastTemplate()).not.toContain('#ffffff')
    })

    it('shows the setting when nothing is selected', () => {
      build(template)
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('#cert-bg')).toBeTruthy()
    })
  })

  describe('selecting', () => {
    it('clears the selection when the certificate itself is clicked', () => {
      build(template)
      component.selectedKey.set('cert-text-1')
      const stage = document.createElement('div')
      component.onStagePointerDown({ target: stage, currentTarget: stage } as unknown as PointerEvent)
      expect(component.selectedKey()).toBeNull()
    })

    it('keeps it when something placed is clicked', () => {
      build(template)
      component.selectedKey.set('cert-text-1')
      const stage = document.createElement('div')
      const chip = document.createElement('div')
      component.onStagePointerDown({ target: chip, currentTarget: stage } as unknown as PointerEvent)
      expect(component.selectedKey()).toBe('cert-text-1')
    })

    it('fits the whole certificate in the dialog', () => {
      build(template)
      expect(component.stageMaxWidth()).toBe('max(360px, calc((100vh - 330px) * 1.6708))')
    })
  })

  describe('learner details typed into the design', () => {
    const typed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808">
        <line x1="320" y1="394" x2="687" y2="394" stroke="#000"/>
        <text font-size="20"><tspan x="230" y="385">at Facility</tspan></text>
        <text font-size="20"><tspan x="503" y="385" text-anchor="middle">SHC Bapcha</tspan></text>
        <text font-size="18"><tspan x="900" y="700">29 September 2026</tspan></text>
      </svg>`

    it('finds them, and not the labels beside them', () => {
      build(typed)
      expect(component.hardcoded().map(h => [h.text, h.reason])).toEqual([
        ['SHC Bapcha', 'on-line'],
        ['29 September 2026', 'date'],
      ])
    })

    it('explains each one in plain words', () => {
      build(typed)
      const [onLine, date] = component.hardcoded()
      expect(component.hardcodedMessage(onLine)).toContain('every learner would get exactly this text')
      expect(component.hardcodedMessage(date)).toContain('Use Issued date')
    })

    it('says so above the certificate and marks each on it', () => {
      build(typed)
      fixture.detectChanges()
      const el: HTMLElement = fixture.nativeElement
      expect(el.querySelector('.hardcoded-callout')!.textContent).toContain('typed into this design')
      expect(el.querySelectorAll('.hardcoded-marker')).toHaveLength(2)
    })

    it('marks each where it sits, even when text cannot be measured', () => {
      build(typed)
      const style = component.hardcodedStyle(component.hardcoded()[0])
      // Half scale; an estimated width so the mark still has a size.
      expect(parseFloat(style['width'])).toBeGreaterThan(0)
      expect(parseFloat(style['top'])).toBeCloseTo((385 - 20) * 0.5)
    })

    it('raises nothing for a standard design', () => {
      build(template)
      expect(component.hardcoded()).toEqual([])
    })
  })

  describe("editing the design's own wording", () => {
    const uploaded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808">
        <rect width="1350" height="808" fill="#fbe7d0"/>
        <text fill="#1c3d5a" xml:space="preserve" style="white-space: pre" font-family="Georgia" font-size="40" letter-spacing="0em"><tspan x="675" y="170" text-anchor="middle">CERTIFICATE</tspan></text>
        <text fill="#000000" font-size="18" letter-spacing="0.3em"><tspan x="675" y="210" text-anchor="middle">OF COMPLETION</tspan></text>
        <text font-size="18"><tspan x="900" y="700">29 September 2026</tspan></text>
      </svg>`

    it('offers the wording it can keep, and counts what it cannot', () => {
      build(uploaded)
      expect(component.artworkTexts().map(t => t.decoration.text)).toEqual(['CERTIFICATE', '29 September 2026'])
      expect(component.fixedWordingCount()).toBe(1)
    })

    it('leaves the file untouched until something is edited', () => {
      build(uploaded)
      // The original element, exactly as the designer exported it.
      expect(lastTemplate()).toContain('letter-spacing="0em"><tspan x="675" y="170" text-anchor="middle">CERTIFICATE</tspan>')
      expect(lastTemplate()).not.toContain('data-cert="text"')
    })

    it('takes a piece over when clicked: out of the artwork, in as editable text', () => {
      build(uploaded)
      const drawn = (URL.createObjectURL as jest.Mock).mock.calls.length
      component.editArtworkText(0)
      const edited = component.selectedDecoration()!
      expect(edited).toEqual(expect.objectContaining({ kind: 'text', text: 'CERTIFICATE', fontFamily: 'Georgia', fontSize: 40 }))
      expect(component.artworkTexts().map(t => t.decoration.text)).toEqual(['29 September 2026'])
      // The artwork image is redrawn without it, so it is not shown twice...
      expect((URL.createObjectURL as jest.Mock).mock.calls.length).toBe(drawn + 1)
      // ...and the file carries it once, now as the author's.
      expect(lastTemplate().match(/CERTIFICATE/g)).toHaveLength(1)
      expect(lastTemplate()).toContain('data-cert="text"')
    })

    it('can then be changed like any other text', () => {
      build(uploaded)
      component.editArtworkText(0)
      component.updateDecoration({ text: 'CERTIFICATE OF MERIT' })
      expect(lastTemplate()).toContain('CERTIFICATE OF MERIT')
      // Untouched wording is still exactly as designed.
      expect(lastTemplate()).toContain('<tspan x="900" y="700">29 September 2026</tspan>')
    })

    it('drops the flag on a typed-in date once it is taken over to be changed', () => {
      build(uploaded)
      expect(component.hardcoded().map(h => h.text)).toContain('29 September 2026')
      component.editArtworkText(1)
      expect(component.hardcoded().map(h => h.text)).not.toContain('29 September 2026')
    })

    it('puts the click targets on the certificate, even when nothing is flagged', () => {
      // A design with editable wording and no typed-in details: the targets were
      // once rendered inside the warning list, so they vanished with it.
      build(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808">
          <text fill="#1c3d5a" font-size="40"><tspan x="675" y="170" text-anchor="middle">CERTIFICATE</tspan></text>
        </svg>`)
      fixture.detectChanges()
      expect(component.hardcoded()).toEqual([])
      const targets = fixture.nativeElement.querySelectorAll('.canvas-stage .artwork-text-target')
      expect(targets).toHaveLength(1)
      expect(fixture.nativeElement.querySelector('.hardcoded-list .artwork-text-target')).toBeNull()
    })

    it('marks each editable piece with a click target', () => {
      build(uploaded)
      fixture.detectChanges()
      const targets = fixture.nativeElement.querySelectorAll('.artwork-text-target')
      expect(targets).toHaveLength(2)
      expect(targets[0].getAttribute('aria-label')).toBe('Edit the wording: CERTIFICATE')
    })

    it('explains when the wording is outlines and cannot be edited', () => {
      const big = 'M' + '1 1 L2 2 '.repeat(300)
      build(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808"><path d="${big}"/><path d="${big}"/><path d="${big}"/></svg>`)
      fixture.detectChanges()
      expect(component.outlinedWording()).toBe(true)
      expect(fixture.nativeElement.querySelector('.wording-note').textContent).toContain('Outline text')
    })

    it('offers nothing extra on a standard design, whose wording is already editable', () => {
      build(template)
      expect(component.artworkTexts()).toEqual([])
      expect(component.fixedWordingCount()).toBe(0)
    })
  })

  describe('lines to snap to', () => {
    it('says so when the artwork has none', () => {
      build('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808"><rect width="10" height="10"/></svg>')
      fixture.detectChanges()
      expect(fixture.nativeElement.textContent).toContain('no lines to snap to')
    })
  })
})
