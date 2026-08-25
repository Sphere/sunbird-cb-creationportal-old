import { HttpClient } from '@angular/common/http'

import { Injectable } from '@angular/core'

import { ConfigurationsService } from '@ws-widget/utils/src/lib/services/configurations.service'

import { Observable, of } from 'rxjs'

import { catchError, map, retry } from 'rxjs/operators'

import { NsContentStripMultiple } from '../content-strip-multiple/content-strip-multiple.model'

import { IContentRating } from '../_models/contentRating.model'

import { NsContent } from './widget-content.model'

import { NSSearch } from './widget-search.model'

// TODO: move this in some common place
const PROTECTED_SLAG_V8 = '/apis/protected/v8'

const API_END_POINTS = {
  CONTENT: `${PROTECTED_SLAG_V8}/content`,
  // AUTHORING_CONTENT: `/apis/authApi/hierarchy`,
  AUTHORING_CONTENT: (doId: string) => `/apis/authApi/content/v3/read/${doId}?mode=edit`,
  AUTHORING_CONTENT_HIERARCHY: (doId: string) => `/apis/proxies/v8/action/content/v3/hierarchy/${doId}?mode=edit`,

  CONTENT_LIKES: `${PROTECTED_SLAG_V8}/content/likeCount`,
  SET_S3_COOKIE: `${PROTECTED_SLAG_V8}/content/setCookie`,
  SET_S3_IMAGE_COOKIE: `${PROTECTED_SLAG_V8}/content/setImageCookie`,
  FETCH_MANIFEST: `${PROTECTED_SLAG_V8}/content/getWebModuleManifest`,
  FETCH_WEB_MODULE_FILES: `${PROTECTED_SLAG_V8}/content/getWebModuleFiles`,
  MULTIPLE_CONTENT: `${PROTECTED_SLAG_V8}/content/multiple`,
  CONTENT_SEARCH_V5: `${PROTECTED_SLAG_V8}/content/searchV5`,
  CONTENT_SEARCH_V6: `${PROTECTED_SLAG_V8}/content/searchV6`,
  CONTENT_SEARCH_REGION_RECOMMENDATION: `${PROTECTED_SLAG_V8}/content/searchRegionRecommendation`,
  CONTENT_HISTORY: `${PROTECTED_SLAG_V8}/user/history`,
  CONTENT_RATING: `${PROTECTED_SLAG_V8}/user/rating`,
  CONTENT_RATING_V2: `${PROTECTED_SLAG_V8}/user/rating/content/average-ratingInfo`,
  COLLECTION_HIERARCHY: (type: string, id: string) => `${PROTECTED_SLAG_V8}/content/collection/${type}/${id}`,
  REGISTRATION_STATUS: `${PROTECTED_SLAG_V8}/admin/userRegistration/checkUserRegistrationContent`,
  MARK_AS_COMPLETE_META: (contentId: string) => `${PROTECTED_SLAG_V8}/user/progress/${contentId}`,
}

@Injectable({
  providedIn: 'root',
})
export class WidgetContentService {
  showConformation: any
  constructor(
    private http: HttpClient,
    private configSvc: ConfigurationsService,
  ) {}

  fetchMarkAsCompleteMeta(identifier: string): Promise<any> {
    const url = API_END_POINTS.MARK_AS_COMPLETE_META(identifier)
    return this.http.get(url).toPromise()
  }
  readcontentV3(id: string): Observable<NsContent.IContent> {
    return this.http.get<NsContent.IContent>(`/apis/proxies/v8/action/content/v3/hierarchy/${id}?mode=edit`).pipe(
      map((data: any) => {
        return data.result.content
      }),
    )
  }
  fetchContent(
    contentId: string,
    hierarchyType: 'all' | 'minimal' | 'detail' = 'detail',
    additionalFields: string[] = [],
  ): Observable<NsContent.IContent> {
    const url = `${API_END_POINTS.CONTENT}/${contentId}?hierarchyType=${hierarchyType}`
    return this.http.post<NsContent.IContent>(url, { additionalFields }).pipe(retry(1))
  }
  fetchAuthoringContent(contentId: string): Observable<NsContent.IContent> {
    // const url = `${API_END_POINTS.AUTHORING_CONTENT}/${contentId}`
    // return this.http.get<NsContent.IContent>(url).pipe(retry(1))
    const url = `${API_END_POINTS.AUTHORING_CONTENT(contentId)}`
    return this.http.get<NsContent.IContent>(url).pipe(retry(1))
  }
  fetchAuthoringContentHierarchy(contentId: string): Observable<NsContent.IContent> {
    const url = `${API_END_POINTS.AUTHORING_CONTENT_HIERARCHY(contentId)}`
    return this.http.get<NsContent.IContent>(url).pipe(retry(1))
  }
  fetchMultipleContent(ids: string[]): Observable<NsContent.IContent[]> {
    return this.http.get<NsContent.IContent[]>(`${API_END_POINTS.MULTIPLE_CONTENT}/${ids.join(',')}`)
  }
  fetchCollectionHierarchy(type: string, id: string, pageNumber: number = 0, pageSize: number = 1) {
    return this.http.get<NsContent.ICollectionHierarchyResponse>(
      `${API_END_POINTS.COLLECTION_HIERARCHY(type, id)}?pageNumber=${pageNumber}&pageSize=${pageSize}`,
    )
  }

  fetchContentLikes(contentIds: { content_id: string[] }) {
    return this.http.post<{ [identifier: string]: number }>(API_END_POINTS.CONTENT_LIKES, contentIds).toPromise()
  }
  fetchContentRatings(contentIds: { contentIds: string[] }) {
    return this.http.post(`${API_END_POINTS.CONTENT_RATING}/rating`, contentIds).toPromise()
  }
  fetchContentRatingsV2(contentId: string) {
    return this.http.get<IContentRating>(`${API_END_POINTS.CONTENT_RATING_V2}/${contentId}`)
  }

  fetchContentHistory(contentId: string): Observable<NsContent.IContinueLearningData> {
    return this.http.get<NsContent.IContinueLearningData>(`${API_END_POINTS.CONTENT_HISTORY}/${contentId}`)
  }

  /**
   * Continue-learning progress is not tracked in this application.
   *
   * This used to POST to /apis/protected/v8/user/history/continue, which the backend
   * here does not serve -- every viewer that opened a resource fired it and got a 500.
   * The failure was swallowed, so nothing surfaced, but the request went out on every
   * open. The method is kept, and still resolves, because five viewer components await
   * it as part of their open sequence.
   */
  async continueLearning(_id: string, _collectionId?: string, _collectionType?: string): Promise<any> {
    return true
  }

  /**
   * Continue-learning progress is not recorded in this application.
   *
   * Kept because the players, the html and web-module viewers, videojs-util and the
   * sub-application responder all call it while content plays -- often on a timer. It
   * used to POST every one of those to /apis/protected/v8/user/history/continue, which
   * this backend does not serve, so each one came back 500. The failures were swallowed
   * by `.catch()`, which is why nothing was visible except the console noise and the
   * wasted requests.
   */
  saveContinueLearning(_content: NsContent.IViewerContinueLearningRequest): Observable<any> {
    return of(null)
  }
  fetchHierarchyContent(contentId: string): Observable<NsContent.IContent> {
    const url = `/apis/proxies/v8/action/content/v3/hierarchy/${contentId}?hierarchyType=detail&mode=edit`
    const apiData = this.http.get<NsContent.IContent>(url).pipe(retry(1))
    return apiData
  }
  setS3Cookie(
    contentId: string,
    // _path: string,
  ): Observable<any> {
    return this.http.post(API_END_POINTS.SET_S3_COOKIE, { contentId }).pipe(catchError(_err => of(true)))
  }

  // setS3ImageCookie(): Observable<any> {
  //   return this.http.post(API_END_POINTS.SET_S3_IMAGE_COOKIE, {}).pipe(catchError(_err => of(true)))
  // }

  fetchManifest(url: string): Observable<any> {
    return this.http.post(API_END_POINTS.FETCH_MANIFEST, { url })
  }
  fetchWebModuleContent(url: string): Observable<any> {
    return this.http.get(`${API_END_POINTS.FETCH_WEB_MODULE_FILES}?url=${encodeURIComponent(url)}`)
  }
  search(req: NSSearch.ISearchRequest): Observable<NSSearch.ISearchApiResult> {
    req.query = req.query || ''
    return this.http.post<NSSearch.ISearchApiResult>(API_END_POINTS.CONTENT_SEARCH_V5, {
      request: req,
    })
  }
  searchRegionRecommendation(
    req: NSSearch.ISearchOrgRegionRecommendationRequest,
  ): Observable<NsContentStripMultiple.IContentStripResponseApi> {
    req.query = req.query || ''
    req.preLabelValue = (req.preLabelValue || '') + ((this.configSvc.userProfile && this.configSvc.userProfile.country) || '')
    req.filters = {
      ...req.filters,
      labels: [req.preLabelValue || ''],
    }
    return this.http.post<NsContentStripMultiple.IContentStripResponseApi>(API_END_POINTS.CONTENT_SEARCH_REGION_RECOMMENDATION, {
      request: req,
    })
  }
  searchV6(req: NSSearch.ISearchV6Request): Observable<NSSearch.ISearchV6ApiResult> {
    req.query = req.query || ''
    return this.http.post<NSSearch.ISearchV6ApiResult>(API_END_POINTS.CONTENT_SEARCH_V6, req)
  }

  fetchContentRating(contentId: string): Observable<{ rating: number }> {
    return this.http.get<{ rating: number }>(`${API_END_POINTS.CONTENT_RATING}/${contentId}`)
  }
  deleteContentRating(contentId: string): Observable<any> {
    return this.http.delete(`${API_END_POINTS.CONTENT_RATING}/${contentId}`)
  }
  addContentRating(contentId: string, data: { rating: number }): Observable<any> {
    return this.http.post<any>(`${API_END_POINTS.CONTENT_RATING}/${contentId}`, data)
  }

  getFirstChildInHierarchy(content: NsContent.IContent): NsContent.IContent {
    if (!(content.children || []).length) {
      return content
    }
    if (content.contentType === 'Learning Path' && !(content.artifactUrl && content.artifactUrl.length)) {
      const child = content.children[0]
      return this.getFirstChildInHierarchy(child)
    }
    if (content.contentType === 'Resource' || content.contentType === 'Knowledge Artifact' || content.contentType === 'Learning Path') {
      return content
    }
    const firstChild = content.children[0]
    const resultContent = this.getFirstChildInHierarchy(firstChild)
    return resultContent
  }

  getRegistrationStatus(source: string): Promise<{ hasAccess: boolean; registrationUrl?: string }> {
    return this.http.get<any>(`${API_END_POINTS.REGISTRATION_STATUS}/${source}`).toPromise()
  }

  fetchConfig(url: string) {
    return this.http.get<any>(url)
  }
}
