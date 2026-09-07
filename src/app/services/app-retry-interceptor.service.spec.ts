import { AppRetryInterceptorService } from './app-retry-interceptor.service'
import { of, throwError } from 'rxjs'
import { HttpErrorResponse } from '@angular/common/http'

describe('AppRetryInterceptorService', () => {
  let svc: AppRetryInterceptorService

  beforeEach(() => {
    svc = new AppRetryInterceptorService()
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('bypasses retry when request body has excludeRetry', done => {
    const req: any = { body: { excludeRetry: true } }
    const next: any = { handle: jest.fn(() => of('OK')) }
    svc.intercept(req, next).subscribe(res => {
      expect(res).toBe('OK')
      expect(next.handle).toHaveBeenCalledWith(req)
      done()
    })
  })

  it('passes a successful response through', done => {
    const req: any = { body: null }
    const next: any = { handle: jest.fn(() => of('DONE')) }
    svc.intercept(req, next).subscribe(res => {
      expect(res).toBe('DONE')
      done()
    })
  })

  it('does NOT retry a <500 error and rethrows it', done => {
    const err = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' })
    const next: any = { handle: jest.fn(() => throwError(() => err)) }
    svc.intercept({ body: null } as any, next).subscribe({
      next: () => done.fail?.('should not emit'),
      error: e => {
        expect(e.status).toBe(400)
        expect(next.handle).toHaveBeenCalledTimes(1)
        done()
      },
    })
  })
})
