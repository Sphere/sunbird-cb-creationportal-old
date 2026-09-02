import { QuizResolverService } from './resolver.service'
import { of, throwError, EMPTY } from 'rxjs'

describe('QuizResolverService', () => {
  let accessControl: any
  let apiService: { get: jest.Mock }
  let router: { navigateByUrl: jest.Mock }
  let svc: QuizResolverService

  beforeEach(() => {
    accessControl = { userId: 'U1' }
    apiService = { get: jest.fn(() => of([{ content: {}, data: {} }])) }
    router = { navigateByUrl: jest.fn() }
    svc = new QuizResolverService(accessControl, apiService as any, router as any, {} as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('canEdit returns true by default (no contacts)', () => {
    expect(svc.canEdit({} as any)).toBe(true)
  })

  it('canEdit returns false when the current user is a track contact', () => {
    expect(svc.canEdit({ trackContacts: [{ id: 'U1' }] } as any)).toBe(false)
  })

  it('canEdit returns false when user is a publisher of an InReview item', () => {
    expect(svc.canEdit({ publisherDetails: [{ id: 'U1' }], status: 'InReview' } as any)).toBe(false)
  })

  it('canEdit re-allows a creator contact on a Reviewed item', () => {
    const meta: any = {
      trackContacts: [{ id: 'U1' }], // sets false
      creatorContacts: [{ id: 'U1' }],
      status: 'Reviewed', // flips back to true
    }
    expect(svc.canEdit(meta)).toBe(true)
  })

  it('getUpdatedData reads hierarchy-and-data in edit mode', done => {
    svc.getUpdatedData('C1').subscribe(() => {
      expect(apiService.get).toHaveBeenCalledWith(expect.stringContaining('C1?mode=edit'))
      done()
    })
  })

  it('getUpdatedData navigates to error page and passes value through on failure', done => {
    apiService.get.mockReturnValue(throwError(() => 'e'))
    svc.getUpdatedData('C2').subscribe((v: any) => {
      expect(router.navigateByUrl).toHaveBeenCalledWith('/error-somethings-wrong')
      expect(v).toBe('e')
      done()
    })
  })

  it('getJSON returns EMPTY for an empty path', () => {
    expect(svc.getJSON('')).toBe(EMPTY)
  })
})
