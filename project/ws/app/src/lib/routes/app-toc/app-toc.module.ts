import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { RouterModule } from '@angular/router'
import { AppTocRoutingModule } from './app-toc-routing.module'
import { TimeDifferencePipe } from 'project/ws/app/src/lib/routes/app-toc/components/app-toc-home/time-difference.pipe'
import { MomentDatePipe } from 'project/ws/app/src/lib/routes/app-toc/components/app-toc-home/moment-date.pipe'
import {
  MatToolbarModule,
  MatIconModule,
  MatButtonModule,
  MatMenuModule,
  MatCardModule,
  MatTooltipModule,
  MatTabsModule,
  MatChipsModule,
  MatDividerModule,
  MatProgressBarModule,
  MatListModule,
  MatDialogModule,
  MatRadioModule,
  MatExpansionModule,
  MatProgressSpinnerModule,
  MatCheckboxModule,
  MatFormFieldModule,
  MatInputModule,
} from '@angular/material'

// comps
import { AppTocAnalyticsComponent } from './routes/app-toc-analytics/app-toc-analytics.component'
import { AppTocContentsComponent } from './routes/app-toc-contents/app-toc-contents.component'
import { AppTocHomeComponent } from './components/app-toc-home/app-toc-home.component'
import { AppTocHomeComponent as AppTocHomeRootComponent } from './routes/app-toc-home/app-toc-home.component'
import { AppTocOverviewComponent } from './components/app-toc-overview/app-toc-overview.component'
import { AppTocBannerComponent } from './components/app-toc-banner/app-toc-banner.component'
import { AppTocCohortsComponent } from './components/app-toc-cohorts/app-toc-cohorts.component'
import { AppTocContentCardComponent } from './components/app-toc-content-card/app-toc-content-card.component'
import { AppTocDiscussionComponent } from './components/app-toc-discussion/app-toc-discussion.component'

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
  PipeAssessmentDurationTransformModule
} from '@ws-widget/utils'
import {
  BtnCallModule,
  BtnContentDownloadModule,
  BtnGoalsModule,
  BtnContentShareModule,
  BtnContentLikeModule,
  // BtnContentShareModule,
  // BtnContentFeedbackModule,
  BtnContentFeedbackV2Module,
  // BtnGoalsModule,
  BtnMailUserModule,
  BtnPageBackModule,
  UserImageModule,
  DisplayContentTypeModule,
  BtnPlaylistModule,
  DisplayContentTypeIconModule,
  ContentProgressModule,
  UserContentRatingModule,
  PipeContentRouteModule,
  PipeContentRoutePipe,
  // BtnKbModule,
  // MarkAsCompleteModule,
  // PlayerBriefModule,
  CardContentModule,
  UserAutocompleteModule,
} from '@ws-widget/collection'
import { AppTocDialogIntroVideoComponent } from './components/app-toc-dialog-intro-video/app-toc-dialog-intro-video.component'
import { CertificationMetaResolver } from './routes/app-toc-certification/resolvers/certification-meta.resolver'
import { ContentCertificationResolver } from './routes/app-toc-certification/resolvers/content-certification.resolver'
import { CertificationApiService } from './routes/app-toc-certification/apis/certification-api.service'
import { AppTocCertificationModule } from './routes/app-toc-certification/app-toc-certification.module'
// import { TrainingService } from '../infy/routes/training/services/training.service'
import { AppTocOverviewDirective } from './routes/app-toc-overview/app-toc-overview.directive'
import { AppTocOverviewComponent as AppTocOverviewRootComponent } from './routes/app-toc-overview/app-toc-overview.component'
import { AppTocHomeDirective } from './routes/app-toc-home/app-toc-home.directive'
import { AppTocCohortsDirective } from './routes/app-toc-cohorts/app-toc-cohorts.directive'
import { AppTocCohortsComponent as AppTocCohortsRootComponent } from './routes/app-toc-cohorts/app-toc-cohorts.component'
import { FormsModule } from '@angular/forms'
import { AppTocAnalyticsTilesComponent } from './components/app-toc-analytics-tiles/app-toc-analytics-tiles.component'
import { KnowledgeArtifactDetailsComponent } from './components/knowledge-artifact-details/knowledge-artifact-details.component'
import { ProfileImageModule } from '../../../../../../../library/ws-widget/collection/src/lib/_common/profile-image/profile-image.module'
import { EditorService } from '../../../../../author/src/lib/routing/modules/editor/services/editor.service'
import { ApiService, AccessControlService, SharedModule } from '../../../../../author/src/public-api'
import { AppTocSinglePageComponent } from './components/app-toc-single-page/app-toc-single-page.component'
import { AppTocSinglePageComponent as AppTocSinglePageRootComponent } from './routes/app-toc-single-page/app-toc-single-page.component'
import { AppTocSinglePageDirective } from './routes/app-toc-single-page/app-toc-single-page.directive'
import { LicenseComponent } from './components/license/license.component'
import { AssessmentDetailComponent } from './components/assessment-detail/assessment-detail.component'
import { AppLearnerBannerComponent } from './components/app-learner-banner/app-learner-banner.component'
import { AppTocDesktopModalComponent } from './components/app-toc-desktop-modal/app-toc-desktop-modal.component'
import { AppTocCertificateModalComponent } from './components/app-toc-certificate-modal/app-toc-certificate-modal.component'
@NgModule({
  declarations: [
    AppTocAnalyticsComponent,
    AppTocContentsComponent,
    AppTocHomeComponent,
    AppTocOverviewComponent,
    AppTocBannerComponent,
    AppLearnerBannerComponent,
    AppTocCohortsComponent,
    AppTocContentCardComponent,
    AppTocDiscussionComponent,
    AppTocDialogIntroVideoComponent,
    AppTocOverviewDirective,
    AppTocOverviewRootComponent,
    AppTocHomeDirective,
    AppTocHomeRootComponent,
    AppTocCohortsDirective,
    AppTocCohortsRootComponent,
    KnowledgeArtifactDetailsComponent,
    AppTocAnalyticsTilesComponent,
    AppTocSinglePageComponent,
    AppTocSinglePageRootComponent,
    AppTocSinglePageDirective,
    LicenseComponent,
    TimeDifferencePipe,
    MomentDatePipe,
    AssessmentDetailComponent,
    AppTocDesktopModalComponent,
    AppTocCertificateModalComponent,
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
    BtnGoalsModule,
    BtnContentShareModule,
    BtnContentLikeModule,
    // BtnContentFeedbackModule,
    BtnContentFeedbackV2Module,
    // BtnGoalsModule,
    BtnPlaylistModule,
    BtnMailUserModule,
    BtnPageBackModule,
    HorizontalScrollerModule,
    UserImageModule,
    DefaultThumbnailModule,
    WidgetResolverModule,
    ContentProgressModule,
    UserContentRatingModule,
    // BtnKbModule,
    AppTocCertificationModule,
    // MarkAsCompleteModule,
    // PlayerBriefModule,
    MatProgressSpinnerModule,
    CardContentModule,
    // BtnContentShareModule,
    UserAutocompleteModule,
    ProfileImageModule,
  ],
  providers: [
    AppTocResolverService,
    AppTocService,
    PipeContentRoutePipe,
    // TrainingApiService,
    // TrainingService,
    CertificationApiService,
    CertificationMetaResolver,
    ContentCertificationResolver,
    EditorService,
    ApiService,
    AccessControlService,
  ],
  exports: [AppTocDiscussionComponent, AssessmentDetailComponent],
  entryComponents: [
    AppTocDialogIntroVideoComponent,
    AppTocOverviewComponent,
    AppTocHomeComponent,
    AppTocSinglePageComponent,
    AppTocSinglePageRootComponent,
    AppTocDesktopModalComponent,
    AppTocCertificateModalComponent,
  ],
})
export class AppTocModule { }
