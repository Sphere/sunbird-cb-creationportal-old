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
      }
      reader.readAsDataURL(file)
    } else {
      this.svgContent = null
    }
  }


}
