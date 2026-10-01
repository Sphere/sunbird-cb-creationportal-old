import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CERT_FIELD_BY_KEY } from '../certificate-fields'
import { parseCertificateSvg } from '../certificate-svg'
import { CertFieldPlacerComponent } from './cert-field-placer.component'

describe('CertFieldPlacerComponent', () => {
  let fixture: ComponentFixture<CertFieldPlacerComponent>
  let component: CertFieldPlacerComponent
  let emitted: string[]
  let validity: boolean[]
  let createObjectURL: jest.Mock
  let revokeObjectURL: jest.Mock

  /** Two rules like the real template: 320-687 and 801-1200, both at y 394.25. */
  const artwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1398 856">
      <rect width="1398" height="856" fill="#FBE7D0"/>
      <line x1="320" y1="394.25" x2="687" y2="394.25" stroke-dasharray="4 4"/>
      <line x1="801" y1="394.25" x2="1200" y2="394.25" stroke-dasharray="4 4"/>
    </svg>`

  /** An already-mapped template, as the design team's RC files arrive. */
  const mapped = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1398 856">
      <rect width="1398" height="856"/>
      <text id="recipientName" font-size="20"><tspan x="609" y="335" text-anchor="middle">{{credentialSubject.recipientName}}</tspan></text>
      <text id="courseName" font-size="20"><tspan x="50%" y="63%" text-anchor="middle">{{credentialSubject.trainingName}}</tspan></text>
      <image id="QrCode" x="125" y="640" width="115" height="125" xlink:href="{{qrCode}}"/>
    </svg>`

  /** A legacy template: ids and text still in the old ${...} form. */
  const legacy = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1398 856">
      <text id="\${recipientName}"><tspan x="36%" y="335" text-anchor="middle">\${recipientName}</tspan></text>
      <text id="\${courseName}"><tspan x="27%" y="63%" text-anchor="middle">\${courseName}</tspan></text>
    </svg>`

  const lastTemplate = () => emitted[emitted.length - 1]

  const build = (markup: string, courseName = '') => {
    fixture = TestBed.createComponent(CertFieldPlacerComponent)
    component = fixture.componentInstance
    component.templateChange.subscribe(value => emitted.push(value))
    component.validityChange.subscribe(value => validity.push(value))
    fixture.componentRef.setInput('svgMarkup', markup)
    fixture.componentRef.setInput('courseName', courseName)
    fixture.detectChanges()
    // Half size on screen, so screen and artwork coordinates differ.
    component.renderedWidth.set(699)
  }

  const pointer = (type: string, clientX: number, clientY: number, extra: any = {}) =>
    ({
      type,
      button: 0,
      pointerId: 1,
      clientX,
      clientY,
      altKey: false,
      preventDefault: jest.fn(),
      currentTarget: { setPointerCapture: jest.fn() },
      ...extra,
    }) as unknown as PointerEvent

  const key = (keyName: string, shiftKey = false) => ({ key: keyName, shiftKey, preventDefault: jest.fn() }) as unknown as KeyboardEvent

  const placedOf = (fieldKey: string) => component.placed().find(f => f.key === fieldKey)

  beforeEach(() => {
    emitted = []
    validity = []
    createObjectURL = jest.fn(() => 'blob:art')
    revokeObjectURL = jest.fn()
    ;(global as any).URL.createObjectURL = createObjectURL
    ;(global as any).URL.revokeObjectURL = revokeObjectURL
    TestBed.configureTestingModule({
      declarations: [CertFieldPlacerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
  })

  describe('loading a template', () => {
    it('reads the canvas and the rules in the artwork', () => {
      build(artwork)
      expect(component.canvas()).toEqual({ width: 1398, height: 856 })
      expect(component.snapLines().map(line => line.centre)).toEqual([503.5, 1000.5])
    })

    it('shows the artwork as an image, never as live markup', () => {
      build(artwork)
      expect(component.backgroundUrl()).toBe('blob:art')
      fixture.detectChanges()
      const img: HTMLImageElement = fixture.nativeElement.querySelector('img.canvas-art')
      expect(img).toBeTruthy()
      // An uploaded SVG can carry script; none of it may reach the page.
      expect(fixture.nativeElement.querySelector('rect')).toBeNull()
    })

    it('reopens a mapped template with its fields in place', () => {
      build(mapped)
      expect(
        component
          .placed()
          .map(f => f.key)
          .sort(),
      ).toEqual(['QrCode', 'courseName', 'recipientName'])
      expect(placedOf('recipientName')).toEqual(expect.objectContaining({ x: 609, y: 335, anchor: 'middle' }))
      // Percentages resolve against the canvas.
      expect(placedOf('courseName')!.x).toBe(699)
    })

    it('keeps placed fields out of the background, so they are not drawn twice', () => {
      build(mapped)
      const background = createObjectURL.mock.calls[0][0] as Blob as any
      expect(background).toBeTruthy()
      // The emitted template carries each field exactly once.
      expect(lastTemplate().match(/id="recipientName"/g)).toHaveLength(1)
    })

    it('recognises a legacy template without anyone converting it', () => {
      build(legacy)
      expect(
        component
          .placed()
          .map(f => f.key)
          .sort(),
      ).toEqual(['courseName', 'recipientName'])
      // And writes it back in the form the platform renders.
      expect(lastTemplate()).toContain('{{credentialSubject.recipientName}}')
      expect(lastTemplate()).toContain('{{credentialSubject.trainingName}}')
      expect(lastTemplate()).not.toContain('${recipientName}')
    })

    it('emits the template straight away, so an already-mapped file can be attached as is', () => {
      build(mapped)
      expect(emitted.length).toBeGreaterThan(0)
      expect(validity[validity.length - 1]).toBe(true)
    })

    it('reports a file that is not valid SVG', () => {
      build('<svg xmlns="http://www.w3.org/2000/svg"><image xlink:href="x"/></svg>')
      expect(component.error()).toContain('not valid SVG')
      expect(validity).toEqual([false])
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('.placer-error')).toBeTruthy()
    })

    it('releases the artwork image when it closes', () => {
      build(artwork)
      fixture.destroy()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:art')
    })
  })

  describe('adding and removing fields', () => {
    it('places a field centred on the canvas and selects it', () => {
      build(artwork)
      component.addField(CERT_FIELD_BY_KEY['recipientFacility'])
      expect(placedOf('recipientFacility')).toEqual(expect.objectContaining({ x: 699, y: 428, anchor: 'middle' }))
      expect(component.selectedKey()).toBe('recipientFacility')
      expect(lastTemplate()).toContain('{{credentialSubject.recipientFacility}}')
    })

    it('selects a field that is already placed rather than adding it twice', () => {
      build(mapped)
      component.addField(CERT_FIELD_BY_KEY['recipientName'])
      expect(component.placed().filter(f => f.key === 'recipientName')).toHaveLength(1)
      expect(component.selectedKey()).toBe('recipientName')
    })

    it('places the QR code as an image with a namespaced href', () => {
      build(artwork)
      component.addField(CERT_FIELD_BY_KEY['QrCode'])
      // The template gains xlink, so the result still parses.
      expect(parseCertificateSvg(lastTemplate()).error).toBe('')
      expect(lastTemplate()).toMatch(/href="\{\{qrCode\}\}"/)
    })

    it('gives new fields the font the template already uses', () => {
      build(artwork)
      component.addField(CERT_FIELD_BY_KEY['recipientName'])
      component.updateSelected({ fontFamily: 'Georgia, Garamond, serif' })
      component.addField(CERT_FIELD_BY_KEY['recipientDistrict'])
      expect(placedOf('recipientDistrict')!.fontFamily).toBe('Georgia, Garamond, serif')
    })

    it('removes the selected field', () => {
      build(mapped)
      component.selectedKey.set('recipientName')
      component.removeSelected()
      expect(placedOf('recipientName')).toBeUndefined()
      expect(component.selectedKey()).toBeNull()
      expect(lastTemplate()).not.toContain('recipientName')
    })

    it('does nothing when asked to remove with nothing selected', () => {
      build(mapped)
      const before = emitted.length
      component.removeSelected()
      expect(component.placed()).toHaveLength(3)
      expect(emitted.length).toBe(before)
    })
  })

  describe('field settings', () => {
    beforeEach(() => {
      build(artwork)
      component.addField(CERT_FIELD_BY_KEY['recipientFacility'])
    })

    it('applies a number from the panel', () => {
      component.updateNumber('x', '503')
      expect(placedOf('recipientFacility')!.x).toBe(503)
      expect(lastTemplate()).toContain('x="503"')
    })

    it('ignores a number that is not usable rather than zeroing the field', () => {
      component.updateNumber('x', 'abc')
      component.updateNumber('y', '-4')
      component.updateNumber('fontSize', '0')
      expect(placedOf('recipientFacility')).toEqual(expect.objectContaining({ x: 699, y: 428, fontSize: 20 }))
    })

    it('centres a value on the rule nearest to it', () => {
      component.updateSelected({ x: 419, y: 385, anchor: 'start' })
      component.snapSelectedToLine()
      // The exact correction that fixed the facility field on a real certificate.
      expect(placedOf('recipientFacility')).toEqual(expect.objectContaining({ x: 504, y: 385, anchor: 'middle' }))
    })
  })

  describe('dragging', () => {
    beforeEach(() => {
      build(artwork)
      component.addField(CERT_FIELD_BY_KEY['recipientFacility'])
      component.updateSelected({ x: 400, y: 200 })
      emitted = []
    })

    it('converts screen movement into artwork units', () => {
      component.onChipPointerDown(pointer('pointerdown', 100, 100), 'recipientFacility')
      // Half scale: 20 screen pixels are 40 artwork units.
      component.onChipPointerMove(pointer('pointermove', 120, 110))
      expect(placedOf('recipientFacility')).toEqual(expect.objectContaining({ x: 440, y: 220 }))
    })

    it('snaps onto a rule it is dropped near, and centres across it', () => {
      component.onChipPointerDown(pointer('pointerdown', 0, 0), 'recipientFacility')
      // Lands at (480, 390) in artwork units: near the 320-687 rule.
      component.onChipPointerMove(pointer('pointermove', 40, 95))
      expect(placedOf('recipientFacility')).toEqual(expect.objectContaining({ x: 504, y: 385 }))
      expect(component.guide()).toEqual(expect.objectContaining({ x1: 320, x2: 687 }))
    })

    it('places freely while Alt is held', () => {
      component.onChipPointerDown(pointer('pointerdown', 0, 0), 'recipientFacility')
      component.onChipPointerMove(pointer('pointermove', 40, 95, { altKey: true }))
      expect(placedOf('recipientFacility')).toEqual(expect.objectContaining({ x: 480, y: 390 }))
      expect(component.guide()).toBeNull()
    })

    it('keeps a field on the certificate', () => {
      component.onChipPointerDown(pointer('pointerdown', 0, 0), 'recipientFacility')
      component.onChipPointerMove(pointer('pointermove', -5000, -5000))
      expect(placedOf('recipientFacility')).toEqual(expect.objectContaining({ x: 0, y: 0 }))
    })

    it('writes the template out once the drag ends, not on every move', () => {
      component.onChipPointerDown(pointer('pointerdown', 0, 0), 'recipientFacility')
      component.onChipPointerMove(pointer('pointermove', 10, 10))
      component.onChipPointerMove(pointer('pointermove', 20, 20))
      expect(emitted).toHaveLength(0)
      component.onChipPointerUp(pointer('pointerup', 20, 20))
      expect(emitted).toHaveLength(1)
      expect(component.guide()).toBeNull()
    })

    it('ignores movement from a pointer that did not start the drag', () => {
      component.onChipPointerDown(pointer('pointerdown', 0, 0), 'recipientFacility')
      component.onChipPointerMove(pointer('pointermove', 100, 100, { pointerId: 7 }))
      expect(placedOf('recipientFacility')).toEqual(expect.objectContaining({ x: 400, y: 200 }))
    })

    it('ignores a right-click', () => {
      component.onChipPointerDown(pointer('pointerdown', 0, 0, { button: 2 }), 'recipientFacility')
      component.onChipPointerMove(pointer('pointermove', 100, 100))
      expect(placedOf('recipientFacility')).toEqual(expect.objectContaining({ x: 400, y: 200 }))
    })
  })

  describe('keyboard', () => {
    beforeEach(() => {
      build(artwork)
      component.addField(CERT_FIELD_BY_KEY['recipientFacility'])
      component.updateSelected({ x: 400, y: 200 })
    })

    it('nudges with the arrow keys, ten at a time with Shift', () => {
      component.onChipKeydown(key('ArrowRight'), 'recipientFacility')
      component.onChipKeydown(key('ArrowDown', true), 'recipientFacility')
      expect(placedOf('recipientFacility')).toEqual(expect.objectContaining({ x: 401, y: 210 }))
    })

    it('removes the field with Delete', () => {
      component.onChipKeydown(key('Delete'), 'recipientFacility')
      expect(placedOf('recipientFacility')).toBeUndefined()
    })
  })

  describe('placement warnings', () => {
    /** 10 artwork units per character, so widths are easy to reason about. */
    const measureByLength = () => jest.spyOn(component as any, 'measureText').mockImplementation((text: any) => String(text).length * 10)

    it('reports nothing when text cannot be measured, rather than guessing', () => {
      build(artwork)
      component.addField(CERT_FIELD_BY_KEY['recipientFacility'])
      jest.spyOn(component as any, 'measureText').mockReturnValue(0)
      expect(component.warnings()).toEqual([])
    })

    it('warns when a value is wider than the rule it sits on', () => {
      build(artwork)
      measureByLength()
      component.addField(CERT_FIELD_BY_KEY['recipientFacility'])
      // Long sample is 28 characters = 280 wide, centred at 419: spans 279-559,
      // starting left of the rule at 320. The real certificate's bug.
      component.updateSelected({ x: 419, y: 385 })
      const [warning] = component.warnings()
      expect(warning.key).toBe('recipientFacility')
      expect(warning.message).toContain('wider than the line')
    })

    it('clears the warning once the value is centred on its rule', () => {
      build(artwork)
      measureByLength()
      component.addField(CERT_FIELD_BY_KEY['recipientFacility'])
      component.updateSelected({ x: 419, y: 385 })
      component.snapSelectedToLine()
      expect(component.warnings()).toEqual([])
    })

    it('warns when a value runs off the certificate', () => {
      build(artwork)
      measureByLength()
      component.addField(CERT_FIELD_BY_KEY['recipientFacility'])
      component.updateSelected({ x: 5, y: 100 })
      expect(component.warnings()[0].message).toContain('off the edge')
    })

    it('warns when two fields overlap', () => {
      build(artwork)
      measureByLength()
      component.addField(CERT_FIELD_BY_KEY['recipientBlock'])
      component.updateSelected({ x: 700, y: 100 })
      component.addField(CERT_FIELD_BY_KEY['recipientDistrict'])
      component.updateSelected({ x: 705, y: 102 })
      expect(component.warnings().some(w => w.message.includes('overlaps'))).toBe(true)
    })

    it('warns when the QR code runs off the certificate', () => {
      build(artwork)
      component.addField(CERT_FIELD_BY_KEY['QrCode'])
      component.updateSelected({ x: 1350, y: 800 })
      expect(component.warnings()[0].message).toContain('QR code')
    })

    it('marks the chip that has a problem', () => {
      build(artwork)
      measureByLength()
      component.addField(CERT_FIELD_BY_KEY['recipientFacility'])
      component.updateSelected({ x: 5, y: 100 })
      expect(component.isWarned('recipientFacility')).toBe(true)
      expect(component.isWarned('recipientName')).toBe(false)
    })
  })

  describe('samples', () => {
    it('shows typical values by default, so a design reads like a real certificate', () => {
      build(artwork)
      expect(component.sampleMode()).toBe('short')
      expect(component.sampleFor('recipientFacility')).toBe('SHC Bapcha')
      component.setSampleMode('long')
      expect(component.sampleFor('recipientFacility')).toBe('SHC Bapcha 4741754370 - 6314')
    })

    it("shows the course's own title", () => {
      build(artwork, 'CBP Testing course 2026-09-28-11-42-28')
      expect(component.sampleFor('courseName')).toBe('CBP Testing course 2026-09-28-11-42-28')
    })

    it('checks placement against the longest values whatever the preview shows', () => {
      build(artwork)
      jest.spyOn(component as any, 'measureText').mockImplementation((text: any) => String(text).length * 10)
      component.addField(CERT_FIELD_BY_KEY['recipientFacility'])
      component.updateSelected({ x: 419, y: 385 })
      // Typical values on screen, yet the long facility name is what is measured.
      expect(component.sampleMode()).toBe('short')
      expect(component.warnings()[0].message).toContain('wider than the line')
    })

    it('shows the problem when a warning is chosen', () => {
      build(artwork)
      component.showWarning({ key: 'recipientFacility', message: 'x' })
      expect(component.selectedKey()).toBe('recipientFacility')
      expect(component.sampleMode()).toBe('long')
    })

    it('splits the field list into placed and available', () => {
      build(mapped)
      expect(
        component
          .placedFields()
          .map(f => f.key)
          .sort(),
      ).toEqual(['QrCode', 'courseName', 'recipientName'])
      expect(component.availableFields().some(f => f.key === 'recipientName')).toBe(false)
      expect(component.placedFields().length + component.availableFields().length).toBe(component.fields.length)
    })

    it('positions a centred chip from its middle, at the baseline', () => {
      build(mapped)
      const style = component.chipStyle(placedOf('recipientName')!)
      expect(style.left).toBe('304.5px')
      expect(style.transform).toBe('translate(-50%, -0.82em)')
    })
  })
})
