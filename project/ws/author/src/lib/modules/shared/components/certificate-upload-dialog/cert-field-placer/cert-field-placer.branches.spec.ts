import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { CERT_FIELD_BY_KEY } from '../certificate-fields'
import { CertFieldPlacerComponent } from './cert-field-placer.component'

/**
 * The editor's screen geometry, labels and placement checks across the shapes a
 * design can take: every anchor, missing optional styling, vertical and dashed
 * rules, pictures, and pieces that fall off the certificate.
 */
describe('CertFieldPlacerComponent (geometry and checks)', () => {
  let fixture: ComponentFixture<CertFieldPlacerComponent>
  let component: CertFieldPlacerComponent
  let emitted: string[]

  /** 1000 wide on screen at 1000 wide artwork: scale 1, so styles read as artwork units. */
  const artwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 600">
      <rect width="1000" height="600" fill="#ffffff"/>
      <line x1="300" y1="300" x2="700" y2="300"/>
    </svg>`

  const build = (courseName = '') => {
    fixture = TestBed.createComponent(CertFieldPlacerComponent)
    component = fixture.componentInstance
    component.templateChange.subscribe(value => emitted.push(value))
    fixture.componentRef.setInput('svgMarkup', artwork)
    fixture.componentRef.setInput('courseName', courseName)
    fixture.detectChanges()
    component.renderedWidth.set(1000)
  }

  /** Every string is 10 artwork units per character, whatever the font. */
  const measureByLength = () => jest.spyOn(component as any, 'measureText').mockImplementation((text: any) => String(text).length * 10)

  const field = (over: any = {}) =>
    ({
      key: 'recipientName',
      x: 100,
      y: 100,
      fontSize: 20,
      fontFamily: 'Arial',
      fill: '#000',
      fontWeight: 'normal',
      anchor: 'start',
      ...over,
    }) as any

  beforeEach(() => {
    emitted = []
    ;(global as any).URL.createObjectURL = jest.fn(() => 'blob:art')
    ;(global as any).URL.revokeObjectURL = jest.fn()
    TestBed.configureTestingModule({
      declarations: [CertFieldPlacerComponent],
      schemas: [NO_ERRORS_SCHEMA],
    })
    build()
  })

  describe('labels and sample values', () => {
    it('names fields, each kind of piece, and anything unknown', () => {
      component.decorations.set([
        { id: 'cert-text-1', kind: 'text', x: 0, y: 0, text: 'Hi' },
        { id: 'cert-line-1', kind: 'line', x: 0, y: 0, length: 10 },
        { id: 'cert-image-1', kind: 'image', x: 0, y: 0, width: 10, height: 10, href: 'data:x' },
      ] as any)
      expect(component.labelFor('recipientName')).toBe(CERT_FIELD_BY_KEY['recipientName'].label)
      expect(component.labelFor('cert-text-1')).toBe('Text')
      expect(component.labelFor('cert-line-1')).toBe('Line')
      expect(component.labelFor('cert-image-1')).toBe('Picture')
      expect(component.labelFor('mystery')).toBe('mystery')
    })

    it('shows the key itself for a field it does not know', () => {
      expect(component.sampleFor('mystery')).toBe('mystery')
      expect((component as any).longestSampleFor('mystery')).toBe('mystery')
    })

    it('uses a short course title normally, and the long stand-in when showing long values', () => {
      build('Basics')
      expect(component.sampleFor('courseName')).toBe('Basics')
      component.setSampleMode('long')
      expect(component.sampleFor('courseName')).toBe(CERT_FIELD_BY_KEY['courseName'].longSample)
      component.toggleSampleMode()
      expect(component.sampleMode()).toBe('short')
    })

    it('checks against a course title longer than the stand-in', () => {
      const title = 'x'.repeat(CERT_FIELD_BY_KEY['courseName'].longSample.length + 5)
      build(title)
      expect((component as any).longestSampleFor('courseName')).toBe(title)
    })
  })

  describe('field chips', () => {
    it('sizes a QR code, falling back to the default size', () => {
      const sized = component.chipStyle(field({ key: 'QrCode', width: 120, height: 130 }))
      expect(sized).toEqual(expect.objectContaining({ width: '120px', height: '130px' }))
      const unsized = component.chipStyle(field({ key: 'QrCode', width: undefined, height: undefined }))
      expect(unsized['width']).toBe(unsized['height'])
      expect(unsized['font-size']).toBeUndefined()
    })

    it('shifts text by its anchor and shows its weight', () => {
      expect(component.chipStyle(field({ anchor: 'middle', fontWeight: 'bold' }))).toEqual(
        expect.objectContaining({ transform: 'translate(-50%, -0.82em)', 'font-weight': '700' }),
      )
      expect(component.chipStyle(field({ anchor: 'end' }))['transform']).toBe('translate(-100%, -0.82em)')
      expect(component.chipStyle(field({ anchor: 'start' }))).toEqual(
        expect.objectContaining({ transform: 'translate(0, -0.82em)', 'font-weight': '400' }),
      )
    })
  })

  describe('piece styles', () => {
    it('fills in defaults for text with no styling of its own', () => {
      const style = component.decorationStyle({ id: 't', kind: 'text', x: 10, y: 20 } as any)
      expect(style).toEqual(
        expect.objectContaining({
          left: '10px',
          top: '20px',
          'font-weight': '400',
          'font-style': 'normal',
          'text-align': 'left',
          transform: 'translate(0, -0.82em)',
        }),
      )
      expect(style['font-family']).toBeTruthy()
      expect(style['color']).toBeTruthy()
    })

    it('follows bold, italic and each anchor for text', () => {
      const centred = component.decorationStyle({
        id: 't',
        kind: 'text',
        x: 0,
        y: 0,
        fontWeight: 'bold',
        fontStyle: 'italic',
        anchor: 'middle',
        lineHeight: 1.5,
      } as any)
      expect(centred).toEqual(
        expect.objectContaining({ 'font-weight': '700', 'font-style': 'italic', 'text-align': 'center', 'line-height': '1.5' }),
      )
      const right = component.decorationStyle({ id: 't', kind: 'text', x: 0, y: 0, anchor: 'end' } as any)
      expect(right).toEqual(expect.objectContaining({ 'text-align': 'right', transform: 'translate(-100%, -0.82em)' }))
    })

    it('draws a solid horizontal rule as a wide hit area', () => {
      const style = component.decorationStyle({ id: 'l', kind: 'line', x: 50, y: 80 } as any)
      expect(style).toEqual(
        expect.objectContaining({
          left: '50px',
          top: '74px',
          width: '0px',
          height: '12px',
          '--line-style': 'solid',
          '--line-width': '1px',
        }),
      )
    })

    it('draws a dashed vertical rule', () => {
      const style = component.decorationStyle({
        id: 'l',
        kind: 'line',
        x: 50,
        y: 80,
        length: 200,
        vertical: true,
        dashed: true,
        stroke: '#123456',
        strokeWidth: 3,
      } as any)
      expect(style).toEqual(
        expect.objectContaining({
          left: '44px',
          top: '80px',
          width: '12px',
          height: '200px',
          '--line-style': 'dashed',
          '--line-colour': '#123456',
          '--line-width': '3px',
        }),
      )
    })

    it('sizes a picture, with a default when it has none', () => {
      expect(component.decorationStyle({ id: 'i', kind: 'image', x: 1, y: 2 } as any)).toEqual({
        left: '1px',
        top: '2px',
        width: '100px',
        height: '100px',
      })
      expect(component.decorationStyle({ id: 'i', kind: 'image', x: 1, y: 2, width: 40, height: 30 } as any)).toEqual(
        expect.objectContaining({ width: '40px', height: '30px' }),
      )
    })

    it('draws the snapping guide along its rule', () => {
      expect(component.guideStyle({ x1: 300, x2: 700, y: 300, centre: 500 } as any)).toEqual({
        left: '300px',
        top: '300px',
        width: '400px',
      })
    })
  })

  describe('marks over the artwork', () => {
    it('explains each kind of typed-in text', () => {
      const item = (reason: string) => ({ text: 'X', reason }) as any
      expect(component.hardcodedMessage(item('date'))).toContain('fixed date')
      expect(component.hardcodedMessage(item('unknown-token'))).toContain('print empty')
      expect(component.hardcodedMessage(item('legacy-token'))).toContain('older format')
      expect(component.hardcodedMessage(item('on-line'))).toContain('exactly this text')
    })

    it('estimates the width of a mark it cannot measure, for every anchor', () => {
      jest.spyOn(component as any, 'measureText').mockReturnValue(0)
      const mark = (anchor: string) =>
        component.hardcodedStyle({ text: 'abcd', x: 500, y: 100, fontSize: 10, fontFamily: 'Arial', anchor } as any)
      // 4 characters x 10 x 0.55 = 22 wide.
      expect(mark('start')['left']).toBe('496px')
      expect(mark('middle')['left']).toBe('485px')
      expect(mark('end')['left']).toBe('474px')
    })

    it('covers every line of a piece of wording, at each anchor', () => {
      measureByLength()
      const target = (anchor: string) =>
        component.artworkTextStyle({ decoration: { id: '', kind: 'text', x: 500, y: 100, text: 'ab\nabcd', fontSize: 10, anchor } } as any)
      expect(target('start')['left']).toBe('496px')
      expect(target('middle')['left']).toBe('476px')
      expect(target('end')['left']).toBe('456px')
      expect(target('start')['width']).toBe('48px')
    })

    it('ignores a click target that is no longer there', () => {
      const before = component.decorations().length
      component.editArtworkText(99)
      expect(component.decorations().length).toBe(before)
    })
  })

  describe('placement warnings', () => {
    it('flags a QR code running off the certificate', () => {
      component.placed.set([field({ key: 'QrCode', x: 950, y: 100, width: 100, height: 100 })])
      expect(component.warnings()).toEqual([{ key: 'QrCode', message: 'The QR code runs off the edge of the certificate.' }])
      expect(component.isWarned('QrCode')).toBe(true)
    })

    it('flags a QR code of the default size at the corner', () => {
      component.placed.set([field({ key: 'QrCode', x: 990, y: 590, width: undefined, height: undefined })])
      expect(component.warnings().length).toBe(1)
    })

    it('flags a value running off either edge, at each anchor', () => {
      measureByLength()
      component.placed.set([field({ key: 'recipientName', x: 990, anchor: 'start' })])
      expect(component.warnings()[0].message).toContain('runs off the edge')
      component.placed.set([field({ key: 'recipientName', x: 5, anchor: 'end' })])
      expect(component.warnings()[0].message).toContain('runs off the edge')
      component.placed.set([field({ key: 'recipientName', x: 5, anchor: 'middle' })])
      expect(component.warnings()[0].message).toContain('runs off the edge')
    })

    it('says nothing about a value it cannot measure', () => {
      jest.spyOn(component as any, 'measureText').mockReturnValue(0)
      component.placed.set([field({ x: 990 })])
      expect(component.warnings()).toEqual([])
    })

    it('flags two values on top of each other', () => {
      measureByLength()
      component.placed.set([field({ key: 'recipientName', x: 100, y: 100 }), field({ key: 'courseName', x: 110, y: 105 })])
      expect(component.warnings().map(w => w.message)).toContain(
        `${component.labelFor('courseName')} overlaps ${component.labelFor('recipientName')}.`,
      )
    })

    it('flags pieces that leave the certificate, and only those', () => {
      measureByLength()
      component.decorations.set([
        { id: 'h-off', kind: 'line', x: 900, y: 10, length: 200 },
        { id: 'h-on', kind: 'line', x: 100, y: 10, length: 200 },
        { id: 'v-off', kind: 'line', x: 10, y: 500, length: 200, vertical: true },
        { id: 'v-unsized', kind: 'line', x: 10, y: 10, vertical: true },
        { id: 'img-off', kind: 'image', x: 950, y: 10, width: 100, height: 10 },
        { id: 'img-low', kind: 'image', x: 10, y: 590, width: 10, height: 50 },
        { id: 'img-unsized', kind: 'image', x: 10, y: 10 },
        { id: 'txt-start', kind: 'text', x: 990, y: 50, text: 'Hello' },
        { id: 'txt-mid', kind: 'text', x: 5, y: 50, text: 'Hello', anchor: 'middle' },
        { id: 'txt-end', kind: 'text', x: 5, y: 50, text: 'Hello\nthere', anchor: 'end' },
        { id: 'txt-fits', kind: 'text', x: 500, y: 50, text: 'Hello', anchor: 'middle' },
        { id: 'txt-empty', kind: 'text', x: 990, y: 50 },
      ] as any)
      expect(
        component
          .warnings()
          .map(w => w.key)
          .sort(),
      ).toEqual(['h-off', 'img-low', 'img-off', 'txt-end', 'txt-mid', 'txt-start', 'v-off'])
    })
  })

  describe('edits with nothing selected', () => {
    it('changes nothing and writes nothing', () => {
      const before = emitted.length
      component.selectedKey.set(null)
      component.updateSelected({ x: 1 })
      component.updateDecoration({ x: 1 })
      component.updateDecorationText('x')
      component.duplicateSelected()
      component.snapSelectedToLine()
      component.updateImageWidth('50')
      expect(emitted.length).toBe(before)
    })

    it('ignores a number that cannot be used', () => {
      component.placed.set([field()])
      component.selectedKey.set('recipientName')
      component.updateNumber('x', 'abc')
      component.updateDecorationNumber('x', '')
      expect(component.placed()[0].x).toBe(100)
    })
  })

  describe('pictures and wording', () => {
    it('resizes a picture with no recorded width as a square', () => {
      component.decorations.set([{ id: 'img', kind: 'image', x: 0, y: 0, href: 'data:x' }] as any)
      component.selectedKey.set('img')
      component.updateImageWidth('80')
      expect(component.decorations()[0]).toEqual(expect.objectContaining({ width: 80, height: 80 }))
    })

    it('does not resize text as if it were a picture', () => {
      component.decorations.set([{ id: 'txt', kind: 'text', x: 0, y: 0, text: 'Hi' }] as any)
      component.selectedKey.set('txt')
      component.updateImageWidth('80')
      expect(component.decorations()[0].width).toBeUndefined()
    })

    it('centres selected wording on the nearest rule', () => {
      component.decorations.set([{ id: 'txt', kind: 'text', x: 320, y: 290, text: 'Hi' }] as any)
      component.selectedKey.set('txt')
      component.snapSelectedToLine()
      expect(component.decorations().find(d => d.id === 'txt')).toEqual(expect.objectContaining({ anchor: 'middle', x: 500 }))
    })

    it('leaves a selected line where it is', () => {
      component.decorations.set([{ id: 'ln', kind: 'line', x: 10, y: 10, length: 50 }] as any)
      component.selectedKey.set('ln')
      component.snapSelectedToLine()
      expect(component.decorations().find(d => d.id === 'ln')).toEqual(expect.objectContaining({ x: 10, y: 10 }))
    })
  })
})
