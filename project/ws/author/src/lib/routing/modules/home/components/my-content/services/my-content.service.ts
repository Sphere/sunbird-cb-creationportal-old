import { Injectable } from '@angular/core'

import { MyContentService as ContentDetailService } from '../../content-detail/services/content-detail.service'

const PROTECTED_SLAG_V8 = '/apis/protected/v8'
const API_END_POINTS = {
  MANDATORY_CONTENT: `${PROTECTED_SLAG_V8}/user/mandatoryContent/checkStatus`,
}

/**
 * Content service for the my-content screens.
 *
 * This was a verbatim copy of the content-detail service plus a single extra endpoint,
 * so it now extends it and declares only that difference. Both stay `@Injectable()`
 * without `providedIn`, so each feature module still gets its own instance exactly as
 * before.
 */
@Injectable()
export class MyContentService extends ContentDetailService {
  getUserCourseDetail() {
    return this.apiService.get<any>(API_END_POINTS.MANDATORY_CONTENT)
  }
}
