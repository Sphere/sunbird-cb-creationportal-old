import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { MobileAppHomeComponent } from './components/mobile-app-home.component'

import { MatCardModule } from '@angular/material/card'
import { MatTabsModule } from '@angular/material/tabs'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { BtnPageBackModule } from '@ws-widget/collection'


@NgModule({
  declarations: [MobileAppHomeComponent],
  imports: [
    CommonModule,
    MatToolbarModule,
    MatCardModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    BtnPageBackModule,
  ],
  exports: [MobileAppHomeComponent],
})
export class MobileAppModule {}
