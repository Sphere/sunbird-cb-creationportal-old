import { Injectable } from '@angular/core'
// tslint:disable
import _ from 'lodash'
// tslint:enable
import { Observable, of } from 'rxjs'
import { NSCompetencyV2 } from '../interface/competency'
import tempdataJson from './tempdata.json'

// const PROTECTED_SLAG_V8 = '/apis/protected/v8'
// const API_END_POINTS = {
//   MANDATORY_CONTENT: `${PROTECTED_SLAG_V8}/frac/getAllNodes?type=COMPETENCY`,
// }
@Injectable()
export class CompService {
  constructor(
    // private apiService: ApiService,
    // private configSvc: ConfigurationsService,
  ) { }
  fetchDictionary(): Observable<NSCompetencyV2.ICompetencyDictionary[]> {
    // const dept = this.configSvc.org
    // const newURL = `${API_END_POINTS.MANDATORY_CONTENT}&department=${dept}`
    // return this.apiService.get<any>(newURL)
    return of(JSON.parse(JSON.stringify(_.get(tempdataJson, 'responseData'))))
  }

}
