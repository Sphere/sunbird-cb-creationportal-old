import { Component, OnInit, Inject, Output, EventEmitter } from '@angular/core'
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog'
import { NSContent } from '@ws/author/src/lib/interface/content'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import { UploadService } from 'project/ws/author/src/lib/routing/modules/editor/shared/services/upload.service'
import { EditorService } from '@ws/author/src/lib/routing/modules/editor/services/editor.service'
import { LoaderService } from 'project/ws/author/src/lib/services/loader.service'
@Component({
  selector: 'ws-auth-root-certificate-upload-dialog',
  templateUrl: './certificate-upload-dialog.component.html',
  styleUrls: ['./certificate-upload-dialog.component.scss'],
})
export class CertificateDialogComponent implements OnInit {
  @Output() action = new EventEmitter<{ action: string }>()
  svgContent!: any
  newRecipientName: string = ''
  file: any
  constructor(
    private sanitizer: DomSanitizer,
    public dialogRef: MatDialogRef<CertificateDialogComponent>,
    private loader: LoaderService,
    private uploadService: UploadService,
    private editorService: EditorService,
    @Inject(MAT_DIALOG_DATA) public data?: NSContent.IContentMeta,

  ) {
  }

  ngOnInit() {
    console.log(this.data)
  }
  onFileSelected(event: any): void {
    this.file = event.target.files[0]

    if (this.file && this.file.type === 'image/svg+xml') {
      const reader = new FileReader()
      reader.onload = (e: any) => {
        const svgContent = e.target.result
        this.svgContent = this.sanitizer.bypassSecurityTrustResourceUrl(svgContent) as SafeResourceUrl
        const base64Data = e.target.result.split(",")[1]
        let svgContents = atob(base64Data)
        this.extractSvgAttributes(svgContents)
      }
      reader.readAsDataURL(this.file)
    } else {
      this.svgContent = null
    }
  }
  extractSvgAttributes(svgContent: string): void {
    if (svgContent) {
      this.newRecipientName = 'Test User'
      const date = new Date()
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()

      const newIssuedDate = `${day}-${month}-${year}`

      // Replace the content of the specified tspan elements
      const last = svgContent.replace(/<tspan[^>]+>\${recipientName}<\/tspan>/g, `<tspan x="600" y="440">${this.newRecipientName}</tspan>`)
        .replace(/<tspan[^>]+>\${issuedDate}<\/tspan>/g, `<tspan x="620" y="800">${newIssuedDate}</tspan>`)
      // .replace(/<image[^>]+>\${qrCodeImage}<\/tspan>/g, `<image x="600" y="440" fill="black" >${newRecipientName}</tspan>`)
      // let newSvgContent = svgContent.replace(/<tspan[^>]*>(.*?)<\/tspan>/, `<tspan x="600" y="440">Likhith</tspan>`).replace(/<tspan[^>]*>(.*?)<\/tspan>/, `<tspan x="620" y="800">10-08-2023</tspan>`)
      // Encode SVG to base64
      const base64EncodedSvg = btoa(last)
      console.log(last)
      // Add data URI prefix
      const dataUri = `data:image/svg+xml;base64,${base64EncodedSvg}`
      this.svgContent = this.sanitizer.bypassSecurityTrustResourceUrl(dataUri) as SafeResourceUrl
    }
  }
  createTemplate() {
    this.loader.changeLoad.next(true)
    const formdata = new FormData()
    formdata.append(
      'content',
      this.file as Blob,
      (this.file as File).name.replace(/[^A-Za-z0-9_.]/g, ''),
    )
    const request: any = {
      "name": 'Sunbird rc certificate test',
    }
    this.editorService.createTemplate(request).subscribe((res: any) => {
      console.log(res)
      if (res.params.status === 'successful') {
        this.uploadService.upload(formdata, {
          contentId: res.result.identifier,
          contentType: '/artifacts',
        }).subscribe(
          (data: any) => {
            console.log(data)
            if (data.status === "successful") {
              let obj = {
                request: {
                  batch: {
                    // @ts-ignore: Unreachable code error
                    "batchId": this.data["batches"][0].batchId,
                    // @ts-ignore: Unreachable code error
                    "courseId": this.data.identifier,
                    "template": {
                      "template": data.artifactUrl,
                      "previewUrl": data.artifactURL,
                      "identifier": data.identifier,
                      "criteria": {
                        "enrollment": {
                          "status": 2
                        },
                      },
                      "name": "Completion Certificate",
                      "issuer": {
                        "name": "in",
                        "url": "https://sphere.aastrika.org/"
                      },
                      "signatoryList": [
                        {
                          "image": "https://www.aastrika.org/wp-content/uploads/2022/12/aastrika-foundation-logo-header.svg",
                          "name": "aastrika-foundation",
                          "id": "in",
                          "designation": "Home"
                        }
                      ]
                    }
                  }
                }
              }
              this.uploadService.templateToBatch(obj).subscribe((res1: any) => {
                console.log(res1)
                if (res.params.status === 'successful') {
                  this.loader.changeLoad.next(false)
                  this.dialogRef.close()
                }
              })
            }
          })
      }
    }, error => {
      if (error) {
        console.log(error)
      }
    })
  }
}
