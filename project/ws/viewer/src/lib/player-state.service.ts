import { Injectable } from '@angular/core'
import { BehaviorSubject, ReplaySubject } from 'rxjs'
import * as _ from 'lodash'
import { take } from 'rxjs/operators'

export interface IPlayerSateStore {
  tocAvailable: boolean
  nextResource: string | null
  prevResource: string | null
}
@Injectable({
  providedIn: 'root',
})

export class PlayerStateService {
  playerState = new ReplaySubject<IPlayerSateStore>(1)
  trigger$ = new BehaviorSubject<any>(undefined)
  // tslint:disable-next-line: max-line-length
  setState({ isValid = true, prev = null, next = null }:
    // tslint:disable-next-line: max-line-length
    { isValid: boolean; prev: string | null; next?: string | null }) {
    // tslint:disable-next-line:object-shorthand-properties-first
    this.playerState.next(
      {
        tocAvailable: isValid,
        nextResource: next,
        prevResource: prev,
      },
    )
  }

  getPrevResource() {
    let prevResource: any
    const tdata = this.trigger$.getValue()
    if (_.isUndefined(tdata)) {
      this.playerState.subscribe((data: any) => {
        if (_.get(data, 'prevResource')) {
          prevResource = _.get(data, 'prevResource')
          this.trigger$.next(prevResource)
        }
      })
      return prevResource
    }
    return prevResource

  }

  getNextResource() {
    let nextResource = ''
    this.playerState.pipe(take(1)).subscribe((data: any) => {
      if (_.get(data, 'nextResource')) {
        nextResource = _.get(data, 'nextResource')
        return nextResource
      }
      return nextResource
    })
    return nextResource
  }
}