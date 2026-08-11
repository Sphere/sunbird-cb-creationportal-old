import { of } from 'rxjs'

import { NotificationService } from './notification.service'

/**
 * Wave 18 — the reviewer/publisher branch of `triggerPushPullNotification` and
 * the disabled-notification guards on the individual notification builders.
 */
describe('NotificationService (workflow branches)', () => {
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

  const body = () => apiService.post.mock.calls[0][1]

  describe('triggerPushPullNotification', () => {
    it('notifies both owners when a reviewer moves the content on', done => {
      // Reviewed sits past the first stage and the next action is still short of the
      // final two, so the approve branch runs.
      const content = { ...baseContent, status: 'Reviewed' }
      workFlowService.getNextStatus.mockReturnValue('InReview')
      workFlowService.getOwner.mockReturnValueOnce('publisherDetails').mockReturnValueOnce('trackContacts')
      service.triggerPushPullNotification(content, 'looks good', true).subscribe(() => {
        expect(body()['event-id']).toBe('approve_content')
        expect(body().recipients.author).toEqual(['author1'])
        done()
      })
    })

    it('copes with an owner list that does not exist on the content', done => {
      const content = { ...baseContent, status: 'Reviewed' }
      workFlowService.getNextStatus.mockReturnValue('InReview')
      workFlowService.getOwner.mockReturnValue('missingOwners')
      service.triggerPushPullNotification(content, 'c', true).subscribe(() => {
        expect(apiService.post).toHaveBeenCalled()
        done()
      })
    })

    it('sends nothing once the content reaches the end of the workflow', done => {
      workFlowService.getNextStatus.mockReturnValue('Live')
      const content = { ...baseContent, status: 'Reviewed' }
      service.triggerPushPullNotification(content, 'c', true).subscribe(res => {
        expect(res).toEqual({})
        expect(apiService.post).not.toHaveBeenCalled()
        done()
      })
    })

    it('copes with a rejection on content that has no author list', done => {
      const content = { ...baseContent, creatorContacts: undefined }
      service.triggerPushPullNotification(content, 'no', false).subscribe(() => {
        expect(body().recipients.author).toEqual([])
        done()
      })
    })
  })

  describe('deleteContent', () => {
    it('marks a live deletion differently from a draft one', done => {
      service.deleteContent({ ...baseContent, status: 'Live' } as any, 'gone').subscribe(() => {
        expect(body()['event-id']).toBe('delete_live_content')
        done()
      })
    })

    it('marks a non-live deletion', done => {
      service.deleteContent(baseContent, 'gone').subscribe(() => {
        expect(body()['event-id']).toBe('delete_non_live_content')
        expect(body().recipients.actor).toEqual(['me'])
        done()
      })
    })

    it('falls back to the raw status when there is no action name', done => {
      workFlowService.getActionName.mockReturnValue(undefined)
      service.deleteContent(baseContent, 'gone').subscribe(() => {
        expect(body()['tag-value-pair']['#currentStage']).toBe('Draft')
        done()
      })
    })

    it('sends nothing when notifications are switched off', done => {
      initService.authAdditionalConfig.allowNotification = false
      service.deleteContent(baseContent, 'gone').subscribe(res => {
        expect(res).toEqual({})
        expect(apiService.post).not.toHaveBeenCalled()
        done()
      })
    })
  })

  describe('markForDeletion', () => {
    it('notifies the author of the expiry', done => {
      service.markForDeletion(baseContent, 'expiring').subscribe(() => {
        expect(body()['event-id']).toBe('mark_content_for_deletion')
        expect(body()['tag-value-pair']['#contentExpiryDate']).toBe('2026-01-01')
        done()
      })
    })

    it('copes with content that has no author list', done => {
      service.markForDeletion({ ...baseContent, creatorContacts: undefined } as any, 'c').subscribe(() => {
        expect(body().recipients.author).toEqual([])
        done()
      })
    })

    it('sends nothing when notifications are switched off', done => {
      initService.authAdditionalConfig.allowNotification = false
      service.markForDeletion(baseContent, 'c').subscribe(res => {
        expect(res).toEqual({})
        done()
      })
    })
  })

  describe('unpublishContent', () => {
    it('notifies the author that the content came down', done => {
      service.unpublishContent(baseContent, 'taking it down').subscribe(() => {
        expect(body()['event-id']).toBe('unpublish_content')
        done()
      })
    })

    it('sends nothing when notifications are switched off', done => {
      initService.authAdditionalConfig.allowNotification = false
      service.unpublishContent(baseContent, 'c').subscribe(res => {
        expect(res).toEqual({})
        expect(apiService.post).not.toHaveBeenCalled()
        done()
      })
    })
  })
})
