import { Injectable } from '@angular/core'
// tslint:disable
// import _ from 'lodash'
// tslint:enable
import { Observable } from 'rxjs'
import { ApiService } from '../../../../../../modules/shared/services/api.service'
import { NSCompetencyV2 } from '../interface/competency'
// import tempdataJson from './tempdata.json'

const PROTECTED_SLAG_V8 = '/apis/protected/v8'
const API_END_POINTS = {
  GET_DICTIONARY: `${PROTECTED_SLAG_V8}/frac/getAllNodes/dictionary`,
  GET_AREA: `${PROTECTED_SLAG_V8}/frac/getAllNodes/competencyarea`,
  GET_REQUESTED: `${PROTECTED_SLAG_V8}/frac/getAllNodes/re`,
  GET_COMP_BY_ID: (id: string, typ: string) => `${PROTECTED_SLAG_V8}/frac/getNodeById/${id}/${typ}`,
  SAVE_COMP: `${PROTECTED_SLAG_V8}/frac/addDataNode`,
  SAVE_COMP_BULK: `${PROTECTED_SLAG_V8}/frac/addDataNodeBulk`,
}
@Injectable()
export class CompService {
  constructor(
    private apiService: ApiService,
    // private configSvc: ConfigurationsService,
  ) { }
  fetchByTyp(typ: string): Observable<NSCompetencyV2.ICompetencyDictionary[]> {
    switch (typ) {
      case 'dictionary':
        return this.fetchDictionary()
      case 'area':
        return this.fetchArea()
      case 'requested':
        return this.fetchRequested()
      default:
        return this.fetchDictionary()
    }
  }
  fetchDictionary(): Observable<NSCompetencyV2.ICompetencyDictionary[]> {
    // const dept = this.configSvc.org
    // const newURL = `${API_END_POINTS.MANDATORY_CONTENT}&department=${dept}`
    return this.apiService.get<any>(API_END_POINTS.GET_DICTIONARY)
    // return of(JSON.parse(JSON.stringify(_.get(tempdataJson, 'responseData'))))
  }
  fetchArea(): Observable<NSCompetencyV2.ICompetencyDictionary[]> {
    // const dept = this.configSvc.org
    // const newURL = `${API_END_POINTS.MANDATORY_CONTENT}&department=${dept}`
    return this.apiService.get<any>(API_END_POINTS.GET_AREA)
    // return of(JSON.parse(JSON.stringify(_.get(tempdataJson, 'responseData'))))
  }
  fetchRequested(): Observable<NSCompetencyV2.ICompetencyDictionary[]> {
    // const dept = this.configSvc.org
    // const newURL = `${API_END_POINTS.MANDATORY_CONTENT}&department=${dept}`
    return this.apiService.get<any>(API_END_POINTS.GET_REQUESTED)
    // return of(JSON.parse(JSON.stringify(_.get(tempdataJson, 'responseData'))))
  }
  fetchById(id: string, type: string): Observable<NSCompetencyV2.ICompetencyDictionary> {
    return this.apiService.get<any>(API_END_POINTS.GET_COMP_BY_ID(id, type))
  }
  requestComp(data: NSCompetencyV2.ICompetencyDictionary): Observable<NSCompetencyV2.ICompetencyDictionary> {
    return this.apiService.post<NSCompetencyV2.ICompetencyDictionary>(API_END_POINTS.SAVE_COMP, data)
  }
  requestCompWithCheild(data: NSCompetencyV2.ICompetencyDictionary): Observable<NSCompetencyV2.ICompetencyDictionary> {
    return this.apiService.post<NSCompetencyV2.ICompetencyDictionary>(API_END_POINTS.SAVE_COMP_BULK, data)
  }
}
