import { Observable, Observer } from 'rxjs'

import { Injectable } from '@angular/core'


@Injectable({ providedIn: 'root' })
export class CKEditorResolverService {

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
        scriptElement.src = '/assets/authoring/ckeditor/ckeditor.js'

        scriptElement.onload = () => {
          // Silence CKEditor 4's version/security notification banner (added in 4.22)
          // for every instance created through this load path. Supported, free flag.
          const ck = (window as any).CKEDITOR
          if (ck && ck.config) {
            ck.config.versionCheck = false
          }
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
