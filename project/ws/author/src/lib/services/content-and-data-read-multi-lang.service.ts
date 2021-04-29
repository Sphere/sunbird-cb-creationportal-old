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



  resolve(
    route: ActivatedRouteSnapshot,
  ): Observable<{ content: NSContent.IContentMeta, data: any }[]> | null {
    const id = route.params['id']
    if (id !== 'new') {
      return this.apiService.get<{ content: NSContent.IContentMeta, data: any }[]>(
        `/apis/proxies/v8/action/content/v3/hierarchy/${id}?mode=edit`,
      ).pipe(
        map((data: any) => {
          console.log('Hierarchy CONTENT-data-multi === IF ', data)
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
