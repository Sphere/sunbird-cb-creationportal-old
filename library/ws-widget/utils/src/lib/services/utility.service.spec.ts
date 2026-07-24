import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { Platform } from '@angular/cdk/platform'
import { TestBed } from '@angular/core/testing'

import { UtilityService } from './utility.service'

describe('UtilityService', () => {
  let service: UtilityService
  let httpMock: HttpTestingController
  let platform: { IOS: boolean; ANDROID: boolean }

  beforeEach(() => {
    platform = { IOS: false, ANDROID: false }
    TestBed.configureTestingModule({
      providers: [UtilityService, { provide: Platform, useValue: platform }, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(UtilityService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('randomId returns a stable id', () => {
    expect(service.randomId).toBe(1)
  })

  it('getJson GETs the given url', () => {
    service.getJson('/x.json').subscribe()
    httpMock.expectOne('/x.json').flush({})
  })

  it('getLeafNodes collects only nodes without children', () => {
    const tree = {
      identifier: 'root',
      children: [
        { identifier: 'a', children: [] },
        { identifier: 'b', children: [{ identifier: 'b1', children: null }] },
      ],
    }
    const leaves = service.getLeafNodes(tree as any, [])
    expect(leaves.map(n => n.identifier)).toEqual(['a', 'b1'])
  })

  it('getPath returns the path from root to the matching id', () => {
    const tree = {
      identifier: 'root',
      children: [{ identifier: 'a', children: [{ identifier: 'target', children: null }] }],
    }
    const path = service.getPath(tree as any, 'target')
    expect(path.map(n => n.identifier)).toEqual(['root', 'a', 'target'])
  })

  it('getPath returns just the root when id is not found', () => {
    const tree = { identifier: 'root', children: [{ identifier: 'a', children: null }] }
    expect(service.getPath(tree as any, 'missing')).toEqual([])
  })

  it('reflects platform flags for isIos / isAndroid / isMobile', () => {
    expect(service.isMobile).toBe(false)
    platform.ANDROID = true
    expect(service.isAndroid).toBe(true)
    expect(service.isMobile).toBe(true)
  })

  it('isAndroidApp reads window.appRef; iOsAppRef reads the webkit handler', () => {
    expect(service.isAndroidApp).toBe(false)
    ;(window as any).appRef = {}
    expect(service.isAndroidApp).toBe(true)

    expect(service.iOsAppRef).toBeNull()
    const handler = { postMessage: () => undefined }
    ;(window as any).webkit = { messageHandlers: { appRef: handler } }
    expect(service.iOsAppRef).toBe(handler)

    delete (window as any).appRef
    delete (window as any).webkit
  })
})
