import { ChangeDetectorRef, Component, OnInit, OnDestroy, Inject, Output, EventEmitter } from '@angular/core'

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'

import { NSContent } from '@ws/author/src/lib/interface/content'

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'

import { UploadService } from 'project/ws/author/src/lib/routing/modules/editor/shared/services/upload.service'

import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'

import { LoaderService } from 'project/ws/author/src/lib/services/loader.service'

import { SuccessDialogComponent } from '../success-dialog/success-dialog.component'

import { MatDialog } from '@angular/material/dialog'
import { isActivationKey, SafeContentService } from '@ws-widget/utils'
import { throwError } from 'rxjs'
import { finalize, switchMap } from 'rxjs/operators'
/** What the author is told when each step of attaching the certificate fails. */
const CERT_ERROR = {
  TEMPLATE: 'Could not create the certificate template. Please try again.',
  UPLOAD: 'The certificate file could not be uploaded. Please try again.',
  NO_BATCH: 'This course has no batch yet, so the certificate cannot be attached.',
  GENERIC: 'Could not attach the certificate. Please try again.',
}

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
    console.log(this.data)
  }
  onFileSelected(event: any): void {
    this.file = event.target.files[0]

    if (this.file && this.file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = (e: any) => {
        // extractSvgAttributes sets the preview itself, from the markup it has
        // stamped the placeholders into. Setting it here as well would leave two
        // object URLs racing for the same element.
        this.extractSvgAttributes(e.target.result as string)
      }
      // Read as text rather than a data URL: certificate templates inline their
      // images, so they run to several MB, and a base64 data URI of that size is
      // refused by the browser and silently previews as blank.
      reader.readAsText(this.file)
    } else {
      this.setPreview(null)
    }
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
   * id the template carries. `fallback` is only used when a template does not
   * carry that element at all, in which case a sample is appended so the author
   * still sees every field the certificate will end up with.
   */
  private previewFields(): ICertPreviewField[] {
    const date = new Date()
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const issuedDate = `${day}-${month}-${date.getFullYear()}`
    // The course being edited, so the preview shows the author their own title
    // rather than a sample from another course.
    const courseName = (this.data && this.data.name) || 'Course Name'

    return [
      { id: 'recipientName', value: this.newRecipientName, fallback: { x: '600', y: '440', fontSize: '48' } },
      { id: 'rmNumber', value: '#09123', fallback: { x: '600', y: '460', fontSize: '20' } },
      { id: 'issuedDate', value: issuedDate, fallback: { x: '620', y: '800', fontSize: '20' } },
      { id: 'maxScore', value: '100%', fallback: { x: '640', y: '780', fontSize: '20' } },
      { id: 'courseName', value: courseName, fallback: { x: '600', y: '500', fontSize: '24' } },
    ]
  }

  /**
   * Finds a text placeholder by either id form a template may use.
   *
   * Registry (RC) templates identify the field plainly -- `id="recipientName"`
   * with `{{credentialSubject.recipientName}}` as the tspan text -- while older
   * templates put the whole `${recipientName}` token in the id. Matching only
   * the second form meant every field of an RC template missed, leaving the raw
   * handlebars on show and appending a duplicate sample over the artwork.
   */
  private findPlaceholder(svgDoc: Document, id: string): Element | null {
    return svgDoc.querySelector(`text[id="${id}"] tspan`) || svgDoc.querySelector(`text[id="\${${id}}"] tspan`)
  }

  /** Stamps one sample value in, appending the field if the template lacks it. */
  private fillPlaceholder(svgDoc: Document, field: ICertPreviewField): void {
    const existing = this.findPlaceholder(svgDoc, field.id)
    if (existing) {
      existing.textContent = field.value
      return
    }
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

  /** Points the QR placeholder at the sample image, adding it if absent. */
  private fillQrCode(svgDoc: Document, href: string): void {
    let image = svgDoc.querySelector('image[id="QrCode"]')
    if (!image) {
      image = svgDoc.createElementNS(SVG_NS, 'image')
      image.setAttribute('id', 'QrCode')
      image.setAttribute('class', 'qr-code')
      image.setAttribute('x', '600')
      image.setAttribute('y', '620')
      image.setAttribute('width', '150')
      image.setAttribute('height', '150')
      svgDoc.documentElement.appendChild(image)
    }
    // RC templates carry `xlink:href="{{qrCode}}"`. setAttribute alone writes a
    // plain attribute that happens to be spelled with a colon, which renderers
    // ignore, so the namespaced one has to be set too; `href` covers SVG2.
    image.setAttributeNS(XLINK_NS, 'xlink:href', href)
    image.setAttribute('href', href)
  }

  extractSvgAttributes(svgContent: string): void {
    if (!svgContent) {
      return
    }
    this.newRecipientName = 'Test User'
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

    // Order matters only in that appended fallbacks paint in this sequence; it
    // matches what the five inline blocks here used to do.
    const fields = this.previewFields()
    this.fillPlaceholder(svgDoc, fields[0])
    this.fillQrCode(svgDoc, qrCodeImage)
    fields.slice(1).forEach(field => this.fillPlaceholder(svgDoc, field))

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
    formdata.append('content', this.file as Blob, (this.file as File).name.replace(/[^A-Za-z0-9_.]/g, ''))

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
          this.dialogRef.disableClose = false
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
            template: data.artifactUrl,
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
