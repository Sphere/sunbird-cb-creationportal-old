import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatListModule } from '@angular/material/list'
import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { NotificationRoutingModule } from './notification-routing.module'

import { NotificationComponent } from './components/notification/notification.component'

import { BtnPageBackModule } from '@ws-widget/collection'

import { PipeLimitToModule } from '../../../../../../../library/ws-widget/utils/src/public-api'


@NgModule({
  declarations: [NotificationComponent],
  imports: [
    CommonModule,
    NotificationRoutingModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatCardModule,
    MatDividerModule,

    BtnPageBackModule,
    PipeLimitToModule,
    MatProgressSpinnerModule,
  ],
})
export class NotificationModule { }
