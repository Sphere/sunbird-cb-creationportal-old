import { Notify } from './notificationMessage'

describe('Notify enum', () => {
  it('exposes representative save/upload members mapped to their own name', () => {
    expect(Notify.SAVE_SUCCESS).toBe('SAVE_SUCCESS')
    expect(Notify.SAVE_FAIL).toBe('SAVE_FAIL')
    expect(Notify.UPLOAD_SUCCESS).toBe('UPLOAD_SUCCESS')
    expect(Notify.UPLOAD_FAIL).toBe('UPLOAD_FAIL')
  })

  it('exposes review / publish workflow members', () => {
    expect(Notify.SEND_FOR_REVIEW_SUCCESS).toBe('SEND_FOR_REVIEW_SUCCESS')
    expect(Notify.REVIEW_SUCCESS).toBe('REVIEW_SUCCESS')
    expect(Notify.PUBLISH_SUCCESS).toBe('PUBLISH_SUCCESS')
    expect(Notify.PUBLISH_SUCCESS_LATE).toBe('PUBLISH_SUCCESS_LATE')
    expect(Notify.PUBLISH_FAIL).toBe('PUBLISH_FAIL')
  })

  it('preserves the special-cased values that differ from a naive key mapping', () => {
    // LINK_UPLOAD uses a space, not an underscore
    expect(Notify.LINK_UPLOAD).toBe('LINK UPLOAD')
    // DUPLICTE is intentionally spelled this way in the source
    expect(Notify.DUPLICTE).toBe('DUPLICTE')
  })

  it('exposes quiz/assessment editor members', () => {
    expect(Notify.RESOURCE_NO_QUIZ).toBe('RESOURCE_NO_QUIZ')
    expect(Notify.MCQ_ALL_OPTIONS_CORRECT).toBe('MCQ_ALL_OPTIONS_CORRECT')
    expect(Notify.MAX_QUIZ_REACHED).toBe('MAX_QUIZ_REACHED')
  })

  it('exposes class-diagram and role-request members', () => {
    expect(Notify.CLASS_DIAGRAM_NO_CLASS).toBe('CLASS_DIAGRAM_NO_CLASS')
    expect(Notify.RELATION_EXISTS).toBe('RELATION_EXISTS')
    expect(Notify.ROLE_REQUEST_SUBMIT_SUCCESS).toBe('ROLE_REQUEST_SUBMIT_SUCCESS')
    expect(Notify.UPLOAD_EXCEL_FILE).toBe('UPLOAD_EXCEL_FILE')
  })

  it('every enum member value matches its key except the known space-cased one', () => {
    Object.entries(Notify).forEach(([key, value]) => {
      if (key === 'LINK_UPLOAD') {
        expect(value).toBe('LINK UPLOAD')
      } else {
        expect(value).toBe(key)
      }
    })
  })

  it('has the expected number of members', () => {
    expect(Object.keys(Notify)).toHaveLength(93)
  })
})
