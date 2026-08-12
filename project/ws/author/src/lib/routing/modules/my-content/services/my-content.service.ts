import { Injectable } from '@angular/core'

import { UNPUBLISH_CONTENT } from '@ws/author/src/lib/constants/apiEndpoints'

import { Observable } from 'rxjs'

import { MyContentService as ContentDetailService } from '../../home/components/content-detail/services/content-detail.service'

/**
 * Content service for the my-content screens.
 *
 * This was a verbatim copy of the content-detail service: eleven of its methods were
 * byte-identical, and only the two below actually belonged to it. It now extends that
 * service and declares just the difference, the same way the sibling service under
 * home/components/my-content already does.
 *
 * Still `@Injectable()` without `providedIn`, so each feature module continues to get
 * its own instance exactly as before.
 */
@Injectable()
export class MyContentService extends ContentDetailService {
  /**
   * Unpublish via the newer endpoint, which takes a list of content ids in the body
   * of a DELETE rather than a single identifier in a POST.
   */
  deleteOrUnpublishContent(id: string): Observable<null> {
    const requestBody = {
      request: {
        contentIds: [id],
      },
    }
    return this.apiService.delete<any>(`${UNPUBLISH_CONTENT}`, { body: requestBody })
  }

  /**
   * These screens moved to the newer unpublish endpoint, so this deliberately does
   * NOT call the inherited implementation, which still posts to the old one. The two
   * bodies were identical before, hence the delegation rather than a second copy.
   */
  upPublishOrDraft(id: string): Observable<null> {
    return this.deleteOrUnpublishContent(id)
  }
}
