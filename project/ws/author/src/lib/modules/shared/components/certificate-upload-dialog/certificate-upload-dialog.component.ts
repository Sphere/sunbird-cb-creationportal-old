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
  extractSvgAttributes(svgContent: string): void {
    if (svgContent) {
      this.newRecipientName = 'Test User'
      const date = new Date()
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      const rmNumber = '#09123'
      const maxScore = '100%'
      const courseName = 'Normal Labour Course'

      const newIssuedDate = `${day}-${month}-${year}`
      // let qrCode = "https://ibb.co/wNbdr4m"
      // Replace the content of the specified tspan elements
      // const last = svgContent.replace(/<tspan[^>]+>\${recipientName}<\/tspan>/g, `<tspan x="600" y="440">${newRecipientName}</tspan>`)
      //   .replace(/<tspan[^>]+>\${issuedDate}<\/tspan>/g, `<tspan x="620" y="800">${newIssuedDate}</tspan>`)
      // let newSvgContent = svgContent.replace(/<tspan[^>]*>(.*?)<\/tspan>/, `<tspan x="600" y="440">Likhith</tspan>`).replace(/<tspan[^>]*>(.*?)<\/tspan>/, `<tspan x="620" y="800">10-08-2023</tspan>`)

      // @ts-ignore: Unreachable code error
      let bucket = window['env']['sitePath']

      const newQrCodeImage = bucket + '/cbp-assets/images/qrCode.png'

      // Create a DOMParser
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml')

      // Update or add recipient name
      let recipientText = svgDoc.querySelector('text[id="${recipientName}"] tspan')
      if (recipientText) {
        recipientText.textContent = this.newRecipientName
      } else {
        const newTextElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text')
        newTextElement.setAttribute('id', 'recipientName')
        newTextElement.setAttribute('fill', 'black')
        newTextElement.setAttribute('xml:space', 'preserve')
        newTextElement.setAttribute('style', 'white-space: pre')
        newTextElement.setAttribute('font-family', 'Roboto')
        newTextElement.setAttribute('font-size', '48')
        newTextElement.setAttribute('letter-spacing', '0em')

        const tspanElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'tspan')
        tspanElement.setAttribute('x', '600')
        tspanElement.setAttribute('y', '440')
        tspanElement.textContent = this.newRecipientName

        newTextElement.appendChild(tspanElement)
        svgDoc.documentElement.appendChild(newTextElement)
      }

      // Update or add QR code image
      let qrCodeImageElement = svgDoc.querySelector('image[id="QrCode"]')
      if (qrCodeImageElement) {
        qrCodeImageElement.setAttribute('xlink:href', newQrCodeImage)
      } else {
        const newImageElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'image')
        newImageElement.setAttribute('id', 'QrCode')
        newImageElement.setAttribute('class', 'qr-code')
        newImageElement.setAttribute('x', '600')
        newImageElement.setAttribute('y', '620')
        newImageElement.setAttribute('width', '150')
        newImageElement.setAttribute('height', '150')
        newImageElement.setAttribute('xlink:href', newQrCodeImage)

        svgDoc.documentElement.appendChild(newImageElement)
      }

      // Update or add rnNumber date
      let rmNumbers = svgDoc.querySelector('text[id="${rmNumber}"] tspan')
      if (rmNumbers) {
        rmNumbers.textContent = rmNumber
      } else {
        const rmNumbersTextElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text')
        rmNumbersTextElement.setAttribute('id', 'rmNumber')
        rmNumbersTextElement.setAttribute('fill', 'black')
        rmNumbersTextElement.setAttribute('xml:space', 'preserve')
        rmNumbersTextElement.setAttribute('style', 'white-space: pre')
        rmNumbersTextElement.setAttribute('font-family', 'Roboto')
        rmNumbersTextElement.setAttribute('font-size', '20')
        rmNumbersTextElement.setAttribute('letter-spacing', '0em')

        const tspanElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'tspan')
        tspanElement.setAttribute('x', '600')
        tspanElement.setAttribute('y', '460')
        tspanElement.textContent = rmNumber

        rmNumbersTextElement.appendChild(tspanElement)
        svgDoc.documentElement.appendChild(rmNumbersTextElement)
      }

      // Update or add issued date
      let issuedDateText = svgDoc.querySelector('text[id="${issuedDate}"] tspan')
      if (issuedDateText) {
        issuedDateText.textContent = newIssuedDate
      } else {
        const newTextElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text')
        newTextElement.setAttribute('id', 'issuedDate')
        newTextElement.setAttribute('fill', 'black')
        newTextElement.setAttribute('xml:space', 'preserve')
        newTextElement.setAttribute('style', 'white-space: pre')
        newTextElement.setAttribute('font-family', 'Roboto')
        newTextElement.setAttribute('font-size', '20')
        newTextElement.setAttribute('letter-spacing', '0em')

        const tspanElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'tspan')
        tspanElement.setAttribute('x', '620')
        tspanElement.setAttribute('y', '800')
        tspanElement.textContent = newIssuedDate

        newTextElement.appendChild(tspanElement)
        svgDoc.documentElement.appendChild(newTextElement)
      }

      let maxScoreText = svgDoc.querySelector('text[id="${maxScore}"] tspan')
      if (maxScoreText) {
        maxScoreText.textContent = maxScore
      } else {
        const maxScoreTextElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text')
        maxScoreTextElement.setAttribute('id', 'maxScore')
        maxScoreTextElement.setAttribute('fill', 'black')
        maxScoreTextElement.setAttribute('xml:space', 'preserve')
        maxScoreTextElement.setAttribute('style', 'white-space: pre')
        maxScoreTextElement.setAttribute('font-family', 'Roboto')
        maxScoreTextElement.setAttribute('font-size', '20')
        maxScoreTextElement.setAttribute('letter-spacing', '0em')
        const tspanElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'tspan')
        tspanElement.setAttribute('x', '640')
        tspanElement.setAttribute('y', '780')
        tspanElement.textContent = maxScore
        maxScoreTextElement.appendChild(tspanElement)
        svgDoc.documentElement.appendChild(maxScoreTextElement)
      }

      let courseNameText = svgDoc.querySelector('text[id="${courseName}"] tspan')
      if (courseNameText) {
        courseNameText.textContent = courseName
      } else {
        const courseNameTextElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'text')
        courseNameTextElement.setAttribute('id', 'courseName')
        courseNameTextElement.setAttribute('fill', 'black')
        courseNameTextElement.setAttribute('xml:space', 'preserve')
        courseNameTextElement.setAttribute('style', 'white-space: pre')
        courseNameTextElement.setAttribute('font-family', 'Roboto')
        courseNameTextElement.setAttribute('font-size', '24')
        courseNameTextElement.setAttribute('letter-spacing', '0em')
        const tspanElement = svgDoc.createElementNS('http://www.w3.org/2000/svg', 'tspan')
        tspanElement.setAttribute('x', '600')
        tspanElement.setAttribute('y', '500')
        tspanElement.textContent = courseName
        courseNameTextElement.appendChild(tspanElement)
        svgDoc.documentElement.appendChild(courseNameTextElement)
      }

      // Serialize the modified SVG back to a string
      const modifiedSvgString = new XMLSerializer().serializeToString(svgDoc)

      console.log('modifiedSvgString', modifiedSvgString)

      // const lasts = svgContent
      //   .replace(/\$\{recipientName\}/g, newRecipientName)
      //   .replace(/\$\{qrCodeImage\}/g, "https://ibb.co/wNbdr4m")
      //   .replace(/\$\{issuedDate\}/g, newIssuedDate)

      this.setPreview(modifiedSvgString)
    }
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
      .createTemplate({ name: 'Sunbird rc certificate test' })
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
