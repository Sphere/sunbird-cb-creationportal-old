import { ConfigurationsService } from '@ws-widget/utils'
import { Injectable } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { noop, Observable } from 'rxjs'
import { NsContent } from '@ws-widget/collection'

@Injectable({
  providedIn: 'root',
})
export class ViewerUtilService {
  API_ENDPOINTS = {
    setS3Cookie: `/apis/v8/protected/content/setCookie`,
    PROGRESS_UPDATE: `/apis/protected/v8/user/realTimeProgress/update`,
    ASSESSMENT_QUIZ_JSON: `apis/protected/v8/assessment/get`,

  }

  downloadRegex = new RegExp(`(/content-store/.*?)(\\\)?\\\\?['"])`, 'gm')
  authoringBase = '/apis/authContent/'
  constructor(private http: HttpClient, private configservice: ConfigurationsService) { }

  async fetchManifestFile(url: string) {
    this.setS3Cookie(url)
    const manifestFile = await this.http
      .get<any>(url)
      .toPromise()
      .catch((_err: any) => { })
    return manifestFile
  }

  private async setS3Cookie(contentId: string) {
    await this.http
      .post(this.API_ENDPOINTS.setS3Cookie, { contentId })
      .toPromise()
      .catch((_err: any) => { })
    return
  }

  realTimeProgressUpdate(contentId: string, request: any) {
    // console.log('realtime', contentId, request)
    this.http
      .post(`${this.API_ENDPOINTS.PROGRESS_UPDATE}/${contentId}`, request)
      .subscribe(noop, noop)
  }

  getContent(contentId: string): Observable<NsContent.IContent> {
    // return this.http.get<NsContent.IContent>(
    //   // tslint:disable-next-line:max-line-length
    //   `/apis/authApi/action/content/hierarchy/${contentId}?rootOrg=${this.configservice.rootOrg || 'igot'}
    // &org=${this.configservice.activeOrg || 'dopt'}`,
    // )
    return this.http.get<NsContent.IContent>(
      // tslint:disable-next-line:max-line-length
      `/apis/authApi/action/content/hierarchy/${contentId}?rootOrg=${this.configservice.rootOrg || 'aastrika'}&org=${this.configservice.activeOrg || 'aastrika'}`,
    )
  }

  getAuthoringUrl(url: string): string {
    return url
      // tslint:disable-next-line:max-line-length
      ? `/apis/authContent/${url.includes('/content-store/') ? new URL(url).pathname.slice(1) : encodeURIComponent(url)}`
      : ''
  }

  regexDownloadReplace = (_str = '', group1: string, group2: string): string => {
    return `${this.authoringBase}${encodeURIComponent(group1)}${group2}`
  }

  replaceToAuthUrl(data: any): any {
    return JSON.parse(
      JSON.stringify(data).replace(
        this.downloadRegex,
        this.regexDownloadReplace,
      ),
    )
  }

  async getQuizJson(data: any) {
    const quizJSON = await this.http
      .post<any>(this.API_ENDPOINTS.ASSESSMENT_QUIZ_JSON, data)
      .toPromise()
      .catch((_err: any) => {
        // throw new DataResponseError('MANIFEST_FETCH_FAILED');
      })
    return quizJSON
  }
  getCompetencyAuthoringUrl(url: string): string {
    return `apis/public/v8/mobileApp/v1/assessment/content${url}`
  }

}
