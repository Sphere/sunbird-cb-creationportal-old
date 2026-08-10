import { Component, Inject, OnInit } from '@angular/core'

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import * as FileSaver from 'file-saver'

import { DomSanitizer } from '@angular/platform-browser'

// import moment from 'moment'

import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'

import { LoaderService } from 'project/ws/author/src/lib/services/loader.service'

// import { WidgetContentService } from '@ws-widget/collection'

@Component({
  standalone: false,
  selector: 'ws-app-app-toc-certificate-modal',
  templateUrl: './app-toc-certificate-modal.component.html',
  styleUrls: ['./app-toc-certificate-modal.component.scss'],
})
export class AppTocCertificateModalComponent implements OnInit {
  img: any = ''
  isLoading = true
  url: any = ''
  constructor(
    public dialogRef: MatDialogRef<AppTocCertificateModalComponent>,
    @Inject(MAT_DIALOG_DATA) public content: any,
    private sanitizer: DomSanitizer,
    private editorService: EditorService,
    private loader: LoaderService,
    // private contentSvc: WidgetContentService,
  ) {}

  ngOnInit() {
    this.loader.changeLoad.next(true)
    const req = {
      request: {
        filters: {
          courseId: this.content.content.identifier,
          status: ['0', '1', '2'],
        },
        sort_by: { createdDate: 'desc' },
      },
    }
    this.editorService.getBatchforCert(req).subscribe(
      (res: any) => {
        const cert = res
        if (cert && cert[0] && cert[0].cert_templates != null) {
          const certificates: any = Object.values(cert[0]['cert_templates'])
          this.url = certificates[0].url
          this.img = this.sanitizer.bypassSecurityTrustUrl(this.url)
        }
        this.settled()
      },
      // Without this the request could only ever succeed: a failure left both the
      // dialog and the global loader spinning with nothing shown and no way back.
      () => {
        this.settled()
      },
    )
  }

  /** Clears both the in-dialog spinner and the global loader, on either outcome. */
  private settled() {
    this.isLoading = false
    this.loader.changeLoad.next(false)
  }
  async downloadCertificate() {
    this.isLoading = true
    const name = this.content.tocConfig || 'certificate' // Fallback if tocConfig is undefined
    const url = this.url

    try {
      // Fetch the SVG content as a text response
      const response = await fetch(url)
      if (!response.ok) throw new Error('Network response was not ok')

      const svgContent = await response.text() // Get SVG content as text
      const blob = new Blob([svgContent], { type: 'image/svg+xml' }) // Create a blob from the SVG content
      const blobUrl = URL.createObjectURL(blob) // Create an object URL for the blob

      // Use FileSaver.js to download the SVG file
      FileSaver.saveAs(blobUrl, `${name}.svg`)

      // Clean up the object URL after downloading
      URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Error downloading the certificate:', error)
      alert('Failed to download the certificate. Please try again.')
    } finally {
      this.isLoading = false
    }
  }

  //   })
  // }
}
