import { Injectable } from '@angular/core'

import { NSContent } from '@ws/author/src/lib/interface/content'
import { EMPTY, Observable, of } from 'rxjs'
import { AccessControlService } from '../../../../../../../modules/shared/services/access-control.service'
import { ApiService } from '../../../../../../../modules/shared/services/api.service'
import { CONTENT_READ_HIERARCHY_AND_DATA } from '../../../../../../../constants/apiEndpoints'
import { catchError, map } from 'rxjs/operators'
import { Router } from '@angular/router'
import { HttpClient, HttpBackend } from '@angular/common/http'

@Injectable()
export class QuizResolverService {
  constructor(
    private accessControl: AccessControlService,
    private apiService: ApiService,
    private router: Router,
    private httpBackend: HttpBackend
  ) { }

  canEdit(meta: NSContent.IContentMeta): boolean {
    // reviwer or publisher cannot edit or add or delete
    let returnVal = true
    if (meta.trackContacts && meta.trackContacts.length) {
      meta.trackContacts.forEach(v => {
        if (v.id === this.accessControl.userId) {
          returnVal = false
        }
      })
    }
    if (meta.publisherDetails && meta.publisherDetails.length && meta.status === 'InReview') {
      meta.publisherDetails.forEach(v => {
        if (v.id === this.accessControl.userId) {
          returnVal = false
        }
      })
    }
    if (meta.creatorContacts && meta.creatorContacts.length && meta.status === 'Reviewed') {
      meta.creatorContacts.forEach(v => {
        if (v.id === this.accessControl.userId) {
          returnVal = true
        }
      })
    }
    return returnVal
  }

  getUpdatedData(id: string): Observable<{ content: NSContent.IContentMeta, data: any }[] | any> {
    return this.apiService.get<{ content: NSContent.IContentMeta, data: any }[]>(
      `${CONTENT_READ_HIERARCHY_AND_DATA}${id}?mode=edit`,
    ).pipe(
      catchError((v: any) => {
        this.router.navigateByUrl('/error-somethings-wrong')
        return of(v)
      }),
    )
  }

  getJSON(path: string): Observable<any> {
    if (path) {
      const newHttpClient = new HttpClient(this.httpBackend)
      return newHttpClient.get(path).pipe(
        map((res: any) => res)).pipe(
          catchError(() => {
            return of({ })
          })
        )
    }
    return EMPTY

  }

}
