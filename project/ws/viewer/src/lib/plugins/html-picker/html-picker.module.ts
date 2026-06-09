import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'


import { MatExpansionModule } from '@angular/material/expansion'
import { MatButtonModule } from '@angular/material/button'
import { AceEditorCompatModule } from '@ws-widget/utils'


import { HtmlPickerComponent } from './html-picker.component'


@NgModule({
  declarations: [HtmlPickerComponent],
  imports: [
    CommonModule,
    MatExpansionModule,
    MatButtonModule,
    AceEditorCompatModule,
  ],
  exports: [
    HtmlPickerComponent,
  ],
})
export class HtmlPickerModule { }
