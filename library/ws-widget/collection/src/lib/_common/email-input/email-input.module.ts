import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'
import { TextFieldModule } from '@angular/cdk/text-field'

import { EmailInputComponent } from './email-input.component'

import { MatFormFieldModule } from '@angular/material/form-field'
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips'
import { MatInputModule } from '@angular/material/input'
import { MatIconModule } from '@angular/material/icon'
@NgModule({
  declarations: [EmailInputComponent],
  imports: [
    CommonModule,
    TextFieldModule,

    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  exports: [EmailInputComponent],
})
export class EmailInputModule { }
