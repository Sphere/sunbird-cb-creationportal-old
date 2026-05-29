import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'
import { TextFieldModule } from '@angular/cdk/text-field'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { UserAutocompleteComponent } from './user-autocomplete.component'

import { MatInputModule } from '@angular/material/input'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatAutocompleteModule } from '@angular/material/autocomplete'
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips'
import { MatIconModule } from '@angular/material/icon'
import { UserImageModule } from '../user-image/user-image.module'


@NgModule({
  declarations: [UserAutocompleteComponent],
  imports: [
    CommonModule,
    TextFieldModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    UserImageModule,
  ],
  exports: [UserAutocompleteComponent],
})
export class UserAutocompleteModule { }
