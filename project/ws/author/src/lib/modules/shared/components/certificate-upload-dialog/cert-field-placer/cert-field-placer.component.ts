import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core'
import { CERT_FIELDS, CERT_FIELD_BY_KEY, ICertField, certSampleFor } from '../certificate-fields'
import {
  CERT_DEFAULT_FILL,
  CERT_DEFAULT_FONT,
  CERT_DEFAULT_QR_SIZE,
  CERT_DEFAULT_SIZE,
  CERT_FONTS,
  CERT_LINE_HEIGHT,
  CertDecorationKind,
  ICanvasSize,
  ICertArtworkText,
  ICertHardcodedText,
  ICertDecoration,
  IPlacedField,
  ISnapLine,
  applyDecorations,
  applyFields,
  decorationSnapLines,
  ensureXlinkNamespace,
  findBackground,
  findHardcodedText,
  findSnapLines,
  getCanvasSize,
  nextDecorationId,
  normaliseLegacyIds,
  parseCertificateSvg,
  readArtworkWording,
  readDecorations,
  readPlacedFields,
  removeDecorations,
  removeField,
  serialiseSvg,
  toHexColour,
} from '../certificate-svg'

/** How close, in artwork units, a value has to come to a rule to snap onto it. */
const SNAP_DISTANCE = 12
/** How close to a rule's centre a centred value has to come to snap across. */
const SNAP_CENTRE_DISTANCE = 30
/** A value is treated as sitting on a rule when the rule is this far below its baseline. */
const ON_LINE_MAX_GAP = 24
/**
 * Longest side an added picture is scaled down to. Logos and signatures are
 * small on a certificate; kept at full camera resolution they are how a template
 * ends up several megabytes, and every certificate is rendered from it.
 */
export const CERT_IMAGE_MAX = 600
/** An embedded picture larger than this, even after scaling, is refused. */
export const CERT_IMAGE_MAX_BYTES = 1_500_000
export const CERT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
/** Wait this long after typing stops before rewriting the whole template. */
const TYPING_DEBOUNCE_MS = 300

/** One problem with where something has been placed. */
export interface IPlacementWarning {
  key: string
  message: string
}

interface IDragState {
  key: string
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

/**
 * The certificate editor.
 *
 * A creator starts from a standard template or their own artwork, then places
 * learner fields and adds or edits text, lines and pictures on top of it.
 *
 * The artwork is shown as an image and everything editable is drawn as HTML
 * laid over it, so nothing from an uploaded file is ever inserted into the page:
 * an uploaded SVG can carry script, and certificate artwork embeds its images
 * and runs to several megabytes, which would be heavy as live DOM. What the
 * author changes is written into the SVG only when the result is emitted, as
 * marked elements appended to the artwork -- which is never otherwise altered.
 */
@Component({
  standalone: false,
  selector: 'ws-auth-cert-field-placer',
  templateUrl: './cert-field-placer.component.html',
  styleUrls: ['./cert-field-placer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CertFieldPlacerComponent implements OnDestroy {
  /** The template as uploaded or chosen. */
  readonly svgMarkup = input.required<string>()
  /** The course being edited, so the preview shows its real title. */
  readonly courseName = input<string>('')

  /** The template with every change written in, ready to upload. */
  readonly templateChange = output<string>()
  /** Whether any learner field has been placed. */
  readonly validityChange = output<boolean>()

  readonly fields = CERT_FIELDS
  readonly fonts = CERT_FONTS
  readonly imageTypes = CERT_IMAGE_TYPES.join(',')

  readonly error = signal('')
  readonly imageError = signal('')
  readonly canvas = signal<ICanvasSize>({ width: 1398, height: 856 })
  readonly placed = signal<IPlacedField[]>([])
  readonly decorations = signal<ICertDecoration[]>([])
  readonly selectedKey = signal<string | null>(null)
  /**
   * What the preview shows. Typical by default, so a design reads like a real
   * certificate. Placement is always checked against the longest values whatever
   * this shows (see findWarnings), because short samples fit anywhere -- which is
   * how a facility name that ran into its label reached a learner's certificate.
   */
  readonly sampleMode = signal<'short' | 'long'>('short')
  readonly backgroundUrl = signal('')
  readonly renderedWidth = signal(0)
  /** The rule something is currently snapped to, drawn as a guide while dragging. */
  readonly guide = signal<ISnapLine | null>(null)
  /**
   * The certificate's background colour, as `#rrggbb`; null when the artwork has
   * no plain background to recolour -- a photo or pattern, say -- and the option
   * is not offered.
   */
  readonly backgroundColour = signal<string | null>(null)
  /** The colour the design came with, so a change can be undone. */
  readonly originalBackgroundColour = signal<string | null>(null)
  /**
   * Learner details that look typed straight into the artwork, where they would
   * print the same on every certificate. Shown on the certificate and explained.
   */
  readonly hardcoded = signal<ICertHardcodedText[]>([])
  /**
   * The design's own wording that can be edited. Each stays exactly as designed
   * -- untouched in the file -- until the author clicks it; only then is it
   * taken over as an editable text.
   */
  readonly artworkTexts = signal<ICertArtworkText[]>([])
  /** Wording that uses effects the editor cannot keep, so stays as it is. */
  readonly fixedWordingCount = signal(0)
  /** The design's wording is outlined shapes, not text, so none of it can be edited. */
  readonly outlinedWording = signal(false)
  /**
   * The canvas is capped so the whole certificate is on screen at once: editing
   * text at the bottom while the top has scrolled away is how things get put in
   * the wrong place. Width follows from the height left in the full-screen
   * dialog once its title, steps, toolbar and buttons are taken out.
   */
  readonly stageMaxWidth = computed(() => {
    const canvas = this.canvas()
    const ratio = canvas.height > 0 ? canvas.width / canvas.height : 1.67
    return `max(360px, calc((100vh - 330px) * ${ratio.toFixed(4)}))`
  })

  /** Rules in the fixed artwork, plus any lines the author has added. */
  readonly snapLines = computed(() =>
    [...this.baseSnapLines(), ...decorationSnapLines(this.decorations())].sort((a, b) => a.y - b.y || a.x1 - b.x1),
  )
  readonly scale = computed(() => {
    const width = this.canvas().width
    return width > 0 ? this.renderedWidth() / width : 0
  })
  /** The selected learner field, if the selection is one. */
  readonly selected = computed(() => this.placed().find(field => field.key === this.selectedKey()) || null)
  readonly selectedField = computed(() => {
    const selected = this.selected()
    return selected ? CERT_FIELD_BY_KEY[selected.key] : null
  })
  /** The selected text, line or picture, if the selection is one. */
  readonly selectedDecoration = computed(() => this.decorations().find(d => d.id === this.selectedKey()) || null)
  readonly placedKeys = computed(() => new Set(this.placed().map(field => field.key)))
  /** The field list, split into what is already on the certificate and what can be added. */
  readonly placedFields = computed(() => this.fields.filter(field => this.placedKeys().has(field.key)))
  readonly availableFields = computed(() => this.fields.filter(field => !this.placedKeys().has(field.key)))
  readonly warnings = computed(() => this.findWarnings())

  private readonly baseSnapLines = signal<ISnapLine[]>([])
  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage')
  private readonly destroyRef = inject(DestroyRef)
  /** The fixed artwork, with everything editable stripped out; every emit starts from a copy. */
  private baseDoc: Document | null = null
  private drag: IDragState | null = null
  /** The shape painting the background, inside baseDoc, so recolouring reaches the emitted file. */
  private backgroundNode: Element | null = null
  private measureContext: CanvasRenderingContext2D | null | undefined
  private emitTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    // Only the markup should re-run this. load() reads and writes other signals
    // (the background URL, the placed fields), and tracking those would make the
    // effect re-trigger itself.
    effect(() => {
      const markup = this.svgMarkup()
      untracked(() => this.load(markup))
    })

    afterNextRender(() => this.observeStage())

    this.destroyRef.onDestroy(() => this.revokeBackground())
  }

  /**
   * Writes out an edit still waiting on the typing pause. This has to happen in
   * ngOnDestroy rather than a DestroyRef callback: outputs are shut down through
   * DestroyRef before those callbacks run, so an emit there is silently dropped.
   */
  ngOnDestroy(): void {
    this.commitText()
  }

  /**
   * Writes a pending text edit now. Bound to the text box's blur, which fires
   * before the click on whatever button took focus -- so Preview and Attach
   * always see the last keystrokes, not the text as it was 300ms earlier.
   */
  commitText(): void {
    if (this.emitTimer) {
      this.emit()
    }
  }

  /** A readable label for anything on the certificate, for the panel and warnings. */
  labelFor(key: string): string {
    const field = CERT_FIELD_BY_KEY[key]
    if (field) {
      return field.label
    }
    const decoration = this.decorations().find(d => d.id === key)
    if (decoration) {
      return decoration.kind === 'text' ? 'Text' : decoration.kind === 'line' ? 'Line' : 'Picture'
    }
    return key
  }

  /** What a chip shows: a realistic value, so its width reflects the real thing. */
  sampleFor(key: string): string {
    const field = CERT_FIELD_BY_KEY[key]
    if (!field) {
      return key
    }
    const long = this.sampleMode() === 'long'
    const courseName = this.courseName()
    // The course's own title, unless a longer stand-in is needed to show how a
    // long title would fit.
    if (field.key === 'courseName' && courseName && !(long && field.longSample.length > courseName.length)) {
      return courseName
    }
    return certSampleFor(field.token, { long })
  }

  /** Where a field chip sits on screen, derived from its artwork coordinates. */
  chipStyle(field: IPlacedField): { [key: string]: string } {
    const scale = this.scale()
    const style: { [key: string]: string } = {
      left: `${field.x * scale}px`,
      top: `${field.y * scale}px`,
    }
    if (field.key === 'QrCode') {
      style['width'] = `${(field.width || CERT_DEFAULT_QR_SIZE) * scale}px`
      style['height'] = `${(field.height || CERT_DEFAULT_QR_SIZE) * scale}px`
      return style
    }
    // An SVG y is the text baseline, and text-anchor decides which end of the
    // text x refers to; the chip is shifted so both match what will render.
    const shift = field.anchor === 'middle' ? '-50%' : field.anchor === 'end' ? '-100%' : '0'
    style['font-size'] = `${field.fontSize * scale}px`
    style['font-family'] = field.fontFamily
    style['color'] = field.fill
    style['font-weight'] = field.fontWeight === 'bold' ? '700' : '400'
    style['transform'] = `translate(${shift}, -0.82em)`
    return style
  }

  /** Where a text, line or picture sits on screen, and how it looks. */
  decorationStyle(d: ICertDecoration): { [key: string]: string } {
    const scale = this.scale()
    if (d.kind === 'text') {
      const shift = d.anchor === 'middle' ? '-50%' : d.anchor === 'end' ? '-100%' : '0'
      return {
        left: `${d.x * scale}px`,
        top: `${d.y * scale}px`,
        'font-size': `${(d.fontSize || CERT_DEFAULT_SIZE) * scale}px`,
        'font-family': d.fontFamily || CERT_DEFAULT_FONT,
        'font-weight': d.fontWeight === 'bold' ? '700' : '400',
        'font-style': d.fontStyle === 'italic' ? 'italic' : 'normal',
        color: d.fill || CERT_DEFAULT_FILL,
        'line-height': String(d.lineHeight || CERT_LINE_HEIGHT),
        'text-align': d.anchor === 'middle' ? 'center' : d.anchor === 'end' ? 'right' : 'left',
        transform: `translate(${shift}, -0.82em)`,
      }
    }
    if (d.kind === 'line') {
      // A thin line is hard to grab, so the chip is a wider hit area with the
      // line drawn through its middle.
      const length = (d.length || 0) * scale
      const style: { [key: string]: string } = {
        '--line-width': `${Math.max(1, (d.strokeWidth || 1) * scale)}px`,
        '--line-colour': d.stroke || CERT_DEFAULT_FILL,
        '--line-style': d.dashed ? 'dashed' : 'solid',
      }
      if (d.vertical) {
        style['left'] = `${d.x * scale - 6}px`
        style['top'] = `${d.y * scale}px`
        style['width'] = '12px'
        style['height'] = `${length}px`
      } else {
        style['left'] = `${d.x * scale}px`
        style['top'] = `${d.y * scale - 6}px`
        style['width'] = `${length}px`
        style['height'] = '12px'
      }
      return style
    }
    return {
      left: `${d.x * scale}px`,
      top: `${d.y * scale}px`,
      width: `${(d.width || 100) * scale}px`,
      height: `${(d.height || 100) * scale}px`,
    }
  }

  /** What is wrong with one piece of text typed into the artwork, in plain words. */
  hardcodedMessage(item: ICertHardcodedText): string {
    switch (item.reason) {
      case 'date':
        return `"${item.text}" is a fixed date, so every certificate would show it instead of the day it was issued. Use Issued date.`
      case 'unknown-token':
        return `${item.text} is not a detail the platform fills, so it will print empty. Pick the right one from Learner details.`
      case 'legacy-token':
        return `${item.text} uses the older format, which the platform no longer fills. Pick the right one from Learner details.`
      default:
        return `"${item.text}" sits on a line where a learner's details go, so every learner would get exactly this text.`
    }
  }

  /**
   * Takes one piece of the design's own wording over as editable text: it comes
   * out of the fixed artwork and back in as the author's, looking the same, and
   * is selected ready to change. Wording never clicked is never rewritten.
   */
  editArtworkText(index: number): void {
    const item = this.artworkTexts()[index]
    if (!item || !this.baseDoc) {
      return
    }
    if (item.node.parentNode) {
      item.node.parentNode.removeChild(item.node)
    }
    this.artworkTexts.update(list => list.filter((_entry, i) => i !== index))
    this.showBackground()
    // It may have been one of the flagged details; the flags follow the artwork.
    this.hardcoded.set(findHardcodedText(this.baseDoc, this.canvas(), this.baseSnapLines()))
    this.addDecoration({ ...item.decoration })
  }

  /** The click target over a piece of the design's wording. */
  artworkTextStyle(item: ICertArtworkText): { [key: string]: string } {
    const scale = this.scale()
    const d = item.decoration
    const size = d.fontSize || CERT_DEFAULT_SIZE
    const lines = (d.text || '').split('\n')
    const width = Math.max(
      ...lines.map(line => this.measureText(line, size, d.fontFamily || CERT_DEFAULT_FONT) || line.length * size * 0.55),
    )
    const left = d.anchor === 'middle' ? d.x - width / 2 : d.anchor === 'end' ? d.x - width : d.x
    const height = size + (lines.length - 1) * size * (d.lineHeight || CERT_LINE_HEIGHT)
    return {
      left: `${(left - 4) * scale}px`,
      top: `${(d.y - size) * scale}px`,
      width: `${(width + 8) * scale}px`,
      height: `${(height + size * 0.3) * scale}px`,
    }
  }

  /** Marks where a hardcoded value sits, over the artwork. */
  hardcodedStyle(item: ICertHardcodedText): { [key: string]: string } {
    const scale = this.scale()
    // An estimate when the text cannot be measured, so the mark still shows.
    const width = this.measureText(item.text, item.fontSize, item.fontFamily) || item.text.length * item.fontSize * 0.55
    const left = item.anchor === 'middle' ? item.x - width / 2 : item.anchor === 'end' ? item.x - width : item.x
    return {
      left: `${(left - 4) * scale}px`,
      top: `${(item.y - item.fontSize) * scale}px`,
      width: `${(width + 8) * scale}px`,
      height: `${item.fontSize * 1.3 * scale}px`,
    }
  }

  guideStyle(line: ISnapLine): { [key: string]: string } {
    const scale = this.scale()
    return {
      left: `${line.x1 * scale}px`,
      top: `${line.y * scale}px`,
      width: `${(line.x2 - line.x1) * scale}px`,
    }
  }

  isWarned(key: string): boolean {
    return this.warnings().some(warning => warning.key === key)
  }

  // ---- Learner fields --------------------------------------------------------

  /** Places a field, or selects it if it is already on the certificate. */
  addField(field: ICertField): void {
    if (this.placedKeys().has(field.key)) {
      this.selectedKey.set(field.key)
      return
    }
    const canvas = this.canvas()
    const placed: IPlacedField =
      field.kind === 'image'
        ? {
            key: field.key,
            x: Math.round(canvas.width / 2 - CERT_DEFAULT_QR_SIZE / 2),
            y: Math.round(canvas.height / 2 - CERT_DEFAULT_QR_SIZE / 2),
            fontSize: CERT_DEFAULT_SIZE,
            anchor: 'start',
            fill: CERT_DEFAULT_FILL,
            fontFamily: CERT_DEFAULT_FONT,
            width: CERT_DEFAULT_QR_SIZE,
            height: CERT_DEFAULT_QR_SIZE,
          }
        : {
            key: field.key,
            x: Math.round(canvas.width / 2),
            y: Math.round(canvas.height / 2),
            fontSize: CERT_DEFAULT_SIZE,
            // Centred, because the rules values sit on are meant to be filled
            // from the middle; the author can change it.
            anchor: 'middle',
            fill: CERT_DEFAULT_FILL,
            fontFamily: this.dominantFont(),
          }
    this.placed.update(fields => [...fields, placed])
    this.selectedKey.set(field.key)
    this.emit()
  }

  /** Removes whatever is selected: a field, text, line or picture. */
  removeSelected(): void {
    const key = this.selectedKey()
    if (!key) {
      return
    }
    this.placed.update(fields => fields.filter(field => field.key !== key))
    this.decorations.update(list => list.filter(d => d.id !== key))
    this.selectedKey.set(null)
    this.emit()
  }

  /** Applies a change to the selected field from the properties panel. */
  updateSelected(change: Partial<IPlacedField>): void {
    const key = this.selectedKey()
    if (!key) {
      return
    }
    this.placed.update(fields => fields.map(field => (field.key === key ? { ...field, ...change } : field)))
    this.emit()
  }

  /** Numeric inputs deliver strings; anything unusable is ignored, not zeroed. */
  updateNumber(prop: 'x' | 'y' | 'fontSize' | 'width' | 'height', raw: string): void {
    const value = this.usableNumber(prop, raw)
    if (value === null) {
      return
    }
    this.updateSelected({ [prop]: value } as Partial<IPlacedField>)
  }

  /** Centres the selected value on the rule beneath it -- the usual intent. */
  snapSelectedToLine(): void {
    const field = this.selected()
    if (field) {
      const line = this.nearestLine(field.x, field.y)
      if (line) {
        this.updateSelected({ anchor: 'middle', x: Math.round(line.centre), y: Math.round(this.baselineFor(line, field.fontSize)) })
      }
      return
    }
    const text = this.selectedDecoration()
    if (text && text.kind === 'text') {
      const line = this.nearestLine(text.x, text.y)
      if (line) {
        this.updateDecoration({
          anchor: 'middle',
          x: Math.round(line.centre),
          y: Math.round(this.baselineFor(line, text.fontSize || CERT_DEFAULT_SIZE)),
        })
      }
    }
  }

  toggleSampleMode(): void {
    this.sampleMode.update(mode => (mode === 'long' ? 'short' : 'long'))
  }

  setSampleMode(mode: 'short' | 'long'): void {
    this.sampleMode.set(mode)
  }

  /** Selects the item a warning is about and shows the values that cause it. */
  showWarning(warning: IPlacementWarning): void {
    this.selectedKey.set(warning.key)
    this.sampleMode.set('long')
  }

  /**
   * The longest realistic value for a field, which placement is checked against:
   * the course's own title or the long sample, whichever is longer.
   */
  private longestSampleFor(key: string): string {
    const field = CERT_FIELD_BY_KEY[key]
    if (!field) {
      return key
    }
    const course = this.courseName()
    if (field.key === 'courseName' && course && course.length > field.longSample.length) {
      return course
    }
    return certSampleFor(field.token, { long: true })
  }

  /** Recolours the certificate's background. Anything but `#rrggbb` is ignored. */
  setBackgroundColour(colour: string): void {
    if (!this.backgroundNode || !/^#[0-9a-f]{6}$/i.test(colour)) {
      return
    }
    const hex = colour.toLowerCase()
    if (hex === this.backgroundColour()) {
      return
    }
    this.backgroundNode.setAttribute('fill', hex)
    this.backgroundColour.set(hex)
    // The background is part of the artwork image, so that image is redrawn.
    this.showBackground()
    this.emit()
  }

  /** Puts the design's own background colour back. */
  resetBackground(): void {
    const original = this.originalBackgroundColour()
    if (original) {
      this.setBackgroundColour(original)
    }
  }

  /**
   * A press on the certificate itself, not on anything placed, clears the
   * selection -- which is how the certificate's own settings are reached.
   */
  onStagePointerDown(event: PointerEvent): void {
    const target = event.target as Element | null
    if (target && (target === event.currentTarget || target.classList.contains('canvas-art'))) {
      this.selectedKey.set(null)
    }
  }

  // ---- Text, lines and pictures ----------------------------------------------

  /** Adds a line of text in the middle of the certificate, ready to edit. */
  addText(): void {
    const canvas = this.canvas()
    this.addDecoration({
      id: '',
      kind: 'text',
      x: Math.round(canvas.width / 2),
      y: Math.round(canvas.height / 2),
      text: 'Your text',
      fontSize: 24,
      anchor: 'middle',
      fill: '#1a2d45',
      fontFamily: this.dominantFont(),
      fontWeight: 'normal',
      fontStyle: 'normal',
    })
  }

  /** Adds a horizontal rule, the thing a value most often needs to sit on. */
  addLine(): void {
    const canvas = this.canvas()
    const length = 320
    this.addDecoration({
      id: '',
      kind: 'line',
      x: Math.round(canvas.width / 2 - length / 2),
      y: Math.round(canvas.height / 2 + 60),
      length,
      vertical: false,
      stroke: '#1a2d45',
      strokeWidth: 1,
      dashed: false,
    })
  }

  /** Adds a picture from the file input -- a logo, a seal, a signature. */
  onImagePicked(event: Event): void {
    const target = event.target as HTMLInputElement | null
    const file = target && target.files ? target.files[0] : null
    // Lets the same file be picked again after being removed.
    if (target) {
      target.value = ''
    }
    if (file) {
      void this.addImage(file)
    }
  }

  async addImage(file: File): Promise<void> {
    this.imageError.set('')
    if (CERT_IMAGE_TYPES.indexOf(file.type) < 0) {
      this.imageError.set('Pictures must be PNG, JPEG or SVG.')
      return
    }
    let image: { href: string; width: number; height: number }
    try {
      image = await this.readImageFile(file)
    } catch {
      this.imageError.set('That picture could not be read. Please try a different file.')
      return
    }
    if (image.href.length > CERT_IMAGE_MAX_BYTES) {
      this.imageError.set('That picture is too large to embed. Please use a smaller or simpler image.')
      return
    }
    const canvas = this.canvas()
    // Fits a 200-wide box to start with; the author resizes from there.
    const width = Math.min(200, image.width || 200)
    const height = image.width ? Math.round((width * image.height) / image.width) : width
    this.addDecoration({
      id: '',
      kind: 'image',
      x: Math.round(canvas.width / 2 - width / 2),
      y: Math.round(canvas.height / 2 - height / 2),
      width,
      height,
      href: image.href,
    })
  }

  /** Copies the selected text, line or picture, just offset from the original. */
  duplicateSelected(): void {
    const source = this.selectedDecoration()
    if (!source) {
      return
    }
    this.addDecoration({ ...source, id: '', x: source.x + 20, y: source.y + 20 })
  }

  /** Applies a change to the selected text, line or picture. */
  updateDecoration(change: Partial<ICertDecoration>): void {
    const key = this.selectedKey()
    if (!key) {
      return
    }
    this.decorations.update(list => list.map(d => (d.id === key ? { ...d, ...change } : d)))
    this.emit()
  }

  /**
   * Typing updates the chip at once but rewrites the template only once the
   * author pauses: the whole SVG is serialised on every write, and artwork can
   * run to megabytes.
   */
  updateDecorationText(text: string): void {
    const key = this.selectedKey()
    if (!key) {
      return
    }
    this.decorations.update(list => list.map(d => (d.id === key ? { ...d, text } : d)))
    this.scheduleEmit()
  }

  updateDecorationNumber(prop: 'x' | 'y' | 'fontSize' | 'length' | 'strokeWidth' | 'width' | 'height', raw: string): void {
    const value = this.usableNumber(prop, raw)
    if (value === null) {
      return
    }
    this.updateDecoration({ [prop]: value } as Partial<ICertDecoration>)
  }

  /**
   * Changes a picture's width and keeps its proportions, which is almost always
   * what is meant; the height box can still be set on its own.
   */
  updateImageWidth(raw: string): void {
    const image = this.selectedDecoration()
    const width = this.usableNumber('width', raw)
    if (!image || image.kind !== 'image' || width === null) {
      return
    }
    const ratio = image.width ? (image.height || image.width) / image.width : 1
    this.updateDecoration({ width, height: Math.round(width * ratio) })
  }

  // ---- Dragging and keyboard -------------------------------------------------

  onChipPointerDown(event: PointerEvent, key: string): void {
    const item = this.positionOf(key)
    if (!item || event.button !== 0) {
      return
    }
    event.preventDefault()
    this.selectedKey.set(key)
    const target = event.currentTarget as HTMLElement | null
    if (target && target.setPointerCapture) {
      target.setPointerCapture(event.pointerId)
    }
    this.drag = {
      key,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: item.x,
      originY: item.y,
    }
  }

  onChipPointerMove(event: PointerEvent): void {
    const drag = this.drag
    const scale = this.scale()
    if (!drag || drag.pointerId !== event.pointerId || !scale) {
      return
    }
    let x = drag.originX + (event.clientX - drag.startX) / scale
    let y = drag.originY + (event.clientY - drag.startY) / scale
    let guide: ISnapLine | null = null

    // Text -- a field or the author's own -- snaps onto rules. Holding Alt places
    // freely, for the rare value that is not on one.
    const snapping = this.snappingFor(drag.key)
    if (snapping && !event.altKey) {
      const line = this.nearestLine(x, y)
      if (line && Math.abs(this.baselineFor(line, snapping.fontSize) - y) <= SNAP_DISTANCE) {
        y = this.baselineFor(line, snapping.fontSize)
        if (snapping.anchor === 'middle' && Math.abs(line.centre - x) <= SNAP_CENTRE_DISTANCE) {
          x = line.centre
        }
        guide = line
      }
    }

    const canvas = this.canvas()
    x = Math.round(Math.max(0, Math.min(canvas.width, x)))
    y = Math.round(Math.max(0, Math.min(canvas.height, y)))
    this.guide.set(guide)
    this.moveTo(drag.key, x, y)
  }

  onChipPointerUp(event: PointerEvent): void {
    if (!this.drag || this.drag.pointerId !== event.pointerId) {
      return
    }
    this.drag = null
    this.guide.set(null)
    // Written out once the drag ends rather than on every move: a template can
    // run to several megabytes and is serialised whole each time.
    this.emit()
  }

  /** Arrow keys nudge, Shift for ten; Delete removes. Placement without a mouse. */
  onChipKeydown(event: KeyboardEvent, key: string): void {
    this.selectedKey.set(key)
    const step = event.shiftKey ? 10 : 1
    const moves: { [key: string]: [number, number] } = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const move = moves[event.key]
    if (move) {
      event.preventDefault()
      const item = this.positionOf(key)
      if (item) {
        this.moveTo(key, item.x + move[0], item.y + move[1])
        this.emit()
      }
      return
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      this.removeSelected()
    }
  }

  /**
   * Width of a rendered value, in artwork units. Uses a canvas to measure; where
   * that is not available the result is 0 and no overflow is reported, rather
   * than a guess being presented as a finding.
   */
  protected measureText(text: string, fontSize: number, fontFamily: string): number {
    if (this.measureContext === undefined) {
      try {
        const canvas = document.createElement('canvas')
        this.measureContext = canvas.getContext ? canvas.getContext('2d') : null
      } catch {
        this.measureContext = null
      }
    }
    if (!this.measureContext) {
      return 0
    }
    this.measureContext.font = `${fontSize}px ${fontFamily}`
    return this.measureContext.measureText(text).width
  }

  /**
   * Reads a picture as a data URL, scaling a large photo down first. SVG is kept
   * as it is, since it is vector and scaling it gains nothing.
   */
  protected readImageFile(file: File): Promise<{ href: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('The picture could not be read.'))
      reader.onload = () => {
        const dataUrl = reader.result as string
        const img = new Image()
        img.onerror = () => reject(new Error('The picture could not be decoded.'))
        img.onload = () => {
          const width = img.naturalWidth || 200
          const height = img.naturalHeight || 200
          const ratio = Math.min(1, CERT_IMAGE_MAX / Math.max(width, height))
          if (file.type === 'image/svg+xml' || ratio === 1) {
            resolve({ href: dataUrl, width, height })
            return
          }
          const scaled = document.createElement('canvas')
          scaled.width = Math.round(width * ratio)
          scaled.height = Math.round(height * ratio)
          const context = scaled.getContext('2d')
          if (!context) {
            resolve({ href: dataUrl, width, height })
            return
          }
          context.drawImage(img, 0, 0, scaled.width, scaled.height)
          // PNG keeps a logo's transparency; a photo stays JPEG, which is far smaller.
          const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
          resolve({ href: scaled.toDataURL(type, 0.9), width: scaled.width, height: scaled.height })
        }
        img.src = dataUrl
      }
      reader.readAsDataURL(file)
    })
  }

  private addDecoration(decoration: ICertDecoration): void {
    const taken = [...this.decorations().map(d => d.id), ...this.placed().map(f => f.key)]
    const added = { ...decoration, id: nextDecorationId(decoration.kind as CertDecorationKind, taken) }
    this.decorations.update(list => [...list, added])
    this.selectedKey.set(added.id)
    this.emit()
  }

  /** The position of any item, whichever list it lives in. */
  private positionOf(key: string): { x: number; y: number } | null {
    const field = this.placed().find(f => f.key === key)
    if (field) {
      return field
    }
    return this.decorations().find(d => d.id === key) || null
  }

  private moveTo(key: string, x: number, y: number): void {
    if (this.placed().some(f => f.key === key)) {
      this.placed.update(fields => fields.map(f => (f.key === key ? { ...f, x, y } : f)))
      return
    }
    this.decorations.update(list => list.map(d => (d.id === key ? { ...d, x, y } : d)))
  }

  /** What snapping needs to know about an item, or null if it does not snap. */
  private snappingFor(key: string): { fontSize: number; anchor: string } | null {
    const field = this.placed().find(f => f.key === key)
    if (field) {
      return field.key === 'QrCode' ? null : { fontSize: field.fontSize, anchor: field.anchor }
    }
    const d = this.decorations().find(item => item.id === key)
    return d && d.kind === 'text' ? { fontSize: d.fontSize || CERT_DEFAULT_SIZE, anchor: d.anchor || 'start' } : null
  }

  private usableNumber(prop: string, raw: string): number | null {
    const value = parseFloat(raw)
    if (isNaN(value) || value < 0) {
      return null
    }
    // A size, thickness or length of nothing would make the item vanish.
    if (value === 0 && ['fontSize', 'strokeWidth', 'length', 'width', 'height'].indexOf(prop) > -1) {
      return null
    }
    return value
  }

  private load(markup: string): void {
    this.revokeBackground()
    this.clearScheduledEmit()
    this.selectedKey.set(null)
    this.imageError.set('')
    const { doc, error } = parseCertificateSvg(markup)
    this.error.set(error)
    if (!doc) {
      this.baseDoc = null
      this.backgroundNode = null
      this.backgroundColour.set(null)
      this.originalBackgroundColour.set(null)
      this.placed.set([])
      this.decorations.set([])
      this.baseSnapLines.set([])
      this.hardcoded.set([])
      this.artworkTexts.set([])
      this.fixedWordingCount.set(0)
      this.outlinedWording.set(false)
      this.validityChange.emit(false)
      return
    }
    const canvas = getCanvasSize(doc)
    this.canvas.set(canvas)
    // Fields and editable elements the template already carries reopen in place,
    // so a template made earlier -- here, from a standard one, or by hand -- is
    // edited rather than redone.
    normaliseLegacyIds(doc)
    const existing = readPlacedFields(doc, canvas)
    const decorations = readDecorations(doc, canvas)
    existing.forEach(field => removeField(doc, field.key))
    removeDecorations(doc)
    // Measured after the editable lines are taken out, so they are not counted
    // twice; they come back in through the decorations.
    this.baseSnapLines.set(findSnapLines(doc))
    this.hardcoded.set(findHardcodedText(doc, canvas, this.baseSnapLines()))
    const wording = readArtworkWording(doc, canvas)
    this.artworkTexts.set(wording.editable)
    this.fixedWordingCount.set(wording.fixedCount)
    this.outlinedWording.set(wording.outlinedWording)
    this.placed.set(existing)
    this.decorations.set(decorations)
    this.baseDoc = doc
    this.backgroundNode = findBackground(doc, canvas)
    const colour = this.backgroundNode ? toHexColour(this.backgroundNode.getAttribute('fill')) : null
    this.backgroundColour.set(colour)
    this.originalBackgroundColour.set(colour)
    this.showBackground()
    this.emit()
  }

  /** Draws the fixed artwork as the canvas image, replacing any earlier one. */
  private showBackground(): void {
    if (!this.baseDoc) {
      return
    }
    this.revokeBackground()
    const url = URL.createObjectURL(new Blob([serialiseSvg(this.baseDoc)], { type: 'image/svg+xml' }))
    this.backgroundUrl.set(url)
  }

  private emit(): void {
    this.clearScheduledEmit()
    if (!this.baseDoc) {
      return
    }
    const doc = this.baseDoc.cloneNode(true) as Document
    const fields = this.placed()
    if (fields.some(field => field.key === 'QrCode')) {
      ensureXlinkNamespace(doc)
    }
    // Text, lines and pictures first, so learner details paint over them.
    applyDecorations(doc, this.decorations())
    applyFields(doc, fields)
    this.templateChange.emit(serialiseSvg(doc))
    this.validityChange.emit(fields.length > 0)
  }

  private scheduleEmit(): void {
    this.clearScheduledEmit()
    this.emitTimer = setTimeout(() => this.emit(), TYPING_DEBOUNCE_MS)
  }

  private clearScheduledEmit(): void {
    if (this.emitTimer) {
      clearTimeout(this.emitTimer)
      this.emitTimer = null
    }
  }

  private findWarnings(): IPlacementWarning[] {
    const warnings: IPlacementWarning[] = []
    const canvas = this.canvas()
    const boxes: { key: string; left: number; right: number; top: number; bottom: number }[] = []

    this.placed().forEach(field => {
      if (field.key === 'QrCode') {
        const width = field.width || CERT_DEFAULT_QR_SIZE
        const height = field.height || CERT_DEFAULT_QR_SIZE
        if (field.x + width > canvas.width || field.y + height > canvas.height) {
          warnings.push({ key: field.key, message: 'The QR code runs off the edge of the certificate.' })
        }
        boxes.push({ key: field.key, left: field.x, right: field.x + width, top: field.y, bottom: field.y + height })
        return
      }
      const width = this.measureText(this.longestSampleFor(field.key), field.fontSize, field.fontFamily)
      if (!width) {
        return
      }
      const left = field.anchor === 'middle' ? field.x - width / 2 : field.anchor === 'end' ? field.x - width : field.x
      const right = left + width
      const label = this.labelFor(field.key)

      if (left < 0 || right > canvas.width) {
        warnings.push({ key: field.key, message: `${label} runs off the edge of the certificate.` })
      } else {
        const line = this.lineBeneath(field.x, field.y)
        // The case that broke a real certificate: a long value centred left of
        // its rule spills past the rule's start, over the label beside it.
        if (line && (left < line.x1 - 2 || right > line.x2 + 2)) {
          warnings.push({
            key: field.key,
            message: `${label} is wider than the line it sits on when the value is long, so it would run into the text beside it. Centre it on the line or make the text smaller.`,
          })
        }
      }
      boxes.push({ key: field.key, left, right, top: field.y - field.fontSize, bottom: field.y })
    })

    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]
        const b = boxes[j]
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
          warnings.push({ key: b.key, message: `${this.labelFor(b.key)} overlaps ${this.labelFor(a.key)}.` })
        }
      }
    }

    // The author's own pieces: only whether they stay on the certificate.
    this.decorations().forEach(d => {
      if (this.decorationOffCanvas(d, canvas)) {
        warnings.push({ key: d.id, message: `${this.labelFor(d.id)} runs off the edge of the certificate.` })
      }
    })
    return warnings
  }

  private decorationOffCanvas(d: ICertDecoration, canvas: ICanvasSize): boolean {
    if (d.kind === 'line') {
      const end = (d.vertical ? d.y : d.x) + (d.length || 0)
      return end > (d.vertical ? canvas.height : canvas.width)
    }
    if (d.kind === 'image') {
      return d.x + (d.width || 0) > canvas.width || d.y + (d.height || 0) > canvas.height
    }
    const widest = Math.max(
      0,
      ...(d.text || '').split('\n').map(line => this.measureText(line, d.fontSize || CERT_DEFAULT_SIZE, d.fontFamily || CERT_DEFAULT_FONT)),
    )
    if (!widest) {
      return false
    }
    const left = d.anchor === 'middle' ? d.x - widest / 2 : d.anchor === 'end' ? d.x - widest : d.x
    return left < 0 || left + widest > canvas.width
  }

  /** The rule a value at (x, y) sits on: just below its baseline, spanning x. */
  private lineBeneath(x: number, y: number): ISnapLine | null {
    const candidates = this.snapLines().filter(
      line => line.y >= y && line.y - y <= ON_LINE_MAX_GAP && x >= line.x1 - 40 && x <= line.x2 + 40,
    )
    return candidates.sort((a, b) => a.y - b.y)[0] || null
  }

  /** The rule closest to (x, y), preferring one whose span contains x. */
  private nearestLine(x: number, y: number): ISnapLine | null {
    let best: ISnapLine | null = null
    let bestScore = Infinity
    this.snapLines().forEach(line => {
      const outside = x < line.x1 ? line.x1 - x : x > line.x2 ? x - line.x2 : 0
      const score = Math.abs(line.y - y) + outside * 2
      if (score < bestScore) {
        bestScore = score
        best = line
      }
    })
    return best
  }

  /**
   * Where a value's baseline sits on a rule. Measured from templates the design
   * team produced, values sit a little under half their size above the rule.
   */
  private baselineFor(line: ISnapLine, fontSize: number): number {
    return line.y - Math.round(fontSize * 0.45)
  }

  /** New text takes the font the template already uses, so it matches. */
  private dominantFont(): string {
    const fieldFonts = this.placed()
      .filter(field => field.key !== 'QrCode')
      .map(field => field.fontFamily)
    const textFonts = this.decorations()
      .filter(d => d.kind === 'text')
      .map(d => d.fontFamily || CERT_DEFAULT_FONT)
    return fieldFonts[0] || textFonts[0] || CERT_DEFAULT_FONT
  }

  private observeStage(): void {
    const stage = this.stage()
    if (!stage) {
      return
    }
    const element = stage.nativeElement
    this.renderedWidth.set(element.clientWidth)
    if (typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        this.renderedWidth.set(entry.contentRect.width)
      }
    })
    observer.observe(element)
    this.destroyRef.onDestroy(() => observer.disconnect())
  }

  private revokeBackground(): void {
    const url = this.backgroundUrl()
    if (url) {
      URL.revokeObjectURL(url)
      this.backgroundUrl.set('')
    }
  }
}
