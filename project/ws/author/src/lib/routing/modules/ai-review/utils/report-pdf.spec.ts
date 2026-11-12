import { HTML2CANVAS_PROBE, keepTextOnItsBaseline } from './report-pdf'

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
