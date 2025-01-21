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
import { MatDialog } from '@angular/material/dialog'
import { interval, Subscription } from 'rxjs'
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

@Component({
  selector: 'ws-widget-player-video',
  templateUrl: './player-video.component.html',
  styleUrls: ['./player-video.component.scss'],
})
export class PlayerVideoComponent extends WidgetBaseComponent
  implements
  OnInit,
  AfterViewInit,
  OnDestroy,
  NsWidgetResolver.IWidgetData<IWidgetsPlayerMediaData> {
  @Input() widgetData!: any
  @ViewChild('videoTag', { static: false }) videoTag!: ElementRef<HTMLVideoElement>
  @ViewChild('realvideoTag', { static: false }) realvideoTag!: ElementRef<HTMLVideoElement>
  private player: videoJs.Player | null = null
  private dispose: (() => void) | null = null
  contentData: any
  popupShown = false;
  progressData: any
  videoQuestions!: {
    timestamp: { hours: 0, minutes: 0, seconds: 0 },
    timestampInSeconds: 0,
    question: [ // Ensure 'question' is used here
      {
        text: '',
        options: [{ text: '', optionId: '', isCorrect: false, answerInfo: '' }]
      }
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
  videoStates: { [videoId: string]: { popupTriggered: any, currentMilestone: any } } = {};

  constructor(
    private eventSvc: EventService,
    private contentSvc: WidgetContentService,
    private activatedRoute: ActivatedRoute,
    public viewerDataSvc: ViewerDataService,
    private dialog: MatDialog
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

  ngOnInit() { console.log("videoDatas", this.widgetData, this.contentData) }


  async ngAfterViewInit() {
    console.log("Initial resume point:", this.widgetData.resumePoint)
    this.widgetData = {
      ...this.widgetData,
    }
    // if (this.widgetData && this.widgetData.identifier && !this.widgetData.url) {
    await this.fetchContent()
    console.log("this.widgetData.videoQuestions", this.widgetData)
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
    const player = videoJs(videoElement, {
      ...videoJsOptions,
      poster: this.widgetData.posterImage,
      autoplay: this.widgetData.autoplay || false,
    })

    const videoId = videoElement.id
    this.videoStates[videoId] = {
      popupTriggered: new Set<number>(), // Track triggered milestones
      currentMilestone: null,
    }

    // Handle play event
    player.on(this.videojsEventNames.play, () => {
      const intervalId = interval(1000).subscribe(() => {
        const currentTimeInSeconds = Math.round(player.currentTime())
        if (this.widgetData.videoQuestions && this.widgetData.videoQuestions.length > 0) {
          for (const milestone of this.widgetData.videoQuestions) {
            // Check if popup has already been triggered for this milestone
            if (
              currentTimeInSeconds === milestone.timestampInSeconds &&
              !this.videoStates[videoId].popupTriggered.has(milestone.timestampInSeconds)
            ) {
              player.pause()
              console.log("Popup triggered for milestone:", milestone.timestampInSeconds)
              this.videoStates[videoId].popupTriggered.add(milestone.timestampInSeconds)
              this.videoStates[videoId].currentMilestone = milestone.timestampInSeconds
              this.openPopup(milestone.question, player, intervalId)
              return // Exit loop after triggering popup
            }
          }
        }
      })
    })

    // Handle timeupdate for user seeking
    player.on('timeupdate', () => {
      const currentTimeInSeconds = Math.round(player.currentTime())
      if (this.widgetData.videoQuestions) {
        for (const milestone of this.widgetData.videoQuestions) {
          // Reset popupTriggered if user seeks before the milestone
          if (currentTimeInSeconds < milestone.timestampInSeconds) {
            this.videoStates[videoId].popupTriggered.delete(milestone.timestampInSeconds)
          }
        }
      }
    })
  }

  openPopup(questions: any, videoElement: any, intervalId: Subscription): void {
    const confirmdialog = this.dialog.open(PlayerVideoPopupComponent, {
      width: '600px',
      data: { questions },
    })

    if (confirmdialog) {
      confirmdialog.afterClosed().subscribe(() => {
        console.log("Popup closed")
        this.dialog.closeAll()
        videoElement.play()
        intervalId.unsubscribe() // Stop the current interval
        this.addTimeUpdateListener(videoElement) // Resume the listener if needed
      })
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
    console.log("initializeVPlayer")
    const dispatcher: telemetryEventDispatcherFunction = event => {
      if (this.widgetData.identifier) {
        this.eventSvc.dispatchEvent(event)
      }
    }
    const saveCLearning: saveContinueLearningFunction = data => {
      if (this.widgetData.identifier) {
        if (this.activatedRoute.snapshot.queryParams.collectionType &&
          this.activatedRoute.snapshot.queryParams.collectionType.toLowerCase() === 'playlist') {
          const continueLearningData = {
            contextPathId: this.activatedRoute.snapshot.queryParams.collectionId ?
              this.activatedRoute.snapshot.queryParams.collectionId : this.widgetData.identifier,
            resourceId: data.resourceId,
            contextType: 'playlist',
            dateAccessed: Date.now(),
            data: JSON.stringify({
              progress: data.progress,
              timestamp: Date.now(),
              contextFullPath: [this.activatedRoute.snapshot.queryParams.collectionId, data.resourceId],
            }),
          }
          this.contentSvc
            .saveContinueLearning(continueLearningData)
            .toPromise()
            .catch()
        } else {
          const continueLearningData = {
            contextPathId: this.activatedRoute.snapshot.queryParams.collectionId ?
              this.activatedRoute.snapshot.queryParams.collectionId : this.widgetData.identifier,
            ...data,
            // resourceId: data.resourceId,
            // dateAccessed: Date.now(),
            // data: data.data,
          }
          // JSON.stringify({
          //   progress: data.progress,
          //   timestamp: Date.now(),
          // }),
          this.contentSvc
            .saveContinueLearning(continueLearningData)
            .toPromise()
            .catch()
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
    if (!this.widgetData.disableTelemetry && typeof (this.widgetData.disableTelemetry) !== 'undefined') {
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
        if (this.activatedRoute.snapshot.queryParams.collectionType &&
          this.activatedRoute.snapshot.queryParams.collectionType.toLowerCase() === 'playlist') {
          const continueLearningData = {
            contextPathId: this.activatedRoute.snapshot.queryParams.collectionId ?
              this.activatedRoute.snapshot.queryParams.collectionId : this.widgetData.identifier,
            resourceId: data.resourceId,
            contextType: 'playlist',
            dateAccessed: Date.now(),
            data: JSON.stringify({
              progress: data.progress,
              timestamp: Date.now(),
              contextFullPath: [this.activatedRoute.snapshot.queryParams.collectionId, data.resourceId],
            }),
          }
          this.contentSvc
            .saveContinueLearning(continueLearningData)
            .toPromise()
            .catch()
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
          this.contentSvc
            .saveContinueLearning(continueLearningData)
            .toPromise()
            .catch()
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
    if (!this.widgetData.disableTelemetry && typeof (this.widgetData.disableTelemetry) !== 'undefined') {
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
    const content = await this.contentSvc
      .readcontentV3(this.widgetData.identifier)
      .toPromise()

    console.log("content", content)
    if (content && content.videoQuestions)
      this.widgetData.videoQuestions = content.videoQuestions ? JSON.parse(content.videoQuestions) : []
    console.log("this.widgetData.videoQuestions", this.widgetData.videoQuestions)
    if (content.artifactUrl && content.artifactUrl.indexOf('/content-store/') > -1) {
      this.widgetData.url = content.artifactUrl
      this.widgetData.posterImage = content.appIcon
      // await this.contentSvc.setS3Cookie(this.widgetData.identifier || '').toPromise()
    }
  }
}

