import { CERT_FIELDS, CERT_FIELD_BY_KEY, certFieldKeyFor, certSampleFor, formatCertDate, humaniseCertField } from './certificate-fields'
import {
  ICertDecoration,
  fillSampleTokens,
  findBackground,
  findHardcodedText,
  readArtworkWording,
  toHexColour,
  applyDecorations,
  applyFields,
  decorationSnapLines,
  nextDecorationId,
  readDecorations,
  removeDecorations,
  ensureXlinkNamespace,
  findSnapLines,
  getCanvasSize,
  IPlacedField,
  parseCertificateSvg,
  readPlacedFields,
  removeField,
  serialiseSvg,
  toAbsolute,
} from './certificate-svg'

describe('certificate-svg', () => {
  const svg = (body: string, attrs = 'viewBox="0 0 1398 856"') => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`

  const parse = (markup: string): Document => {
    const { doc, error } = parseCertificateSvg(markup)
    expect(error).toBe('')
    return doc as Document
  }

  const placed = (over: Partial<IPlacedField> = {}): IPlacedField => ({
    key: 'recipientName',
    x: 609,
    y: 335,
    fontSize: 20,
    anchor: 'middle',
    fill: '#000000',
    fontFamily: 'Roboto',
    ...over,
  })

  describe('parseCertificateSvg', () => {
    it('rejects an empty template', () => {
      expect(parseCertificateSvg('').error).toContain('empty')
    })

    it('rejects markup that will not parse', () => {
      // DOMParser answers with a <parsererror> document rather than throwing,
      // so an unchecked caller would work against the error document.
      const { doc, error } = parseCertificateSvg('<svg xmlns="http://www.w3.org/2000/svg"><image xlink:href="x"/></svg>')
      expect(doc).toBeNull()
      expect(error).toContain('not valid SVG')
    })

    it('rejects a well-formed file that is not an SVG', () => {
      expect(parseCertificateSvg('<html><body>hi</body></html>').error).toBeTruthy()
    })

    it('accepts a valid template', () => {
      expect(parseCertificateSvg(svg('')).error).toBe('')
    })
  })

  describe('getCanvasSize', () => {
    it('prefers the viewBox', () => {
      expect(getCanvasSize(parse(svg('')))).toEqual({ width: 1398, height: 856 })
    })

    it('falls back to width and height', () => {
      expect(getCanvasSize(parse(svg('', 'width="800" height="600"')))).toEqual({ width: 800, height: 600 })
    })

    it('falls back to a usable canvas when the template declares neither', () => {
      const size = getCanvasSize(parse(svg('', '')))
      expect(size.width).toBeGreaterThan(0)
      expect(size.height).toBeGreaterThan(0)
    })
  })

  describe('toAbsolute', () => {
    it('resolves a percentage against the canvas', () => {
      // Design tools mix the two freely -- x="36%" next to y="335" -- and
      // placement has to happen in one space.
      expect(toAbsolute('36%', 1398)).toBeCloseTo(503.28)
    })

    it('passes a plain number through', () => {
      expect(toAbsolute('335', 856)).toBe(335)
    })

    it('treats nonsense as zero rather than NaN', () => {
      expect(toAbsolute('abc', 100)).toBe(0)
      expect(toAbsolute(null, 100)).toBe(0)
    })
  })

  describe('readPlacedFields', () => {
    it('reads a field back with its position and style', () => {
      const doc = parse(
        svg(
          `<text id="recipientName" fill="#112233" font-family="Georgia" font-size="30">
             <tspan x="609" y="335" text-anchor="middle">{{credentialSubject.recipientName}}</tspan>
           </text>`,
        ),
      )
      const [field] = readPlacedFields(doc, getCanvasSize(doc))
      expect(field).toEqual(
        expect.objectContaining({ key: 'recipientName', x: 609, y: 335, anchor: 'middle', fontSize: 30, fill: '#112233' }),
      )
    })

    it('converts percentage coordinates so a hand-mapped template reopens correctly', () => {
      const doc = parse(svg(`<text id="recipientName"><tspan x="36%" y="335">x</tspan></text>`))
      expect(readPlacedFields(doc, getCanvasSize(doc))[0].x).toBeCloseTo(503.28)
    })

    it('reads the QR code with its box', () => {
      const doc = parse(svg(`<image id="QrCode" x="125" y="640" width="115" height="125"/>`))
      const [field] = readPlacedFields(doc, getCanvasSize(doc))
      expect(field).toEqual(expect.objectContaining({ key: 'QrCode', x: 125, y: 640, width: 115, height: 125 }))
    })

    it('ignores elements that are part of the artwork', () => {
      const doc = parse(svg(`<text id="clip0_767_4"><tspan>CERTIFICATE</tspan></text><image id="image0_767_4"/>`))
      expect(readPlacedFields(doc, getCanvasSize(doc))).toEqual([])
    })
  })

  describe('findSnapLines', () => {
    it('returns horizontal rules with their centre', () => {
      const doc = parse(svg(`<line x1="320" y1="394.25" x2="687" y2="394.25" stroke-dasharray="4 4"/>`))
      expect(findSnapLines(doc)).toEqual([{ y: 394.25, x1: 320, x2: 687, centre: 503.5 }])
    })

    it('ignores vertical lines and short ticks', () => {
      const doc = parse(svg(`<line x1="10" y1="0" x2="10" y2="500"/><line x1="0" y1="5" x2="8" y2="5"/>`))
      expect(findSnapLines(doc)).toEqual([])
    })

    it('normalises a line drawn right to left', () => {
      const doc = parse(svg(`<line x1="687" y1="394" x2="320" y2="394"/>`))
      expect(findSnapLines(doc)[0]).toEqual({ y: 394, x1: 320, x2: 687, centre: 503.5 })
    })
  })

  describe('applyFields', () => {
    it('writes the handlebars token the platform substitutes', () => {
      const doc = parse(svg(''))
      applyFields(doc, [placed()])
      const rendered = serialiseSvg(doc)
      expect(rendered).toContain('{{credentialSubject.recipientName}}')
      expect(rendered).toContain('id="recipientName"')
      expect(rendered).toContain('text-anchor="middle"')
    })

    it('leaves the artwork untouched', () => {
      const doc = parse(svg('<rect width="1398" height="856" fill="#FBE7D0"/>'))
      applyFields(doc, [placed()])
      expect(serialiseSvg(doc)).toContain('<rect width="1398" height="856" fill="#FBE7D0"/>')
    })

    it('replaces rather than duplicates when applied twice', () => {
      const doc = parse(svg(''))
      applyFields(doc, [placed()])
      applyFields(doc, [placed({ x: 700 })])
      const rendered = serialiseSvg(doc)
      expect(rendered.match(/id="recipientName"/g)).toHaveLength(1)
      expect(rendered).toContain('x="700"')
    })

    it('writes the QR code with a namespaced href', () => {
      const doc = parse(svg(''))
      ensureXlinkNamespace(doc)
      applyFields(doc, [placed({ key: 'QrCode', width: 115, height: 125 })])
      const rendered = serialiseSvg(doc)
      // A plain xlink:href attribute merely looks namespaced and is ignored.
      expect(rendered).toMatch(/href="\{\{qrCode\}\}"/)
      expect(rendered).toContain('width="115"')
    })

    it('ignores a field that is not in the catalogue', () => {
      const doc = parse(svg(''))
      applyFields(doc, [placed({ key: 'notAField' })])
      expect(serialiseSvg(doc)).not.toContain('notAField')
    })

    it('round-trips: what is applied reads back the same', () => {
      const doc = parse(svg(''))
      const fields = [placed(), placed({ key: 'recipientDistrict', x: 976, y: 433, anchor: 'middle' })]
      applyFields(doc, fields)
      const reopened = parse(serialiseSvg(doc))
      const read = readPlacedFields(reopened, getCanvasSize(reopened))
      expect(read).toHaveLength(2)
      expect(read.map(f => f.key).sort()).toEqual(['recipientDistrict', 'recipientName'])
      expect(read.find(f => f.key === 'recipientDistrict')).toEqual(expect.objectContaining({ x: 976, y: 433 }))
    })
  })

  describe('removeField', () => {
    it('takes a field back out', () => {
      const doc = parse(svg(''))
      applyFields(doc, [placed()])
      removeField(doc, 'recipientName')
      expect(serialiseSvg(doc)).not.toContain('recipientName')
    })
  })

  describe('ensureXlinkNamespace', () => {
    it('declares xlink so an added QR code does not break parsing', () => {
      const doc = parse(svg(''))
      ensureXlinkNamespace(doc)
      applyFields(doc, [placed({ key: 'QrCode' })])
      expect(parseCertificateSvg(serialiseSvg(doc)).error).toBe('')
    })

    it('leaves an existing declaration alone', () => {
      const doc = parse(svg('', 'viewBox="0 0 10 10" xmlns:xlink="http://www.w3.org/1999/xlink"'))
      ensureXlinkNamespace(doc)
      expect(doc.documentElement.getAttribute('xmlns:xlink')).toBe('http://www.w3.org/1999/xlink')
    })
  })

  describe('the field catalogue', () => {
    it('has a unique key per field', () => {
      expect(new Set(CERT_FIELDS.map(f => f.key)).size).toBe(CERT_FIELDS.length)
    })

    it('is indexed by key', () => {
      CERT_FIELDS.forEach(field => expect(CERT_FIELD_BY_KEY[field.key]).toBe(field))
    })

    it('gives every text field a long sample, so overflow shows in the preview', () => {
      // Previewing only short values is how badly placed fields reach
      // production: "Test User" fits anywhere.
      CERT_FIELDS.filter(f => f.kind === 'text').forEach(field => {
        expect(field.longSample.length).toBeGreaterThan(0)
      })
    })

    it('uses a handlebars token for every field', () => {
      CERT_FIELDS.forEach(field => expect(field.token).toMatch(/^\{\{.+\}\}$/))
    })
  })

  describe('formatCertDate', () => {
    const date = new Date(2026, 8, 3)

    it('renders the pattern the certificate job sends', () => {
      // What an issued certificate actually shows, as on the legacy flow.
      expect(formatCertDate(date)).toBe('03 September 2026')
    })

    it('follows whatever pattern a template asks for', () => {
      expect(formatCertDate(date, 'DD-MM-YYYY')).toBe('03-09-2026')
      expect(formatCertDate(date, 'D MMM YYYY')).toBe('3 Sep 2026')
    })
  })

  describe('certSampleFor', () => {
    const today = new Date(2026, 8, 30)

    it('gives a realistic value for a known field, whatever form the token takes', () => {
      expect(certSampleFor('{{credentialSubject.recipientDesignation}}')).toBe('ANM-MP')
      expect(certSampleFor('credentialSubject.recipientDesignation')).toBe('ANM-MP')
      expect(certSampleFor('recipientDesignation')).toBe('ANM-MP')
    })

    it('gives the long value when asked, to show overflow', () => {
      expect(certSampleFor('recipientFacility', { long: true })).toBe('SHC Bapcha 4741754370 - 6314')
    })

    it("shows the course's own title", () => {
      expect(certSampleFor('{{credentialSubject.trainingName}}', { courseName: 'My Course' })).toBe('My Course')
    })

    it('reads legacy names under their current field', () => {
      expect(certSampleFor('courseName')).toBe(CERT_FIELD_BY_KEY['courseName'].sample)
    })

    it("honours a dateFormat helper's own pattern", () => {
      expect(certSampleFor('{{dateFormat issuanceDate "DD MMMM YYYY"}}', { today })).toBe('30 September 2026')
    })

    it('dates a bare date field in the platform pattern', () => {
      expect(certSampleFor('issuedDate', { today })).toBe('30 September 2026')
      expect(certSampleFor('credentialSubject.issuanceDate', { today })).toBe('30 September 2026')
    })

    it('dates the mapped issued-date token the designer writes', () => {
      expect(certSampleFor('{{credentialSubject.issuedDate}}', { today })).toBe('30 September 2026')
    })

    it('names a field nobody has a sample for, readably', () => {
      expect(certSampleFor('{{credentialSubject.favouriteColour}}')).toBe('Favourite Colour')
    })
  })

  describe('humaniseCertField', () => {
    it('spaces and capitalises a field name', () => {
      expect(humaniseCertField('recipient_block')).toBe('Recipient block')
      expect(humaniseCertField('favouriteColour')).toBe('Favourite Colour')
    })

    it('never returns nothing', () => {
      expect(humaniseCertField('')).toBe('Sample')
    })
  })
})

describe('certificate-svg decorations', () => {
  const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808">${body}</svg>`
  const parse = (markup: string): Document => parseCertificateSvg(markup).doc as Document
  const canvas = { width: 1350, height: 808 }

  const text = (over: Partial<ICertDecoration> = {}): ICertDecoration => ({
    id: 'cert-text-1',
    kind: 'text',
    x: 675,
    y: 120,
    text: 'CERTIFICATE',
    fontSize: 48,
    anchor: 'middle',
    fill: '#1c5d95',
    fontFamily: 'Georgia, Garamond, serif',
    fontWeight: 'bold',
    fontStyle: 'normal',
    ...over,
  })

  describe('nextDecorationId', () => {
    it('numbers ids per kind, skipping any already taken', () => {
      expect(nextDecorationId('text', [])).toBe('cert-text-1')
      expect(nextDecorationId('text', ['cert-text-1', 'cert-text-2'])).toBe('cert-text-3')
      expect(nextDecorationId('line', ['cert-text-1'])).toBe('cert-line-1')
    })
  })

  describe('text', () => {
    it('round-trips with its style', () => {
      const doc = parse(svg(''))
      applyDecorations(doc, [text()])
      const [back] = readDecorations(parse(serialiseSvg(doc)), canvas)
      expect(back).toEqual(text())
    })

    it('writes each line as its own tspan and reads them back joined', () => {
      const doc = parse(svg(''))
      applyDecorations(doc, [text({ text: 'Line one\nLine two', fontWeight: 'normal' })])
      const rendered = serialiseSvg(doc)
      expect(rendered.match(/<tspan/g)).toHaveLength(2)
      expect(rendered).toContain('dy="1.25em"')
      expect(readDecorations(parse(rendered), canvas)[0].text).toBe('Line one\nLine two')
    })

    it('escapes what the author types', () => {
      const doc = parse(svg(''))
      applyDecorations(doc, [text({ text: 'Tom & Jerry <script>' })])
      const rendered = serialiseSvg(doc)
      expect(rendered).toContain('Tom &amp; Jerry &lt;script&gt;')
      expect(parseCertificateSvg(rendered).error).toBe('')
    })

    it('marks itself so it is found again, and nothing unmarked is', () => {
      const doc = parse(svg('<text id="art"><tspan>fixed artwork</tspan></text>'))
      applyDecorations(doc, [text()])
      const read = readDecorations(parse(serialiseSvg(doc)), canvas)
      expect(read.map(d => d.id)).toEqual(['cert-text-1'])
    })
  })

  describe('line', () => {
    it('round-trips a dashed horizontal rule', () => {
      const doc = parse(svg(''))
      const line: ICertDecoration = {
        id: 'cert-line-1',
        kind: 'line',
        x: 400,
        y: 300,
        length: 550,
        vertical: false,
        stroke: '#999999',
        strokeWidth: 1,
        dashed: true,
      }
      applyDecorations(doc, [line])
      const rendered = serialiseSvg(doc)
      expect(rendered).toContain('x2="950"')
      expect(rendered).toContain('stroke-dasharray')
      expect(readDecorations(parse(rendered), canvas)[0]).toEqual(line)
    })

    it('round-trips a vertical line', () => {
      const doc = parse(svg(''))
      applyDecorations(doc, [
        { id: 'cert-line-1', kind: 'line', x: 100, y: 100, length: 200, vertical: true, stroke: '#000000', strokeWidth: 2, dashed: false },
      ])
      const [back] = readDecorations(parse(serialiseSvg(doc)), canvas)
      expect(back).toEqual(expect.objectContaining({ vertical: true, length: 200, x: 100, y: 100, dashed: false }))
    })

    it('offers horizontal lines as snap targets', () => {
      const lines = decorationSnapLines([
        { id: 'a', kind: 'line', x: 400, y: 300, length: 550 },
        { id: 'b', kind: 'line', x: 100, y: 100, length: 200, vertical: true },
        { id: 'c', kind: 'line', x: 0, y: 0, length: 5 },
      ])
      expect(lines).toEqual([{ y: 300, x1: 400, x2: 950, centre: 675 }])
    })
  })

  describe('image', () => {
    it('round-trips an embedded image with a namespaced href', () => {
      const doc = parse(svg(''))
      const logo: ICertDecoration = {
        id: 'cert-image-1',
        kind: 'image',
        x: 60,
        y: 50,
        width: 120,
        height: 90,
        href: 'data:image/png;base64,AAAA',
      }
      applyDecorations(doc, [logo])
      const rendered = serialiseSvg(doc)
      // The xlink namespace is declared, so the result still parses.
      expect(parseCertificateSvg(rendered).error).toBe('')
      expect(readDecorations(parse(rendered), canvas)[0]).toEqual(logo)
    })
  })

  describe('applying and removing', () => {
    it('replaces rather than duplicates when applied twice', () => {
      const doc = parse(svg(''))
      applyDecorations(doc, [text()])
      applyDecorations(doc, [text({ text: 'CHANGED' })])
      const rendered = serialiseSvg(doc)
      expect(rendered.match(/id="cert-text-1"/g)).toHaveLength(1)
      expect(rendered).toContain('CHANGED')
    })

    it('paints in order, later on top', () => {
      const doc = parse(svg(''))
      applyDecorations(doc, [text({ id: 'cert-text-1' }), text({ id: 'cert-text-2' })])
      const rendered = serialiseSvg(doc)
      expect(rendered.indexOf('cert-text-1')).toBeLessThan(rendered.indexOf('cert-text-2'))
    })

    it('strips every decoration and leaves the artwork', () => {
      const doc = parse(svg('<rect id="bg" width="10" height="10"/>'))
      applyDecorations(doc, [text(), { id: 'cert-line-1', kind: 'line', x: 0, y: 0, length: 100 }])
      removeDecorations(doc)
      const rendered = serialiseSvg(doc)
      expect(rendered).toContain('id="bg"')
      expect(rendered).not.toContain('data-cert')
    })

    it('gives a repeated or missing id a fresh one when reading', () => {
      const doc = parse(
        svg(
          '<text data-cert="text" id="dup"><tspan x="1" y="1">a</tspan></text>' +
            '<text data-cert="text" id="dup"><tspan x="1" y="1">b</tspan></text>' +
            '<line data-cert="line" x1="0" y1="0" x2="50" y2="0"/>',
        ),
      )
      const ids = readDecorations(doc, canvas).map(d => d.id)
      expect(new Set(ids).size).toBe(3)
      expect(ids).toContain('dup')
    })

    it('ignores a marker on the wrong kind of element', () => {
      const doc = parse(svg('<rect data-cert="text" width="1" height="1"/>'))
      expect(readDecorations(doc, canvas)).toEqual([])
    })
  })

  describe('bold fields', () => {
    it('writes and reads a field weight', () => {
      const doc = parse(svg(''))
      applyFields(doc, [
        { key: 'recipientName', x: 675, y: 300, fontSize: 36, anchor: 'middle', fill: '#000', fontFamily: 'Roboto', fontWeight: 'bold' },
      ])
      const back = readPlacedFields(parse(serialiseSvg(doc)), canvas)[0]
      expect(back.fontWeight).toBe('bold')
    })

    it('reads a numeric weight from a design tool as bold', () => {
      const doc = parse(svg('<text id="recipientName" font-weight="700"><tspan x="1" y="1">x</tspan></text>'))
      expect(readPlacedFields(doc, canvas)[0].fontWeight).toBe('bold')
    })
  })
})

describe('certificate-svg samples and background', () => {
  const canvas = { width: 1350, height: 808 }
  const parse = (body: string) =>
    parseCertificateSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808">${body}</svg>`).doc as Document

  describe('fillSampleTokens', () => {
    it('fills handlebars and legacy tokens in place, and reports what it filled', () => {
      const doc = parse(
        '<text><tspan x="1" y="1">{{credentialSubject.recipientName}}</tspan></text><text><tspan>${courseName}</tspan></text><text><tspan>fixed</tspan></text>',
      )
      const filled = fillSampleTokens(doc, token => `<${token}>`)
      const out = serialiseSvg(doc)
      expect(out).toContain('&lt;credentialSubject.recipientName&gt;')
      expect(out).toContain('&lt;courseName&gt;')
      expect(out).toContain('fixed')
      expect(filled.size).toBe(2)
    })

    it('leaves a text element wrapping tspans alone, filling the tspans instead', () => {
      const doc = parse('<text><tspan>{{a}}</tspan><tspan>{{b}}</tspan></text>')
      fillSampleTokens(doc, token => token.toUpperCase())
      expect(doc.querySelectorAll('tspan')).toHaveLength(2)
      expect(serialiseSvg(doc)).toContain('>A<')
    })
  })

  describe('findBackground', () => {
    it('prefers a shape marked as the background', () => {
      const doc = parse(
        '<rect width="1350" height="808" fill="#ffffff"/><rect id="bg" data-cert-bg="true" width="10" height="10" fill="#000000"/>',
      )
      expect(findBackground(doc, canvas)!.getAttribute('id')).toBe('bg')
    })

    it('otherwise takes the first plain rectangle covering the canvas', () => {
      const doc = parse('<rect width="200" height="200" fill="#123456"/><rect id="bg" width="100%" height="100%" fill="#FBE7D0"/>')
      expect(findBackground(doc, canvas)!.getAttribute('id')).toBe('bg')
    })

    it('does not treat a pattern or gradient as a colour', () => {
      const doc = parse('<rect width="1350" height="808" fill="url(#pattern0)"/>')
      expect(findBackground(doc, canvas)).toBeNull()
    })

    it('finds nothing when the artwork has no plain background', () => {
      expect(findBackground(parse('<circle r="5"/>'), canvas)).toBeNull()
    })
  })

  describe('toHexColour', () => {
    it('normalises what a colour input can show', () => {
      expect(toHexColour('#FBE7D0')).toBe('#fbe7d0')
      expect(toHexColour('#abc')).toBe('#aabbcc')
      expect(toHexColour('rgb(255, 0, 16)')).toBe('#ff0010')
      expect(toHexColour('white')).toBe('#ffffff')
    })

    it('says so when a fill is not a plain colour', () => {
      expect(toHexColour('url(#p)')).toBeNull()
      expect(toHexColour('none')).toBeNull()
      expect(toHexColour(null)).toBeNull()
    })
  })
})

describe('learner details typed into the artwork', () => {
  const canvas = { width: 1350, height: 808 }
  /** The facility rule from the real Bihar template: 320-687 at y 394. */
  const rule = { y: 394, x1: 320, x2: 687, centre: 503.5 }
  const parse = (body: string) =>
    parseCertificateSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808">${body}</svg>`).doc as Document
  const text = (content: string, x: number, y: number, anchor = 'middle') =>
    `<text font-size="20"><tspan x="${x}" y="${y}" text-anchor="${anchor}">${content}</tspan></text>`

  describe('certFieldKeyFor', () => {
    it('knows the fields the platform fills, in any form', () => {
      expect(certFieldKeyFor('{{credentialSubject.recipientName}}')).toBe('recipientName')
      expect(certFieldKeyFor('{{credentialSubject.trainingName}}')).toBe('courseName')
      expect(certFieldKeyFor('{{credentialSubject.issuedDate}}')).toBe('issuedDate')
      // Templates made before the date was mapped still carry the helper.
      expect(certFieldKeyFor('{{dateFormat issuanceDate "DD MMMM YYYY"}}')).toBe('issuedDate')
      expect(certFieldKeyFor('{{qrCode}}')).toBe('QrCode')
      expect(certFieldKeyFor('${recipientName}')).toBe('recipientName')
    })

    it('reads the Aastrika fields under their legacy template names', () => {
      expect(certFieldKeyFor('${designation}')).toBe('recipientDesignation')
      expect(certFieldKeyFor('${facilityName}')).toBe('recipientFacility')
      expect(certFieldKeyFor('${nin}')).toBe('recipientNIN')
      expect(certFieldKeyFor('${block}')).toBe('recipientBlock')
      expect(certFieldKeyFor('${district}')).toBe('recipientDistrict')
    })

    it('does not offer fields the credential does not carry', () => {
      ;['recipientState', 'recipientCountry', 'orgName', 'providerName'].forEach(key =>
        expect(certFieldKeyFor(`{{credentialSubject.${key}}}`)).toBeNull(),
      )
    })

    it('says when a token fills nothing', () => {
      expect(certFieldKeyFor('{{name}}')).toBeNull()
      expect(certFieldKeyFor('{{credentialSubject.favouriteColour}}')).toBeNull()
    })
  })

  describe('findHardcodedText', () => {
    it('flags a name typed onto the line where it should be placed', () => {
      const [found] = findHardcodedText(parse(text('Aastrika User', 503, 385)), canvas, [rule])
      expect(found).toEqual(expect.objectContaining({ text: 'Aastrika User', reason: 'on-line', x: 503, y: 385 }))
    })

    it('leaves the label beside a line alone', () => {
      // "at Facility" starts before the rule does; it is a label, not a value.
      expect(findHardcodedText(parse(text('at Facility', 230, 385, 'start')), canvas, [rule])).toEqual([])
    })

    it('leaves text well above a line alone', () => {
      expect(findHardcodedText(parse(text('This certificate is awarded to', 503, 300)), canvas, [rule])).toEqual([])
    })

    it('flags a fixed date wherever it is', () => {
      const dates = ['29 September 2026', '29-09-2026', 'Sep 29, 2026', '2026-09-29', '1st March 2025']
      dates.forEach(date => {
        const [found] = findHardcodedText(parse(text(date, 100, 100)), canvas, [])
        expect({ date, reason: found && found.reason }).toEqual({ date, reason: 'date' })
      })
    })

    it('does not mistake a year or a number for a date', () => {
      expect(findHardcodedText(parse(text('Established 1998', 100, 100)), canvas, [])).toEqual([])
      expect(findHardcodedText(parse(text('Reg. No. 4741754370', 100, 100)), canvas, [])).toEqual([])
    })

    it('flags a placeholder the platform does not fill', () => {
      const [found] = findHardcodedText(parse(text('Name: {{name}}', 100, 100)), canvas, [])
      expect(found).toEqual(expect.objectContaining({ text: '{{name}}', reason: 'unknown-token' }))
    })

    it('does not flag a placeholder the platform does fill', () => {
      expect(findHardcodedText(parse(text('{{credentialSubject.recipientName}}', 503, 385)), canvas, [rule])).toEqual([])
    })

    it('flags the old ${...} form, which prints literally', () => {
      const [found] = findHardcodedText(parse(text('${recipientName}', 100, 100)), canvas, [])
      expect(found).toEqual(expect.objectContaining({ text: '${recipientName}', reason: 'legacy-token' }))
    })

    it('ignores empty text', () => {
      expect(findHardcodedText(parse(text('   ', 503, 385)), canvas, [rule])).toEqual([])
    })
  })
})

describe("the design's own wording", () => {
  const canvas = { width: 1350, height: 808 }
  const parse = (body: string, defs = '') =>
    parseCertificateSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1350 808"><defs>${defs}</defs>${body}</svg>`).doc as Document
  /** How Figma writes a text layer when outlining is off. */
  const figma = (content: string, extra = '') =>
    `<text fill="#1c3d5a" xml:space="preserve" style="white-space: pre" font-family="Georgia" font-size="40" letter-spacing="0em" ${extra}><tspan x="675" y="170" text-anchor="middle">${content}</tspan></text>`
  const read = (doc: Document) => readArtworkWording(doc, canvas)

  it('takes over a plain line of wording exactly as designed', () => {
    const [item] = read(parse(figma('CERTIFICATE', 'font-weight="bold"'))).editable
    expect(item.decoration).toEqual(
      expect.objectContaining({
        kind: 'text',
        text: 'CERTIFICATE',
        x: 675,
        y: 170,
        fontSize: 40,
        anchor: 'middle',
        fill: '#1c3d5a',
        fontFamily: 'Georgia',
        fontWeight: 'bold',
      }),
    )
    expect(item.node.nodeName.toLowerCase()).toBe('text')
  })

  it("keeps a paragraph's own line spacing", () => {
    const doc = parse(
      '<text font-size="20"><tspan x="100" y="300">Bihar, has successfully</tspan><tspan x="100" y="330">completed the course</tspan></text>',
    )
    const [item] = read(doc).editable
    expect(item.decoration.text).toBe('Bihar, has successfully\ncompleted the course')
    expect(item.decoration.lineHeight).toBe(1.5)
  })

  it('takes inherited colour and font from the group around it', () => {
    const doc = parse('<g fill="#b8963e" font-family="Arial" font-size="22"><text><tspan x="1" y="50">OF COMPLETION</tspan></text></g>')
    const [item] = read(doc).editable
    expect(item.decoration).toEqual(expect.objectContaining({ fill: '#b8963e', fontFamily: 'Arial', fontSize: 22 }))
  })

  it('accepts the frame clip design tools wrap everything in', () => {
    const doc = parse(
      '<g clip-path="url(#frame)">' + figma('CERTIFICATE') + '</g>',
      '<clipPath id="frame"><rect width="1350" height="808" fill="white"/></clipPath>',
    )
    expect(read(doc).editable).toHaveLength(1)
  })

  describe('leaves as designed anything it could not reproduce', () => {
    const fixed = (doc: Document) => {
      const result = read(doc)
      expect(result.editable).toEqual([])
      expect(result.fixedCount).toBe(1)
    }

    it('letter spacing', () => fixed(parse(figma('C E R T', '').replace('letter-spacing="0em"', 'letter-spacing="0.2em"'))))
    it('a transform on the text', () => fixed(parse(figma('CERTIFICATE', 'transform="rotate(-5)"'))))
    it('a transform on a group around it', () => fixed(parse('<g transform="translate(10 0)">' + figma('CERTIFICATE') + '</g>')))
    it('a clip that actually clips', () =>
      fixed(
        parse(
          '<g clip-path="url(#half)">' + figma('CERTIFICATE') + '</g>',
          '<clipPath id="half"><rect width="600" height="808"/></clipPath>',
        ),
      ))
    it('a gradient or pattern fill', () => fixed(parse(figma('CERTIFICATE').replace('fill="#1c3d5a"', 'fill="url(#g)"'))))
    it('styling in a style attribute', () =>
      fixed(parse(figma('CERTIFICATE').replace('style="white-space: pre"', 'style="font-weight: 700"'))))
    it('two differently styled runs on one line', () =>
      fixed(parse('<text font-size="20"><tspan x="100" y="300">Mr. </tspan><tspan x="140" y="300">Name</tspan></text>')))
    it('a tspan with styling of its own', () =>
      fixed(parse('<text font-size="20"><tspan x="100" y="300" fill="red">Warning</tspan></text>')))
    it('uneven line spacing', () =>
      fixed(
        parse('<text font-size="20"><tspan x="1" y="100">a</tspan><tspan x="1" y="130">b</tspan><tspan x="1" y="170">c</tspan></text>'),
      ))
    it('text on a curve', () => fixed(parse('<text><textPath href="#p">around</textPath></text>')))
  })

  it('leaves learner details alone -- they are not wording', () => {
    const result = read(parse(figma('{{credentialSubject.recipientName}}') + figma('${courseName}')))
    expect(result.editable).toEqual([])
    expect(result.fixedCount).toBe(0)
  })

  it('recognises wording exported as outlines', () => {
    const big = 'M' + '1 1 L2 2 '.repeat(300)
    const outlined = parse(`<path d="${big}"/><path d="${big}"/><path d="${big}"/>`)
    expect(read(outlined).outlinedWording).toBe(true)
    // Real text present: some wording was kept as text, so it is not the whole story.
    expect(read(parse(`<path d="${big}"/><path d="${big}"/><path d="${big}"/>` + figma('Hello'))).outlinedWording).toBe(false)
  })

  it("writes a paragraph's line spacing back out", () => {
    const doc = parse('')
    applyDecorations(doc, [{ id: 'cert-text-1', kind: 'text', x: 1, y: 100, text: 'a\nb', fontSize: 20, lineHeight: 1.5 }])
    const out = serialiseSvg(doc)
    expect(out).toContain('dy="1.5em"')
    expect(readDecorations(parse(out.replace(/^<svg[^>]*>|<\/svg>$/g, '')), canvas)[0].lineHeight).toBe(1.5)
  })
})
