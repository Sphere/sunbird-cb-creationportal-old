// import { WidgetContentService } from '@ws-widget/collection'
// import { ConfigurationsService } from './../../../../../../../../../library/ws-widget/utils/src/lib/services/configurations.service'
import { Component, OnInit } from '@angular/core'
import { ValueService } from '@ws-widget/utils/src/public-api'
import { ActivatedRoute } from '@angular/router'
// import { HttpErrorResponse } from '@angular/common/http'

@Component({
  selector: 'ws-app-license',
  templateUrl: './license.component.html',
  styleUrls: ['./license.component.scss'],
})
export class LicenseComponent implements OnInit {
  isXSmall = false
  licenseName: any
  currentLicenseData: any
  constructor(private valueSvc: ValueService,
              private route: ActivatedRoute,
    // private configSvc: ConfigurationsService,
    // private widgetContentSvc: WidgetContentService
  ) {
    this.valueSvc.isXSmall$.subscribe(isXSmall => {
      this.isXSmall = isXSmall
    })
  }

  ngOnInit() {

    this.route.queryParams.subscribe(params => {
      this.licenseName = params['license']
      this.getLicenseConfig()

    })

  }

  getLicenseConfig() {
    // const licenseurl = `${this.configSvc.sitePath}/license.meta.json`
    // this.widgetContentSvc.fetchConfig(licenseurl).subscribe(data => {
    //   const licenseData = data
    //   if (licenseData) {
    //     this.currentLicenseData = licenseData.licenses.filter((license: any) => license.licenseName === this.licenseName)
    //   }
    // },
    // (err: HttpErrorResponse) => {
    //     if (err.status === 404) {
    //       this.getLicenseConfig()
    //     }
    //   })
  }
}
