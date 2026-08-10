import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { RouterModule } from '@angular/router'

import { AppTocRoutingModule } from './app-toc-routing.module'

import { TimeDifferencePipe } from 'project/ws/app/src/lib/routes/app-toc/components/app-toc-home/time-difference.pipe'

import { MomentDatePipe } from 'project/ws/app/src/lib/routes/app-toc/components/app-toc-home/moment-date.pipe'

import { MatToolbarModule } from '@angular/material/toolbar'
import { MatIconModule } from '@angular/material/icon'
import { MatButtonModule } from '@angular/material/button'
import { MatMenuModule } from '@angular/material/menu'
import { MatCardModule } from '@angular/material/card'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatTabsModule } from '@angular/material/tabs'
import { MatChipsModule } from '@angular/material/chips'
import { MatDividerModule } from '@angular/material/divider'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatListModule } from '@angular/material/list'
import { MatDialogModule } from '@angular/material/dialog'
import { MatRadioModule } from '@angular/material/radio'
import { MatExpansionModule } from '@angular/material/expansion'
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'
import { MatCheckboxModule } from '@angular/material/checkbox'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'
// comps

import { AppTocContentsComponent } from './routes/app-toc-contents/app-toc-contents.component'

import { AppTocHomeComponent } from './components/app-toc-home/app-toc-home.component'

import { AppTocHomeComponent as AppTocHomeRootComponent } from './routes/app-toc-home/app-toc-home.component'

import { AppTocOverviewComponent } from './components/app-toc-overview/app-toc-overview.component'

import { AppTocBannerComponent } from './components/app-toc-banner/app-toc-banner.component'

import { AppLearnerBannerComponent } from './components/app-learner-banner/app-learner-banner.component'

import { AppTocDesktopModalComponent } from './components/app-toc-desktop-modal/app-toc-desktop-modal.component'

import { AppTocCertificateModalComponent } from './components/app-toc-certificate-modal/app-toc-certificate-modal.component'

import { AppTocContentCardComponent } from './components/app-toc-content-card/app-toc-content-card.component'

// services
import { AppTocResolverService } from './resolvers/app-toc-resolver.service'

import { AppTocService } from './services/app-toc.service'

// import { TrainingApiService } from '../infy/routes/training/apis/training-api.service'

// custom modules
import { WidgetResolverModule } from '@ws-widget/resolver'

import {
  PipeDurationTransformModule,
  PipeSafeSanitizerModule,
  PipeLimitToModule,
  PipePartialContentModule,
  HorizontalScrollerModule,
  DefaultThumbnailModule,
  PipeNameTransformModule,
  PipeCountTransformModule,
  PipeAssessmentDurationTransformModule,
} from '@ws-widget/utils'

import {
  BtnCallModule,
  BtnContentDownloadModule,
  BtnContentShareModule,
  BtnContentLikeModule,
  // BtnContentShareModule,
  // BtnContentFeedbackModule,
  // BtnGoalsModule,
  BtnPageBackModule,
  UserImageModule,
  DisplayContentTypeModule,
  DisplayContentTypeIconModule,
  ContentProgressModule,
  PipeContentRouteModule,
  PipeContentRoutePipe,
  // BtnKbModule,
  // MarkAsCompleteModule,
  // PlayerBriefModule,
  CardContentModule,
  UserAutocompleteModule,
} from '@ws-widget/collection'

import { AppTocDialogIntroVideoComponent } from './components/app-toc-dialog-intro-video/app-toc-dialog-intro-video.component'

// import { TrainingService } from '../infy/routes/training/services/training.service'

import { AppTocOverviewDirective } from './routes/app-toc-overview/app-toc-overview.directive'

import { AppTocOverviewComponent as AppTocOverviewRootComponent } from './routes/app-toc-overview/app-toc-overview.component'

import { AppTocHomeDirective } from './routes/app-toc-home/app-toc-home.directive'

import { FormsModule } from '@angular/forms'

import { EditorService } from '../../../../../author/src/lib/routing/modules/editor/services/editor.service'

import { ApiService, AccessControlService, SharedModule } from '../../../../../author/src/public-api'

import { AppTocSinglePageComponent } from './components/app-toc-single-page/app-toc-single-page.component'

import { AppTocSinglePageComponent as AppTocSinglePageRootComponent } from './routes/app-toc-single-page/app-toc-single-page.component'

import { AppTocSinglePageDirective } from './routes/app-toc-single-page/app-toc-single-page.directive'

import { LicenseComponent } from './components/license/license.component'

import { AssessmentDetailComponent } from './components/assessment-detail/assessment-detail.component'

@NgModule({
  declarations: [
    AppTocContentsComponent,
    AppTocHomeComponent,
    AppTocOverviewComponent,
    AppTocBannerComponent,
    AppLearnerBannerComponent,
    AppTocDesktopModalComponent,
    AppTocCertificateModalComponent,
    AppTocContentCardComponent,
    AppTocDialogIntroVideoComponent,
    AppTocOverviewDirective,
    AppTocOverviewRootComponent,
    AppTocHomeDirective,
    AppTocHomeRootComponent,
    AppTocSinglePageComponent,
    AppTocSinglePageRootComponent,
    AppTocSinglePageDirective,
    LicenseComponent,
    TimeDifferencePipe,
    MomentDatePipe,
    AssessmentDetailComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule,
    AppTocRoutingModule,
    MatToolbarModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule,
    MatRadioModule,
    MatTabsModule,
    FormsModule,
    MatCardModule,
    MatListModule,
    MatDividerModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatExpansionModule,
    DisplayContentTypeModule,
    DisplayContentTypeIconModule,
    PipeDurationTransformModule,
    PipeAssessmentDurationTransformModule,
    PipeSafeSanitizerModule,
    PipeLimitToModule,
    PipeNameTransformModule,
    PipeCountTransformModule,
    PipePartialContentModule,
    PipeContentRouteModule,
    BtnCallModule,
    BtnContentDownloadModule,
    BtnContentShareModule,
    BtnContentLikeModule,
    // BtnContentFeedbackModule,
    // BtnGoalsModule,
    BtnPageBackModule,
    HorizontalScrollerModule,
    UserImageModule,
    DefaultThumbnailModule,
    WidgetResolverModule,
    ContentProgressModule,
    // BtnKbModule,
    // MarkAsCompleteModule,
    // PlayerBriefModule,
    MatProgressSpinnerModule,
    CardContentModule,
    // BtnContentShareModule,
    UserAutocompleteModule,
  ],
  providers: [
    AppTocResolverService,
    AppTocService,
    PipeContentRoutePipe,
    // TrainingApiService,
    // TrainingService,
    EditorService,
    ApiService,
    AccessControlService,
  ],
  exports: [AssessmentDetailComponent],
})
export class AppTocModule {}
