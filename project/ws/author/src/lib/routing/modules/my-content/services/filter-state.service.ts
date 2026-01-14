import { Injectable } from '@angular/core'
import { BehaviorSubject, Observable } from 'rxjs'

@Injectable({
  providedIn: 'root'
})
export class FilterStateService {
  private filterStateSubject = new BehaviorSubject<any>([])
  private sourceNameSubject = new BehaviorSubject<string>('')
  private languageSubject = new BehaviorSubject<string>('')

  filterState$: Observable<any> = this.filterStateSubject.asObservable()
  sourceName$: Observable<string> = this.sourceNameSubject.asObservable()
  language$: Observable<string> = this.languageSubject.asObservable()

  constructor() { }

  setFilters(filters: any) {
    this.filterStateSubject.next(filters)
  }

  getFilters(): any {
    return this.filterStateSubject.value
  }

  setSourceName(sourceName: string) {
    this.sourceNameSubject.next(sourceName)
  }

  getSourceName(): string {
    return this.sourceNameSubject.value
  }

  setLanguage(language: string) {
    this.languageSubject.next(language)
  }

  getLanguage(): string {
    return this.languageSubject.value
  }

  clearFilters() {
    this.filterStateSubject.next([])
    this.sourceNameSubject.next('')
    this.languageSubject.next('')
  }
}
