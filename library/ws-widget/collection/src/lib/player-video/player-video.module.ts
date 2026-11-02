import { NgModule } from '@angular/core'

import { CommonModule } from '@angular/common'
import { MatIconModule } from '@angular/material/icon'

import { PlayerVideoComponent } from './player-video.component'
import { VideoQuestionsReviewDialogComponent } from './video-questions-review-dialog.component'

@NgModule({
  declarations: [PlayerVideoComponent, VideoQuestionsReviewDialogComponent],
  imports: [CommonModule, MatIconModule],
  exports: [PlayerVideoComponent],
})
export class PlayerVideoModule {}
