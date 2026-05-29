import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { IapComponent } from './iap.component'

import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
@NgModule({
  declarations: [IapComponent],
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
  ],
  exports: [
    IapComponent,
  ],
})
export class IapModule { }
