import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Observable, ReplaySubject } from 'rxjs'
import { map } from 'rxjs/operators'

// TODO: move this in some common place
const PROTECTED_SLAG_V8 = '/apis/protected/v8'
const API_END_POINTS = {
  PROGRESS_HASH: `${PROTECTED_SLAG_V8}/user/progress`,
  'getCourseComments': `${PROTECTED_SLAG_V8}/scroing/comments`,
  'createComment': `${PROTECTED_SLAG_V8}/scroing/comments/create`
}

@Injectable({
  providedIn: 'root',
})
export class ContentProgressService {

  private progressHashSubject: ReplaySubject<{ [id: string]: number }> = new ReplaySubject(1)
  private progressHash: { [id: string]: number } | null = null
  private isFetchingProgress = false

  constructor(
    private http: HttpClient,
  ) { }

  getProgressFor(id: string): Observable<number> {
    if (this.shouldFetchProgress) {
      this.fetchProgressHash()
    }
    return this.progressHashSubject.pipe(map(hash => hash[id]))
  }

  getComments(id: string): Observable<any> {
    return this.http
      .get<any>(`${API_END_POINTS.getCourseComments}/course?courseId=${id}`)
  }

  addComment(data: any) {
    return this.http.post(
      API_END_POINTS.createComment, data)
  }

  getProgressHash(): Observable<{ [id: string]: number }> {
    if (this.shouldFetchProgress) {
      this.fetchProgressHash()
    }
    return this.progressHashSubject
  }
  private fetchProgressHash() {
    this.isFetchingProgress = true
    // this.http.get<{ [id: string]: number }>(API_END_POINTS.PROGRESS_HASH).subscribe(data => {
    //   this.progressHash = data
    //   this.isFetchingProgress = false
    //   this.progressHashSubject.next(data)
    // })
  }
  private get shouldFetchProgress(): boolean {
    return Boolean(this.progressHash === null && !this.isFetchingProgress)
  }

  fetchProgressHashContentsId(
    contentIds: any,
  ): Observable<any> {
    const url = API_END_POINTS.PROGRESS_HASH
    return this.http.post<any>(url, contentIds)
  }

  updateProgressHash(progressdata: any) {
    if (this.progressHash) {
      Object.keys(progressdata).forEach((id: string) => {
        if (this.progressHash && progressdata[id].new_progress) {
          this.progressHash[id] = progressdata[id].new_progress
        }
      })
      this.progressHashSubject.next(this.progressHash)
    }
  }
}
