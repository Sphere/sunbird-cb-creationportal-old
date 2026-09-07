import { ViewerDataService, IViewerTocChangeEvent } from './viewer-data.service'
import { take } from 'rxjs/operators'

describe('ViewerDataService', () => {
  let svc: ViewerDataService

  beforeEach(() => {
    svc = new ViewerDataService()
  })

  it('should be created with default none status', () => {
    expect(svc).toBeTruthy()
    expect(svc.status).toBe('none')
    expect(svc.resourceId).toBeNull()
  })

  it('reset sets resourceId/status and clears resource+error', () => {
    svc.resource = { identifier: 'x' } as any
    svc.error = 'e'
    svc.reset('R1', 'pending')
    expect(svc.resourceId).toBe('R1')
    expect(svc.status).toBe('pending')
    expect(svc.resource).toBeNull()
    expect(svc.error).toBeNull()
  })

  it('updateResource(resource) sets done status + resourceId from identifier', () => {
    svc.updateResource({ identifier: 'ID9' } as any)
    expect(svc.status).toBe('done')
    expect(svc.resource).toEqual({ identifier: 'ID9' })
    expect(svc.resourceId).toBe('ID9')
    expect(svc.error).toBeNull()
  })

  it('updateResource(null, error) sets error status', () => {
    svc.updateResource(null, 'boom')
    expect(svc.status).toBe('error')
    expect(svc.resource).toBeNull()
    expect(svc.error).toBe('boom')
  })

  it('updateNextPrevResource emits toc change event', done => {
    svc.tocChangeSubject.pipe(take(1)).subscribe((e: IViewerTocChangeEvent) => {
      expect(e).toEqual({ tocAvailable: false, nextResource: 'n', prevResource: 'p' })
      done()
    })
    svc.updateNextPrevResource(false, 'p', 'n')
  })
})
