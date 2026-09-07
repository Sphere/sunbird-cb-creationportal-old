import { NotificationService } from './notification.service'
import { ENotificationEvent, INotification } from '../models/notifications.model'

describe('NotificationService (notification-v2)', () => {
  let router: { navigate: jest.Mock }
  let svc: NotificationService

  const notif = (eventId: any, targetData: any = {}): INotification => ({ eventId, targetData }) as any

  beforeEach(() => {
    router = { navigate: jest.fn() }
    svc = new NotificationService(router as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('routes ShareGoal to pending-actions', () => {
    svc.mapRoute(notif(ENotificationEvent.ShareGoal))
    expect(router.navigate).toHaveBeenCalledWith(['/app/goals/me/pending-actions'])
  })

  it('routes SharePlaylist to playlist notification', () => {
    svc.mapRoute(notif(ENotificationEvent.SharePlaylist))
    expect(router.navigate).toHaveBeenCalledWith(['/app/playlist/notification'])
  })

  it('routes ShareContent to toc overview using identifier', () => {
    svc.mapRoute(notif(ENotificationEvent.ShareContent, { identifier: 'C1' }))
    expect(router.navigate).toHaveBeenCalledWith(['/app/toc/C1/overview'])
  })

  it('routes editor events to author editor using identifier', () => {
    svc.mapRoute(notif(ENotificationEvent.SendContent, { identifier: 'E9' }))
    expect(router.navigate).toHaveBeenCalledWith(['/author/editor/E9'])
  })

  it('does NOT navigate when identifier is missing for content events', () => {
    svc.mapRoute(notif(ENotificationEvent.PublishContent, {}))
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('does NOT navigate for an unknown event', () => {
    svc.mapRoute(notif('SOME_UNKNOWN_EVENT' as any))
    expect(router.navigate).not.toHaveBeenCalled()
  })
})
