import { of } from 'rxjs'

import { NotificationService } from './notification.service'
import { NOTIFICATION } from '../constants/apiEndpoints'

describe('NotificationService', () => {
  let apiService: any
  let workFlowService: any
  let accessService: any
  let initService: any
  let service: NotificationService

  const baseContent: any = {
    identifier: 'do_123',
    name: 'My Content',
    category: 'Course',
    contentType: 'Course',
    status: 'Draft',
    expiryDate: '2026-01-01',
    creatorContacts: [{ id: 'author1' }],
    trackContacts: [{ id: 'reviewer1' }],
    publisherDetails: [{ id: 'pub1' }],
  }

  beforeEach(() => {
    apiService = { post: jest.fn().mockReturnValue(of({ ok: true })) }
    workFlowService = {
      getWorkFlow: jest.fn().mockReturnValue(['Draft', 'InReview', 'Reviewed', 'Live']),
      getNextStatus: jest.fn().mockReturnValue('InReview'),
      getOwner: jest.fn().mockReturnValue('trackContacts'),
      getActionName: jest.fn().mockReturnValue('Review'),
      getOwnerName: jest.fn().mockReturnValue('Reviewer'),
    }
    accessService = { userId: 'me' }
    initService = { authAdditionalConfig: { allowNotification: true } }
    service = new NotificationService(apiService, workFlowService, accessService, initService)
  })

  it('is created', () => {
    expect(service).toBeInstanceOf(NotificationService)
  })

  describe('triggerPushPullNotification', () => {
    it('returns empty observable when notifications are disabled', done => {
      initService.authAdditionalConfig.allowNotification = false
      service.triggerPushPullNotification(baseContent, 'c', true).subscribe(res => {
        expect(res).toEqual({})
        expect(apiService.post).not.toHaveBeenCalled()
        done()
      })
    })

    it('sends content for review when author forwards from Draft', done => {
      // Draft is index 0, nextAction InReview index 1 (< length-2 == 2), owner has members
      service.triggerPushPullNotification(baseContent, 'please review', true).subscribe(() => {
        expect(apiService.post).toHaveBeenCalledTimes(1)
        const [url, body] = apiService.post.mock.calls[0]
        expect(url).toBe(NOTIFICATION)
        expect(body['event-id']).toBe('send_content')
        expect(body.recipients.nextActor).toEqual(['reviewer1'])
        done()
      })
    })

    it('returns empty observable when forwarding but the next owner has no members', done => {
      const content = { ...baseContent, trackContacts: [] }
      service.triggerPushPullNotification(content, 'c', true).subscribe(res => {
        expect(res).toEqual({})
        expect(apiService.post).not.toHaveBeenCalled()
        done()
      })
    })

    it('sends a reject notification when not approved', done => {
      service.triggerPushPullNotification(baseContent, 'no good', false).subscribe(() => {
        const body = apiService.post.mock.calls[0][1]
        expect(body['event-id']).toBe('reject_content')
        expect(body.recipients.author).toEqual(['author1'])
        done()
      })
    })
  })

  describe('body builders', () => {
    it('publishContent builds a publish_content event', () => {
      const body = service.publishContent(baseContent, 'go', ['p1'])
      expect(body['event-id']).toBe('publish_content')
      expect(body['target-data'].identifier).toBe('do_123')
      expect(body.recipients.publisher).toEqual(['p1'])
      expect(body.recipients.author).toEqual(['author1'])
    })

    it('approveContent pluralises actor names based on count', () => {
      const body = service.approveContent(baseContent, 'ok', 'Review', 'Publish', 'Reviewer', 'Publisher', ['a', 'b'], ['n1'])
      expect(body['event-id']).toBe('approve_content')
      expect(body['tag-value-pair']['#currentActor']).toBe('Reviewers')
      expect(body['tag-value-pair']['#nextActor']).toBe('Publisher')
    })

    it('rejectContent builds a reject_content event', () => {
      const body = service.rejectContent(baseContent, 'bad', 'Review', 'Reviewer', ['a'])
      expect(body['event-id']).toBe('reject_content')
      expect(body.recipients.actor).toEqual(['a'])
    })

    it('sendContent builds a send_content event', () => {
      const body = service.sendContent(baseContent, 'c', 'Review', 'Reviewer', ['r1', 'r2'])
      expect(body['event-id']).toBe('send_content')
      expect(body['tag-value-pair']['#nextActor']).toBe('Reviewers')
    })
  })

  describe('lifecycle notifications', () => {
    it('deleteContent uses delete_live_content for Live content', done => {
      const content = { ...baseContent, status: 'Live' }
      service.deleteContent(content, 'c').subscribe(() => {
        expect(apiService.post.mock.calls[0][1]['event-id']).toBe('delete_live_content')
        done()
      })
    })

    it('deleteContent uses delete_non_live_content otherwise', done => {
      service.deleteContent(baseContent, 'c').subscribe(() => {
        expect(apiService.post.mock.calls[0][1]['event-id']).toBe('delete_non_live_content')
        done()
      })
    })

    it('markForDeletion builds a mark_content_for_deletion event', done => {
      service.markForDeletion(baseContent, 'c').subscribe(() => {
        expect(apiService.post.mock.calls[0][1]['event-id']).toBe('mark_content_for_deletion')
        done()
      })
    })

    it('unpublishContent builds an unpublish_content event', done => {
      service.unpublishContent(baseContent, 'c').subscribe(() => {
        expect(apiService.post.mock.calls[0][1]['event-id']).toBe('unpublish_content')
        done()
      })
    })

    it('moveToDraft builds a move_content_to_draft event', done => {
      service.moveToDraft(baseContent, 'c').subscribe(() => {
        expect(apiService.post.mock.calls[0][1]['event-id']).toBe('move_content_to_draft')
        done()
      })
    })

    it('lifecycle methods short-circuit when notifications are disabled', done => {
      initService.authAdditionalConfig.allowNotification = false
      service.moveToDraft(baseContent, 'c').subscribe(res => {
        expect(res).toEqual({})
        expect(apiService.post).not.toHaveBeenCalled()
        done()
      })
    })
  })

  it('getApi posts the body to the notification endpoint', () => {
    service.getApi({ hello: 'world' })
    expect(apiService.post).toHaveBeenCalledWith(NOTIFICATION, { hello: 'world' }, false)
  })
})
