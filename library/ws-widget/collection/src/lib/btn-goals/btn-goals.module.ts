import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatMenuModule } from '@angular/material/menu'
import { MatInputModule } from '@angular/material/input'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatListModule } from '@angular/material/list'
import { MatDialogModule } from '@angular/material/dialog'
import { BtnGoalsComponent } from './btn-goals.component'

import { BtnGoalsDialogComponent } from './btn-goals-dialog/btn-goals-dialog.component'

import { BtnGoalsSelectionComponent } from './btn-goals-selection/btn-goals-selection.component'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { RouterModule } from '@angular/router'

import { BtnGoalsErrorComponent } from './btn-goals-error/btn-goals-error.component'


@NgModule({
  declarations: [BtnGoalsComponent, BtnGoalsDialogComponent, BtnGoalsSelectionComponent, BtnGoalsErrorComponent],
  imports: [
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatListModule,
    MatDialogModule,
  ],
  exports: [BtnGoalsComponent],
})
export class BtnGoalsModule { }
