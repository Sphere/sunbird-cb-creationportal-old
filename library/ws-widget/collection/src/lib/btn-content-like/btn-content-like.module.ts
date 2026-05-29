import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatBadgeModule } from '@angular/material/badge'
import { BtnContentLikeComponent } from './btn-content-like.component'


@NgModule({
  declarations: [BtnContentLikeComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatBadgeModule,
  ],
  exports: [BtnContentLikeComponent],
})
export class BtnContentLikeModule { }
