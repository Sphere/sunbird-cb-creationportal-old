import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { RouterModule } from '@angular/router'

import { MatCardModule } from '@angular/material/card'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { MatSnackBarModule } from '@angular/material/snack-bar'
import {
  // BtnContentDownloadModule,
  // BtnContentFeedbackModule,
  BtnContentLikeModule,
  // BtnContentShareModule,
  // BtnGoalsModule,
  DisplayContentTypeModule,
  UserImageModule,
} from '@ws-widget/collection'

import { PipeDurationTransformModule, PipeLimitToModule, PipePartialContentModule } from '@ws-widget/utils'

import { WidgetResolverModule } from '@ws-widget/resolver'

import { YoutubeComponent } from './youtube.component'

import { YoutubeModule as YoutubeViewContainerModule } from '../../route-view-container/youtube/youtube.module'

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
    MatSnackBarModule,
    PipeDurationTransformModule,
    PipeLimitToModule,
    PipePartialContentModule,
    UserImageModule,
    WidgetResolverModule,
    YoutubeViewContainerModule,
  ],
})
export class YoutubeModule {}
