import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { AboutVideoComponent } from './about-video.component'

import { MatRadioModule } from '@angular/material/radio'
import { MatButtonModule } from '@angular/material/button'
import { MatToolbarModule } from '@angular/material/toolbar'
import { LocaleTranslatorModule, BtnPageBackModule } from '@ws-widget/collection'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { RouterModule } from '@angular/router'


@NgModule({
  declarations: [AboutVideoComponent],
  imports: [
    CommonModule,
    MatRadioModule,
    RouterModule,
    WidgetResolverModule,
    LocaleTranslatorModule,
    MatButtonModule,
    BtnPageBackModule,
    MatToolbarModule,
  ],
  exports: [AboutVideoComponent],
})
export class AboutVideoModule { }
