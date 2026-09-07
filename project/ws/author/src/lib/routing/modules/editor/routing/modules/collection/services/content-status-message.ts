import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

/**
 * Which notification to show after an action on content in a given state.
 *
 * The workflow is Draft/Live -> send for review -> InReview -> review -> Reviewed ->
 * publish, so the message depends on the state the content was in when the action ran,
 * not on the action itself.
 *
 * This was duplicated verbatim in module-creation and course-collection as two
 * switches over the same states, one for each outcome. A state the workflow does not
 * cover yields an empty string, which callers treat as "say nothing".
 */
const MESSAGES: { [status: string]: { success: string; failure: string } } = {
  Draft: { success: Notify.SEND_FOR_REVIEW_SUCCESS, failure: Notify.SEND_FOR_REVIEW_FAIL },
  Live: { success: Notify.SEND_FOR_REVIEW_SUCCESS, failure: Notify.SEND_FOR_REVIEW_FAIL },
  InReview: { success: Notify.REVIEW_SUCCESS, failure: Notify.REVIEW_FAIL },
  Reviewed: { success: Notify.PUBLISH_SUCCESS, failure: Notify.PUBLISH_FAIL },
  Review: { success: Notify.PUBLISH_SUCCESS, failure: Notify.PUBLISH_FAIL },
}

export function getStatusMessage(status: string, type: 'success' | 'failure'): string {
  const entry = MESSAGES[status]
  if (!entry) {
    return ''
  }
  return type === 'success' ? entry.success : entry.failure
}
