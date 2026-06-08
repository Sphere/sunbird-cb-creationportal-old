import { Component, OnInit } from '@angular/core'
import hostConfig from '../../assets/configurations/host.config.json'

@Component({
  standalone: false,
  selector: 'ws-image-upload-intro-popup',
  templateUrl: './image-upload-intro-popup.component.html',
  styleUrls: ['./image-upload-intro-popup.component.scss'],
})
export class ImageUploadIntroPopupComponent implements OnInit {
  uploadImageInto: { first: string; second: string; third: string } | null = null

  ngOnInit(): void {
    this.uploadImageInto = (hostConfig as any).uploadImageInto ?? null
  }
}
