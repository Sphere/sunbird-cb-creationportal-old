import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { EmailInputComponent } from './email-input.component'

import { MatFormFieldModule } from '@angular/material/form-field'
import { MatChipsModule } from '@angular/material/chips'
import { MatInputModule } from '@angular/material/input'
import { MatIconModule } from '@angular/material/icon'
@NgModule({
  declarations: [EmailInputComponent],
  imports: [
    CommonModule,

    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  exports: [EmailInputComponent],
})
export class EmailInputModule { }
