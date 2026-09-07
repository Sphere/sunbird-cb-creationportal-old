import { of, throwError } from 'rxjs'
import { BtnContentLikeComponent } from './btn-content-like.component'

describe('BtnContentLikeComponent', () => {
  let events: any
  let btnLikeSvc: any
  let configSvc: any

  const build = (opts: { restricted?: boolean } = {}) => {
    events = {
      raiseInteractTelemetry: jest.fn(),
      dispatchEvent: jest.fn(),
    }
    btnLikeSvc = {
      isLikedFor: jest.fn().mockReturnValue(of(false)),
      like: jest.fn().mockReturnValue(of({ id1: 5 })),
      unlike: jest.fn().mockReturnValue(of({ id1: 3 })),
      fetchingLikes: false,
    }
    configSvc = {
      rootOrg: 'org1',
      restrictedFeatures: opts.restricted ? new Set(['contentLike']) : new Set<string>(),
    }
    const c = new BtnContentLikeComponent(events, btnLikeSvc, configSvc)
    c.widgetData = { identifier: 'id1' }
    return c
  }

  it('should create and read isRestricted from config', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.isRestricted).toBe(false)
    expect(build({ restricted: true }).isRestricted).toBe(true)
  })

  describe('getters', () => {
    it('showLikesCount should be false by default', () => {
      expect(build().showLikesCount).toBe(false)
    })

    it('showCount should be false when likes are not shown', () => {
      const c = build()
      c.likesCount = 10
      expect(c.showCount).toBe(false)
    })
  })

  describe('ngOnInit', () => {
    it('should set LIKED when the content is already liked', () => {
      const c = build()
      btnLikeSvc.isLikedFor.mockReturnValue(of(true))
      c.ngOnInit()
      expect(btnLikeSvc.isLikedFor).toHaveBeenCalledWith('id1')
      expect(c.status).toBe('LIKED')
    })

    it('should set PENDING when not liked but likes are still fetching', () => {
      const c = build()
      btnLikeSvc.isLikedFor.mockReturnValue(of(false))
      btnLikeSvc.fetchingLikes = true
      c.ngOnInit()
      expect(c.status).toBe('PENDING')
    })

    it('should set NOT_LIKED when not liked and not fetching', () => {
      const c = build()
      c.ngOnInit()
      expect(c.status).toBe('NOT_LIKED')
    })

    it('should short-circuit to NOT_LIKED when restricted', () => {
      const c = build({ restricted: true })
      c.ngOnInit()
      expect(c.status).toBe('NOT_LIKED')
      expect(btnLikeSvc.isLikedFor).not.toHaveBeenCalled()
    })

    it('should short-circuit to NOT_LIKED when for preview', () => {
      const c = build()
      c.forPreview = true
      c.ngOnInit()
      expect(c.status).toBe('NOT_LIKED')
      expect(btnLikeSvc.isLikedFor).not.toHaveBeenCalled()
    })
  })

  describe('like', () => {
    it('should raise telemetry, call service and set LIKED on success', () => {
      const c = build()
      const evt = { stopPropagation: jest.fn() } as any
      c.like(evt)
      expect(evt.stopPropagation).toHaveBeenCalled()
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('like', 'content', {
        contentId: 'id1',
      })
      expect(btnLikeSvc.like).toHaveBeenCalledWith('id1')
      expect(c.likesCount).toBe(5)
      expect(c.status).toBe('LIKED')
    })

    it('should set NOT_LIKED on error', () => {
      const c = build()
      btnLikeSvc.like.mockReturnValue(throwError(() => new Error('x')))
      c.like({ stopPropagation: jest.fn() } as any)
      expect(c.status).toBe('NOT_LIKED')
    })

    it('should just toggle status in preview mode without calling the service', () => {
      const c = build()
      c.forPreview = true
      c.status = 'NOT_LIKED'
      c.like({ stopPropagation: jest.fn() } as any)
      expect(c.status).toBe('LIKED')
      expect(btnLikeSvc.like).not.toHaveBeenCalled()
    })
  })

  describe('unlike', () => {
    it('should call service, set NOT_LIKED and dispatch an event on success', () => {
      const c = build()
      const evt = { stopPropagation: jest.fn() } as any
      c.unlike(evt)
      expect(evt.stopPropagation).toHaveBeenCalled()
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('unlike', 'content', {
        contentId: 'id1',
      })
      expect(btnLikeSvc.unlike).toHaveBeenCalledWith('id1')
      expect(c.likesCount).toBe(3)
      expect(c.status).toBe('NOT_LIKED')
      expect(events.dispatchEvent).toHaveBeenCalled()
    })

    it('should set LIKED on error', () => {
      const c = build()
      btnLikeSvc.unlike.mockReturnValue(throwError(() => new Error('x')))
      c.unlike({ stopPropagation: jest.fn() } as any)
      expect(c.status).toBe('LIKED')
    })

    it('should just toggle status in preview mode without calling the service', () => {
      const c = build()
      c.forPreview = true
      c.status = 'LIKED'
      c.unlike({ stopPropagation: jest.fn() } as any)
      expect(c.status).toBe('NOT_LIKED')
      expect(btnLikeSvc.unlike).not.toHaveBeenCalled()
    })
  })

  describe('raiseTelemetry', () => {
    it('should delegate to the event service', () => {
      const c = build()
      c.raiseTelemetry('like')
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('like', 'content', {
        contentId: 'id1',
      })
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe the like subscription', () => {
      const c = build()
      c.ngOnInit()
      const sub = (c as any).likeSubscription
      const spy = jest.spyOn(sub, 'unsubscribe')
      c.ngOnDestroy()
      expect(spy).toHaveBeenCalled()
    })

    it('should not throw when there is no subscription', () => {
      const c = build({ restricted: true })
      c.ngOnInit()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })
  })
})
