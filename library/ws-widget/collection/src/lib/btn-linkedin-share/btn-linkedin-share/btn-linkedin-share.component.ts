import { Component, OnInit, Input } from '@angular/core'

import { DomSanitizer } from '@angular/platform-browser'

import { ConfigurationsService } from '../../../../../utils/src/public-api'

@Component({
  standalone: false,
  selector: 'ws-widget-btn-linkedin-share',
  templateUrl: './btn-linkedin-share.component.html',
  styleUrls: ['./btn-linkedin-share.component.scss'],
})
export class BtnLinkedinShareComponent implements OnInit {
  @Input() url = location.href
  @Input() contentId: string | null = null
  @Input() shareType: string | null = null
  isSocialMediaLinkedinShareEnabled = false
  userId: string | undefined
  constructor(
    private sanitizer: DomSanitizer,
    private configSvc: ConfigurationsService,
  ) {}

  ngOnInit() {
    if (this.configSvc.restrictedFeatures) {
      this.isSocialMediaLinkedinShareEnabled = !this.configSvc.restrictedFeatures.has('socialMediaLinkedinShare')
    }
    if (this.configSvc.userProfile) {
      this.userId = this.configSvc.userProfile.userId
    }
  }

  /** The LinkedIn share endpoint as a plain string. */
  get shareUrl(): string {
    const url = `https://sphere.aastrika.org/share/${this.shareType}/${this.userId}/${this.contentId}`
    return `https://www.linkedin.com/shareArticle?mini=true&url=${url}&source=LinkedIn`
  }

  get sanitizeFbUrl() {
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.shareUrl)
  }

  /**
   * Opens the LinkedIn share dialog. Previously an <a> with an inline
   * onclick="window.open(...); return false", which made it a button in all but
   * name; the window features are kept identical so the popup is unchanged.
   */
  openShare(): void {
    window.open(this.shareUrl, 'mywin', 'left=20,top=20,width=500,height=500,toolbar=1,resizable=0')
  }
}
