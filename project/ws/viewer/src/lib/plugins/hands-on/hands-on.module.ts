import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'


import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatButtonModule } from '@angular/material/button'
import { MatDialogModule } from '@angular/material/dialog'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { AceEditorCompatModule } from '@ws-widget/utils'


import { PipeSafeSanitizerModule, PipeDurationTransformModule } from '@ws-widget/utils'

import { CompletionSpinnerModule } from '@ws-widget/collection'


import { HandsOnComponent } from './hands-on.component'

import { HandsOnDialogComponent } from './components/hands-on-dialog/hands-on-dialog.component'

@NgModule({
  declarations: [HandsOnComponent, HandsOnDialogComponent],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressBarModule,
    MatExpansionModule,
    MatButtonModule,
    MatDialogModule,
    AceEditorCompatModule,
    MatProgressSpinnerModule,
    PipeSafeSanitizerModule,
    PipeDurationTransformModule,
    CompletionSpinnerModule,
  ],
  exports: [
    HandsOnComponent,
  ],
})
export class HandsOnModule { }
