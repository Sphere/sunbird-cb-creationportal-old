import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { RouterModule } from '@angular/router'

import { LeftMenuComponent } from './left-menu.component'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatChipsModule } from '@angular/material/chips'
import { MatCardModule } from '@angular/material/card'
import { MatSidenavModule } from '@angular/material/sidenav'
import { MatListModule } from '@angular/material/list'
@NgModule({
  declarations: [LeftMenuComponent],
  imports: [
    CommonModule,
    RouterModule,
    WidgetResolverModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSidenavModule,
    MatChipsModule,
    MatCardModule,
    MatListModule,
  ],
  exports: [
    LeftMenuComponent,
  ],
})
export class LeftMenuModule { }
