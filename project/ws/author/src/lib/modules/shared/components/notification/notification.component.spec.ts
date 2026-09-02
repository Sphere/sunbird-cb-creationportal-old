import { NotificationComponent } from './notification.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

/**
 * Direct-instantiation unit tests for NotificationComponent (a snackbar body).
 * MAT_SNACK_BAR_DATA is passed straight into the constructor as a plain object.
 */
describe('NotificationComponent', () => {
  function build(type: any, data: any = {}): NotificationComponent {
    return new NotificationComponent({ type, data })
  }

  it('captures the injected type and data', () => {
    const c = build(Notify.SAVE_SUCCESS, { id: 1 })
    expect(c).toBeTruthy()
    expect(c.type).toBe(Notify.SAVE_SUCCESS)
    expect(c.otherData).toEqual({ id: 1 })
    expect(c.notify).toBe(Notify)
  })

  const successTypes = [
    Notify.SAVE_SUCCESS,
    Notify.UPLOAD_SUCCESS,
    Notify.REVIEW_SUCCESS,
    Notify.PUBLISH_SUCCESS,
    Notify.EMAIL_SUCCESS,
    Notify.SUCCESS,
    Notify.SEND_FOR_REVIEW_SUCCESS,
  ]

  it.each(successTypes)('canShow returns true only for the "success" slot on %s', type => {
    const c = build(type)
    expect(c.canShow('success')).toBe(true)
    expect(c.canShow('failure')).toBe(false)
  })

  const failTypes = [
    Notify.SAVE_FAIL,
    Notify.UPLOAD_FAIL,
    Notify.SEND_FOR_REVIEW_FAIL,
    Notify.REVIEW_FAIL,
    Notify.PUBLISH_FAIL,
    Notify.EMAIL_FAIL,
    Notify.FAIL,
    Notify.CONTENT_FAIL,
  ]

  it.each(failTypes)('canShow returns true only for the "failure" slot on %s', type => {
    const c = build(type)
    expect(c.canShow('failure')).toBe(true)
    expect(c.canShow('success')).toBe(false)
  })

  it('canShow returns false for a type outside the success/failure groups', () => {
    const c = build(Notify.COPY)
    expect(c.canShow('success')).toBe(false)
    expect(c.canShow('failure')).toBe(false)
    expect(c.canShow('anything')).toBe(false)
  })
})
