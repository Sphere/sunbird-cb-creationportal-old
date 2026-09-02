import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

import { getStatusMessage } from './content-status-message'

/**
 * Extracted from module-creation and course-collection, where the same pair of
 * switches appeared verbatim. The message depends on the state the content was in
 * when the action ran, not on the action.
 */
describe('getStatusMessage', () => {
  describe('success', () => {
    it.each([
      ['Draft', Notify.SEND_FOR_REVIEW_SUCCESS],
      ['Live', Notify.SEND_FOR_REVIEW_SUCCESS],
      ['InReview', Notify.REVIEW_SUCCESS],
      ['Reviewed', Notify.PUBLISH_SUCCESS],
      ['Review', Notify.PUBLISH_SUCCESS],
    ])('%s', (status, expected) => {
      expect(getStatusMessage(status, 'success')).toBe(expected)
    })
  })

  describe('failure', () => {
    it.each([
      ['Draft', Notify.SEND_FOR_REVIEW_FAIL],
      ['Live', Notify.SEND_FOR_REVIEW_FAIL],
      ['InReview', Notify.REVIEW_FAIL],
      ['Reviewed', Notify.PUBLISH_FAIL],
      ['Review', Notify.PUBLISH_FAIL],
    ])('%s', (status, expected) => {
      expect(getStatusMessage(status, 'failure')).toBe(expected)
    })
  })

  describe('states outside the workflow', () => {
    it.each([['Processing'], ['Failed'], ['Retired'], ['']])('says nothing for %s', status => {
      expect(getStatusMessage(status, 'success')).toBe('')
      expect(getStatusMessage(status, 'failure')).toBe('')
    })

    it('says nothing for an undefined status rather than throwing', () => {
      expect(getStatusMessage(undefined as any, 'success')).toBe('')
    })
  })

  it('never returns the same message for both outcomes of a workflow state', () => {
    for (const status of ['Draft', 'Live', 'InReview', 'Reviewed', 'Review']) {
      expect(getStatusMessage(status, 'success')).not.toBe(getStatusMessage(status, 'failure'))
    }
  })
})
