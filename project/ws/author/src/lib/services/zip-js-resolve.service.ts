import { Observable, Observer } from 'rxjs'
import { Injectable } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class ZipJSResolverService {
  private isExist = false
  constructor() { }

  inject(): Observable<boolean> {
    return new Observable<boolean>((observer: Observer<boolean>) => {
      if (this.isExist) {
        observer.next(true)
        observer.complete()
      } else {
        const scriptElement = document.createElement('script')
        scriptElement.type = 'text/javascript'
        scriptElement.src = '/assets/authoring/zip-js/zip.js'

        scriptElement.onload = () => {
          this.isExist = true
          observer.next(true)
          observer.complete()
        }

        scriptElement.onerror = () => {
          observer.error(false)
          observer.complete()
        }

        document.getElementsByTagName('body')[0].appendChild(scriptElement)
      }
    })
  }
}
