import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { MatDividerModule, MatSortModule, MatTableModule } from '@angular/material'
import { PipeContentRouteModule } from '@ws-widget/collection'
import { SharedModule } from '@ws/author/src/lib/modules/shared/shared.module'
import { WidgetResolverModule } from '../../../../../../../../../../library/ws-widget/resolver/src/public-api'
import { CompetenciesRoutingModule } from './competencies-routing.module'
import { CompCardTableComponent } from './components/comp-card-table/comp-card-table.component'
import { CompDetailComponent } from './components/comp-detail/comp-detail.component'
import { CompDraftComponent } from './components/comp-draft/comp-draft.component'
import { CompLevelComponent } from './components/comp-level/comp-level.component'
import { CompetenciesBaseComponent } from './components/competencies-base/competencies-base.component'
import { CompetenciesHomeComponent } from './components/competencies-home/competencies-home.component'
import { DetailedCompetencyComponent } from './components/detailed-competency/detailed-competency.component'
import { RequestCompetencyComponent } from './components/request-competency/request-competency.component'
import { CompService } from './services/competencies.service'

@NgModule({
  declarations: [
    CompetenciesBaseComponent,
    CompetenciesHomeComponent,
    CompCardTableComponent,
    RequestCompetencyComponent,
    CompDetailComponent,
    CompDraftComponent,
    CompLevelComponent,
    DetailedCompetencyComponent,
  ],
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
