import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { AIHubDashboardComponent } from './components/aihub-dashboard/aihub-dashboard.component'

import { AIHubRoutingModule } from './ai-hub-routing.module'

import { MatTabsModule } from '@angular/material/tabs'
import { TranslateComponent } from './components/translate/translate.component'

import { QuestionGeneratorComponent } from './components/question-generator/question-generator.component'

import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
import { MatOptionModule } from '@angular/material/core'
import { MatSelectModule } from '@angular/material/select'
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
