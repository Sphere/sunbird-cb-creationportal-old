import { Injectable } from '@angular/core'
import { ConfigurationsService } from '@ws-widget/utils/src/public-api'
// import { AUTHORING_BASE, CONTENT_CREATE } from '@ws/author/src/lib/constants/apiEndpoints'
import { AUTHORING_BASE } from '@ws/author/src/lib/constants/apiEndpoints'
// import { NSApiResponse } from '@ws/author/src/lib/interface//apiResponse'
import { NSApiRequest } from '@ws/author/src/lib/interface/apiRequest'
import { AccessControlService } from '@ws/author/src/lib/modules/shared/services/access-control.service'
// import { ApiService } from '@ws/author/src/lib/modules/shared/services/api.service'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { environment } from '../../../../../../../../../../src/environments/environment'
import { HttpClient } from '@angular/common/http'
const API_END_POINTS = {
  CREATE_FORUM: `/apis/proxies/v8/discussion/forum/v3/create`,
}
@Injectable()
export class CreateService {
  constructor(
    // private apiService: ApiService,
    private configSvc: ConfigurationsService,
    private accessService: AccessControlService,
    private http: HttpClient,
  ) { }

  create(meta: {
    mimeType: string; contentType: string; locale: string,
    name?: string, description?: string
  }): Observable<string> {
    const requestBody: NSApiRequest.ICreateMetaRequest = {
      content: {
        ...meta,
        name: meta.name || 'untitled content',
        description: meta.description || '',
        category: meta.contentType,
        createdBy: this.accessService.userId,
        authoringDisabled: false,
        isContentEditingDisabled: false,
        isMetaEditingDisabled: false,
        isExternal: meta.mimeType === 'application/html',
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

  createV2(meta: {
    mimeType: string; contentType: string; locale: string, name: any,
    primaryCategory: string, purpose?: string, isAssessment?: boolean
  }): Observable<string> {
    // let description: string = meta.name.courseSummary.trim()
    let instructions: string = meta.name.courseDescription.trim()
    let courseName: string = meta.name.courseName.trim()
    let randomNumber = ''
    // tslint:disable-next-line: no-increment-decrement
    for (let i = 0; i < 16; i++) {
      randomNumber += Math.floor(Math.random() * 10)
    }
    const requestBody: NSApiRequest.ICreateMetaRequestV2 = {
      request: {
        content: {
          isAssessment: meta.isAssessment ? meta.isAssessment : false,
          code: randomNumber,
          contentType: meta.contentType,
          createdBy: this.accessService.userId,
          createdFor: [(this.configSvc.userProfile && this.configSvc.userProfile.rootOrgId) ? this.configSvc.userProfile.rootOrgId : ''],
          creator: this.accessService.userName,
          // description: description,
          framework: environment.framework,
          mimeType: meta.mimeType,
          name: courseName,
          instructions: instructions,
          purpose: (meta.name.courseIntroduction) ? meta.name.courseIntroduction : '',
          // organisation: [environment.organisation],
          organisation: [
            (this.configSvc.userProfile && this.configSvc.userProfile.departmentName) ? this.configSvc.userProfile.departmentName : '',
          ],
          isExternal: meta.mimeType === 'text/x-url',
          primaryCategory: meta.primaryCategory,
          license: 'CC BY 4.0',
          ownershipType: ['createdFor'],
        },
      },
    }
    return this.http
      .post<NSApiRequest.ICreateMetaRequest>(
        `${AUTHORING_BASE}content/v3/create`,
        requestBody,
      )
      .pipe(
        map((data: any) => {
          return data.result
        }),
      )
  }
  createForum(req: any) {
    return this.http.post(API_END_POINTS.CREATE_FORUM, req)
  }
}
