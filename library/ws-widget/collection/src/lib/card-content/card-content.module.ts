import { CommonModule } from '@angular/common'

import { NgModule } from '@angular/core'

import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatChipsModule } from '@angular/material/chips'
import { MatDividerModule } from '@angular/material/divider'
import { MatIconModule } from '@angular/material/icon'
import { MatMenuModule } from '@angular/material/menu'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatExpansionModule } from '@angular/material/expansion'
import { RouterModule } from '@angular/router'

import {
  DefaultThumbnailModule,
  PipeCountTransformModule,
  PipeDurationTransformModule,
  PipeHtmlTagRemovalModule,
  PipePartialContentModule,
} from '@ws-widget/utils'

import { BtnChannelAnalyticsModule } from '../btn-channel-analytics/btn-channel-analytics.module'

// import { BtnContentDownloadModule } from '../btn-content-download/btn-content-download.module'

import { BtnContentFeedbackV2Module } from '../btn-content-feedback-v2/btn-content-feedback-v2.module'

import { BtnContentLikeModule } from '../btn-content-like/btn-content-like.module'

import { BtnContentMailMeModule } from '../btn-content-mail-me/btn-content-mail-me.module'

// import { BtnContentShareModule } from '../btn-content-share/btn-content-share.module'

// import { BtnGoalsModule } from '../btn-goals/btn-goals.module'

// import { BtnKbModule } from '../btn-kb/btn-kb.module'

import { BtnPlaylistModule } from '../btn-playlist/btn-playlist.module'

import { ContentProgressModule } from '../_common/content-progress/content-progress.module'

import { DisplayContentTypeModule } from '../_common/display-content-type/display-content-type.module'

import { PipeContentRouteModule } from '../_common/pipe-content-route/pipe-content-route.module'

import { ProfileImageModule } from '../_common/profile-image/profile-image.module'

import { UserImageModule } from '../_common/user-image/user-image.module'

import { CardContentComponent } from './card-content.component'

@NgModule({
  declarations: [CardContentComponent],
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule,
    MatTooltipModule,
    MatMenuModule,
    MatChipsModule,
    MatDividerModule,
    DefaultThumbnailModule,
    DisplayContentTypeModule,
    PipeDurationTransformModule,
    PipePartialContentModule,
    PipeContentRouteModule,
    PipeCountTransformModule,
    PipeHtmlTagRemovalModule,
    ContentProgressModule,
    // BtnKbModule,
    // BtnContentDownloadModule,
    BtnContentLikeModule,
    // BtnContentShareModule,
    // BtnGoalsModule,
    BtnPlaylistModule,
    BtnContentMailMeModule,
    UserImageModule,
    BtnChannelAnalyticsModule,
    ProfileImageModule,
    BtnContentFeedbackV2Module,
  ],
  exports: [CardContentComponent],
})
export class CardContentModule {}
