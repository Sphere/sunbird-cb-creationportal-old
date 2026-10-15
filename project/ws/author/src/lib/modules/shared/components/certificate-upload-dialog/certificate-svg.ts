import { CERT_FIELD_BY_KEY, CERT_LEGACY_KEYS, ICertField, certFieldKeyFor } from './certificate-fields'

export const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
export const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink'

/** Where one field sits on the certificate, in the artwork's own coordinates. */
export interface IPlacedField {
  key: string
  x: number
  y: number
  fontSize: number
  anchor: 'start' | 'middle' | 'end'
  fill: string
  fontFamily: string
  fontWeight?: 'normal' | 'bold'
  /** Images only. */
  width?: number
  height?: number
}

/** A line in the artwork a value can be aligned to -- a rule or a signature line. */
export interface ISnapLine {
  y: number
  x1: number
  x2: number
  /** Where a centre-anchored value should sit to be centred on the line. */
  centre: number
}

export interface ICanvasSize {
  width: number
  height: number
}

/**
 * Fonts the certificate renderer is known to have. A creator picking anything
 * else gets a preview that does not match the issued certificate, because the
 * substitution happens server-side at download time, not in the browser.
 */
export const CERT_FONTS = ['Roboto', 'Georgia, Garamond, serif', 'Arial, Helvetica, sans-serif', 'Times New Roman, serif']

export const CERT_DEFAULT_FONT = CERT_FONTS[0]
export const CERT_DEFAULT_SIZE = 20
export const CERT_DEFAULT_FILL = '#000000'
/** The QR code is square; the platform renders it at whatever box it is given. */
export const CERT_DEFAULT_QR_SIZE = 125

/**
 * Parses a template. DOMParser reports a malformed document by returning a
 * `<parsererror>` document rather than throwing, so that has to be checked for
 * explicitly or the caller silently works against an error document.
 */
export function parseCertificateSvg(markup: string): { doc: Document | null; error: string } {
  if (!markup) {
    return { doc: null, error: 'The template is empty.' }
  }
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
  if (doc.querySelector('parsererror')) {
    return { doc: null, error: 'This file is not valid SVG, so it cannot be used as a certificate template.' }
  }
  if (!doc.documentElement || doc.documentElement.nodeName.toLowerCase() !== 'svg') {
    return { doc: null, error: 'This file does not contain an SVG image.' }
  }
  return { doc, error: '' }
}

/** The artwork's own coordinate space, which every placed field is expressed in. */
export function getCanvasSize(doc: Document): ICanvasSize {
  const root = doc.documentElement
  const viewBox = (root.getAttribute('viewBox') || '')
    .trim()
    .split(/[\s,]+/)
    .map(Number)
  if (viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    return { width: viewBox[2], height: viewBox[3] }
  }
  const width = parseFloat(root.getAttribute('width') || '')
  const height = parseFloat(root.getAttribute('height') || '')
  if (width > 0 && height > 0) {
    return { width, height }
  }
  // A last resort so the canvas still renders; placement will be approximate.
  return { width: 1398, height: 856 }
}

/**
 * Resolves a coordinate that may be a percentage.
 *
 * Templates exported from design tools mix the two freely -- `x="36%"` next to
 * `y="335"` -- and placement has to happen in one space, so percentages are
 * converted up front against the canvas.
 */
export function toAbsolute(value: string | null, extent: number): number {
  if (!value) {
    return 0
  }
  const trimmed = value.trim()
  if (trimmed.endsWith('%')) {
    const percent = parseFloat(trimmed.slice(0, -1))
    return isNaN(percent) ? 0 : (percent / 100) * extent
  }
  const parsed = parseFloat(trimmed)
  return isNaN(parsed) ? 0 : parsed
}

function anchorOf(value: string | null): 'start' | 'middle' | 'end' {
  return value === 'middle' || value === 'end' ? value : 'start'
}

/** Design tools write weight as a word or a number; 600 and up reads as bold. */
function weightOf(value: string | null): 'normal' | 'bold' {
  if (!value) {
    return 'normal'
  }
  return value === 'bold' || parseInt(value, 10) >= 600 ? 'bold' : 'normal'
}

/**
 * Gives legacy `${name}` ids their current key, so an older template reopens
 * with its fields recognised. Only the id changes: every recognised field is
 * rewritten with its current token when the template is saved, and anything not
 * in the catalogue is left alone for the author to see. Returns how many ids
 * were changed.
 */
export function normaliseLegacyIds(doc: Document): number {
  let changed = 0
  doc.querySelectorAll('[id]').forEach(node => {
    const match = /^\$\{\s*([A-Za-z0-9_]+)\s*\}$/.exec(node.getAttribute('id') || '')
    if (!match) {
      return
    }
    const key = CERT_LEGACY_KEYS[match[1]] || match[1]
    if (CERT_FIELD_BY_KEY[key]) {
      node.setAttribute('id', key)
      changed += 1
    }
  })
  return changed
}

/**
 * Reads back the fields a template already carries, so a template that has been
 * through this editor -- or was mapped by hand -- reopens with its fields in
 * place instead of blank.
 */
export function readPlacedFields(doc: Document, canvas: ICanvasSize): IPlacedField[] {
  const placed: IPlacedField[] = []

  doc.querySelectorAll('text').forEach(text => {
    const key = text.getAttribute('id') || ''
    const field: ICertField = CERT_FIELD_BY_KEY[key]
    if (!field || field.kind !== 'text') {
      return
    }
    const tspan = text.querySelector('tspan')
    const holder = tspan || text
    placed.push({
      key,
      x: toAbsolute(holder.getAttribute('x'), canvas.width),
      y: toAbsolute(holder.getAttribute('y'), canvas.height),
      fontSize: toAbsolute(text.getAttribute('font-size'), canvas.height) || CERT_DEFAULT_SIZE,
      anchor: anchorOf(holder.getAttribute('text-anchor') || text.getAttribute('text-anchor')),
      fill: text.getAttribute('fill') || CERT_DEFAULT_FILL,
      fontFamily: text.getAttribute('font-family') || CERT_DEFAULT_FONT,
      fontWeight: weightOf(text.getAttribute('font-weight')),
    })
  })

  doc.querySelectorAll('image').forEach(image => {
    const key = image.getAttribute('id') || ''
    const field: ICertField = CERT_FIELD_BY_KEY[key]
    if (!field || field.kind !== 'image') {
      return
    }
    placed.push({
      key,
      x: toAbsolute(image.getAttribute('x'), canvas.width),
      y: toAbsolute(image.getAttribute('y'), canvas.height),
      fontSize: CERT_DEFAULT_SIZE,
      anchor: 'start',
      fill: CERT_DEFAULT_FILL,
      fontFamily: CERT_DEFAULT_FONT,
      width: toAbsolute(image.getAttribute('width'), canvas.width) || CERT_DEFAULT_QR_SIZE,
      height: toAbsolute(image.getAttribute('height'), canvas.height) || CERT_DEFAULT_QR_SIZE,
    })
  })

  return placed
}

/**
 * The rules and signature lines in the artwork, which values are meant to sit
 * on. Offering these as snap targets is what stops a value being dropped a
 * hundred units left of its own line -- where a short value looks fine and a
 * long one runs into the label beside it.
 */
export function findSnapLines(doc: Document): ISnapLine[] {
  const lines: ISnapLine[] = []
  doc.querySelectorAll('line').forEach(line => {
    const y1 = parseFloat(line.getAttribute('y1') || '')
    const y2 = parseFloat(line.getAttribute('y2') || '')
    const x1 = parseFloat(line.getAttribute('x1') || '')
    const x2 = parseFloat(line.getAttribute('x2') || '')
    if ([y1, y2, x1, x2].some(isNaN)) {
      return
    }
    // Horizontal rules only: a value sits on a line, never along a vertical one.
    if (Math.abs(y1 - y2) > 1 || Math.abs(x2 - x1) < 20) {
      return
    }
    const left = Math.min(x1, x2)
    const right = Math.max(x1, x2)
    lines.push({ y: y1, x1: left, x2: right, centre: (left + right) / 2 })
  })
  return lines.sort((a, b) => a.y - b.y || a.x1 - b.x1)
}

/** Removes any element this editor owns, so applying is idempotent. */
function removeExisting(doc: Document, key: string): void {
  doc.querySelectorAll(`[id="${key}"]`).forEach(node => {
    if (node.parentNode) {
      node.parentNode.removeChild(node)
    }
  })
}

function buildText(doc: Document, field: ICertField, placed: IPlacedField): Element {
  const text = doc.createElementNS(SVG_NAMESPACE, 'text')
  text.setAttribute('id', field.key)
  text.setAttribute('fill', placed.fill)
  text.setAttribute('xml:space', 'preserve')
  text.setAttribute('style', 'white-space: pre')
  text.setAttribute('font-family', placed.fontFamily)
  text.setAttribute('font-size', String(placed.fontSize))
  text.setAttribute('letter-spacing', '0em')
  if (placed.fontWeight === 'bold') {
    text.setAttribute('font-weight', 'bold')
  }

  const tspan = doc.createElementNS(SVG_NAMESPACE, 'tspan')
  tspan.setAttribute('x', String(Math.round(placed.x)))
  tspan.setAttribute('y', String(Math.round(placed.y)))
  tspan.setAttribute('text-anchor', placed.anchor)
  tspan.textContent = field.token

  text.appendChild(tspan)
  return text
}

function buildImage(doc: Document, field: ICertField, placed: IPlacedField): Element {
  const image = doc.createElementNS(SVG_NAMESPACE, 'image')
  image.setAttribute('id', field.key)
  image.setAttribute('class', 'qr-code')
  image.setAttribute('x', String(Math.round(placed.x)))
  image.setAttribute('y', String(Math.round(placed.y)))
  image.setAttribute('width', String(Math.round(placed.width || CERT_DEFAULT_QR_SIZE)))
  image.setAttribute('height', String(Math.round(placed.height || CERT_DEFAULT_QR_SIZE)))
  // setAttribute alone writes a plain attribute that merely looks namespaced,
  // which renderers ignore; `href` covers SVG2.
  image.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', field.token)
  image.setAttribute('href', field.token)
  return image
}

/**
 * Writes the placed fields into the artwork.
 *
 * The artwork itself is never altered: each field is appended as its own
 * element, replacing only a previous element of the same id. That keeps the
 * designer's file intact and makes re-editing lossless.
 */
export function applyFields(doc: Document, fields: IPlacedField[]): void {
  fields.forEach(placed => {
    const field: ICertField = CERT_FIELD_BY_KEY[placed.key]
    if (!field) {
      return
    }
    removeExisting(doc, field.key)
    const node = field.kind === 'image' ? buildImage(doc, field, placed) : buildText(doc, field, placed)
    doc.documentElement.appendChild(node)
  })
}

/** Removes a field's element from the artwork entirely. */
export function removeField(doc: Document, key: string): void {
  removeExisting(doc, key)
}

export function serialiseSvg(doc: Document): string {
  return new XMLSerializer().serializeToString(doc)
}

/**
 * The xlink namespace has to be declared on the root for `xlink:href` to be
 * legal; a template with no image of its own will not have declared it, and the
 * result would fail to parse once a QR code is added.
 */
export function ensureXlinkNamespace(doc: Document): void {
  const root = doc.documentElement
  if (!root.getAttribute('xmlns:xlink')) {
    root.setAttribute('xmlns:xlink', XLINK_NAMESPACE)
  }
}

// ---- Decorations: text, lines and images the author adds or edits ----------

/**
 * What the editor owns besides learner fields. Each is written with a
 * `data-cert` attribute naming its kind, which is how it is found again: the
 * standard templates mark their own title, wording and rules this way so all of
 * it can be edited, while anything unmarked -- borders, backgrounds, an uploaded
 * file's own artwork -- stays fixed.
 */
export type CertDecorationKind = 'text' | 'line' | 'image'

export interface ICertDecoration {
  id: string
  kind: CertDecorationKind
  /** Text: the anchor point on the first baseline. Line and image: top-left. */
  x: number
  y: number
  // text
  text?: string
  fontSize?: number
  anchor?: 'start' | 'middle' | 'end'
  fill?: string
  fontFamily?: string
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  /**
   * Spacing between lines, as a multiple of the size. Unset means the editor's
   * default; set when a design's own paragraph is taken over, so it keeps the
   * spacing the designer chose.
   */
  lineHeight?: number
  // line
  length?: number
  vertical?: boolean
  stroke?: string
  strokeWidth?: number
  dashed?: boolean
  // image
  width?: number
  height?: number
  href?: string
}

export const CERT_DECORATION_ATTR = 'data-cert'
/** Line spacing for multi-line text, as a multiple of the size. */
export const CERT_LINE_HEIGHT = 1.25
export const CERT_DASH = '6 6'

/** The next unused id for a kind: `cert-text-1`, `cert-text-2`, ... */
export function nextDecorationId(kind: CertDecorationKind, taken: string[]): string {
  const used = new Set(taken)
  let n = 1
  while (used.has(`cert-${kind}-${n}`)) {
    n += 1
  }
  return `cert-${kind}-${n}`
}

function numberOf(value: string | null, fallback: number): number {
  const parsed = parseFloat(value || '')
  return isNaN(parsed) ? fallback : parsed
}

function readDecorationText(node: Element, canvas: ICanvasSize): ICertDecoration {
  const tspans = Array.from(node.querySelectorAll('tspan'))
  const first = tspans[0] || node
  return {
    id: node.getAttribute('id') || '',
    kind: 'text',
    x: toAbsolute(first.getAttribute('x') || node.getAttribute('x'), canvas.width),
    y: toAbsolute(first.getAttribute('y') || node.getAttribute('y'), canvas.height),
    // One tspan per line is how multi-line text is written; a plain <text> is one line.
    text: tspans.length ? tspans.map(t => t.textContent || '').join('\n') : node.textContent || '',
    fontSize: numberOf(node.getAttribute('font-size'), CERT_DEFAULT_SIZE),
    anchor: anchorOf(node.getAttribute('text-anchor') || first.getAttribute('text-anchor')),
    fill: node.getAttribute('fill') || CERT_DEFAULT_FILL,
    fontFamily: node.getAttribute('font-family') || CERT_DEFAULT_FONT,
    fontWeight: weightOf(node.getAttribute('font-weight')),
    fontStyle: node.getAttribute('font-style') === 'italic' ? 'italic' : 'normal',
    lineHeight: lineHeightOf(tspans),
  }
}

/** The spacing a written paragraph uses, when it is not the editor's default. */
function lineHeightOf(tspans: Element[]): number | undefined {
  const dy = tspans.length > 1 ? tspans[1].getAttribute('dy') || '' : ''
  const match = /^(\d+(\.\d+)?)em$/.exec(dy)
  if (!match) {
    return undefined
  }
  const value = parseFloat(match[1])
  return value === CERT_LINE_HEIGHT ? undefined : value
}

function readDecorationLine(node: Element): ICertDecoration {
  const x1 = numberOf(node.getAttribute('x1'), 0)
  const y1 = numberOf(node.getAttribute('y1'), 0)
  const x2 = numberOf(node.getAttribute('x2'), 0)
  const y2 = numberOf(node.getAttribute('y2'), 0)
  const vertical = Math.abs(x2 - x1) < Math.abs(y2 - y1)
  return {
    id: node.getAttribute('id') || '',
    kind: 'line',
    x: Math.min(x1, x2),
    y: Math.min(y1, y2),
    length: vertical ? Math.abs(y2 - y1) : Math.abs(x2 - x1),
    vertical,
    stroke: node.getAttribute('stroke') || CERT_DEFAULT_FILL,
    strokeWidth: numberOf(node.getAttribute('stroke-width'), 1),
    dashed: !!node.getAttribute('stroke-dasharray'),
  }
}

function readDecorationImage(node: Element): ICertDecoration {
  return {
    id: node.getAttribute('id') || '',
    kind: 'image',
    x: numberOf(node.getAttribute('x'), 0),
    y: numberOf(node.getAttribute('y'), 0),
    width: numberOf(node.getAttribute('width'), 100),
    height: numberOf(node.getAttribute('height'), 100),
    href: node.getAttributeNS(XLINK_NAMESPACE, 'href') || node.getAttribute('href') || node.getAttribute('xlink:href') || '',
  }
}

/** Reads back every element the editor owns, so a template reopens editable. */
export function readDecorations(doc: Document, canvas: ICanvasSize): ICertDecoration[] {
  const found: ICertDecoration[] = []
  const taken: string[] = []
  doc.querySelectorAll(`[${CERT_DECORATION_ATTR}]`).forEach(node => {
    const kind = node.getAttribute(CERT_DECORATION_ATTR)
    const tag = node.nodeName.toLowerCase()
    let decoration: ICertDecoration | null = null
    if (kind === 'text' && tag === 'text') {
      decoration = readDecorationText(node, canvas)
    } else if (kind === 'line' && tag === 'line') {
      decoration = readDecorationLine(node)
    } else if (kind === 'image' && tag === 'image') {
      decoration = readDecorationImage(node)
    }
    if (!decoration) {
      return
    }
    // A template that forgot an id, or repeated one, still gets distinct ones.
    if (!decoration.id || taken.indexOf(decoration.id) > -1) {
      decoration.id = nextDecorationId(decoration.kind, taken)
    }
    taken.push(decoration.id)
    found.push(decoration)
  })
  return found
}

/** Removes every element the editor owns, leaving only the fixed artwork. */
export function removeDecorations(doc: Document): void {
  doc.querySelectorAll(`[${CERT_DECORATION_ATTR}]`).forEach(node => {
    if (node.parentNode) {
      node.parentNode.removeChild(node)
    }
  })
}

function buildDecorationText(doc: Document, d: ICertDecoration): Element {
  const text = doc.createElementNS(SVG_NAMESPACE, 'text')
  text.setAttribute(CERT_DECORATION_ATTR, 'text')
  text.setAttribute('id', d.id)
  text.setAttribute('fill', d.fill || CERT_DEFAULT_FILL)
  text.setAttribute('font-family', d.fontFamily || CERT_DEFAULT_FONT)
  text.setAttribute('font-size', String(d.fontSize || CERT_DEFAULT_SIZE))
  text.setAttribute('text-anchor', d.anchor || 'start')
  text.setAttribute('xml:space', 'preserve')
  if (d.fontWeight === 'bold') {
    text.setAttribute('font-weight', 'bold')
  }
  if (d.fontStyle === 'italic') {
    text.setAttribute('font-style', 'italic')
  }
  const lines = (d.text || '').split('\n')
  lines.forEach((line, index) => {
    const tspan = doc.createElementNS(SVG_NAMESPACE, 'tspan')
    tspan.setAttribute('x', String(Math.round(d.x)))
    if (index === 0) {
      tspan.setAttribute('y', String(Math.round(d.y)))
    } else {
      tspan.setAttribute('dy', `${d.lineHeight || CERT_LINE_HEIGHT}em`)
    }
    // textContent escapes for us; an empty line still has to keep its height.
    tspan.textContent = line || ' '
    text.appendChild(tspan)
  })
  return text
}

function buildDecorationLine(doc: Document, d: ICertDecoration): Element {
  const line = doc.createElementNS(SVG_NAMESPACE, 'line')
  const length = d.length || 0
  line.setAttribute(CERT_DECORATION_ATTR, 'line')
  line.setAttribute('id', d.id)
  line.setAttribute('x1', String(Math.round(d.x)))
  line.setAttribute('y1', String(Math.round(d.y)))
  line.setAttribute('x2', String(Math.round(d.vertical ? d.x : d.x + length)))
  line.setAttribute('y2', String(Math.round(d.vertical ? d.y + length : d.y)))
  line.setAttribute('stroke', d.stroke || CERT_DEFAULT_FILL)
  line.setAttribute('stroke-width', String(d.strokeWidth || 1))
  if (d.dashed) {
    line.setAttribute('stroke-dasharray', CERT_DASH)
  }
  return line
}

function buildDecorationImage(doc: Document, d: ICertDecoration): Element {
  const image = doc.createElementNS(SVG_NAMESPACE, 'image')
  image.setAttribute(CERT_DECORATION_ATTR, 'image')
  image.setAttribute('id', d.id)
  image.setAttribute('x', String(Math.round(d.x)))
  image.setAttribute('y', String(Math.round(d.y)))
  image.setAttribute('width', String(Math.round(d.width || 100)))
  image.setAttribute('height', String(Math.round(d.height || 100)))
  image.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  image.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', d.href || '')
  image.setAttribute('href', d.href || '')
  return image
}

/**
 * Writes the decorations into the artwork, in order, so later ones paint on top.
 * Any previous copy of each is removed first, making this safe to repeat.
 */
export function applyDecorations(doc: Document, decorations: ICertDecoration[]): void {
  if (decorations.some(d => d.kind === 'image')) {
    ensureXlinkNamespace(doc)
  }
  decorations.forEach(d => {
    removeExisting(doc, d.id)
    const node =
      d.kind === 'text' ? buildDecorationText(doc, d) : d.kind === 'line' ? buildDecorationLine(doc, d) : buildDecorationImage(doc, d)
    doc.documentElement.appendChild(node)
  })
}

/** Horizontal decoration lines, as snap targets alongside the artwork's own. */
export function decorationSnapLines(decorations: ICertDecoration[]): ISnapLine[] {
  return decorations
    .filter(d => d.kind === 'line' && !d.vertical && (d.length || 0) >= 20)
    .map(d => {
      const x2 = d.x + (d.length || 0)
      return { y: d.y, x1: d.x, x2, centre: (d.x + x2) / 2 }
    })
}

// ---- Samples and background ---------------------------------------------------

/** A handlebars or legacy token in a template's text. */
export const CERT_TOKEN = /\{\{([^{}]+)\}\}|\$\{([^{}]+)\}/g
/** The legacy form on its own, to warn that the platform will not fill it. */
export const CERT_TOKEN_LEGACY = /\$\{[^{}]+\}/

/**
 * Replaces every token in the template's text with a sample, in place, so each
 * value keeps the position, anchor and font the designer gave it. Returns the
 * nodes it filled. Used for the preview and for the design thumbnails, which
 * would otherwise show `{{credentialSubject.recipientName}}` to the creator.
 */
export function fillSampleTokens(doc: Document, sampleFor: (token: string) => string): Set<Element> {
  const filled = new Set<Element>()
  const nodes: Element[] = []
  doc.querySelectorAll('text, tspan').forEach(node => nodes.push(node))
  nodes.forEach(node => {
    // Only leaf text: a <text> wrapping <tspan>s would otherwise be rewritten
    // as a single string and the tspans inside it lost.
    if (node.children && node.children.length > 0) {
      return
    }
    const text = node.textContent || ''
    const replaced = text.replace(CERT_TOKEN, (_match: string, handlebars: string, legacy: string) => sampleFor(handlebars || legacy))
    if (replaced !== text) {
      node.textContent = replaced
      filled.add(node)
    }
  })
  return filled
}

/** Marks the shape that is the certificate's background, so its colour can change. */
export const CERT_BACKGROUND_ATTR = 'data-cert-bg'

/**
 * The shape that paints the certificate's background: one marked as such, or
 * else the first plain-coloured rectangle covering the whole canvas -- which is
 * how design tools export a background. A pattern or gradient fill is not a
 * colour the author can pick, so it does not count.
 */
export function findBackground(doc: Document, canvas: ICanvasSize): Element | null {
  const marked = doc.querySelector(`[${CERT_BACKGROUND_ATTR}]`)
  if (marked) {
    return marked
  }
  const rects: Element[] = []
  doc.querySelectorAll('rect').forEach(rect => rects.push(rect))
  return (
    rects.find(rect => {
      const x = toAbsolute(rect.getAttribute('x'), canvas.width)
      const y = toAbsolute(rect.getAttribute('y'), canvas.height)
      const width = toAbsolute(rect.getAttribute('width'), canvas.width)
      const height = toAbsolute(rect.getAttribute('height'), canvas.height)
      return x <= 1 && y <= 1 && width >= canvas.width - 1 && height >= canvas.height - 1 && !!toHexColour(rect.getAttribute('fill'))
    }) || null
  )
}

const NAMED_COLOURS: { [name: string]: string } = {
  white: '#ffffff',
  black: '#000000',
  ivory: '#fffff0',
  beige: '#f5f5dc',
}

/**
 * A fill as `#rrggbb`, the only form a colour input accepts; null when the fill
 * is not a plain colour (none, a pattern, a gradient).
 */
export function toHexColour(value: string | null): string | null {
  if (!value) {
    return null
  }
  const colour = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(colour)) {
    return colour
  }
  if (/^#[0-9a-f]{3}$/.test(colour)) {
    return `#${colour
      .slice(1)
      .split('')
      .map(c => c + c)
      .join('')}`
  }
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/.exec(colour)
  if (rgb) {
    return `#${rgb
      .slice(1)
      .map(part => Math.min(255, parseInt(part, 10)).toString(16).padStart(2, '0'))
      .join('')}`
  }
  return NAMED_COLOURS[colour] || null
}

// ---- Learner details typed into the artwork ---------------------------------------

/** Why a piece of fixed artwork text looks like a learner detail that will not change. */
export type CertHardcodedReason = 'on-line' | 'date' | 'unknown-token' | 'legacy-token'

export interface ICertHardcodedText {
  text: string
  reason: CertHardcodedReason
  x: number
  y: number
  fontSize: number
  fontFamily: string
  anchor: 'start' | 'middle' | 'end'
}

const MONTH_NAMES =
  'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?'
const DATE_PATTERNS = [
  /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/,
  /\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/,
  new RegExp(`\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTH_NAMES})\\s*,?\\s+\\d{4}\\b`, 'i'),
  new RegExp(`\\b(?:${MONTH_NAMES})\\s+\\d{1,2}(?:st|nd|rd|th)?\\s*,?\\s+\\d{4}\\b`, 'i'),
]

/**
 * Text that is part of the fixed artwork but looks like it was meant to change
 * per learner. Artwork prints identically on every certificate, so a name,
 * date or score typed into the design file comes out the same for everyone --
 * and there is no error anywhere to say so.
 *
 * Found by where the text sits and what it says: text starting within the span
 * of one of the design's rules and just above it is sitting where a value goes
 * (a label beside a rule starts before it, so is not caught); a date is a date
 * wherever it is; and a placeholder the platform does not fill prints empty.
 * Only real text can be checked -- design tools often export lettering as
 * outlines, which carry no text at all.
 */
export function findHardcodedText(doc: Document, canvas: ICanvasSize, lines: ISnapLine[]): ICertHardcodedText[] {
  const found: ICertHardcodedText[] = []
  doc.querySelectorAll('text').forEach(node => {
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim()
    if (!text) {
      return
    }
    const first = node.querySelector('tspan') || node
    const x = toAbsolute(first.getAttribute('x') || node.getAttribute('x'), canvas.width)
    const y = toAbsolute(first.getAttribute('y') || node.getAttribute('y'), canvas.height)
    const at = {
      text,
      x,
      y,
      fontSize: parseFloat(node.getAttribute('font-size') || '') || CERT_DEFAULT_SIZE,
      fontFamily: node.getAttribute('font-family') || CERT_DEFAULT_FONT,
      anchor: anchorOf(first.getAttribute('text-anchor') || node.getAttribute('text-anchor')),
    }

    const tokens = text.match(CERT_TOKEN) || []
    if (tokens.length) {
      // A known token in artwork text is filled by the platform wherever it is,
      // so only the ones that will not be filled are worth mentioning.
      tokens.forEach(token => {
        if (/^\$\{/.test(token)) {
          found.push({ ...at, text: token, reason: 'legacy-token' })
        } else if (!certFieldKeyFor(token)) {
          found.push({ ...at, text: token, reason: 'unknown-token' })
        }
      })
      return
    }
    if (DATE_PATTERNS.some(pattern => pattern.test(text))) {
      found.push({ ...at, reason: 'date' })
      return
    }
    const onLine = lines.some(line => line.y >= y && line.y - y <= 24 && x >= line.x1 && x <= line.x2)
    if (onLine) {
      found.push({ ...at, reason: 'on-line' })
    }
  })
  return found
}

// ---- The design's own wording ------------------------------------------------------

/** A piece of the design's own wording that can be edited without changing how it looks. */
export interface ICertArtworkText {
  /** The element in the artwork; removed only once the author edits it. */
  node: Element
  /** How it reads as an editable text, should the author edit it. */
  decoration: ICertDecoration
}

export interface ICertArtworkWording {
  /** Wording the editor can take over faithfully. */
  editable: ICertArtworkText[]
  /** Wording that uses something the editor cannot reproduce, so stays as it is. */
  fixedCount: number
  /**
   * The design has no real text at all but does have large outlined shapes --
   * the signature of wording exported as outlines, which cannot be edited.
   */
  outlinedWording: boolean
}

const TEXT_ATTRS = [
  'id',
  'x',
  'y',
  'fill',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'letter-spacing',
  'xml:space',
  'style',
]
const TSPAN_ATTRS = ['x', 'y', 'text-anchor']
/** Presentation a group may pass down to text inside it. */
const INHERITED = ['fill', 'font-family', 'font-size', 'font-weight', 'font-style']
const GROUP_ATTRS = ['id', 'clip-path', ...INHERITED]

function attributeNames(node: Element): string[] {
  const names: string[] = []
  for (let i = 0; i < node.attributes.length; i += 1) {
    names.push(node.attributes[i].name)
  }
  return names
}

function onlyAllowed(node: Element, allowed: string[]): boolean {
  return attributeNames(node).every(name => allowed.indexOf(name) > -1 || name.startsWith('xmlns'))
}

/** Only `white-space` may be set in a style attribute; anything else would be lost. */
function plainStyle(value: string | null): boolean {
  if (!value) {
    return true
  }
  return value
    .split(';')
    .map(rule => rule.trim())
    .filter(Boolean)
    .every(rule => /^white-space\s*:/i.test(rule))
}

function zeroSpacing(value: string | null): boolean {
  return !value || /^(normal|0(\.0+)?(em|px)?)$/i.test(value.trim())
}

/**
 * Whether a clip-path is just the frame design tools wrap everything in -- a
 * single rectangle covering the canvas -- which clips nothing that matters.
 */
function harmlessClip(doc: Document, value: string, canvas: ICanvasSize): boolean {
  const id = /url\(\s*#([^)\s]+)\s*\)/.exec(value)
  if (!id) {
    return false
  }
  // By attribute: getElementById is unreliable on a parsed SVG document.
  const clip = doc.querySelector(`[id="${id[1]}"]`)
  if (!clip || clip.children.length !== 1 || clip.children[0].nodeName.toLowerCase() !== 'rect') {
    return false
  }
  const rect = clip.children[0]
  return (
    toAbsolute(rect.getAttribute('x'), canvas.width) <= 1 &&
    toAbsolute(rect.getAttribute('y'), canvas.height) <= 1 &&
    toAbsolute(rect.getAttribute('width'), canvas.width) >= canvas.width - 1 &&
    toAbsolute(rect.getAttribute('height'), canvas.height) >= canvas.height - 1
  )
}

/** A plain number in user units, or null for anything relative or unknown. */
function userUnits(value: string | null): number | null {
  if (!value) {
    return null
  }
  const match = /^\s*(-?\d+(\.\d+)?)(px)?\s*$/.exec(value)
  return match ? parseFloat(match[1]) : null
}

/**
 * Reads one piece of wording as an editable text, or returns null if taking it
 * over would change how it looks. Deliberately strict: a piece left as fixed
 * artwork loses nothing, while one rewritten imperfectly changes the design.
 */
function toEditableText(doc: Document, node: Element, canvas: ICanvasSize): ICertDecoration | null {
  if (!onlyAllowed(node, TEXT_ATTRS) || !plainStyle(node.getAttribute('style')) || !zeroSpacing(node.getAttribute('letter-spacing'))) {
    return null
  }

  // What the text inherits from the groups around it, and whether those groups
  // do anything the editor would drop once the text is moved out of them.
  const inherited: { [name: string]: string } = {}
  let parent = node.parentElement
  while (parent && parent !== doc.documentElement) {
    if (parent.nodeName.toLowerCase() !== 'g' || !onlyAllowed(parent, GROUP_ATTRS)) {
      return null
    }
    const clip = parent.getAttribute('clip-path')
    if (clip && !harmlessClip(doc, clip, canvas)) {
      return null
    }
    INHERITED.forEach(name => {
      const value = parent!.getAttribute(name)
      if (value && !(name in inherited)) {
        inherited[name] = value
      }
    })
    parent = parent.parentElement
  }
  const attr = (name: string) => node.getAttribute(name) || inherited[name] || null

  // Direct text, or one tspan per line: nothing else inside.
  const children = Array.from(node.childNodes).filter(child => child.nodeType === 1) as Element[]
  if (children.some(child => child.nodeName.toLowerCase() !== 'tspan' || !onlyAllowed(child, TSPAN_ATTRS) || child.children.length)) {
    return null
  }
  const lines = children.length ? children : [node]
  const xs = lines.map(line => userUnits(line.getAttribute('x')))
  const ys = lines.map(line => userUnits(line.getAttribute('y')))
  if (xs.some(x => x === null) || ys.some(y => y === null)) {
    return null
  }
  // Every line starts at the same x and sits below the last: one paragraph.
  // Two runs sharing a line mean mixed styling, which the editor cannot keep.
  if (xs.some(x => Math.abs((x as number) - (xs[0] as number)) > 0.5)) {
    return null
  }
  const gaps = ys.slice(1).map((y, i) => (y as number) - (ys[i] as number))
  if (gaps.some(gap => gap <= 0) || gaps.some(gap => Math.abs(gap - gaps[0]) > 0.5)) {
    return null
  }

  const fontSize = userUnits(attr('font-size')) || CERT_DEFAULT_SIZE
  const fillValue = attr('fill')
  const fill = fillValue ? toHexColour(fillValue) : CERT_DEFAULT_FILL
  if (!fill) {
    return null
  }
  const text = children.length ? children.map(line => line.textContent || '').join('\n') : node.textContent || ''
  if (!text.trim() || CERT_TOKEN_PRESENT.test(text)) {
    return null
  }
  const anchors = lines.map(line => line.getAttribute('text-anchor')).filter(Boolean)
  return {
    id: '',
    kind: 'text',
    x: xs[0] as number,
    y: ys[0] as number,
    text,
    fontSize,
    anchor: anchorOf(node.getAttribute('text-anchor') || anchors[0] || null),
    fill,
    fontFamily: attr('font-family') || CERT_DEFAULT_FONT,
    fontWeight: weightOf(attr('font-weight')),
    fontStyle: attr('font-style') === 'italic' ? 'italic' : 'normal',
    lineHeight: gaps.length ? Math.round((gaps[0] / fontSize) * 1000) / 1000 : undefined,
  }
}

/** Any placeholder at all: text carrying one belongs to the learner details, not the wording. */
const CERT_TOKEN_PRESENT = /\{\{[^{}]+\}\}|\$\{[^{}]+\}/

/**
 * The design's own wording, split into what the author can edit and what has
 * to stay as it is. Run on the artwork after learner details and the editor's
 * own pieces have been taken out, so only the designer's text is left.
 */
export function readArtworkWording(doc: Document, canvas: ICanvasSize): ICertArtworkWording {
  const editable: ICertArtworkText[] = []
  let fixedCount = 0
  let textCount = 0
  doc.querySelectorAll('text').forEach(node => {
    const content = (node.textContent || '').trim()
    if (!content || CERT_TOKEN_PRESENT.test(content)) {
      return
    }
    textCount += 1
    const decoration = toEditableText(doc, node, canvas)
    if (decoration) {
      editable.push({ node, decoration })
    } else {
      fixedCount += 1
    }
  })
  let outlines = 0
  doc.querySelectorAll('path').forEach(path => {
    if ((path.getAttribute('d') || '').length > 2000) {
      outlines += 1
    }
  })
  return { editable, fixedCount, outlinedWording: textCount === 0 && outlines >= 3 }
}
