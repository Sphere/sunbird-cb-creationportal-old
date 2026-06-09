import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { AboutHomeComponent } from './components/about-home.component'

import { MatToolbarModule } from '@angular/material/toolbar'
import { MatDividerModule } from '@angular/material/divider'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { BtnPageBackNavModule } from '@ws-widget/collection'

import { HorizontalScrollerModule, PipeSafeSanitizerModule } from '@ws-widget/utils'

import { WidgetResolverModule } from '@ws-widget/resolver'


@NgModule({
  declarations: [AboutHomeComponent],
  imports: [
    CommonModule,
    MatToolbarModule,
    MatDividerModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,

    BtnPageBackNavModule,
    HorizontalScrollerModule,
    WidgetResolverModule,
    PipeSafeSanitizerModule,

  ],
  exports: [AboutHomeComponent],
})
export class AboutModule { }
