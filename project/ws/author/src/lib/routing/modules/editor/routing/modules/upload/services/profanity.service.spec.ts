import { ProfanityService } from './profanity.service'
import { of } from 'rxjs'

describe('ProfanityService', () => {
  let apiService: { post: jest.Mock }
  let svc: ProfanityService

  beforeEach(() => {
    apiService = { post: jest.fn(() => of({ ok: true })) }
    svc = new ProfanityService(apiService as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('getFileName extracts the artifact filename from an encoded url', () => {
    const url = 'https://cdn/foo%2Fartifacts%2Fmy-doc.pdf?type=main'
    expect(svc.getFileName(url)).toBe('my-doc.pdf')
  })

  it('getFileName returns null when the pattern is absent', () => {
    expect(svc.getFileName('https://cdn/plain.pdf')).toBeNull()
  })

  it('startProfanity posts to the profanity endpoint with derived fileName + stripped url', () => {
    const url = 'https://cdn/foo%2Fartifacts%2Fmy-doc.pdf?type=main'
    svc.startProfanity('content-123', url, 'ignored')
    expect(apiService.post).toHaveBeenCalledWith('/apis/protected/v8/profanity/startPdfProfanity', {
      fileName: 'my-doc.pdf',
      pdfDownloadUrl: 'https://cdn/foo%2Fartifacts%2Fmy-doc.pdf',
      contentId: 'content-123',
    })
  })

  it('startProfanity returns the api observable', done => {
    svc.startProfanity('c', 'https://cdn/foo%2Fartifacts%2Fa.pdf?type=main', '').subscribe((r: any) => {
      expect(r).toEqual({ ok: true })
      done()
    })
  })
})
