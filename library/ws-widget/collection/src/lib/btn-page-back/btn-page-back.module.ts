import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { RouterModule } from '@angular/router'

import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { BtnPageBackComponent } from './btn-page-back.component'


@NgModule({
  declarations: [BtnPageBackComponent],
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  exports: [BtnPageBackComponent],
})
export class BtnPageBackModule { }
