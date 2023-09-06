import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'

import {
  MatCardModule,
  MatSidenavModule,
  MatToolbarModule,
  MatIconModule,
  MatButtonModule,
  MatDividerModule,
  MatSlideToggleModule,
  MatListModule,
  MatTreeModule,
  MatProgressSpinnerModule,
  MatSnackBarModule,
  MatTabsModule,
  MatCheckboxModule,
  MatProgressBarModule,
  MatRadioModule,
  MatTableModule
} from '@angular/material'

import { ViewerRoutingModule } from './viewer-routing.module'

import {
  PipeDurationTransformModule,
  PipeLimitToModule,
  DefaultThumbnailModule,
  PipePartialContentModule,
} from '@ws-widget/utils'

import {
  ErrorResolverModule,
  BtnPageBackModule,
  BtnFullscreenModule,
  DisplayContentTypeModule,
  // BtnContentDownloadModule,
  BtnContentLikeModule,
  // BtnContentShareModule,
  // BtnGoalsModule,
  BtnPlaylistModule,
  // BtnContentFeedbackModule,
  DisplayContentTypeIconModule,
  BtnContentFeedbackV2Module,
  // PlayerBriefModule,
} from '@ws-widget/collection'

import { WidgetResolverModule } from '@ws-widget/resolver'
import { ViewerComponent } from './viewer.component'
import { ViewerTocComponent } from './components/viewer-toc/viewer-toc.component'
import { ViewerTopBarModule } from './components/viewer-top-bar/viewer-top-bar.module'
import { ReviewDialogComponent } from './components/review-checklist/review-dialog.component'
import { MatDialogModule } from '@angular/material/dialog'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'

@NgModule({
  declarations: [ViewerComponent, ViewerTocComponent, ReviewDialogComponent],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatCardModule,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatListModule,
    MatTreeModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    ViewerRoutingModule,
    ErrorResolverModule,
    PipeDurationTransformModule,
    PipeLimitToModule,
    DefaultThumbnailModule,
    BtnPageBackModule,
    BtnFullscreenModule,
    WidgetResolverModule,
    DisplayContentTypeModule,
    // BtnContentDownloadModule,
    BtnContentLikeModule,
    // BtnContentShareModule,
    // BtnGoalsModule,
    BtnPlaylistModule,
    // BtnContentFeedbackModule,
    BtnContentFeedbackV2Module,
    DisplayContentTypeIconModule,
    PipePartialContentModule,
    MatTabsModule,
    // PlayerBriefModule,
    ViewerTopBarModule,
    MatCheckboxModule,
    MatDialogModule,
    MatProgressBarModule,
    MatRadioModule,
    MatTableModule
  ],
  entryComponents: [
    ReviewDialogComponent
  ],
})
export class ViewerModule { }
