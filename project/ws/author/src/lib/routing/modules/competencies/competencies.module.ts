import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { MatDividerModule, MatSortModule, MatTableModule } from '@angular/material'
import { PipeContentRouteModule } from '@ws-widget/collection'
import { SharedModule } from '@ws/author/src/lib/modules/shared/shared.module'
import { WidgetResolverModule } from '../../../../../../../../library/ws-widget/resolver/src/public-api'
import { CompetenciesRoutingModule } from './competencies-routing.module'
import { compCardTableComponent } from './components/comp-card-table/comp-card-table.component'
import { CompetenciesHomeComponent } from './components/competencies-home/competencies-home.component'
import { CompService } from './services/competencies.service'

@NgModule({
  declarations: [CompetenciesHomeComponent, compCardTableComponent],
  imports: [
    CommonModule,
    SharedModule,
    CompetenciesRoutingModule,
    MatTableModule,
    MatSortModule,
    MatDividerModule,
    PipeContentRouteModule,
    WidgetResolverModule,
  ],
  providers: [CompService],
})
export class CompetenciesModule { }
