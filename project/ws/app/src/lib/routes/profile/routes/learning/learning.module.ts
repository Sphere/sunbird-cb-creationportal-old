import { NgModule } from '@angular/core'

import { RouterModule } from '@angular/router'

import { CommonModule } from '@angular/common'

import { LearningTimeComponent } from './components/learning-time/learning-time.component'

import { LearningHistoryComponent } from './components/learning-history/learning-history.component'

import { LearningHomeComponent } from './components/learning-home/learning-home.component'

import { MatButtonModule } from '@angular/material/button'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatDatepickerModule } from '@angular/material/datepicker'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatSelectModule } from '@angular/material/select'
import { MatOptionModule } from '@angular/material/core'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatListModule } from '@angular/material/list'
import { MatCardModule } from '@angular/material/card'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatSlideToggleModule } from '@angular/material/slide-toggle'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatInputModule } from '@angular/material/input'
import { MatGridListModule } from '@angular/material/grid-list'
import { MatPaginatorModule } from '@angular/material/paginator'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'

import { LearningTimeResolver } from './resolvers/learning-time.resolver'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { PipeDurationTransformModule } from '@ws-widget/utils'

import { LearningHistoryResolver } from './resolvers/learning-history.resolver'

import { LearningHistoryProgressComponent } from './components/learning-history-progress/learning-history-progress.component'

import { DisplayContentTypeModule } from '@ws-widget/collection'

import { ProgressRadialComponent } from './components/progress-radial/progress-radial.component'

import { CalendarModule } from '../../module/calendar-module/calendar.module'

import { HistoryCardComponent } from './components/history-card/history-card.component'

import { AnalyticsModule } from '../analytics/analytics.module'

import { BubbleChartComponent } from './components/bubble-chart/bubble-chart.component'

import { HistoryTileComponent } from './components/history-tile/history-tile.component'

@NgModule({
  declarations: [
    LearningTimeComponent,
    LearningHistoryComponent,
    LearningHomeComponent,
    LearningHistoryProgressComponent,
    ProgressRadialComponent,
    HistoryCardComponent,
    BubbleChartComponent,
    HistoryTileComponent,
  ],
  imports: [
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatCardModule,
    MatToolbarModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatGridListModule,
    MatPaginatorModule,

    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    CalendarModule,
    WidgetResolverModule,
    PipeDurationTransformModule,
    DisplayContentTypeModule,
    AnalyticsModule,
  ],
  providers: [LearningTimeResolver, LearningHistoryResolver],
})
export class LearningModule {}
