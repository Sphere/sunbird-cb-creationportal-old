import { Injectable } from '@angular/core'
import { Resolve, ActivatedRouteSnapshot, Router } from '@angular/router'
import { Observable, of } from 'rxjs'
import { ApiService } from '../modules/shared/services/api.service'
import { NSContent } from '../interface/content'
// import { CONTENT_READ_HIERARCHY_AND_DATA } from '../constants/apiEndpoints'
import { catchError, map } from 'rxjs/operators'

@Injectable()
export class ContentAndDataReadMultiLangTOCResolver implements Resolve<{ content: NSContent.IContentMeta, data: any }[] | null> {

  constructor(
    private apiService: ApiService,
    private router: Router,
  ) {
  }

  // resolve(
  //   route: ActivatedRouteSnapshot,
  // ): Observable<{ content: NSContent.IContentMeta, data: any }[]> {
  //   const id = route.params['id']
  //   return this.apiService.get<{ content: NSContent.IContentMeta, data: any }[]>(
  //     `${CONTENT_READ_HIERARCHY_AND_DATA}${id}`,
  //   ).pipe(
  //     catchError((v: any) => {
  //       this.router.navigateByUrl('/error-somethings-wrong')
  //       return of(v)
  //     }),
  //   )
  // }

  // resolve(
  //   route: ActivatedRouteSnapshot,
  // ): Observable<{ content: NSContent.IContentMeta, data: any }[]> {
  //   const id = route.params['id']
  //   return this.apiService.get<{ content: NSContent.IContentMeta, data: any }[]>(
  //     `/apis/proxies/v8/action/content/v3/hierarchy/${id}?mode=edit`,
  //   ).pipe(
  //     catchError((v: any) => {
  //       this.router.navigateByUrl('/error-somethings-wrong')
  //       return of(v)
  //     }),
  //   )
  // }


  jsonVerify(s: string) { try { JSON.parse(s); return true } catch (e) { return false } }

  resolve(
    route: ActivatedRouteSnapshot,
  ): Observable<{ content: NSContent.IContentMeta, data: any }[]> | null {
    const id = route.params['id']
    if (id !== 'new') {
      return this.apiService.get<{ content: NSContent.IContentMeta, data: any }[]>(
        `/apis/proxies/v8/action/content/v3/hierarchy/${id}?mode=edit`,
      ).pipe(
        map((data: any) => {
          data.result.content.creatorContacts =
            this.jsonVerify(data.result.content.creatorContacts) ? JSON.parse(data.result.content.creatorContacts) : []
          if (data.result && data.result.content) {
            data.result.content.trackContacts =
              this.jsonVerify(data.result.content.reviewer) ? JSON.parse(data.result.content.reviewer) : []
            data.result.content.creatorDetails =
              this.jsonVerify(data.result.content.creatorDetails) ? JSON.parse(data.result.content.creatorDetails) : []
            data.result.content.publisherDetails = this.jsonVerify(data.result.content.publisherDetails) ?
              JSON.parse(data.result.content.publisherDetails) : []
            if (data.result.content.children.length > 0) {
              data.result.content.children.forEach((element: any) => {
                element.creatorContacts = this.jsonVerify(element.creatorContacts) ? JSON.parse(element.creatorContacts) : []
                element.trackContacts = this.jsonVerify(element.reviewer) ? JSON.parse(element.reviewer) : []
                element.creatorDetails = this.jsonVerify(element.creatorDetails) ? JSON.parse(element.creatorDetails) : []
                element.publisherDetails = this.jsonVerify(element.publisherDetails) ? JSON.parse(element.publisherDetails) : []
              })
            }
          }
          return [data.result]
        }),
        catchError((v: any) => {
          this.router.navigateByUrl('/error-somethings-wrong')
          return of(v)
        }),
      )
    }
    return null
  }

}
