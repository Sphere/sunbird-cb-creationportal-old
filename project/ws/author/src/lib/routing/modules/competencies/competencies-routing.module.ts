import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { DepartmentResolver } from '../../../services/department-resolv.servive'
import { CompetenciesHomeComponent } from './components/competencies-home/competencies-home.component'
import { CompetenciesResolverService } from './resolvers/competencies-resolver.service'

const routes: Routes = [

  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'home',
    component: CompetenciesHomeComponent,
    resolve: {
      departmentData: DepartmentResolver,
      competencies: CompetenciesResolverService
    },
  },
]
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [CompetenciesResolverService],
})
export class CompetenciesRoutingModule { }
