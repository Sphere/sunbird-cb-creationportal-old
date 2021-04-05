import {
  AfterViewInit,
  Component,
  HostBinding,
  Input,
  // OnChanges,
  OnDestroy,
  OnInit,
} from '@angular/core'
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'
import { NsWidgetResolver, WidgetBaseComponent } from '@ws-widget/resolver'
/* tslint:disable */
import _ from 'lodash'
/* tslint:enable */
@Component({
  selector: 'ws-auth-comp-draft',
  templateUrl: './comp-draft.component.html',
  styleUrls: ['./comp-draft.component.scss'],
})
export class CompDraftComponent extends WidgetBaseComponent
  implements OnInit, OnDestroy, AfterViewInit, NsWidgetResolver.IWidgetData<any> {
  @Input() widgetData!: any
  @HostBinding('id')
  public id = `ws-card_${Math.random()}`
  @HostBinding('class') class = 'flex-1'
  introVideo: SafeResourceUrl | null = null
  guideVideo: SafeResourceUrl | null = null
  constructor(
    // private events: EventService,
    // private configSvc: ConfigurationsService,
    // private utilitySvc: UtilityService,
    // private snackBar: MatSnackBar,
    private domSanitizer: DomSanitizer,

  ) {
    super()

  }
  ngOnDestroy(): void {
    // throw new Error('Method not implemented.')
  }

  ngOnInit() {
    if (this.widgetData) {

    }
    // if (this.aboutPage && this.aboutPage.banner && this.aboutPage.banner.videoLink) {
    this.introVideo = this.domSanitizer.bypassSecurityTrustResourceUrl(
      '/assets/videos/intro.mp4'
    )
    this.guideVideo = this.domSanitizer.bypassSecurityTrustResourceUrl(
      '/assets/videos/guide.mp4'
    )
    // }

  }
  changeToDefaultImg($event: any) {
    $event.target.src = '/assets/instances/eagle/app_logos/default.png'
  }
  // ngOnChanges(data: any) {
  // }

  ngAfterViewInit() {
    // this.cd.detectChanges();
  }

}
