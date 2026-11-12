import { groupBlocks, HTML2CANVAS_PROBE, keepTextOnItsBaseline, looksBlank, scaleFor } from './report-pdf'

describe('keepTextOnItsBaseline', () => {
  afterEach(() => {
    document.head.querySelectorAll('style[data-air-pdf]').forEach(s => s.remove())
    document.head.querySelectorAll('style[data-test]').forEach(s => s.remove())
  })

  // The portal's Tailwind base rule that made every image a block and sank the PDF's text.
  const tailwindBase = () => {
    const s = document.createElement('style')
    s.setAttribute('data-test', '')
    s.textContent = 'img{display:block;vertical-align:middle}'
    document.head.appendChild(s)
  }

  const probe = () => {
    const img = document.createElement('img')
    img.src = HTML2CANVAS_PROBE
    img.style.verticalAlign = 'baseline'
    document.body.appendChild(img)
    return img
  }

  it("puts html2canvas's measuring image back inline while the PDF is drawn, and undoes it", () => {
    tailwindBase()
    const img = probe()
    expect(getComputedStyle(img).display).toBe('block')
    const restore = keepTextOnItsBaseline(document)
    expect(getComputedStyle(img).display).toBe('inline')
    restore()
    expect(getComputedStyle(img).display).toBe('block')
    expect(document.head.querySelector('style[data-air-pdf]')).toBeNull()
    img.remove()
  })

  it("leaves the portal's own images alone", () => {
    tailwindBase()
    const other = document.createElement('img')
    other.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='
    document.body.appendChild(other)
    const restore = keepTextOnItsBaseline(document)
    expect(getComputedStyle(other).display).toBe('block')
    restore()
    other.remove()
  })

  it('matches the probe html2canvas really uses', () => {
    // If html2canvas is upgraded and changes its probe image, this fix would silently stop
    // matching: this test fails first.
    const source: string = jest.requireActual('fs').readFileSync(require.resolve('html2canvas/dist/html2canvas.js'), 'utf8')
    expect(source).toContain(`var SMALL_IMAGE = '${HTML2CANVAS_PROBE}'`)
  })
})

describe('drawing a long report in parts', () => {
  it('groups the blocks so each part fits one drawing, a too-tall block on its own', () => {
    // Blocks start at 0, 400, 900, 1500 and the last ends at 1700; a part may be 1000 tall.
    expect(groupBlocks([0, 400, 900, 1500], 1700, 1000)).toEqual([
      [0, 1],
      [2, 3],
    ])
    expect(groupBlocks([0, 2500, 2600], 2700, 1000)).toEqual([[0], [1, 2]])
    expect(groupBlocks([0], 300, 1000)).toEqual([[0]])
    expect(groupBlocks([], 0, 1000)).toEqual([])
  })

  it('draws at scale 2, and lower only when the browser would refuse the canvas', () => {
    expect(scaleFor(4000, 718)).toBe(2)
    // 40,000 CSS px tall: past both limits at scale 2.
    const s = scaleFor(40000, 718)
    expect(s).toBeLessThan(1)
    expect(40000 * s).toBeLessThanOrEqual(32000)
    expect(718 * s * 40000 * s).toBeLessThanOrEqual(16_000_000 + 1)
    expect(scaleFor(0)).toBe(2)
  })

  it('calls a drawing with no size empty, and never refuses one it cannot inspect', () => {
    expect(looksBlank(null, document)).toBe(true)
    const none = document.createElement('canvas')
    none.width = 0
    expect(looksBlank(none, document)).toBe(true)
    const sized = document.createElement('canvas')
    sized.width = 10
    sized.height = 10
    // jsdom has no 2D context: unknown is not blank.
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    expect(looksBlank(sized, document)).toBe(false)
  })

  it('tells a white drawing from one with something on it', () => {
    const data = new Uint8ClampedArray(160 * 640 * 4).fill(255)
    const ctx = { drawImage: jest.fn(), getImageData: jest.fn(() => ({ data })) }
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
    const c = document.createElement('canvas')
    c.width = 100
    c.height = 100
    expect(looksBlank(c, document)).toBe(true)
    data[4000] = 30
    expect(looksBlank(c, document)).toBe(false)
  })

  afterEach(() => jest.restoreAllMocks())
})
