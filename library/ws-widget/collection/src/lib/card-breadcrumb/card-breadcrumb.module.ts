import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { RouterModule } from '@angular/router'

import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { CardBreadcrumbComponent } from './card-breadcrumb.component'


@NgModule({
  declarations: [CardBreadcrumbComponent],
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule],
})
export class CardBreadcrumbModule {}
