import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'

import { BadgesComponent } from './badges.component'


import { MatButtonModule } from '@angular/material/button'
import { MatCardModule } from '@angular/material/card'
import { MatIconModule } from '@angular/material/icon'
import { MatTabsModule } from '@angular/material/tabs'
import { MatToolbarModule } from '@angular/material/toolbar'
import { MatTooltipModule } from '@angular/material/tooltip'
import { MatProgressBarModule } from '@angular/material/progress-bar'
import { MatMenuModule } from '@angular/material/menu'
import { BadgesCardComponent } from './components/badges-card/badges-card.component'

import { BadgesShareDialogComponent } from './components/badges-share-dialog/badges-share-dialog.component'

import { BadgesNotEarnedComponent } from './components/badges-not-earned/badges-not-earned.component'

import { HorizontalScrollerModule, DefaultThumbnailModule } from '@ws-widget/utils'

import { BtnLinkedinShareModule } from '../../../../../../../../../library/ws-widget/collection/src/lib/btn-linkedin-share/btn-linkedin-share.module'

import { BtnFacebookShareModule } from '../../../../../../../../../library/ws-widget/collection/src/lib/btn-facebook-share/btn-facebook-share.module'

import { BtnTwitterShareModule } from '../../../../../../../../../library/ws-widget/collection/src/lib/btn-twitter-share/btn-twitter-share.module'


@NgModule({
  declarations: [BadgesComponent, BadgesCardComponent, BadgesNotEarnedComponent, BadgesShareDialogComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTabsModule,
    MatToolbarModule,
    MatTooltipModule,
    MatProgressBarModule,
    HorizontalScrollerModule,
    DefaultThumbnailModule,
    MatMenuModule,
    BtnLinkedinShareModule,
    BtnFacebookShareModule,
    BtnTwitterShareModule,
  ],
})
export class BadgesModule { }
