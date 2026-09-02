import { BtnPageBackService } from './btn-page-back.service'
import { Subject } from 'rxjs'
import { NavigationStart } from '@angular/router'

describe('BtnPageBackService', () => {
  let events: Subject<any>
  let router: any
  let svc: BtnPageBackService

  beforeEach(() => {
    events = new Subject<any>()
    router = { events, url: '/current' }
    svc = new BtnPageBackService(router)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('checkUrl stores the widget url', () => {
    svc.checkUrl('/w')
    expect(svc.widgetUrl).toBe('/w')
  })

  it('getLastUrl defaults to "/" when the stack is empty', () => {
    expect(svc.getLastUrl()).toEqual({ fragment: undefined, route: '/', queryParams: undefined })
    expect(svc.previousRouteUrls).toContain('/')
  })

  it('getLastUrl splits off a fragment', () => {
    svc.previousRouteUrls = ['/app/toc/1#reviews']
    const r = svc.getLastUrl()
    expect(r.route).toBe('/app/toc/1')
    expect(r.fragment).toBe('reviews')
  })

  it('getLastUrl parses query params', () => {
    svc.previousRouteUrls = ['/app/search?q=ng&page=2']
    const r = svc.getLastUrl()
    expect(r.route).toBe('/app/search')
    expect(r.queryParams).toEqual({ q: 'ng', page: '2' })
  })

  it('getLastUrl returns undefined queryParams for a malformed query', () => {
    svc.previousRouteUrls = ['/x?broken']
    expect(svc.getLastUrl().queryParams).toBeUndefined()
  })

  it('getLastUrl encodes the child segment of a ">" path', () => {
    svc.previousRouteUrls = ['/page/explore>tag with space']
    expect(svc.getLastUrl().route).toBe(`/page/explore>${encodeURIComponent('tag with space')}`)
  })

  it('getLastUrl decodes an encoded url before parsing', () => {
    svc.previousRouteUrls = ['%2Fapp%2Ftoc%2F9']
    expect(svc.getLastUrl().route).toBe('/app/toc/9')
  })

  it('initialize pushes the current router url on a NavigationStart to a new url', () => {
    svc.initialize()
    events.next(new NavigationStart(1, '/next'))
    expect(svc.previousRouteUrls).toContain('/current')
  })

  it('initialize pops when navigating back to the last stored url', () => {
    svc.initialize()
    svc.previousRouteUrls = ['/a', '/b']
    events.next(new NavigationStart(2, '/b'))
    expect(svc.previousRouteUrls).toEqual(['/a'])
  })
})
