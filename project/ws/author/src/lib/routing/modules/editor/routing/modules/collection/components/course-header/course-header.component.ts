
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core'
import { ConfigurationsService, NsPage } from '@ws-widget/utils/src/public-api'
import { SafeUrl, DomSanitizer } from '@angular/platform-browser'
import { HeaderServiceService } from './../../../../../../../../../../../../../src/app/services/header-service.service'
import { IActionButtonConfig, IActionButton } from '@ws/author/src/lib/interface/action-button'
import { CollectionStoreService } from '../../services/store.service'
import { AuthInitService } from '@ws/author/src/lib/services/init.service'
import { Subscription } from 'rxjs'

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'ws-author-course-header',
  templateUrl: './course-header.component.html',
  styleUrls: ['./course-header.component.scss'],
})
export class CourseHeaderComponent implements OnInit {
  appIcon: SafeUrl | null = null
  courseNameHeader: any
  primaryNavbarBackground: Partial<NsPage.INavBackground> | null = null
  @Input() buttonConfig: IActionButtonConfig | null = null
  @Output() action = new EventEmitter<string>()
  @Output() subAction = new EventEmitter<{ type: string; identifier: string; nodeClicked?: boolean }>()
  @Input() isModelHeaderView: boolean = false;
  @Input() backToDashboard: boolean = false;
  @Input() clickedNext: boolean = false;


  activeSubscription?: Subscription
  isEditMetaPage: boolean = false;
  requiredConfig: IActionButton[] = []
  backNav: boolean = false
  constructor(private configSvc: ConfigurationsService, private domSanitizer: DomSanitizer,
    private headerService: HeaderServiceService,
    private initService: AuthInitService,
    private store: CollectionStoreService) {
    this.headerService.showCourseHeader.subscribe(data => {
      this.courseNameHeader = data
    })
    if (sessionStorage.getItem('isSettingsPageFromPreview')) {
      sessionStorage.removeItem('isSettingsPageFromPreview')
      this.isEditMetaPage = false
    }
  }

  ngOnInit() {

    if (sessionStorage.getItem('isSettingsPageFromPreview')) {
      sessionStorage.removeItem('isSettingsPageFromPreview')
      this.isEditMetaPage = false
    } else if (this.backToDashboard && !this.clickedNext) {
      this.isEditMetaPage = true
    } else {
      this.isEditMetaPage = false
    }
    if (this.backToDashboard) {
      this.isEditMetaPage = true
    }

    this.activeSubscription = this.initService.isEditMetaPageClickedClickedMessage.subscribe((message) => {
      if (sessionStorage.getItem('isSettingsPageFromPreview') && !this.clickedNext) {
        sessionStorage.removeItem('isSettingsPageFromPreview')
        this.isEditMetaPage = false
      } else if (!message) {
        this.isEditMetaPage = false
      } else {
        this.isEditMetaPage = true
      }
      if (message === 'isSettingsPage') {
        this.isEditMetaPage = false
      }
      if (message === 'backFromSettings') {
        this.isEditMetaPage = true

      }
    })
    if (sessionStorage.getItem('isSettingsPageFromPreview')) {
      sessionStorage.removeItem('isSettingsPageFromPreview')
      this.isEditMetaPage = false
    }
    if (this.configSvc.instanceConfig) {
      this.appIcon = this.domSanitizer.bypassSecurityTrustResourceUrl(
        this.configSvc.instanceConfig.logos.app,
      )
      this.primaryNavbarBackground = this.configSvc.primaryNavBar
    }

    if (this.buttonConfig) {
      // tslint:disable-next-line:no-console
      console.log('buttonClicked', this.configSvc.userRoles)
      this.buttonConfig.buttons.forEach(button => {
        if (button.event === 'save' || button.event === 'push' || button.title === 'saveAndNext') {
          if (button.title === 'Review' || button.title == 'Publish') {
            if (button.title === 'Review' && this.configSvc.userRoles!.has('content_reviewer')) {
              this.backNav = false
              this.requiredConfig.push(button)
            }
            if (button.title === 'Publish' && this.configSvc.userRoles!.has('content_publisher')) {
              this.backNav = false
              this.requiredConfig.push(button)
            }
          } else {
            this.backNav = true
          }
        }
      })
    }
  }
  backNavigation(): void {
    this.initService.isBackButtonClickedAction('backButtonClicked')
  }
  showCourseSettings() {
    this.subAction.emit({ type: 'editContent', identifier: this.store.parentNode[0], nodeClicked: true })
  }
  ngOnDestroy() {
    if (this.activeSubscription) {
      this.activeSubscription.unsubscribe()
    }
  }
}
