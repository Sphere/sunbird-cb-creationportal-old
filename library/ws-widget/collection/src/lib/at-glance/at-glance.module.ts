import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { AtGlanceComponent } from './at-glance.component'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { RouterModule } from '@angular/router'

import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { PipeDurationTransformModule } from '@ws-widget/utils'


@NgModule({
  declarations: [AtGlanceComponent],
  imports: [CommonModule, WidgetResolverModule, RouterModule, MatCardModule, MatDividerModule, MatIconModule, PipeDurationTransformModule],
  exports: [AtGlanceComponent],
})
export class AtGlanceModule { }
