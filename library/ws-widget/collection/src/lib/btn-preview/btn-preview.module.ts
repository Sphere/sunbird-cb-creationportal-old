import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { BtnPreviewComponent } from './btn-preview.component'

@NgModule({
  declarations: [BtnPreviewComponent],
  imports: [CommonModule],
  exports: [BtnPreviewComponent],
})
export class BtnPreviewModule {}
