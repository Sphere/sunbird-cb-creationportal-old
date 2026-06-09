import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { CertificationComponent } from './certification.component'

@NgModule({
  declarations: [CertificationComponent],
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
  ],
  exports: [
    CertificationComponent,
  ],
})
export class CertificationModule { }
