import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { InterestComponent } from './components/interest/interest.component'

// import { PipeLimitToModule } from '@ws-shared/util'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { MatButtonModule } from '@angular/material/button'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatChipsModule } from '@angular/material/chips'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { MatInputModule } from '@angular/material/input'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { PipeLimitToModule } from '@ws-widget/utils'

import { InterestService } from './services/interest.service'


@NgModule({
  declarations: [InterestComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatSnackBarModule,
    MatChipsModule,
    MatCardModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PipeLimitToModule,
  ],
  exports: [InterestComponent],
  providers: [InterestService],
})
export class InterestModule { }
