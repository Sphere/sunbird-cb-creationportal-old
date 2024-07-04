import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import {
  MatButtonModule,
  MatCardModule,
  MatDialogModule,
  MatIconModule,
  MatToolbarModule,
  MatTooltipModule,
  MatSliderModule,
} from '@angular/material'
import { ImageCropperModule } from 'ngx-image-cropper'
import { NewImageCropComponent } from './new-image-crop.component'

@NgModule({
  declarations: [NewImageCropComponent],
  imports: [
    CommonModule,
    ImageCropperModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatToolbarModule,
    MatDialogModule,
    MatCardModule,
    MatTooltipModule,
    MatSliderModule,
  ],
  exports: [NewImageCropComponent],
  entryComponents: [NewImageCropComponent],
})
export class NewImageCropModule { }
