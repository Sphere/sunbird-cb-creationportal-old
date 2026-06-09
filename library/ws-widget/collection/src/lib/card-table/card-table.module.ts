import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { CardTableComponent } from './card-table.component'

import { HorizontalScrollerModule, PipeCountTransformModule, PipeDurationTransformModule } from '@ws-widget/utils'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { PipeTableListModule } from './pipe-table-list/pipe-table-list.module'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatTableModule } from '@angular/material/table'
import { MatSortModule } from '@angular/material/sort'
import { MatMenuModule } from '@angular/material/menu'
import { MatCardModule } from '@angular/material/card'
import { RouterModule } from '@angular/router'

import { PipeTableMetaModule } from './pipe-table-meta/pipe-table-meta.module'

import { PipeRelativePathTableModule } from './relative-url/relative-url.module'

@NgModule({
  declarations: [CardTableComponent],
  imports: [
    CommonModule,
    HorizontalScrollerModule,
    WidgetResolverModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatMenuModule,
    MatSortModule,
    PipeTableListModule,
    RouterModule,
    MatCardModule,
    PipeDurationTransformModule,
    PipeCountTransformModule,
    PipeTableMetaModule,
    PipeRelativePathTableModule,
  ],
  exports: [
    CardTableComponent,
  ],
  //
})
export class CardTableModule { }
