import { Observable } from 'rxjs'

import { environment } from '../../../../../../../../../../../../src/environments/environment'

/**
 * Collaborators the notification needs, described structurally rather than by class.
 *
 * Keeping these as shapes means this helper pulls in no Angular services of its own, so
 * the two components can hand over the instances they already hold without gaining a
 * constructor argument -- fourteen spec files construct them directly with `new`, and a
 * new parameter would break every one.
 */
export interface IEmailNotificationDeps {
  configurationsService: { userProfile?: { userName?: string; email?: string } | null }
  contentService: { parentContent: any; getOriginalMeta(id: any): any }
  editorService: { sendEmailNotificationAPI(payload: any): Observable<any> }
}

/** Field on the content holding the recipients for a given action. */
const RECIPIENTS_FIELD: { [actionType: string]: string } = {
  sendForReview: 'reviewer',
  sendForPublish: 'publisherDetails',
  reviewFailed: 'creatorContacts',
  publishFailed: 'creatorContacts',
  publishCompleted: 'creatorContacts',
}

/**
 * The field is a JSON string on content read from the server, but a live array once it
 * has been written in memory. Tolerate both, and anything malformed.
 */
function readContacts(raw: any): any[] {
  let contacts = raw
  if (typeof raw === 'string') {
    try {
      contacts = JSON.parse(raw)
    } catch {
      return []
    }
  }
  return Array.isArray(contacts) ? contacts : []
}

/**
 * Emails the people who need to know that content changed state.
 *
 * This was duplicated verbatim in module-creation and course-collection -- 65 lines
 * differing only by a stray console.log. The original used a switch whose three
 * branches were the same loop over a different field, so that is a lookup now.
 *
 * Recipients are whoever is named on the content for that action, and nothing is sent
 * when none of them has an email. A failure to send is swallowed exactly as before:
 * the state change has already happened and must not be reported as failed.
 */
export async function sendContentEmailNotification(deps: IEmailNotificationDeps, actionType: string): Promise<void> {
  const { configurationsService, contentService, editorService } = deps
  const originalData = contentService.getOriginalMeta(contentService.parentContent)
  const profile = configurationsService.userProfile

  const recipientEmails: string[] = []
  const field = RECIPIENTS_FIELD[actionType]
  if (field) {
    readContacts(originalData[field]).forEach((element: any) => {
      if (element && element.email) {
        recipientEmails.push(element.email)
      }
    })
  }

  if (!recipientEmails.length) {
    return
  }

  const emailReqPayload = {
    contentState: actionType,
    contentLink: `${environment.cbpPortal}author/editor/${originalData.identifier}/collection`,
    contentName: profile ? profile.userName : '',
    sender: profile ? profile.email : '',
    recipientEmails,
  }

  await editorService
    .sendEmailNotificationAPI(emailReqPayload)
    .toPromise()
    .catch(_error => {})
}
