import { Injectable } from '@angular/core'
import { Resolve } from '@angular/router'
import { Observable, of } from 'rxjs'
import { catchError, map } from 'rxjs/operators'
import { IResolveResponse } from '@ws-widget/utils'
import { NSCompetencyV2 } from '../interface/competency'
import { CompService } from '../services/competencies.service'

@Injectable()
export class ResolveAreaService
  implements
  Resolve<Observable<IResolveResponse<NSCompetencyV2.ICompetencyDictionary>> | IResolveResponse<NSCompetencyV2.ICompetencyDictionary[]>
  > {
  constructor(
    private mySvc: CompService,
  ) {
  }
  resolve(): Observable<IResolveResponse<NSCompetencyV2.ICompetencyDictionary[]>> {
    return this.mySvc.fetchArea().pipe(
      map(data => ({ data, error: null })),
      catchError(error => of({ error, data: null })),
    )
  }
}
