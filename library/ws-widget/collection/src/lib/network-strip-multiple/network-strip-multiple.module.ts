import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { RouterModule } from '@angular/router'

import { NetworkStripMultipleComponent } from './network-strip-multiple.component'

import { HorizontalScrollerModule } from '@ws-widget/utils'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatChipsModule } from '@angular/material/chips'
import { MatCardModule } from '@angular/material/card'
@NgModule({
  declarations: [NetworkStripMultipleComponent],
  imports: [
    CommonModule,
    RouterModule,
    HorizontalScrollerModule,
    WidgetResolverModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatCardModule,
  ],
})
export class NetworkStripMultipleModule { }
