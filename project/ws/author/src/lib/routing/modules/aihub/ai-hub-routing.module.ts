import { NgModule } from '@angular/core'
import { Routes, RouterModule } from '@angular/router'
import { AIHubDashboardComponent } from './components/aihub-dashboard/aihub-dashboard.component'
import { TranslateComponent } from './components/translate/translate.component'
import { QuestionGeneratorComponent } from './components/question-generator/question-generator.component'
const routes: Routes = [
  {
    path: '',
    component: AIHubDashboardComponent,
    children: [
      { path: '', redirectTo: 'translate', pathMatch: 'full' },
      { path: 'translate', component: TranslateComponent },
      { path: 'question-generator', component: QuestionGeneratorComponent },
    ]
  }
]

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AIHubRoutingModule { }
