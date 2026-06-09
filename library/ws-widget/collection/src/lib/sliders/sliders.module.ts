import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { SlidersComponent } from './sliders.component'

import { RouterModule } from '@angular/router'

import { NavigationModule, ImageResponsiveModule } from '@ws-widget/utils'

@NgModule({
  declarations: [SlidersComponent],
  imports: [
    CommonModule,
    RouterModule,
    NavigationModule,
    ImageResponsiveModule,
  ],
  exports: [SlidersComponent],
})
export class SlidersModule { }
