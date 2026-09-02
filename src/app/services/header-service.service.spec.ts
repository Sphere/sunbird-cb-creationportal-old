import { HeaderServiceService } from './header-service.service'

describe('HeaderServiceService', () => {
  let service: HeaderServiceService

  beforeEach(() => {
    service = new HeaderServiceService()
  })

  it('mirrors headerSaveData emissions into isSavePressed', () => {
    service.headerSaveData.next(false)
    expect(service.isSavePressed).toBe(false)
    service.headerSaveData.next(true)
    expect(service.isSavePressed).toBe(true)
  })

  it('saveCourseContent re-emits the current isSavePressed', () => {
    // console.log is intentional in the impl; keep the test output clean.
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined)
    const received: boolean[] = []
    service.isSavePressed = true
    service.headerSaveData.subscribe(v => received.push(v))

    service.saveCourseContent()

    expect(received).toContain(true)
    logSpy.mockRestore()
  })

  it('showCreatorHeader emits the given course name', () => {
    const emitted: unknown[] = []
    service.showCourseHeader.subscribe(v => emitted.push(v))

    service.showCreatorHeader('Angular 101')

    expect(emitted).toEqual(['Angular 101'])
  })

  it('showCreatorHeader falls back to "Course Name" for an empty name', () => {
    const emitted: unknown[] = []
    service.showCourseHeader.subscribe(v => emitted.push(v))

    service.showCreatorHeader('')

    expect(emitted).toEqual(['Course Name'])
  })

  it('showCreatorHeader emits empty string for the "showlogo" sentinel', () => {
    const emitted: unknown[] = []
    service.showCourseHeader.subscribe(v => emitted.push(v))

    service.showCreatorHeader('showlogo')

    expect(emitted).toEqual([''])
  })
})
