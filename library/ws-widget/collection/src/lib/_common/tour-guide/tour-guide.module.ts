import { CommonModule } from '@angular/common'

import { NgModule } from '@angular/core'

import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { TourComponent } from './tour-guide.component'


@NgModule({
  declarations: [TourComponent],
  imports: [
    MatCardModule,
    MatIconModule,
    CommonModule,
  ],
  exports: [TourComponent],
})
export class TourModule { }
