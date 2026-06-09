import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { ContactHomeComponent } from './components/contact-home.component'

import { MatToolbarModule } from '@angular/material/toolbar'
import { MatCardModule } from '@angular/material/card'
import { MatButtonModule } from '@angular/material/button'
import { BtnPageBackModule } from '@ws-widget/collection'


@NgModule({
  declarations: [ContactHomeComponent],
  imports: [CommonModule, MatToolbarModule, MatCardModule, BtnPageBackModule, MatButtonModule],
  exports: [ContactHomeComponent],
})
export class ContactModule {}
