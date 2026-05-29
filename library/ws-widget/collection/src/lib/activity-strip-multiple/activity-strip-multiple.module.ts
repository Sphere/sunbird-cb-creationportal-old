import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { RouterModule } from '@angular/router'

import { ActivityStripMultipleComponent } from './activity-strip-multiple.component'

import { HorizontalScrollerModule } from '@ws-widget/utils'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatChipsModule } from '@angular/material/chips'
import { MatCardModule } from '@angular/material/card'
@NgModule({
  declarations: [ActivityStripMultipleComponent],
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
export class ActivityStripMultipleModule { }
