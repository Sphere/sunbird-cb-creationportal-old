import { Component, Inject, OnInit } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material'
import * as FileSaver from 'file-saver'
import { DomSanitizer } from '@angular/platform-browser'
// import moment from 'moment'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { LoaderService } from 'project/ws/author/src/lib/services/loader.service'

@Component({
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

  ) { }

  ngOnInit() {
    this.loader.changeLoad.next(true)
    console.log("this.content.identifier", this.content.content.identifier)
    const req = {
      request: {
        filters: {
          courseId: this.content.content.identifier,
          status: ['0', '1', '2'],
        },
        sort_by: { createdDate: 'desc' },
      },
    }
    this.editorService.getBatchforCert(req).subscribe((res: any) => {
      console.log(res)
      let cert = res
      if (cert && cert[0] && cert[0].cert_templates != null) {
        console.log("cert", cert[0].cert_templates, cert[0].cert_templates)


        let certificates: any = Object.values(cert[0]['cert_templates'])
        console.log("certificates[this.content.identifier].url", certificates[0].url)
        this.url = certificates[0].url
        // tslint:disable-next-line:no-this-assignment
        this.img = this.sanitizer.bypassSecurityTrustUrl(this.url)

      }
      this.isLoading = false
    })








  }
  async downloadCertificate() {
    this.isLoading = true
    const img = new Image()
    const name = this.content.tocConfig || 'certificate'  // Fallback if tocConfig is undefined
    const url = this.url

    img.crossOrigin = 'anonymous' // Ensure CORS is handled properly for the image
    img.onload = () => {
      const canvas: HTMLCanvasElement = document.getElementById('certCanvas') as HTMLCanvasElement
      const ctx = canvas.getContext('2d')

      if (ctx) {
        // Set canvas dimensions to match the image
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0, img.width, img.height)

        // Convert canvas content to base64 image (JPEG)
        const imgURI = canvas.toDataURL('image/jpeg')

        // Convert base64 to Blob
        const byteString = atob(imgURI.split(',')[1])
        const mimeString = imgURI.split(',')[0].split(':')[1].split(';')[0]
        const ab = new ArrayBuffer(byteString.length)
        const ia = new Uint8Array(ab)
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i)
        }
        const blob = new Blob([ab], { type: mimeString })

        // Save the Blob as a file
        FileSaver.saveAs(blob, `${name}.jpg`)

        // Remove any local storage entry if needed
        if (localStorage.getItem(`certificate_downloaded_${this.content ? this.content.content.identifier : ''}`)) {
          localStorage.removeItem(`certificate_downloaded_${this.content.content.identifier}`)
        }
      }

      this.isLoading = false
    }

    img.onerror = () => {
      console.error('Image loading failed.')
      this.isLoading = false
    }

    img.src = url // Trigger image load
  }
  //   })
  // }

}
