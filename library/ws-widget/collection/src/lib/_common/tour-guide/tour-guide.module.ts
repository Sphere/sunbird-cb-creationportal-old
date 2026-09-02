import { CommonModule } from '@angular/common'

import { NgModule } from '@angular/core'

import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'

@NgModule({
  imports: [MatCardModule, MatIconModule, CommonModule],
})
export class TourModule {}
