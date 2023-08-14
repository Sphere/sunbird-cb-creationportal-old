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
      const rmNumber = '#09123'

      const newIssuedDate = `${day}-${month}-${year}`
      // let qrCode = "https://ibb.co/wNbdr4m"
      // Replace the content of the specified tspan elements
      // const last = svgContent.replace(/<tspan[^>]+>\${recipientName}<\/tspan>/g, `<tspan x="600" y="440">${newRecipientName}</tspan>`)
      //   .replace(/<tspan[^>]+>\${issuedDate}<\/tspan>/g, `<tspan x="620" y="800">${newIssuedDate}</tspan>`)
      // let newSvgContent = svgContent.replace(/<tspan[^>]*>(.*?)<\/tspan>/, `<tspan x="600" y="440">Likhith</tspan>`).replace(/<tspan[^>]*>(.*?)<\/tspan>/, `<tspan x="620" y="800">10-08-2023</tspan>`)

      // @ts-ignore: Unreachable code error
      let bucket = window["env"]["sitePath"]

      const newQrCodeImage = bucket + '/cbp-assets/images/qrCode.png'

      // Create a DOMParser
      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml")

      // Update or add recipient name
      let recipientText = svgDoc.querySelector('text[id="${recipientName}"] tspan')
      if (recipientText) {
        recipientText.textContent = newRecipientName
      } else {
        const newTextElement = svgDoc.createElementNS("http://www.w3.org/2000/svg", "text")
        newTextElement.setAttribute("id", "recipientName")
        newTextElement.setAttribute("fill", "black")
        newTextElement.setAttribute("xml:space", "preserve")
        newTextElement.setAttribute("style", "white-space: pre")
        newTextElement.setAttribute("font-family", "Roboto")
        newTextElement.setAttribute("font-size", "48")
        newTextElement.setAttribute("letter-spacing", "0em")

        const tspanElement = svgDoc.createElementNS("http://www.w3.org/2000/svg", "tspan")
        tspanElement.setAttribute("x", "600")
        tspanElement.setAttribute("y", "440")
        tspanElement.textContent = newRecipientName

        newTextElement.appendChild(tspanElement)
        svgDoc.documentElement.appendChild(newTextElement)
      }

      // Update or add QR code image
      let qrCodeImageElement = svgDoc.querySelector('image[id="QrCode"]')
      if (qrCodeImageElement) {
        qrCodeImageElement.setAttribute("xlink:href", newQrCodeImage)
      } else {
        const newImageElement = svgDoc.createElementNS("http://www.w3.org/2000/svg", "image")
        newImageElement.setAttribute("id", "QrCode")
        newImageElement.setAttribute("class", "qr-code")
        newImageElement.setAttribute("x", "600")
        newImageElement.setAttribute("y", "620")
        newImageElement.setAttribute("width", "150")
        newImageElement.setAttribute("height", "150")
        newImageElement.setAttribute("xlink:href", newQrCodeImage)

        svgDoc.documentElement.appendChild(newImageElement)
      }

      // Update or add issued date
      let rmNumbers = svgDoc.querySelector('text[id="${rmNumber}"] tspan')
      if (rmNumbers) {
        rmNumbers.textContent = rmNumber
      } else {
        const rmNumbersTextElement = svgDoc.createElementNS("http://www.w3.org/2000/svg", "text")
        rmNumbersTextElement.setAttribute("id", "issuedDate")
        rmNumbersTextElement.setAttribute("fill", "black")
        rmNumbersTextElement.setAttribute("xml:space", "preserve")
        rmNumbersTextElement.setAttribute("style", "white-space: pre")
        rmNumbersTextElement.setAttribute("font-family", "Roboto")
        rmNumbersTextElement.setAttribute("font-size", "20")
        rmNumbersTextElement.setAttribute("letter-spacing", "0em")

        const tspanElement = svgDoc.createElementNS("http://www.w3.org/2000/svg", "tspan")
        tspanElement.setAttribute("x", "600")
        tspanElement.setAttribute("y", "460")
        tspanElement.textContent = rmNumber

        rmNumbersTextElement.appendChild(tspanElement)
        svgDoc.documentElement.appendChild(rmNumbersTextElement)
      }

      // Update or add issued date
      let issuedDateText = svgDoc.querySelector('text[id="${issuedDate}"] tspan')
      if (issuedDateText) {
        issuedDateText.textContent = newIssuedDate
      } else {
        const newTextElement = svgDoc.createElementNS("http://www.w3.org/2000/svg", "text")
        newTextElement.setAttribute("id", "issuedDate")
        newTextElement.setAttribute("fill", "black")
        newTextElement.setAttribute("xml:space", "preserve")
        newTextElement.setAttribute("style", "white-space: pre")
        newTextElement.setAttribute("font-family", "Roboto")
        newTextElement.setAttribute("font-size", "20")
        newTextElement.setAttribute("letter-spacing", "0em")

        const tspanElement = svgDoc.createElementNS("http://www.w3.org/2000/svg", "tspan")
        tspanElement.setAttribute("x", "620")
        tspanElement.setAttribute("y", "800")
        tspanElement.textContent = newIssuedDate

        newTextElement.appendChild(tspanElement)
        svgDoc.documentElement.appendChild(newTextElement)
      }

      // Serialize the modified SVG back to a string
      const modifiedSvgString = new XMLSerializer().serializeToString(svgDoc)

      console.log("modifiedSvgString", modifiedSvgString)

      // const lasts = svgContent
      //   .replace(/\$\{recipientName\}/g, newRecipientName)
      //   .replace(/\$\{qrCodeImage\}/g, "https://ibb.co/wNbdr4m")
      //   .replace(/\$\{issuedDate\}/g, newIssuedDate)

      // Encode SVG to base64
      // console.log("last", lasts)
      const base64EncodedSvg = btoa(modifiedSvgString)
      // Add data URI prefix
      const dataUri = `data:image/svg+xml;base64,${base64EncodedSvg}`
      this.svgContent = this.sanitizer.bypassSecurityTrustResourceUrl(dataUri) as SafeResourceUrl
    }
  }

}
