import { CommonModule } from '@angular/common'

import { NgModule } from '@angular/core'

import { RouterModule } from '@angular/router'

import { ImageResponsiveModule, NavigationModule } from '@ws-widget/utils'

import { SlidersMobComponent } from './sliders-mob.component'

@NgModule({
  declarations: [SlidersMobComponent],
  imports: [CommonModule, RouterModule, NavigationModule, ImageResponsiveModule],
})
export class SlidersMobModule {}
