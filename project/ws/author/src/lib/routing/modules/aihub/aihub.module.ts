import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { AIHubDashboardComponent } from './components/aihub-dashboard/aihub-dashboard.component'
import { AIHubRoutingModule } from './ai-hub-routing.module'
import { MatTabsModule } from '@angular/material'
import { TranslateComponent } from './components/translate/translate.component'
import { QuestionGeneratorComponent } from './components/question-generator/question-generator.component'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { MatFormFieldModule } from '@angular/material'
import { MatInputModule } from '@angular/material'
import { MatOptionModule } from '@angular/material'
import { MatSelectModule } from '@angular/material'
import { AIHubService } from './services/aihub.service'
@NgModule({
  declarations: [AIHubDashboardComponent, TranslateComponent, QuestionGeneratorComponent],
  imports: [
    CommonModule,
    MatTabsModule,
    AIHubRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatOptionModule,
    MatSelectModule,
    MatFormFieldModule
  ],
  exports: [AIHubDashboardComponent],
  providers: [AIHubService]
})
export class AIHubModule { }
