import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Resolve } from '@angular/router'
import { EMPTY, Observable, of } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { IResolveResponse } from '@ws-widget/utils'
import { NSCompetencyV2 } from '../interface/competency'
import { CompService } from '../services/competencies.service'

@Injectable()
export class CompetencyByIdResolverService
  implements
  Resolve<Observable<IResolveResponse<NSCompetencyV2.ICompetencyDictionary>> | IResolveResponse<NSCompetencyV2.ICompetencyDictionary>
  > {
  constructor(
    private mySvc: CompService,
  ) {
  }

  resolve(route: ActivatedRouteSnapshot): Observable<IResolveResponse<NSCompetencyV2.ICompetencyDictionary>> {
    const typ = 'COMPETENCY'
    const compId = route.paramMap.get('competencyId')
    if (compId) {
      const data: string = route.data ? route.data.type || typ : typ
      return this.mySvc.fetchById(compId, data).pipe(
        map(data => ({ data, error: null })),
        catchError(error => of({ error, data: null })),
      )
    } else {
      return EMPTY
    }
  }
}
