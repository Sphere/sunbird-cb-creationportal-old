import { Component, Input, OnInit } from '@angular/core'
import { NsContent, IWidgetsPlayerMediaData, NsDiscussionForum } from '@ws-widget/collection'
import { NsWidgetResolver } from '@ws-widget/resolver'
import { ActivatedRoute } from '@angular/router'
import { ConfigurationsService } from '../../../../../../../library/ws-widget/utils/src/public-api'
import { PlayerStateService } from '../../player-state.service'
@Component({
  selector: 'viewer-audio-container',
  templateUrl: './audio.component.html',
  styleUrls: ['./audio.component.scss'],
})
export class AudioComponent implements OnInit {
  @Input() isScreenSizeSmall = false
  @Input() isFetchingDataComplete = false
  @Input() isNotEmbed = true
  @Input() audioData: NsContent.IContent | null = null
  @Input() widgetResolverAudioData: NsWidgetResolver.IRenderConfigWithTypedData<
    IWidgetsPlayerMediaData
  > | null = null
  @Input() discussionForumWidget: NsWidgetResolver.IRenderConfigWithTypedData<
    NsDiscussionForum.IDiscussionForumInput
  > | null = null
  @Input() isPreviewMode = false
  @Input() forPreview = false
  isTypeOfCollection = false
  isRestricted = false
  viewerDataServiceSubscription: any
  prevResourceUrl: string | null = null
  nextResourceUrl: string | null = null

  constructor(private activatedRoute: ActivatedRoute, private configSvc: ConfigurationsService,
    private viewerDataSvc: PlayerStateService) { }

  ngOnInit() {
    if (this.configSvc.restrictedFeatures) {
      this.isRestricted =
        !this.configSvc.restrictedFeatures.has('disscussionForum')
    }
    this.isTypeOfCollection = this.activatedRoute.snapshot.queryParams.collectionType ? true : false

    this.viewerDataServiceSubscription = this.viewerDataSvc.playerState.subscribe(data => {
      this.prevResourceUrl = data.prevResource
      this.nextResourceUrl = data.nextResource
    })
  }
}
