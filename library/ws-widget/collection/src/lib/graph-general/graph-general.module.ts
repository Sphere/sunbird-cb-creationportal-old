import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { GraphGeneralComponent } from './graph-general.component'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { MatSelectModule } from '@angular/material/select'
import { MatFormFieldModule } from '@angular/material/form-field'
@NgModule({
  declarations: [GraphGeneralComponent],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatSelectModule, MatFormFieldModule],
})
export class GraphGeneralModule {}
