import { Injectable } from '@angular/core'

import { BtnPageBackService } from '../btn-page-back/btn-page-back.service'

/**
 * Back-navigation history for the nav-bar variant of the back button.
 *
 * The behaviour is identical to `BtnPageBackService` — this was a verbatim copy of it.
 * It stays a distinct injectable rather than an alias because both are `providedIn:
 * 'root'`: the two back buttons each need their own `previousRouteUrls` stack, and
 * collapsing them onto one token would make the widgets share (and corrupt) a single
 * history.
 */
@Injectable({
  providedIn: 'root',
})
export class BtnPageBackNavService extends BtnPageBackService {}
