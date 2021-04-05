import { CommonModule } from '@angular/common'
import { NgModule } from '@angular/core'
import { MatDividerModule, MatSortModule, MatTableModule } from '@angular/material'
import { PipeContentRouteModule } from '@ws-widget/collection'
import { SharedModule } from '@ws/author/src/lib/modules/shared/shared.module'
import { WidgetResolverModule } from '../../../../../../../../../../library/ws-widget/resolver/src/public-api'
import { CompetenciesRoutingModule } from './competencies-routing.module'
import { CompCardTableComponent } from './components/comp-card-table/comp-card-table.component'
import { CompDraftComponent } from './components/request-competency/comp-draft/comp-draft.component'
import { AddCompLevelDialogModule } from './components/request-competency/add-comp-level/add-comp-level.module'
import { CompetenciesAreaComponent } from './components/competencies-area/competencies-area.component'
import { CompetenciesBaseComponent } from './components/competencies-base/competencies-base.component'
import { CompetenciesDictonaryComponent } from './components/competencies-dictonary/competencies-dictonary.component'
import { CompetenciesHomeComponent } from './components/competencies-home/competencies-home.component'
import { DetailedAreaComponent } from './components/detailed-area/detailed-area.component'
import { DetailedCompetencyComponent } from './components/detailed-competency/detailed-competency.component'
import { RequestCompetencyComponent } from './components/request-competency/request-competency.component'
import { CompService } from './services/competencies.service'

@NgModule({
  declarations: [
    CompetenciesBaseComponent,
    CompetenciesHomeComponent,
    CompCardTableComponent,
    RequestCompetencyComponent,
    CompDraftComponent,
    DetailedCompetencyComponent,
    CompetenciesDictonaryComponent,
    CompetenciesAreaComponent,
    DetailedAreaComponent,
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
    AddCompLevelDialogModule,
  ],
  providers: [CompService],
})
export class CompetenciesModule { }
