import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { ConfigurationsService, getStringifiedQueryParams } from '../../../../../utils/src/public-api'
import { NsAutoComplete } from './user-autocomplete.model'

// TODO: move this in some common place
const PROTECTED_SLAG_V8 = '/apis/protected/v8'
const PROXIES_V8 = '/apis/proxies/v8'
const API_END_POINTS = {
  // AUTOCOMPLETE: (query: string) => `${PROTECTED_SLAG_V8}/user/autocomplete/${query}`,
  AUTOCOMPLETE: (query: string) => `${PROXIES_V8}/user/v1/autocomplete/${query}`,
  AUTOCOMPLETE_BY_DEPARTMENT: (query: string) => `${PROTECTED_SLAG_V8}/user/autocomplete/department/${query}`,
}

@Injectable({
  providedIn: 'root',
})
export class UserAutocompleteService {

  constructor(
    private http: HttpClient,
    private configSvc: ConfigurationsService
  ) { }

  fetchAutoComplete(
    query: string,
  ): Observable<NsAutoComplete.IUserAutoComplete[]> {
    let url = API_END_POINTS.AUTOCOMPLETE(query)

    const stringifiedQueryParams = getStringifiedQueryParams({
      dealerCode: this.configSvc.userProfile && this.configSvc.userProfile.dealerCode ? this.configSvc.userProfile.dealerCode : undefined,
      sourceFields: this.configSvc.instanceConfig && this.configSvc.instanceConfig.sourceFieldsUserAutocomplete
        ? this.configSvc.instanceConfig.sourceFieldsUserAutocomplete
        : undefined,
    })

    url += stringifiedQueryParams ? `?${stringifiedQueryParams}` : ''

    return this.http.get<NsAutoComplete.IUserAutoComplete[]>(
      url ,
    )
  }

  fetchAutoCompleteV2(
    query: string,
    roleType?: string
  ): Observable<NsAutoComplete.IUserAutoComplete[]> {
    let url = API_END_POINTS.AUTOCOMPLETE(query)
    const stringifiedQueryParams = getStringifiedQueryParams({
      dealerCode: this.configSvc.userProfile && this.configSvc.userProfile.dealerCode ? this.configSvc.userProfile.dealerCode : undefined,
      sourceFields: this.configSvc.instanceConfig && this.configSvc.instanceConfig.sourceFieldsUserAutocomplete
        ? this.configSvc.instanceConfig.sourceFieldsUserAutocomplete
        : undefined,
    })

    url += stringifiedQueryParams ? `?${stringifiedQueryParams}` : ''

    return this.http.get<NsAutoComplete.IUserAutoComplete[]>(url).pipe(
      map((data: any) => {
        const resData: any = []

        if (data && data.params && data.params.status === 'success') {
          const tempData = (data.result && data.result.response && data.result.response.count > 0) ? data.result.response.content : []
          if (tempData && tempData.length > 0) {
            tempData.forEach((element: any) => {
             if (element.roles && element.roles.length > 0 && element.roles.filter((v: any) => v.role === roleType).length) {
                if (roleType === 'CONTENT_PUBLISHER') {
                  resData.push(this.getAutoCompleteData(element))
                } else if (roleType === 'CONTENT_REVIEWER') {
                  resData.push(this.getAutoCompleteData(element))
                } else {
                  if (this.configSvc.userProfile && (element.rootOrgName === this.configSvc.userProfile.departmentName)) {
                    resData.push(this.getAutoCompleteData(element))
                  }
                }
              } else if (roleType === 'ANY_ROLE') {
                resData.push(this.getAutoCompleteData(element))
              }
            })
          }
        }
        return resData
      })
    )
  }

  getAutoCompleteData(resData: any) {
    const tempData = {
      department_name: (resData.rootOrgName) ? resData.rootOrgName : '',
      email: (
        resData.profileDetails && resData.profileDetails.personalDetails
        && resData.profileDetails.personalDetails.primaryEmail
      ) ? resData.profileDetails.personalDetails.primaryEmail : '',
      first_name: (resData.firstName) ? resData.firstName : '',
      last_name: (resData.lastName) ? resData.lastName : '',
      root_org: '',
      wid: (resData.id) ? resData.id : '',
    }
    return tempData
  }

  fetchAutoCompleteByDept(
    query: string,
    departments: any
  ): Observable<NsAutoComplete.IUserAutoComplete[]> {
    let url = API_END_POINTS.AUTOCOMPLETE_BY_DEPARTMENT(query)

    const stringifiedQueryParams = getStringifiedQueryParams({
      dealerCode: this.configSvc.userProfile && this.configSvc.userProfile.dealerCode ? this.configSvc.userProfile.dealerCode : undefined,
      sourceFields: this.configSvc.instanceConfig && this.configSvc.instanceConfig.sourceFieldsUserAutocomplete
        ? this.configSvc.instanceConfig.sourceFieldsUserAutocomplete
        : undefined,
    })

    url += stringifiedQueryParams ? `?${stringifiedQueryParams}` : ''

    return this.http.post<NsAutoComplete.IUserAutoComplete[]>(
      url,
      { departments }
    )
  }
}
