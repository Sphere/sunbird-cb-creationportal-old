import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core'

import { ActivatedRoute } from '@angular/router'

import { NsWidgetResolver, WidgetBaseComponent } from '@ws-widget/resolver'

import { EventService } from '@ws-widget/utils'

import videoJs from 'video.js'

import { ROOT_WIDGET_CONFIG } from '../collection.config'

import { IWidgetsPlayerMediaData } from '../_models/player-media.model'

import {
  fireRealTimeProgressFunction,
  saveContinueLearningFunction,
  telemetryEventDispatcherFunction,
  videoInitializer,
  videoJsInitializer,
} from '../_services/videojs-util'

import { WidgetContentService } from '../_services/widget-content.service'

import { ViewerDataService } from 'project/ws/viewer/src/lib/viewer-data.service'

import { PlayerVideoPopupComponent } from '../player-video-popup/player-video-popup-component'
import { VideoQuestionsReviewDialogComponent } from './video-questions-review-dialog.component'

import { MatDialog } from '@angular/material/dialog'

import 'videojs-markers'

const videoJsOptions: videoJs.PlayerOptions = {
  controls: true,
  autoplay: false,
  preload: 'auto',
  fluid: false,
  techOrder: ['html5'],
  playbackRates: [0.75, 0.85, 1, 1.25, 2, 3],
  poster: '',
  html5: {
    hls: {
      overrideNative: true,
    },
    nativeVideoTracks: false,
    nativeAudioTracks: false,
    nativeTextTracks: false,
  },
  nativeControlsForTouch: false,
}

/**
 * `videoQuestions` arrives as a JSON string from the legacy platform but as the saved
 * array from Sunbird Spark, which has no schema entry for it. `JSON.parse` on an array
 * stringifies it first, so `[]` became "" and threw "Unexpected end of JSON input".
 */
export function parseVideoQuestions(raw: unknown): any[] {
  if (Array.isArray(raw)) {
    return raw
  }
  if (typeof raw !== 'string' || raw.trim() === '') {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

@Component({
  standalone: false,
  selector: 'ws-widget-player-video',
  templateUrl: './player-video.component.html',
  styleUrls: ['./player-video.component.scss'],
})
export class PlayerVideoComponent
  extends WidgetBaseComponent
  implements OnInit, AfterViewInit, OnDestroy, NsWidgetResolver.IWidgetData<IWidgetsPlayerMediaData>
{
  @Input() widgetData!: any
  @ViewChild('videoTag', { static: false }) videoTag!: ElementRef<HTMLVideoElement>
  @ViewChild('realvideoTag', { static: false }) realvideoTag!: ElementRef<HTMLVideoElement>
  private player: videoJs.Player | null = null
  private dispose: (() => void) | null = null
  contentData: any
  popupShown = false
  progressData: any
  videoQuestions!: {
    timestamp: { hours: 0; minutes: 0; seconds: 0 }
    timestampInSeconds: 0
    question: [
      // Ensure 'question' is used here
      {
        text: ''
        options: [{ text: ''; optionId: ''; isCorrect: false; answerInfo: '' }]
      },
    ]
  }
  videojsEventNames = {
    disposing: 'disposing',
    ended: 'ended',
    exitfullscreen: 'exitfullscreen',
    fullscreen: 'fullscreen',
    mute: 'mute',
    pause: 'pause',
    play: 'play',
    ready: 'ready',
    seeked: 'seeked',
    unmute: 'unmute',
    volumechange: 'volumechange',
    loadeddata: 'loadeddata',
  }
  videoStates: {
    [videoId: string]: { popupTriggered: Set<number>; currentMilestone: number | null; lastTime: number; popupOpen: boolean }
  } = {}

  constructor(
    private eventSvc: EventService,
    private contentSvc: WidgetContentService,
    private activatedRoute: ActivatedRoute,
    public viewerDataSvc: ViewerDataService,
    private dialog: MatDialog,
  ) {
    super()
    // console.log(window.innerWidth)
    // if (window.innerWidth < 768) {
    //   screen.orientation.lock('landscape');
    //   //this.isMobileResolution = true;
    // } else {
    //   //this.isMobileResolution = false;
    // }
  }

  ngOnInit() {
    console.log('videoDatas', this.widgetData, this.contentData)
  }

  ngAfterViewInit(): void {
    // Angular does not await lifecycle hooks; run the async work
    // fire-and-forget, exactly as `async ngAfterViewInit()` already did.
    void this.afterViewInitAsync()
  }

  private async afterViewInitAsync(): Promise<void> {
    console.log('Initial resume point:', this.widgetData.resumePoint)
    this.widgetData = {
      ...this.widgetData,
    }
    // if (this.widgetData && this.widgetData.identifier && !this.widgetData.url) {
    await this.fetchContent()
    console.log('this.widgetData.videoQuestions', this.widgetData)
    //enable below code to show popup questions
    if (this.videoTag) {
      this.addTimeUpdateListener(this.videoTag.nativeElement)
    }
    if (this.realvideoTag) {
      this.addTimeUpdateListener(this.realvideoTag.nativeElement)
    }

    if (this.widgetData.url) {
      if (this.widgetData.isVideojs) {
        this.initializePlayer()
      } else {
        this.initializeVPlayer()
      }
    }
  }

  addTimeUpdateListener(videoElement: HTMLVideoElement): void {
    const videoId = videoElement.id
    if (this.videoStates[videoId]) {
      return // Already listening; a second registration would fire every question twice.
    }
    const player = videoJs(videoElement, {
      ...videoJsOptions,
      poster: this.widgetData.posterImage,
      autoplay: this.widgetData.autoplay || false,
    })

    this.questionPlayer = player
    this.questionVideoId = videoId
    const state = (this.videoStates[videoId] = {
      popupTriggered: new Set<number>(), // Milestones already shown in this pass
      currentMilestone: null as number | null,
      lastTime: 0,
      popupOpen: false as boolean,
    })

    // A question fires when playback CROSSES its timestamp (previous tick < t <= this tick).
    // The old check polled every 500ms for an exact rounded second, so at 2x/3x speed the
    // poll often stepped over it; each play also started an interval that was never stopped.
    player.on('timeupdate', () => {
      const now = player.currentTime()
      const previous = state.lastTime
      state.lastTime = now
      const milestones = this.widgetData.videoQuestions
      if (!Array.isArray(milestones) || milestones.length === 0) {
        return
      }
      for (const milestone of milestones) {
        // Seeking back before a question shows it again on the next pass.
        if (now < Number(milestone.timestampInSeconds)) {
          state.popupTriggered.delete(Number(milestone.timestampInSeconds))
        }
      }
      // A jump of more than a few seconds is a seek, not playback: don't fire on it.
      const isPlayback = now >= previous && now - previous <= PlayerVideoComponent.MAX_PLAYBACK_STEP
      if (state.popupOpen || !isPlayback) {
        return
      }
      const due = milestones.find(milestone => {
        const at = Number(milestone.timestampInSeconds)
        return at > previous && at <= now && !state.popupTriggered.has(at) && this.hasQuestions(milestone)
      })
      if (due) {
        const at = Number(due.timestampInSeconds)
        player.pause()
        state.popupTriggered.add(at)
        state.currentMilestone = at
        state.popupOpen = true
        this.openPopup(due.question, player, videoId)
      }
    })
  }

  /** Largest gap between two timeupdate ticks that still counts as playback (3x speed ~1s). */
  private static readonly MAX_PLAYBACK_STEP = 3

  private hasQuestions(milestone: any): boolean {
    return Array.isArray(milestone && milestone.question) && milestone.question.length > 0
  }

  /** The player the question listener is attached to, used by Jump to. */
  private questionPlayer: any = null
  private questionVideoId: string | null = null

  /** Milestones that actually hold questions; drives the reviewer button. */
  get questionMilestones(): any[] {
    const all = this.widgetData && this.widgetData.videoQuestions
    return Array.isArray(all) ? all.filter(m => this.hasQuestions(m)) : []
  }

  get questionCount(): number {
    return this.questionMilestones.reduce((n, m) => n + m.question.length, 0)
  }

  /** Lets creators, reviewers and publishers see every question, its answer and hints. */
  openQuestionsReview(): void {
    if (this.questionPlayer) {
      this.questionPlayer.pause()
    }
    const ref = this.dialog.open(VideoQuestionsReviewDialogComponent, {
      width: '720px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: 'first-tabbable',
      ariaLabelledBy: 'vqr-title',
      data: { milestones: this.questionMilestones },
    })
    if (ref) {
      ref.afterClosed().subscribe(result => {
        if (result && typeof result.jumpTo === 'number') {
          this.jumpToQuestion(result.jumpTo)
        }
      })
    }
  }

  /**
   * Seeks a couple of seconds before a question and plays, so the reviewer sees the popup
   * fire exactly as a learner would.
   */
  jumpToQuestion(seconds: number): void {
    const player = this.questionPlayer
    if (!player) {
      return
    }
    const target = Math.max(0, seconds - PlayerVideoComponent.JUMP_LEAD_IN)
    const state = this.questionVideoId ? this.videoStates[this.questionVideoId] : undefined
    if (state) {
      state.popupTriggered.forEach(at => at >= target && state.popupTriggered.delete(at))
      state.lastTime = target
      state.popupOpen = false
    }
    player.currentTime(target)
    player.play()
  }

  private static readonly JUMP_LEAD_IN = 2

  openPopup(questions: any, player: any, videoId?: string): void {
    const confirmdialog = this.dialog.open(PlayerVideoPopupComponent, {
      width: '640px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: 'first-tabbable',
      panelClass: 'video-question-dialog',
      ariaLabelledBy: 'vq-title',
      data: { questions },
    })

    const resume = () => {
      if (videoId && this.videoStates[videoId]) {
        this.videoStates[videoId].popupOpen = false
      }
      player.play()
    }
    if (confirmdialog) {
      confirmdialog.afterClosed().subscribe(resume)
    } else {
      resume()
    }
  }

  ngOnDestroy() {
    if (this.player) {
      this.player.dispose()
    }
    if (this.dispose) {
      this.dispose()
    }
  }
  private initializeVPlayer() {
    console.log('initializeVPlayer')
    const dispatcher: telemetryEventDispatcherFunction = event => {
      if (this.widgetData.identifier) {
        this.eventSvc.dispatchEvent(event)
      }
    }
    const saveCLearning: saveContinueLearningFunction = data => {
      if (this.widgetData.identifier) {
        if (
          this.activatedRoute.snapshot.queryParams.collectionType &&
          this.activatedRoute.snapshot.queryParams.collectionType.toLowerCase() === 'playlist'
        ) {
          const continueLearningData = {
            contextPathId: this.activatedRoute.snapshot.queryParams.collectionId
              ? this.activatedRoute.snapshot.queryParams.collectionId
              : this.widgetData.identifier,
            resourceId: data.resourceId,
            contextType: 'playlist',
            dateAccessed: Date.now(),
            data: JSON.stringify({
              progress: data.progress,
              timestamp: Date.now(),
              contextFullPath: [this.activatedRoute.snapshot.queryParams.collectionId, data.resourceId],
            }),
          }
          this.contentSvc.saveContinueLearning(continueLearningData).toPromise().catch()
        } else {
          const continueLearningData = {
            contextPathId: this.activatedRoute.snapshot.queryParams.collectionId
              ? this.activatedRoute.snapshot.queryParams.collectionId
              : this.widgetData.identifier,
            ...data,
            // resourceId: data.resourceId,
            // dateAccessed: Date.now(),
            // data: data.data,
          }
          // JSON.stringify({
          //   progress: data.progress,
          //   timestamp: Date.now(),
          // }),
          this.contentSvc.saveContinueLearning(continueLearningData).toPromise().catch()
        }
      }
    }
    const fireRProgress: fireRealTimeProgressFunction = (identifier, data) => {
      if (identifier && data && this.widgetData.identifier) {
        // this.viewerSvc
        //   .realTimeProgressUpdate(identifier, data)
      }
    }
    if (this.widgetData.resumePoint && this.widgetData.resumePoint !== 0) {
      this.realvideoTag.nativeElement.currentTime = this.widgetData.resumePoint
    }
    let enableTelemetry = false
    if (!this.widgetData.disableTelemetry && typeof this.widgetData.disableTelemetry !== 'undefined') {
      enableTelemetry = true
    }
    this.dispose = videoInitializer(
      this.realvideoTag.nativeElement,
      dispatcher,
      saveCLearning,
      fireRProgress,
      this.widgetData.passThroughData,
      ROOT_WIDGET_CONFIG.player.video,
      enableTelemetry,
      this.widgetData,
      this.widgetData.mimeType,
    ).dispose
  }

  private initializePlayer() {
    const dispatcher: telemetryEventDispatcherFunction = event => {
      if (this.widgetData.identifier) {
        this.eventSvc.dispatchEvent(event)
      }
    }
    const saveCLearning: saveContinueLearningFunction = data => {
      if (this.widgetData.identifier) {
        if (
          this.activatedRoute.snapshot.queryParams.collectionType &&
          this.activatedRoute.snapshot.queryParams.collectionType.toLowerCase() === 'playlist'
        ) {
          const continueLearningData = {
            contextPathId: this.activatedRoute.snapshot.queryParams.collectionId
              ? this.activatedRoute.snapshot.queryParams.collectionId
              : this.widgetData.identifier,
            resourceId: data.resourceId,
            contextType: 'playlist',
            dateAccessed: Date.now(),
            data: JSON.stringify({
              progress: data.progress,
              timestamp: Date.now(),
              contextFullPath: [this.activatedRoute.snapshot.queryParams.collectionId, data.resourceId],
            }),
          }
          this.contentSvc.saveContinueLearning(continueLearningData).toPromise().catch()
        } else {
          const continueLearningData = {
            contextPathId: this.activatedRoute.snapshot.queryParams.collectionId
              ? this.activatedRoute.snapshot.queryParams.collectionId
              : this.widgetData.identifier,
            ...data,
            // resourceId: data.resourceId,
            // dateAccessed: Date.now(),
            // data: JSON.stringify({
            //   progress: data.progress,
            //   timestamp: Date.now(),
            // }),
          }
          this.contentSvc.saveContinueLearning(continueLearningData).toPromise().catch()
        }
      }
    }
    const fireRProgress: fireRealTimeProgressFunction = (identifier, data) => {
      if (identifier && data && this.widgetData.identifier) {
        // this.viewerSvc
        //   .realTimeProgressUpdate(identifier, data)
      }
    }
    let enableTelemetry = false
    if (!this.widgetData.disableTelemetry && typeof this.widgetData.disableTelemetry !== 'undefined') {
      enableTelemetry = true
    }
    const initObj = videoJsInitializer(
      this.videoTag.nativeElement,
      {
        ...videoJsOptions,
        poster: this.widgetData.posterImage,
        autoplay: this.widgetData.autoplay || false,
      },
      dispatcher,
      saveCLearning,
      fireRProgress,
      this.widgetData.passThroughData,
      ROOT_WIDGET_CONFIG.player.video,
      this.widgetData.resumePoint ? this.widgetData.resumePoint : 0,
      enableTelemetry,
      this.widgetData,
      this.widgetData.mimeType,
    )
    this.player = initObj.player
    this.dispose = initObj.dispose
    initObj.player.ready(() => {
      if (Array.isArray(this.widgetData.subtitles)) {
        this.widgetData.subtitles.forEach((u: any, index: any) => {
          initObj.player.addRemoteTextTrack(
            {
              default: index === 0,
              kind: 'captions',
              label: u.label,
              srclang: u.srclang,
              src: u.url,
            },
            false,
          )
        })
      }
      if (this.widgetData.url) {
        initObj.player.src(this.widgetData.url)
      }
    })
  }

  async fetchContent() {
    const content = await this.contentSvc.readcontentV3(this.widgetData.identifier).toPromise()

    console.log('content', content)
    if (content && content.videoQuestions) this.widgetData.videoQuestions = parseVideoQuestions(content.videoQuestions)
    console.log('this.widgetData.videoQuestions', this.widgetData.videoQuestions)
    if (content.artifactUrl && content.artifactUrl.indexOf('/content-store/') > -1) {
      this.widgetData.url = content.artifactUrl
      this.widgetData.posterImage = content.appIcon
      // await this.contentSvc.setS3Cookie(this.widgetData.identifier || '').toPromise()
    }
  }
}
