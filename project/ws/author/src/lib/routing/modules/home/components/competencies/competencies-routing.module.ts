import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { PageResolve } from '@ws-widget/utils'
import { DepartmentResolver } from '../../../../../services/department-resolv.servive'
import { CompetenciesBaseComponent } from './components/competencies-base/competencies-base.component'
import { CompetenciesHomeComponent } from './components/competencies-home/competencies-home.component'
import { DetailedCompetencyComponent } from './components/detailed-competency/detailed-competency.component'
import { RequestCompetencyComponent } from './components/request-competency/request-competency.component'
import { CompetenciesResolverService } from './resolvers/competencies-resolver.service'

const routes: Routes = [
  {
    path: '',
    // pathMatch: 'full',
    component: CompetenciesBaseComponent,
    resolve: {
      departmentData: DepartmentResolver,
      competencies: CompetenciesResolverService,
    },
    children: [
      {
        path: 'home',
        component: CompetenciesHomeComponent,
      },
      {
        path: 'request-new',
        component: RequestCompetencyComponent,
        data: {
          pageType: 'feature',
          pageKey: 'competency-detail',
        },
        resolve: {
          pageData: PageResolve,
        },
      },
      {
        path: ':competencyId',
        component: DetailedCompetencyComponent,
        data: {
          pageType: 'feature',
          pageKey: 'competency-detail',
        },
        resolve: {
          pageData: PageResolve,
        },
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home',
      },
    ]
  }
]
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [CompetenciesResolverService],
})
export class CompetenciesRoutingModule { }
