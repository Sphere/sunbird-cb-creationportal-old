import {
  Component, OnInit, Inject
} from '@angular/core'
import {
  MAT_DIALOG_DATA
} from '@angular/material/dialog'
import { ConfigurationsService } from '@ws-widget/utils'
import { HttpClient } from '@angular/common/http'

@Component({
  selector: 'ws-image-upload-intro-popup',
  templateUrl: './image-upload-intro-popup.component.html',
  styleUrls: ['./image-upload-intro-popup.component.scss']
})
export class ImageUploadIntroPopupComponent implements OnInit {
  uploadImageInto: any
  private baseUrl = 'assets/configurations'
  constructor(
    private configSvc: ConfigurationsService,
    @Inject(MAT_DIALOG_DATA) data: any,
    private http: HttpClient,

  ) {
    console.log("data", data)
  }

  async ngOnInit() {
    const publicConfig: any = await this.http
      .get<any>(`${this.baseUrl}/host.config.json`)
      .toPromise()
    publicConfig.rootOrg = 'aastrika'
    publicConfig.org = ['aastrika']
    console.log("yes here", publicConfig, this.configSvc.instanceConfig)

    this.configSvc.instanceConfig = publicConfig
    if (publicConfig) {
      console.log(publicConfig.uploadImageInto)
      this.uploadImageInto = publicConfig.uploadImageInto
    }
  }

}
