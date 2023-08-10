import { Component, OnInit, Inject, Output, EventEmitter } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
@Component({
  selector: 'ws-auth-root-certificate-upload-dialog',
  templateUrl: './certificate-upload-dialog.component.html',
  styleUrls: ['./certificate-upload-dialog.component.scss'],
})
export class CertificateDialogComponent implements OnInit {
  @Output() action = new EventEmitter<{ action: string }>()
  svgContent!: any


  constructor(
    private sanitizer: DomSanitizer,
    public dialogRef: MatDialogRef<CertificateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data?: NSContent.IContentMeta,
  ) {

  }

  ngOnInit() {

  }
  onFileSelected(event: any): void {
    const file = event.target.files[0]

    if (file && file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = (e: any) => {
        const svgContent = e.target.result
        this.svgContent = this.sanitizer.bypassSecurityTrustResourceUrl(svgContent) as SafeResourceUrl
        const base64Data = e.target.result.split(",")[1]
        let svgContents = atob(base64Data)
        this.extractSvgAttributes(svgContents)
      }
      reader.readAsDataURL(file)
    } else {
      this.svgContent = null
    }
  }
  extractSvgAttributes(svgContent: string): void {
    if (svgContent) {


      const newRecipientName = 'Test User'
      const date = new Date()
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()

      const newIssuedDate = `${day}-${month}-${year}`

      // Replace the content of the specified tspan elements
      const last = svgContent.replace(/<tspan[^>]+>\${recipientName}<\/tspan>/g, `<tspan x="600" y="440">${newRecipientName}</tspan>`)
        .replace(/<tspan[^>]+>\${issuedDate}<\/tspan>/g, `<tspan x="620" y="800">${newIssuedDate}</tspan>`)
      // let newSvgContent = svgContent.replace(/<tspan[^>]*>(.*?)<\/tspan>/, `<tspan x="600" y="440">Likhith</tspan>`).replace(/<tspan[^>]*>(.*?)<\/tspan>/, `<tspan x="620" y="800">10-08-2023</tspan>`)
      // Encode SVG to base64
      const base64EncodedSvg = btoa(last)
      // Add data URI prefix
      const dataUri = `data:image/svg+xml;base64,${base64EncodedSvg}`
      this.svgContent = this.sanitizer.bypassSecurityTrustResourceUrl(dataUri) as SafeResourceUrl
    }
  }

}
