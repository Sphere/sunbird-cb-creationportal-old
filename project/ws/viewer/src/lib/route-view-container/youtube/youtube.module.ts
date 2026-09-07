import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { RouterModule } from '@angular/router'

import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import { MatChipsModule } from '@angular/material/chips'
import { MatButtonModule } from '@angular/material/button'
import {
  // BtnContentDownloadModule,
  // BtnContentFeedbackModule,
  BtnContentLikeModule,
  // BtnContentShareModule,
  // BtnGoalsModule,
  DisplayContentTypeModule,
  UserImageModule,
  // PlayerBriefModule,
} from '@ws-widget/collection'

import { PipeDurationTransformModule, PipeLimitToModule, PipePartialContentModule } from '@ws-widget/utils'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { YoutubeComponent } from './youtube.component'

@NgModule({
  declarations: [YoutubeComponent],
  imports: [
    RouterModule,
    // BtnContentDownloadModule,
    // BtnContentFeedbackModule,
    BtnContentLikeModule,
    // BtnContentShareModule,
    // BtnGoalsModule,
    CommonModule,
    DisplayContentTypeModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatChipsModule,
    MatButtonModule,
    MatSnackBarModule,
    PipeDurationTransformModule,
    PipeLimitToModule,
    PipePartialContentModule,
    UserImageModule,
    WidgetResolverModule,
    // PlayerBriefModule,
  ],
  exports: [YoutubeComponent],
})
export class YoutubeModule {}
