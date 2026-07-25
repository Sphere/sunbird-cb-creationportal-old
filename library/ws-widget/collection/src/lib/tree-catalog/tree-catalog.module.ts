import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { RouterModule } from '@angular/router'

import { TreeCatalogMenuComponent } from './tree-catalog-menu/tree-catalog-menu.component'

import { MatMenuModule } from '@angular/material/menu'
import { MatIconModule } from '@angular/material/icon'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatButtonModule } from '@angular/material/button'
import { TreeCatalogRoutePipe } from './tree-catalog-route.pipe'

@NgModule({
  declarations: [TreeCatalogMenuComponent, TreeCatalogRoutePipe],
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatMenuModule, MatProgressSpinnerModule],
  exports: [TreeCatalogMenuComponent],
})
export class TreeCatalogModule {}
