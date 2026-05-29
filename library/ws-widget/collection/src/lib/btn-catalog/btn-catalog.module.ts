import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { BtnCatalogComponent } from './btn-catalog.component'

import { TreeCatalogModule } from '../tree-catalog/tree-catalog.module'


@NgModule({
  declarations: [BtnCatalogComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    TreeCatalogModule,
  ],
})
export class BtnCatalogModule { }
