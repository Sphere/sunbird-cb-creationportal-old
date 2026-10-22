import { ChangeDetectorRef, Component, OnInit, OnDestroy, Inject, Output, EventEmitter, HostListener } from '@angular/core'

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'

import { NSContent } from '@ws/author/src/lib/interface/content'

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'

import { UploadService } from 'project/ws/author/src/lib/routing/modules/editor/shared/services/upload.service'

import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'

import { LoaderService } from 'project/ws/author/src/lib/services/loader.service'

import { SuccessDialogComponent } from '../success-dialog/success-dialog.component'
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component'

import { MatDialog } from '@angular/material/dialog'
import { isActivationKey, SafeContentService } from '@ws-widget/utils'
import { Observable, of, throwError } from 'rxjs'
import { filter, finalize, map, switchMap, take } from 'rxjs/operators'
import { certSampleFor } from './certificate-fields'
import { CERT_TEMPLATE_CHOICE_AFTER, ICertTemplate, parseCertTemplates } from './certificate-templates'
import { CERT_TOKEN_LEGACY, fillSampleTokens, parseCertificateSvg, serialiseSvg } from './certificate-svg'
/** What the author is told when each step of attaching the certificate fails. */
const CERT_ERROR = {
  TEMPLATE: 'Could not create the certificate template. Please try again.',
  UPLOAD: 'The certificate file could not be uploaded. Please try again.',
  NO_BATCH: 'This course has no batch yet, so the certificate cannot be attached.',
  GENERIC: 'Could not attach the certificate. Please try again.',
}

const CERT_LEGACY_WARNING =
  'This template uses the older ${...} placeholders. The platform fills {{...}} placeholders only, so these fields will be empty on the issued certificate.'

const SVG_NS = 'http://www.w3.org/2000/svg'
const XLINK_NS = 'http://www.w3.org/1999/xlink'

/** One text placeholder the certificate preview fills in. */
interface ICertPreviewField {
  id: string
  value: string
  fallback: { x: string; y: string; fontSize: string }
}

@Component({
  standalone: false,
  selector: 'ws-auth-root-certificate-upload-dialog',
  templateUrl: './certificate-upload-dialog.component.html',
  styleUrls: ['./certificate-upload-dialog.component.scss'],
})
export class CertificateDialogComponent implements OnInit, OnDestroy {
  /** Enter/Space keyboard equivalent for (click) handlers. */
  readonly isActivationKey = isActivationKey

  @Output() action = new EventEmitter<{ action: string }>()
  svgContent!: any
  newRecipientName: string = ''
  file: any

  /**
   * In-dialog busy state. The global loader is rendered by the app shell, which
   * sits *below* the CDK overlay, so while this dialog is open that spinner is
   * hidden behind it and the user sees nothing happen for the several seconds
   * the three calls take. This drives the button instead.
   */
  attaching = false

  /** Shown under the preview when the chosen template will not render properly. */
  templateWarning = ''

  /**
   * The artwork the field placer works on. It changes only when a file is chosen
   * or the author returns to placing; the placer reloads whenever this changes,
   * so it must not follow every edit.
   */
  svgText = ''
  /** The template with the placed fields written in -- what gets uploaded. */
  mappedSvg = ''
  /** Placing fields comes first; the preview then shows the rendered result. */
  step: 'place' | 'preview' = 'place'
  /** Whether any field has been placed. */
  hasFields = false
  /**
   * Whether the author has changed the design since choosing it -- the thing
   * closing or changing design would throw away. Choosing a design and leaving
   * again is not work, so it is not asked about.
   */
  hasUnsavedChanges = false
  /**
   * The editor writes the template out once as soon as it loads a design. That
   * first write is the design as chosen, not an edit, so it is not counted.
   */
  private expectInitialEmit = false

  /**
   * The standard designs a creator can start from, read from the shared config
   * on S3 so designs can be added without a portal release.
   */
  templates: ICertTemplate[] = []
  /** The list of designs is still being fetched. */
  templatesLoading = true
  /** The list of designs could not be fetched; uploading still works. */
  templatesFailed = false
  /** With many designs: the creator chose "Use a ready-made design". */
  browsingTemplates = false
  /** What the creator typed to narrow the list of designs. */
  templateFilter = ''
  /**
   * Each design drawn with sample values, for its thumbnail. Showing the file as
   * it is would put `{{credentialSubject.recipientName}}` in front of the creator.
   */
  thumbnails: { [id: string]: string } = {}
  /** The design being fetched, which disables the others meanwhile. */
  loadingTemplate: string | null = null
  templateLoadError = ''

  /**
   * Object URLs handed to the preview. They are revoked together when the dialog
   * closes rather than as each one is replaced: the <object> fetches the URL
   * asynchronously, so revoking the previous one immediately aborts a load that
   * is still in flight and the preview ends up blank.
   */
  private previewObjectUrls: string[] = []
  constructor(
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    public dialogRef: MatDialogRef<CertificateDialogComponent>,
    private loader: LoaderService,
    private uploadService: UploadService,
    private editorService: EditorService,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data?: NSContent.IContentMeta,
  ) {}

  ngOnInit() {
    this.loadTemplates()
    // Every way out is routed through requestClose, so unsaved work is never
    // lost to a stray Esc or a click outside the dialog -- not only the close icon.
    this.dialogRef.disableClose = true
    if (this.dialogRef.backdropClick) {
      this.dialogRef.backdropClick().subscribe(() => this.requestClose())
    }
    if (this.dialogRef.keydownEvents) {
      this.dialogRef
        .keydownEvents()
        .pipe(filter(event => event.key === 'Escape'))
        .subscribe(() => this.requestClose())
    }
  }

  /**
   * Refreshing or closing the tab would lose the design just as surely as closing
   * the dialog, and an attach in progress would be cut off halfway. Browsers only
   * show their own generic "Leave site?" message here -- the text cannot be set --
   * but it still stops the loss. Nothing is asked when there is nothing to lose.
   */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.hasUnsavedChanges && !this.attaching) {
      return
    }
    event.preventDefault()
    // Older Chromium only shows the prompt once returnValue is set.
    event.returnValue = ''
  }

  /** Closes the dialog, first checking with the author if that loses their work. */
  requestClose(): void {
    if (this.attaching) {
      return
    }
    this.confirmDiscard('discardCertificate').subscribe(discard => {
      if (discard) {
        this.dialogRef.close()
      }
    })
  }

  /** Back to choosing a design, first checking with the author if that loses their work. */
  requestChangeDesign(): void {
    if (this.attaching) {
      return
    }
    this.confirmDiscard('changeCertificateDesign').subscribe(discard => {
      if (discard) {
        this.startOver()
      }
    })
  }

  /** True straight away when there is nothing to lose; otherwise the author's answer. */
  private confirmDiscard(message: 'discardCertificate' | 'changeCertificateDesign'): Observable<boolean> {
    if (!this.hasUnsavedChanges) {
      return of(true)
    }
    return this.dialog
      .open(ConfirmDialogComponent, { width: '460px', data: message })
      .afterClosed()
      .pipe(map(answer => answer === true))
  }

  /**
   * Which start screen to show. A few designs fit beside the upload card on one
   * screen; past CERT_TEMPLATE_CHOICE_AFTER the creator first picks a route --
   * ready-made or their own -- and only then sees the full list.
   */
  get startView(): 'single' | 'choose' | 'browse' {
    if (this.templatesLoading || this.templatesFailed || this.templates.length <= CERT_TEMPLATE_CHOICE_AFTER) {
      return 'single'
    }
    return this.browsingTemplates ? 'browse' : 'choose'
  }

  /** A few thumbnails on the "ready-made" route card, as a taste of the list. */
  get peekTemplates(): ICertTemplate[] {
    return this.templates.slice(0, 3)
  }

  /** The designs matching the search, by name or description. */
  get filteredTemplates(): ICertTemplate[] {
    const term = this.templateFilter.trim().toLowerCase()
    if (!term) {
      return this.templates
    }
    return this.templates.filter(t => `${t.name} ${t.description}`.toLowerCase().includes(term))
  }

  browseTemplates(): void {
    this.browsingTemplates = true
    this.templateLoadError = ''
  }

  backToChoice(): void {
    this.browsingTemplates = false
    this.templateFilter = ''
    this.templateLoadError = ''
  }

  onTemplateFilter(event: Event): void {
    this.templateFilter = (event.target as HTMLInputElement | null)?.value ?? ''
  }

  clearTemplateFilter(): void {
    this.templateFilter = ''
  }

  /** Fetches the list of standard designs, then draws their thumbnails. */
  loadTemplates(): void {
    this.templatesLoading = true
    this.templatesFailed = false
    this.editorService
      .certificateTemplates()
      .pipe(
        take(1),
        finalize(() => {
          this.templatesLoading = false
          this.cdr.detectChanges()
        }),
      )
      .subscribe({
        next: raw => {
          this.templates = parseCertTemplates(raw)
          void this.loadThumbnails()
        },
        error: () => {
          this.templates = []
          this.templatesFailed = true
        },
      })
  }

  /**
   * Draws each standard design with sample values. A design whose thumbnail
   * cannot be built still shows -- as a plain placeholder -- and can be chosen.
   */
  private async loadThumbnails(): Promise<void> {
    if (typeof fetch !== 'function') {
      return
    }
    await Promise.all(
      this.templates.map(async template => {
        try {
          const response = await fetch(template.url)
          if (!response.ok) {
            return
          }
          const { doc } = parseCertificateSvg(await response.text())
          if (!doc) {
            return
          }
          fillSampleTokens(doc, token => this.sampleFor(token))
          const qr = doc.querySelector('image[id="QrCode"]')
          if (qr) {
            qr.setAttributeNS(XLINK_NS, 'xlink:href', this.sampleQrHref())
            qr.setAttribute('href', this.sampleQrHref())
          }
          const url = URL.createObjectURL(new Blob([serialiseSvg(doc)], { type: 'image/svg+xml' }))
          this.previewObjectUrls.push(url)
          this.thumbnails[template.id] = url
        } catch {
          // Left without a thumbnail; the card still works.
        }
      }),
    )
    this.cdr.detectChanges()
  }

  /** The sample QR image the previews show in place of a learner's real one. */
  private sampleQrHref(): string {
    // @ts-ignore: Unreachable code error
    const bucket = window['env'] ? window['env']['sitePath'] : ''
    return `${bucket}/cbp-assets/images/qrCode.png`
  }
  onFileSelected(event: any): void {
    this.file = event.target.files[0]

    if (this.file && this.file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = (e: any) => {
        this.startWith(e.target.result as string)
      }
      // Read as text rather than a data URL: certificate templates inline their
      // images, so they run to several MB, and a base64 data URI of that size is
      // refused by the browser and silently previews as blank.
      reader.readAsText(this.file)
    } else {
      this.svgText = ''
      this.mappedSvg = ''
      this.hasFields = false
      this.setPreview(null)
    }
    // Lets the same file be chosen again after "Choose a different file".
    if (event && event.target) {
      event.target.value = ''
    }
  }

  /**
   * Starts from one of the standard designs. It is fetched as text and treated
   * exactly like an uploaded file, so everything after this point is shared.
   */
  async useTemplate(template: ICertTemplate): Promise<void> {
    if (this.loadingTemplate) {
      return
    }
    this.loadingTemplate = template.id
    this.templateLoadError = ''
    this.cdr.detectChanges()
    try {
      const response = await fetch(template.url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      const markup = await response.text()
      // Attaching uploads a file, so the design becomes one.
      this.file = new File([markup], `${template.id}-certificate.svg`, { type: 'image/svg+xml' })
      this.startWith(markup)
    } catch {
      this.templateLoadError = `The ${template.name} design could not be loaded. Please try again.`
    } finally {
      this.loadingTemplate = null
      this.cdr.detectChanges()
    }
  }

  /** Back to choosing a design, discarding the one in progress. */
  startOver(): void {
    this.svgText = ''
    this.mappedSvg = ''
    this.file = null
    this.step = 'place'
    this.hasFields = false
    this.hasUnsavedChanges = false
    this.templateWarning = ''
    this.templateLoadError = ''
    this.svgContent = null
    this.cdr.detectChanges()
  }

  /** A chosen design or file starts over at designing it. */
  private startWith(markup: string): void {
    this.svgText = markup
    this.mappedSvg = markup
    this.step = 'place'
    this.hasFields = false
    this.hasUnsavedChanges = false
    this.expectInitialEmit = true
    // extractSvgAttributes sets the preview itself, from the markup it has
    // stamped the placeholders into. Setting it here as well would leave two
    // object URLs racing for the same element.
    this.extractSvgAttributes(markup)
  }

  /** The placer's latest output. Kept apart from svgText so the placer does not reload. */
  onTemplateChange(markup: string): void {
    this.mappedSvg = markup
    if (this.expectInitialEmit) {
      this.expectInitialEmit = false
      return
    }
    this.hasUnsavedChanges = true
  }

  onValidityChange(hasFields: boolean): void {
    this.hasFields = hasFields
  }

  /**
   * Back to placing. The placer is rebuilt when it reappears, so it is handed
   * the mapped template -- it reads the fields back out of it -- or every
   * placement made so far would be lost.
   */
  goToPlace(): void {
    if (this.step === 'place') {
      return
    }
    if (this.mappedSvg) {
      this.svgText = this.mappedSvg
    }
    // The editor is rebuilt and writes the template out once more on loading;
    // that is not a new change.
    this.expectInitialEmit = true
    this.step = 'place'
  }

  /** The rendered result, with every field filled with a sample. */
  goToPreview(): void {
    this.step = 'preview'
    this.extractSvgAttributes(this.mappedSvg || this.svgText)
  }

  /**
   * Points the preview at an object URL for the given markup. Object URLs have
   * no length ceiling and carry no character-set restriction, unlike the
   * base64 data URI this used to build.
   */
  private setPreview(svgMarkup: string | null): void {
    if (!svgMarkup) {
      this.svgContent = null
      this.cdr.detectChanges()
      return
    }
    const url = URL.createObjectURL(new Blob([svgMarkup], { type: 'image/svg+xml' }))
    this.previewObjectUrls.push(url)
    this.svgContent = SafeContentService.trustedResourceUrl(this.sanitizer, url) as SafeResourceUrl
    // FileReader delivers this outside a change-detection cycle, so without an
    // explicit pass the preview only appears on the next unrelated event.
    this.cdr.detectChanges()
  }

  ngOnDestroy(): void {
    this.previewObjectUrls.forEach(url => URL.revokeObjectURL(url))
    this.previewObjectUrls = []
  }
  /**
   * The sample values the preview stamps into a template, keyed by the element
   * id the template carries. `fallback` is only used for a template that has no
   * placeholders of any kind, where there is nothing to fill in place.
   */
  private previewFields(): ICertPreviewField[] {
    return [
      { id: 'recipientName', value: this.sampleFor('recipientName'), fallback: { x: '600', y: '440', fontSize: '48' } },
      { id: 'rmNumber', value: this.sampleFor('rmNumber'), fallback: { x: '600', y: '460', fontSize: '20' } },
      { id: 'issuedDate', value: this.sampleFor('issuedDate'), fallback: { x: '620', y: '800', fontSize: '20' } },
      { id: 'maxScore', value: this.sampleFor('maxScore'), fallback: { x: '640', y: '780', fontSize: '20' } },
      { id: 'courseName', value: this.sampleFor('courseName'), fallback: { x: '600', y: '500', fontSize: '24' } },
    ]
  }

  /**
   * A realistic value for one placeholder, as the learner would see it -- the
   * same values the field placer shows, and dates in the pattern the template
   * asks for, so the preview looks like an issued certificate.
   */
  private sampleFor(token: string): string {
    const courseName = this.data && this.data.name ? this.data.name : ''
    return certSampleFor(token, { courseName })
  }

  /**
   * Replaces every token in the template's text with a sample, in place, so each
   * value keeps the position, anchor and font the designer gave it. Returns the
   * nodes it filled, so the id pass that follows can leave them alone.
   */
  private fillTokens(svgDoc: Document): Set<Element> {
    return fillSampleTokens(svgDoc, token => this.sampleFor(token))
  }

  /**
   * Finds a text placeholder by either id form a template may use.
   *
   * Registry (RC) templates identify the field plainly -- `id="recipientName"`
   * with a handlebars token as the tspan text -- while older templates put the
   * whole token in the id.
   */
  private findPlaceholder(svgDoc: Document, id: string): Element | null {
    return svgDoc.querySelector(`text[id="${id}"] tspan`) || svgDoc.querySelector(`text[id="\${${id}}"] tspan`)
  }

  /**
   * Stamps one sample into a field the template identifies by id -- for older
   * templates, whose text is a stand-in rather than a token. A field the token
   * pass already filled is left as it is: that value came from the template's
   * own token, which can carry detail the id cannot, such as its date pattern.
   */
  private fillById(svgDoc: Document, field: ICertPreviewField, tokenFilled: Set<Element>): boolean {
    const existing = this.findPlaceholder(svgDoc, field.id)
    if (!existing) {
      return false
    }
    if (!tokenFilled.has(existing)) {
      existing.textContent = field.value
    }
    return true
  }

  /** Appends a sample for a template that carries no placeholders at all. */
  private appendPlaceholder(svgDoc: Document, field: ICertPreviewField): void {
    const textElement = svgDoc.createElementNS(SVG_NS, 'text')
    textElement.setAttribute('id', field.id)
    textElement.setAttribute('fill', 'black')
    textElement.setAttribute('xml:space', 'preserve')
    textElement.setAttribute('style', 'white-space: pre')
    textElement.setAttribute('font-family', 'Roboto')
    textElement.setAttribute('font-size', field.fallback.fontSize)
    textElement.setAttribute('letter-spacing', '0em')

    const tspanElement = svgDoc.createElementNS(SVG_NS, 'tspan')
    tspanElement.setAttribute('x', field.fallback.x)
    tspanElement.setAttribute('y', field.fallback.y)
    tspanElement.textContent = field.value

    textElement.appendChild(tspanElement)
    svgDoc.documentElement.appendChild(textElement)
  }

  /**
   * Points the QR placeholder at the sample image. Only creates one when the
   * template has nothing else to fill; adding it to a template that simply has
   * no QR code puts a stray image over the artwork.
   */
  private fillQrCode(svgDoc: Document, href: string, create: boolean): void {
    let image = svgDoc.querySelector('image[id="QrCode"]')
    if (!image) {
      if (!create) {
        return
      }
      image = svgDoc.createElementNS(SVG_NS, 'image')
      image.setAttribute('id', 'QrCode')
      image.setAttribute('class', 'qr-code')
      image.setAttribute('x', '600')
      image.setAttribute('y', '620')
      image.setAttribute('width', '150')
      image.setAttribute('height', '150')
      svgDoc.documentElement.appendChild(image)
    }
    // RC templates carry the QR as an xlink:href. setAttribute alone writes a
    // plain attribute that happens to be spelled with a colon, which renderers
    // ignore, so the namespaced one has to be set too; `href` covers SVG2.
    image.setAttributeNS(XLINK_NS, 'xlink:href', href)
    image.setAttribute('href', href)
  }

  extractSvgAttributes(svgContent: string): void {
    if (!svgContent) {
      return
    }
    this.newRecipientName = certSampleFor('recipientName')
    // A template still on the legacy syntax previews fine but will not render on
    // the platform, which substitutes handlebars only. Say so rather than let it
    // look correct here and come out blank for the learner.
    this.templateWarning = CERT_TOKEN_LEGACY.test(svgContent) ? CERT_LEGACY_WARNING : ''
    // @ts-ignore: Unreachable code error
    const bucket = window['env']['sitePath']
    const qrCodeImage = `${bucket}/cbp-assets/images/qrCode.png`

    const svgDoc = new DOMParser().parseFromString(svgContent, 'image/svg+xml')
    // DOMParser reports a malformed template by handing back a <parsererror>
    // document instead of throwing. Stamping samples into that and previewing it
    // shows the author an XML error where their certificate should be, so show
    // the file they picked, unmodified, and let them see it is the file at fault.
    if (svgDoc.querySelector('parsererror')) {
      this.setPreview(svgContent)
      return
    }

    // Fill whatever the template actually carries: any token in its text, then
    // the fields it identifies by id, then its QR code.
    const tokenFilled = this.fillTokens(svgDoc)
    let filled = tokenFilled.size
    const fields = this.previewFields()
    fields.forEach(field => {
      if (this.fillById(svgDoc, field, tokenFilled)) {
        filled += 1
      }
    })
    const hasQr = !!svgDoc.querySelector('image[id="QrCode"]')
    const isBare = filled === 0 && !hasQr

    // Nothing to fill means a template with no placeholders, where appending
    // samples is the only way to show anything. A template that does carry
    // placeholders is left exactly as designed -- appending to it put fields
    // over the artwork that the certificate will never have.
    if (isBare) {
      fields.forEach(field => this.appendPlaceholder(svgDoc, field))
    }
    this.fillQrCode(svgDoc, qrCodeImage, isBare)

    this.setPreview(new XMLSerializer().serializeToString(svgDoc))
  }

  createTemplate() {
    // The button is disabled until a file is picked; this guards the same thing
    // for any other caller, since the upload dereferences this.file directly.
    if (!this.file) {
      return
    }
    // Guards a second click while the first is still running; the dialog stays
    // open for the whole chain.
    if (this.attaching) {
      return
    }
    this.attaching = true
    this.dialogRef.disableClose = true
    this.loader.changeLoad.next(true)
    const formdata = new FormData()
    // The template with the placed fields written in, rather than the artwork as
    // it was chosen; they are the same when nothing has been placed.
    const content: Blob = this.mappedSvg ? new Blob([this.mappedSvg], { type: 'image/svg+xml' }) : (this.file as Blob)
    formdata.append('content', content, (this.file as File).name.replace(/[^A-Za-z0-9_.]/g, ''))

    // One chain with a single finalize, so the loader is cleared on every exit:
    // success, a step reporting an unsuccessful status, a course with no batch,
    // or any of the three calls failing. Previously each of those was a separate
    // nested subscribe and most of them left the spinner running for ever.
    this.editorService
      // Named after the course so templates are identifiable in the asset list;
      // this used to be a fixed test string for every certificate ever created.
      .createTemplate({ name: this.templateName() })
      .pipe(
        switchMap((res: any) => {
          if (res && res.params && res.params.status === 'successful') {
            return this.uploadService.upload(formdata, {
              contentId: res.result.identifier,
              contentType: '/artifacts',
            })
          }
          // Previously EMPTY, which completes without emitting: the loader
          // stopped and the user was told nothing at all. Every unhappy path now
          // reaches the error handler and says what went wrong.
          return throwError(() => new Error(CERT_ERROR.TEMPLATE))
        }),
        switchMap((data: any) => {
          if (!data || data.status !== 'successful') {
            return throwError(() => new Error(CERT_ERROR.UPLOAD))
          }
          // @ts-ignore: Unreachable code error
          const batches = this.data && this.data['batches']
          if (!batches || !batches.length) {
            return throwError(() => new Error(CERT_ERROR.NO_BATCH))
          }
          return this.uploadService.templateToBatch(this.batchRequest(data, batches[0].batchId))
        }),
        finalize(() => {
          this.attaching = false
          // disableClose stays on: closing is always routed through requestClose.
          this.loader.changeLoad.next(false)
          // finalize runs outside Angular's change detection when the last
          // emission came from an XHR callback, so the button would otherwise
          // stay in its busy state until the next unrelated event.
          this.cdr.detectChanges()
        }),
      )
      .subscribe(
        () => {
          // Only a success closes this dialog. On failure it stays open with the
          // chosen file still in place, so the author can simply press the button
          // again instead of picking the certificate a second time.
          this.dialogRef.close()
          this.showResult('Course Certificate successfully attached', true)
        },
        (error: any) => {
          // eslint-disable-next-line no-console
          console.error('Attaching the certificate failed', error)
          this.showResult(this.messageFor(error), false)
        },
      )
  }

  /**
   * A name for the asset the template is stored as. The course title makes the
   * asset identifiable later; the timestamp keeps two certificates for the same
   * course apart.
   */
  private templateName(): string {
    const course = (this.data && this.data.name) || 'Course'
    return `${course} - Certificate ${new Date().toISOString().slice(0, 10)}`
  }

  /** The message to show for a failure, preferring the reason we raised ourselves. */
  private messageFor(error: any): string {
    const known: string[] = [CERT_ERROR.TEMPLATE, CERT_ERROR.UPLOAD, CERT_ERROR.NO_BATCH]
    const message = error && error.message
    return known.indexOf(message) > -1 ? message : CERT_ERROR.GENERIC
  }

  /** Success and failure differ only in wording and colour, so they share a dialog. */
  private showResult(message: string, ok: boolean): void {
    this.dialog.open(SuccessDialogComponent, {
      width: '450px',
      height: '300x',
      data: {
        message,
        icon: ok ? 'check_circle' : 'error',
        color: ok ? '#2CB93A' : '#F44336',
        backgroundColor: '#FFFFFF',
        padding: '6px 11px 10px 6px !important',
        id: '',
        cert_upload: ok ? 'Yes' : 'No',
      },
    })
  }

  /** The batch payload that carries the uploaded template. */
  private batchRequest(data: any, batchId: string) {
    return {
      request: {
        batch: {
          batchId,
          // @ts-ignore: Unreachable code error
          courseId: this.data.identifier,
          template: {
            // No template URL: lern reads the template asset by this identifier
            // and takes its artifactUrl itself, so a URL sent here is ignored.
            // The identifier is what makes that work and must stay.
            previewUrl: data.artifactURL,
            identifier: data.identifier,
            criteria: {
              enrollment: {
                status: 2,
              },
            },
            name: 'Completion Certificate',
            issuer: {
              name: 'in',
              url: 'https://sphere.aastrika.org/',
            },
            signatoryList: [
              {
                image: 'https://www.aastrika.org/wp-content/uploads/2022/12/aastrika-foundation-logo-header.svg',
                name: 'aastrika-foundation',
                id: 'in',
                designation: 'Home',
              },
            ],
          },
        },
      },
    }
  }
}
