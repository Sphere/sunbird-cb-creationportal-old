import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { PageResolve } from '@ws-widget/utils'
import { DepartmentResolver } from '../../../../../services/department-resolv.servive'
import { CompetenciesAreaComponent } from './components/competencies-area/competencies-area.component'
import { CompetenciesBaseComponent } from './components/competencies-base/competencies-base.component'
import { CompetenciesDictonaryComponent } from './components/competencies-dictonary/competencies-dictonary.component'
import { CompetenciesHomeComponent } from './components/competencies-home/competencies-home.component'
import { DetailedAreaComponent } from './components/detailed-area/detailed-area.component'
import { DetailedCompetencyComponent } from './components/detailed-competency/detailed-competency.component'
import { RequestCompetencyComponent } from './components/request-competency/request-competency.component'
import { CompetencyByIdResolverService } from './resolvers/competency-by-id-resolver.service'
import { CompetencyResolverService } from './resolvers/competency-resolver.service'
import { ResolveAreaService } from './resolvers/resolve-area.service'

const routes: Routes = [
  {
    path: '',
    component: CompetenciesBaseComponent,
    resolve: {
      departmentData: DepartmentResolver,
    },
    children: [

      {
        path: 'competency',
        component: CompetenciesHomeComponent,
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'dictionary',
          },
          /**this will be default path */
          {
            path: 'dictionary',
            component: CompetenciesDictonaryComponent,
            data: {
              load: 'dictionary',
            },
            resolve: {
              competencies: CompetencyResolverService,
            },
          },
          {
            path: 'area',
            component: CompetenciesAreaComponent,
            data: {
              load: 'area',
            },
            resolve: {
              area: CompetencyResolverService,
            },
          },

        ],
      },
      {
        /** default load need to update after API update */
        path: 'area/:areaId',
        component: DetailedAreaComponent,
        data: {
          pageType: 'feature',
          pageKey: 'competency-detail',
          load: 'dictionary',
        },
        resolve: {
          pageData: PageResolve,
          competencies: CompetencyResolverService,
        },
      },
      {
        path: 'competency/:competencyId',
        component: DetailedCompetencyComponent,
        data: {
          pageType: 'feature',
          pageKey: 'competency-detail',
          type: 'COMPETENCY',
        },
        resolve: {
          pageData: PageResolve,
          competency: CompetencyByIdResolverService,
        },
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
          areaList: ResolveAreaService,
        },
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'competency',
      },
    ],
  },
]
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [CompetencyResolverService, CompetencyByIdResolverService, ResolveAreaService],
})
export class CompetenciesRoutingModule { }
