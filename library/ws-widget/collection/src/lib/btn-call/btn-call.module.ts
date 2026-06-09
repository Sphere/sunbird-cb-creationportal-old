import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { BtnCallComponent } from './btn-call.component'

import { BtnCallDialogComponent } from './btn-call-dialog/btn-call-dialog.component'

import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatDialogModule } from '@angular/material/dialog'
@NgModule({
  declarations: [BtnCallComponent, BtnCallDialogComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  exports: [BtnCallComponent],
})
export class BtnCallModule { }
