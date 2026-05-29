import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { UserContentDetailedRatingComponent } from './user-content-detailed-rating.component'

import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { InViewPortModule } from '../../../../../utils/src/lib/directives/in-view-port/in-view-port.module'


@NgModule({
  declarations: [UserContentDetailedRatingComponent],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    InViewPortModule,
    MatProgressBarModule,
  ],
  exports: [UserContentDetailedRatingComponent],
})
export class UserContentDetailedRatingModule { }
