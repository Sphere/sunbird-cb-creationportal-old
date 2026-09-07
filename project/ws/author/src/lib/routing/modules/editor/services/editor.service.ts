import { HttpClient } from '@angular/common/http'

import { Injectable } from '@angular/core'

import { NsAutoComplete, UserAutocompleteService } from '@ws-widget/collection'

import { ConfigurationsService, randomInt } from '@ws-widget/utils'

import {
  AUTHORING_CONTENT_BASE,
  CONTENT_BASE_COPY,
  // CONTENT_CREATE,
  CONTENT_DELETE,
  CONTENT_READ,
  CONTENT_SAVE,
  CONTENT_SAVE_V2,
  SEARCH,
  STATUS_CHANGE,
  SEARCH_V6_ADMIN,
  SEARCH_V6_AUTH,
  CONTENT_READ_HIERARCHY_AND_DATA,
  AUTHORING_BASE,
  SEND_TO_REVIEW,
  PUBLISH_CONTENT,
  REJECT_CONTENT,
  EMAIL_NOTIFICATION,
} from '@ws/author/src/lib/constants/apiEndpoints'

import { NSApiResponse } from '@ws/author/src/lib/interface//apiResponse'

import { NSApiRequest } from '@ws/author/src/lib/interface/apiRequest'

import { NSContent } from '@ws/author/src/lib/interface/content'

import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'

import { ApiService } from '@ws/author/src/lib/modules/shared/services/api.service'

import { EMPTY, Observable, of } from 'rxjs'

import { map, mergeMap, catchError, retry, shareReplay, finalize } from 'rxjs/operators'

import { CONTENT_READ_MULTIPLE_HIERARCHY } from './../../../../constants/apiEndpoints'

import { ISearchContent, ISearchResult } from '../../../../interface/search'

import { environment } from '../../../../../../../../../src/environments/environment'

// import { HttpHeaders } from '@angular/common/http'

@Injectable({ providedIn: 'root' })
export class EditorService {
  accessPath: string[] = []
  newCreatedLexid!: string

  /** In-flight hierarchy reads, keyed by id -- see readcontentV3. */
  private readonly hierarchyReadById = new Map<string, Observable<any>>()

  /** In-flight content reads, keyed by id -- see readContentEditMode. */
  private readonly contentReadById = new Map<string, Observable<any>>()

  /** How long the cbp-data.json config is reused before it is fetched again. */
  private static readonly CBP_DATA_TTL_MS = 5 * 60 * 1000

  private cbpDataCache?: { fetchedAt: number; data: Observable<any> }
  resourseID!: any
  parentData: any

  constructor(
    private apiService: ApiService,
    private accessService: AccessControlService,
    private userAutoComplete: UserAutocompleteService,
    private configSvc: ConfigurationsService,
    private http: HttpClient,
  ) {}

  create(meta: NSApiRequest.ICreateMetaRequestGeneral): Observable<string> {
    const requestBody: NSApiRequest.ICreateMetaRequest = {
      content: {
        locale: 'en',
        isExternal: false,
        authoringDisabled: false,
        isMetaEditingDisabled: false,
        isContentEditingDisabled: false,
        category: meta.contentType,
        ...meta,
        createdBy: this.accessService.userId,
      },
    }
    if (this.accessService.rootOrg === 'client2') {
      if (meta.contentType === 'Knowledge Artifact') {
        try {
          const userPath = `client2/Australia/dealer_code-${this.configSvc.unMappedUser.json_unmapped_fields.dealer_group_code}`
          requestBody.content.accessPaths = userPath
        } catch {
          requestBody.content.accessPaths = 'client2'
        }
      } else {
        requestBody.content.accessPaths = 'client2'
      }
    }
    return this.http
      .post<NSApiRequest.ICreateMetaRequest>(
        // tslint:disable-next-line:max-line-length
        // `${CONTENT_CREATE}${this.accessService.orgRootOrgAsQuery}`,
        `${AUTHORING_BASE}content/v3/create`,
        requestBody,
      )
      .pipe(
        map((data: any) => {
          return data.identifier
        }),
      )
  }
  getBatchforCert(req: any): Observable<any> {
    // return this.http
    //   .get<any>(
    //     // tslint:disable-next-line:max-line-length
    //     `/api/course/v1/batch/read/${id}`,
    //   )
    return this.http.post<any>('apis/proxies/v8/learner/course/v1/batch/list', req).pipe(
      retry(1),
      map((data: any) => data.result.response.content),
    )
  }
  createTemplate(data: any): Observable<any> {
    console.log(data)
    let randomNumber = ''
    // tslint:disable-next-line: no-increment-decrement
    for (let i = 0; i < 16; i++) {
      randomNumber += randomInt(10)
    }
    const requestBody: any = {
      request: {
        content: {
          name: data.name,
          code: randomNumber,
          mimeType: 'image/svg+xml',
          createdBy: this.accessService.userId,
          createdFor: [this.configSvc.userProfile && this.configSvc.userProfile.rootOrgId ? this.configSvc.userProfile.rootOrgId : ''],
          creator: this.accessService.userName,
          contentType: 'Asset',
          primaryCategory: 'Asset',
          generateDIALCodes: 'No',
          dialcodeRequired: 'No',
          framework: environment.framework,
        },
      },
    }
    return this.http
      .post<NSApiRequest.ICreateMetaRequestV2>(
        // tslint:disable-next-line:max-line-length
        //`${AUTHORING_BASE}content/v3/create`,
        'apis/proxies/v8/action/content/v3/create',
        requestBody,
      )
      .pipe(
        map((data: any) => {
          console.log(data)
          this.resourseID = data.result.identifier
          return data
        }),
      )
  }

  createV2(meta: NSApiRequest.ICreateMetaRequestGeneralV2): Observable<string> {
    let randomNumber = ''
    // tslint:disable-next-line: no-increment-decrement
    for (let i = 0; i < 16; i++) {
      randomNumber += randomInt(10)
    }
    const requestBody: NSApiRequest.ICreateMetaRequestV2 = {
      request: {
        content: {
          code: randomNumber,
          contentType: meta.contentType,
          createdBy: this.accessService.userId,
          createdFor: [this.configSvc.userProfile && this.configSvc.userProfile.rootOrgId ? this.configSvc.userProfile.rootOrgId : ''],
          creator: this.accessService.userName,
          // description: '',
          framework: environment.framework,
          mimeType: meta.mimeType,
          name: meta.name,
          isAssessment: meta.isAssessment,
          instructions: '',
          // organisation: [environment.organisation],
          organisation: [
            this.configSvc.userProfile && this.configSvc.userProfile.departmentName ? this.configSvc.userProfile.departmentName : '',
          ],
          isExternal: meta.mimeType === 'application/html',
          primaryCategory: meta.primaryCategory,
          license: 'CC BY 4.0',
          ownershipType: ['createdFor'],
          purpose: meta.description ? meta.description : '',
        },
      },
    }
    return this.http
      .post<NSApiRequest.ICreateMetaRequestV2>(
        // tslint:disable-next-line:max-line-length
        //`${AUTHORING_BASE}content/v3/create`,
        'apis/proxies/v8/action/content/v3/create',
        requestBody,
      )
      .pipe(
        map((data: any) => {
          this.resourseID = data.result.identifier
          return data.result.identifier
        }),
      )
  }

  readContent(id: string): Observable<NSContent.IContentMeta> {
    this.newCreatedLexid = id
    return this.apiService.get<NSContent.IContentMeta>(`${CONTENT_READ}${id}${this.accessService.orgRootOrgAsQuery}`)
  }

  /**
   * One shared request for `content/v3/read/{id}?mode=edit`.
   *
   * readContentV2 and checkReadAPI both hit this URL, and a single builder action
   * reaches them several times at once -- adding an assessment read the course five
   * times. Overlapping requests for the same id now share one call.
   *
   * Sharing is deliberately limited to requests that overlap: the entry is dropped once
   * the last subscriber finishes, so a later read still goes to the server and sees
   * whatever a save changed. Holding the response beyond that would hand back stale
   * content, which is worse than the extra call.
   */
  private readContentEditMode(id: string): Observable<any> {
    const inFlight = this.contentReadById.get(id)
    if (inFlight) {
      return inFlight
    }
    const request = this.apiService.get<any>(`${AUTHORING_BASE}content/v3/read/${id}?mode=edit`).pipe(
      finalize(() => this.contentReadById.delete(id)),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
    this.contentReadById.set(id, request)
    return request
  }

  readContentV2(id: string): Observable<NSContent.IContentMeta> {
    this.newCreatedLexid = id
    return this.readContentEditMode(id).pipe(map((data: any) => JSON.parse(JSON.stringify(data.result.content))))
  }

  /**
   * Reads a content hierarchy in edit mode.
   *
   * Called from ~67 places, and a single click in the course builder often reaches
   * several of them at once -- adding an assessment issued this request three times for
   * the course and three more for the new resource. Requests for the same id that
   * overlap in time now share one HTTP call.
   *
   * Only *concurrent* calls are shared: the entry is dropped once the last subscriber
   * is done, so a later read still goes to the server and picks up anything a save
   * changed in between. Each subscriber gets its own copy, because callers assign the
   * result onto component state and some of them edit it.
   */
  readcontentV3(id: string): Observable<NSContent.IContentMeta> {
    const inFlight = this.hierarchyReadById.get(id)
    if (inFlight) {
      return inFlight.pipe(map(content => JSON.parse(JSON.stringify(content))))
    }
    const request = this.apiService.get<NSContent.IContentMeta>(`/apis/proxies/v8/action/content/v3/hierarchy/${id}?mode=edit`).pipe(
      map((data: any) => data.result.content),
      finalize(() => this.hierarchyReadById.delete(id)),
      shareReplay({ bufferSize: 1, refCount: true }),
    )
    this.hierarchyReadById.set(id, request)
    return request.pipe(map(content => JSON.parse(JSON.stringify(content))))
  }
  contentRead(id: string): Observable<any> {
    const res = this.apiService.get<any>(`/apis/proxies/v8/action/content/v3/hierarchy/${id}.img`)
    return res
  }

  /**
   * Reads a content item in edit mode.
   *
   * The cache here used to be a single field that ignored `id`: the first read won and
   * every later call -- for any other content -- was handed that first item's data back.
   * It suppressed a duplicate request by returning the wrong content. Sharing is keyed
   * by id now, through the same in-flight request readContentV2 uses.
   */
  checkReadAPI(id: string): Observable<any> {
    return this.readContentEditMode(id).pipe(map((data: any) => JSON.parse(JSON.stringify(data))))
  }

  getAllEntities(language: string = 'en'): any {
    const body = {
      entityType: 'Competency',
      language,
      query: '',
      strict: 'false',
      field: ['code', 'name', 'levels'],
    }
    return this.http.post<any>('/apis/proxies/v8/entity/v1/search', body)
  }
  getEntities(id: any, language: string = 'en'): any {
    const body = {
      entityType: 'Competency',
      language,
      query: String(id),
      strict: 'true',
      field: ['code', 'name', 'levels'],
    }
    return this.http.post<any>('/apis/proxies/v8/entity/v1/search', body)
  }
  createBatch(data: any): Observable<any> {
    return this.http.post<any>(`/apis/proxies/v8/learner/course/v1/batch/create`, data).pipe(retry(1))
  }
  createAndReadModule(requestPayload: any, parentId: any): Observable<any> {
    return this.createModule(requestPayload).pipe(mergeMap(data => this.getModuleContent(parentId, data)))
  }
  getModuleContent(id: string, moduleId: any): Observable<NSContent.IContentMeta> {
    return this.apiService.get<NSContent.IContentMeta>(`/apis/proxies/v8/action/content/v3/hierarchy/${id}?mode=edit`).pipe(
      map((data: any) => {
        const tempReturnData = data.result.content.children.filter((v: NSContent.IContentMeta) => v.identifier === moduleId)
        this.newCreatedLexid = tempReturnData[0].identifier
        return tempReturnData[0]
      }),
    )
  }
  createModule(meta: any) {
    return (
      this.apiService
        .patch<null>(`/apis/proxies/v8/action/content/v3/hierarchy/update`, meta)
        // .pipe(
        //   map((data: any) => {
        //     return data.result
        //   })
        //   )
        .pipe(
          map((data: any) => {
            const temp = Object.keys(data.result.identifiers).filter((v: any) => !v.includes('do_'))
            return data.result.identifiers[temp[0]]
          }),
        )
    )
  }

  createAndReadContentV2(meta: NSApiRequest.ICreateMetaRequestGeneralV2): Observable<NSContent.IContentMeta> {
    return this.createV2(meta).pipe(mergeMap(data => this.readContentV2(data)))
  }

  readMultipleContent(ids: string[]): Observable<NSContent.IContentMeta[]> {
    return this.apiService.get<NSContent.IContentMeta>(`${CONTENT_READ_MULTIPLE_HIERARCHY}${ids.join()}`)
  }

  createAndReadContent(meta: NSApiRequest.ICreateMetaRequestGeneral): Observable<NSContent.IContentMeta> {
    return this.create(meta).pipe(mergeMap(data => this.readContent(data)))
  }

  updateContent(meta: NSApiRequest.IContentUpdate): Observable<null> {
    return this.apiService.post<null>(`${CONTENT_SAVE}${this.accessService.orgRootOrgAsQuery}`, meta)
  }

  updateContentV2(meta: NSApiRequest.IContentUpdate): Observable<null> {
    return this.apiService.post<null>(`${CONTENT_SAVE_V2}${this.accessService.orgRootOrgAsQuery}`, meta)
  }
  rejectContentApi(requestPayload: any, id: string): Observable<null> {
    return this.apiService.post<any>(REJECT_CONTENT + id, requestPayload)
  }

  resourceToModule(meta: any): Observable<null> {
    return this.http.patch<null>(
      // `${AUTHORING_BASE}content/v3/update/${id}`,
      `/apis/proxies/v8/action/content/v3/hierarchy/add`,
      meta,
    )
  }

  /**
   * Content update rejects a string `category` with
   * "Metadata category should be a/an Array value".
   *
   * Content is created with `category: <contentType>` as a plain string and every save
   * spreads the stored metadata straight back into the PATCH, so the string is echoed
   * and the update fails -- most visibly on Add Assessment. Creation still accepts the
   * string, so only the update payload is normalised here, and only when the field is
   * actually present.
   *
   * The payload is copied rather than edited in place: callers pass metadata that is
   * also held in component state.
   */
  private withCategoryAsArray(payload: any): any {
    const content = payload?.request?.content
    if (!content || !('category' in content)) {
      return payload
    }
    const { category } = content
    if (Array.isArray(category)) {
      return payload
    }
    const normalised = category === null || category === undefined || category === '' ? [] : [category]
    return { ...payload, request: { ...payload.request, content: { ...content, category: normalised } } }
  }

  updateContentV3(meta: NSApiRequest.IContentUpdateV2, id: string): Observable<null> {
    return this.apiService.patch<null>(
      // `${AUTHORING_BASE}content/v3/update/${id}`,
      `/apis/proxies/v8/action/content/v3/update/${id}`,
      this.withCategoryAsArray(meta),
    )
  }

  updateNewContentV3(meta: any, id: string): Observable<null> {
    return this.http.patch<null>(
      // `${AUTHORING_BASE}content/v3/update/${id}`,
      `/apis/proxies/v8/action/content/v3/update/${id}`,
      this.withCategoryAsArray(meta),
    )
  }

  updateContentV4(meta: NSApiRequest.IContentUpdateV3): Observable<null> {
    return this.apiService.patch<null>(`/apis/proxies/v8/action/content/v3/hierarchy/update`, meta)
  }

  // updateContentV6(meta: NSApiRequest.IContentUpdateV3, check: boolean): Observable<null> {
  //   if (!check) {
  //     return this.apiService.patch<null>(
  //       `/apis/proxies/v8/action/content/v3/hierarchy/update`,
  //       meta,
  //     )
  //   }
  //   //window.location.reload()
  // }

  updateContentWithFewFields(requestBody: any, identifier: string): Observable<any> {
    return this.apiService.patch<any>(`/apis/proxies/v8/action/content/v3/update/${identifier}`, this.withCategoryAsArray(requestBody))
  }

  updateContentForReviwer(requestBody: any, identifier: string): Observable<any> {
    return this.apiService.patch<any>(`/apis/proxies/v8/action/content/v3/updateReviewStatus/${identifier}`, requestBody)
  }

  updateHierarchyForReviwer(meta: NSApiRequest.IContentUpdateV3): Observable<any> {
    return this.apiService.patch<null>(`/apis/proxies/v8/action/content/v3/hierarchyUpdate`, meta)
  }

  fetchEmployeeList(data: string, roleType?: string): Observable<any[]> {
    // return this.userAutoComplete.fetchAutoComplete(data).pipe(
    return this.userAutoComplete.fetchAutoCompleteV2(data, roleType).pipe(
      map((v: NsAutoComplete.IUserAutoComplete[]) => {
        return v.map(user => {
          return {
            displayName: `${user.first_name || ''} ${user.last_name || ''}`,
            id: user.wid,
            mail: user.email,
            department: user.department_name,
          }
        })
      }),
      catchError(_ => of([])),
    )
  }

  searchSkills(query: string): Observable<any> {
    return this.apiService.get(`/LA/api/search?search_text=${query}&type=skill`).pipe(
      map((v: any) =>
        v.map((val: any) => {
          return {
            identifier: val.identifier,
            name: val.name,
            skill: val.skill,
            category: val.category,
          }
        }),
      ),
    )
  }

  searchV6Content(query = '*', locale: string): Observable<ISearchContent[]> {
    return this.apiService
      .post<ISearchResult>(this.accessService.hasRole(['editor', 'admin']) ? SEARCH_V6_ADMIN : SEARCH_V6_AUTH, {
        query: query || '*',
        locale: [locale],
        pageSize: 20,
        pageNo: 0,
        filters: [
          {
            andFilters: [
              {
                status: ['Live'],
                contentType: ['Course', 'Collection', 'Learning Path', 'Resource'],
              },
            ],
          },
        ],
        uuid: this.accessService.userId,
        rootOrg: this.accessService.rootOrg,
      })
      .pipe(
        map(v => (v && v.result ? v.result : [])),
        catchError(_ => of([])),
      )
  }

  checkUrl(url: string): Observable<any> {
    return this.apiService.get<any>(url)
  }

  forwardBackward(meta: NSApiRequest.IForwardBackwardActionGeneral, id: string, status: string): Observable<null> {
    const requestBody: NSApiRequest.IForwardBackwardAction = {
      actor: this.accessService.userId,
      ...meta,
      org: this.accessService.org,
      rootOrg: this.accessService.rootOrg || '',
      appName: this.accessService.appName,
      appUrl: window.location.origin,
      actorName: this.accessService.userName,
      action: this.accessService.getAction(status, meta.operation),
    }
    return this.apiService.post<null>(STATUS_CHANGE + id, requestBody)
  }

  // sendToReview(id: string, status: string, parentStatus: string) {
  //   if (status === 'Review' && parentStatus === 'Review') {
  //     // tslint:disable-next-line: no-shadowed-variable
  //     const requestbody = {
  //       request: {
  //         content: {
  //           publisher: this.accessService.userName,
  //           lastPublishedBy: this.accessService.userName,
  //         },
  //       },
  //     }
  //     return this.apiService.post<any>(PUBLISH_CONTENT + id, requestbody)
  //     // tslint:disable-next-line: no-else-after-return
  //   } else if (parentStatus === 'Draft') {
  //     const requestbody = { }
  //     return this.apiService.post<any>(SEND_TO_REVIEW + id, requestbody)
  //   }
  //   return EMPTY
  // }

  sendToReview(id: string, parentStatus: string) {
    if (parentStatus === 'Draft') {
      const requestbody = {}
      return this.apiService.post<any>(SEND_TO_REVIEW + id, requestbody)
    }
    return EMPTY
  }

  publishContent(id: string) {
    const requestbody = {
      request: {
        content: {
          publisher: this.accessService.userName,
          lastPublishedBy: this.accessService.userName,
        },
      },
    }
    return this.apiService.post<any>(PUBLISH_CONTENT + id, requestbody)
  }

  readJSON(artifactUrl: string): Observable<any> {
    return this.apiService.get(`${AUTHORING_CONTENT_BASE}${encodeURIComponent(artifactUrl)}`)
  }

  searchContent(searchData: any): Observable<any> {
    return this.apiService
      .post<NSApiResponse.ISearchApiResponse>(SEARCH, searchData)
      .pipe(map((data: NSApiResponse.IApiResponse<NSApiResponse.ISearchApiResponse>) => data))
  }

  checkRole(id: string): Observable<string[]> {
    return this.apiService.get<string[]>(`/apis/protected/V8/user/roles/${id}`).pipe(
      map((v: { default_roles: string[]; user_roles: string[] }) => {
        if (v) {
          let roles: string[] = []
          if (v.default_roles) {
            roles = roles.concat(v.default_roles)
          }
          if (v.user_roles) {
            roles = roles.concat(v.user_roles)
          }
          return roles
        }
        return []
      }),
    )
  }

  getAccessPath(): Observable<string[]> {
    return this.accessPath.length
      ? of()
      : this.apiService.get<string[]>(`/apis/protected/V8/user/accessControl`).pipe(
          map((v: { special: { accessPaths: string[] }[] }) => {
            if (v) {
              v.special.forEach(acc => {
                this.accessPath = this.accessPath.concat(acc.accessPaths)
              })
            }
            return this.accessPath
          }),
        )
  }

  copy(lexId: string, url: string) {
    // tslint:disable-next-line: max-line-length
    const destination = `${this.accessService.rootOrg.replace(
      / /g,
      '_',
    )}%2F${this.accessService.org.replace(/ /g, '_')}%2FPublic%2F${lexId.replace('.img', '')}`
    const location = url.split('/').slice(4, 8).join('%2F')
    return this.apiService.post(
      CONTENT_BASE_COPY,
      {
        destination,
        location,
      },
      false,
    )
  }

  deleteContent(id: string, isKnowledgeBoard = false): Observable<null> {
    return isKnowledgeBoard
      ? this.apiService.delete(`${CONTENT_DELETE}/${id}/kb${this.accessService.orgRootOrgAsQuery}`)
      : this.apiService.post(`${CONTENT_DELETE}${this.accessService.orgRootOrgAsQuery}`, {
          identifier: id,
          author: this.accessService.userId,
          isAdmin: this.accessService.hasRole(['editor', 'admin']),
        })
  }

  getDataForContent(id: string) {
    return this.apiService.get<{ content: NSContent.IContentMeta; data: any }[]>(`${CONTENT_READ_HIERARCHY_AND_DATA}${id}`).pipe(
      catchError((v: any) => {
        return of(v)
      }),
    )
  }

  sendEmailNotificationAPI(requestBody: any): Observable<any> {
    return this.apiService.post<any>(EMAIL_NOTIFICATION, requestBody)
  }
  rolesMappingAPI(): Observable<any> {
    return this.apiService.get<any>(`apis/public/v8/competencyAssets/rolesMappingData`).pipe(
      map((data: any) => {
        return data.response
      }),
    )
  }
  /**
   * The shared cbp-data.json config blob.
   *
   * Three callers here each wanted a different field out of the same ~19 kB file, and
   * two of them appended a `?v=<timestamp>` cache buster, so the browser could never
   * reuse it -- opening the course builder downloaded the whole file several times.
   *
   * Unlike the content reads, this is deployment config rather than something a save
   * changes, so it is held briefly. The cache buster is kept but is now computed once
   * per fetch, so a config change is still picked up within the TTL rather than
   * requiring a reload.
   */
  private cbpData(): Observable<any> {
    const now = new Date().getTime()
    const cached = this.cbpDataCache
    if (cached && now - cached.fetchedAt < EditorService.CBP_DATA_TTL_MS) {
      return cached.data.pipe(map(value => JSON.parse(JSON.stringify(value))))
    }
    const request = this.apiService
      .get<any>(`https://aastar-assets.s3.ap-south-1.amazonaws.com/data/cbp-data.json?v=${now}`)
      .pipe(shareReplay({ bufferSize: 1, refCount: false }))
    this.cbpDataCache = { fetchedAt: now, data: request }
    return request.pipe(map(value => JSON.parse(JSON.stringify(value))))
  }

  /** Drops the cached config so the next read fetches it again. */
  clearCbpDataCache(): void {
    this.cbpDataCache = undefined
  }

  rolesMapped(): Observable<any> {
    return this.cbpData().pipe(map((data: any) => data.roles))
  }
  sourceNames(): Observable<any> {
    return this.cbpData().pipe(map((data: any) => data.sourceName))
  }
  languageList(): Observable<any> {
    return this.cbpData().pipe(map((data: any) => data.languageList))
  }
}
