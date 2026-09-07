import { of, throwError } from 'rxjs'

import { sendContentEmailNotification } from './content-email-notification'

/**
 * Extracted from module-creation and course-collection, where it was duplicated
 * verbatim. These pin the recipient rules per action, because the original expressed
 * them as a switch whose branches were the same loop over a different field.
 */
describe('sendContentEmailNotification', () => {
  let editorService: any
  let contentService: any
  let configurationsService: any

  const content = (over: any = {}) => ({
    identifier: 'do_1',
    reviewer: [{ email: 'rev@x.com' }],
    publisherDetails: [{ email: 'pub@x.com' }],
    creatorContacts: [{ email: 'creator@x.com' }],
    ...over,
  })

  const deps = (meta: any) => {
    editorService = { sendEmailNotificationAPI: jest.fn().mockReturnValue(of({ ok: true })) }
    contentService = { parentContent: 'do_1', getOriginalMeta: jest.fn().mockReturnValue(meta) }
    configurationsService = { userProfile: { userName: 'Creator One', email: 'me@x.com' } }
    return { editorService, contentService, configurationsService }
  }

  const sentPayload = () => editorService.sendEmailNotificationAPI.mock.calls[0][0]

  describe('who gets the mail', () => {
    it.each([
      ['sendForReview', 'rev@x.com'],
      ['sendForPublish', 'pub@x.com'],
      ['reviewFailed', 'creator@x.com'],
      ['publishFailed', 'creator@x.com'],
      ['publishCompleted', 'creator@x.com'],
    ])('%s goes to %s', async (action, email) => {
      await sendContentEmailNotification(deps(content()), action)

      expect(sentPayload().recipientEmails).toEqual([email])
    })

    it('collects every address on the field, skipping entries without one', async () => {
      const d = deps(content({ reviewer: [{ email: 'a@x.com' }, { name: 'no email' }, { email: 'b@x.com' }] }))
      await sendContentEmailNotification(d, 'sendForReview')

      expect(sentPayload().recipientEmails).toEqual(['a@x.com', 'b@x.com'])
    })
  })

  describe('when nothing should be sent', () => {
    it.each([
      ['the field is missing', { reviewer: undefined }],
      ['the field is empty', { reviewer: [] }],
      ['nobody has an email', { reviewer: [{ name: 'someone' }] }],
      ['the field is malformed json', { reviewer: '{ not json' }],
    ])('sends nothing when %s', async (_label, over) => {
      const d = deps(content(over))
      await sendContentEmailNotification(d, 'sendForReview')

      expect(editorService.sendEmailNotificationAPI).not.toHaveBeenCalled()
    })

    it('sends nothing for an action with no recipient rule', async () => {
      const d = deps(content())
      await sendContentEmailNotification(d, 'somethingElse')

      expect(editorService.sendEmailNotificationAPI).not.toHaveBeenCalled()
    })
  })

  describe('the payload', () => {
    it('carries the action, the author and a link to the content', async () => {
      await sendContentEmailNotification(deps(content()), 'sendForReview')

      const p = sentPayload()
      expect(p.contentState).toBe('sendForReview')
      expect(p.contentName).toBe('Creator One')
      expect(p.sender).toBe('me@x.com')
      expect(p.contentLink).toContain('author/editor/do_1/collection')
    })

    it('leaves the author fields blank when there is no profile', async () => {
      const d = deps(content())
      d.configurationsService = { userProfile: null }
      await sendContentEmailNotification(d, 'sendForReview')

      expect(sentPayload().contentName).toBe('')
      expect(sentPayload().sender).toBe('')
    })

    it('reads the content via the parent id', async () => {
      const d = deps(content())
      await sendContentEmailNotification(d, 'sendForReview')

      expect(d.contentService.getOriginalMeta).toHaveBeenCalledWith('do_1')
    })
  })

  describe('stored as a json string, as the server returns it', () => {
    it.each([
      ['sendForReview', 'reviewer', 'rev@x.com'],
      ['sendForPublish', 'publisherDetails', 'pub@x.com'],
      ['publishCompleted', 'creatorContacts', 'creator@x.com'],
    ])('%s parses %s', async (action, field, email) => {
      const d = deps(content({ [field]: JSON.stringify([{ email }]) }))
      await sendContentEmailNotification(d, action)

      expect(sentPayload().recipientEmails).toEqual([email])
    })
  })

  it('does not reject when sending fails -- the state change already happened', async () => {
    const d = deps(content())
    d.editorService.sendEmailNotificationAPI = jest.fn().mockReturnValue(throwError(() => new Error('smtp down')))

    await expect(sendContentEmailNotification(d, 'sendForReview')).resolves.toBeUndefined()
  })
})
