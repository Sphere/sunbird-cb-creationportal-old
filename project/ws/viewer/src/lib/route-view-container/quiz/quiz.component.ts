import { Component, Input, OnInit } from '@angular/core'
import { NsContent } from '@ws-widget/collection'
import { NSQuiz } from '../../plugins/quiz/quiz.model'
import { ActivatedRoute } from '@angular/router'
import { PlayerStateService } from '../../player-state.service'

@Component({
  selector: 'viewer-quiz-container',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss'],
})
export class QuizComponent implements OnInit {
  @Input() isFetchingDataComplete = false
  @Input() isErrorOccured = false
  @Input() quizData: NsContent.IContent | null = null
  @Input() forPreview = false
  @Input() quizJson: NSQuiz.IQuiz = {
    timeLimit: 0,
    questions: [],
    isAssessment: false,
  }
  @Input() isPreviewMode = false
  isTypeOfCollection = false
  collectionId: string | null = null
  viewerDataServiceSubscription: any
  prevResourceUrl: string | null = null
  nextResourceUrl: string | null = null

  constructor(private activatedRoute: ActivatedRoute,
    private viewerDataSvc: PlayerStateService) { }

  ngOnInit() {
    this.isTypeOfCollection = this.activatedRoute.snapshot.queryParams.collectionType ? true : false
    if (this.isTypeOfCollection) {
      this.collectionId = this.activatedRoute.snapshot.queryParams.collectionId
    }

    this.viewerDataServiceSubscription = this.viewerDataSvc.playerState.subscribe(data => {
      this.prevResourceUrl = data.prevResource
      this.nextResourceUrl = data.nextResource
    })

  }
}
