import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'

import { WidgetContentShareService } from './widget-content-share.service'

const USER_SHARE = '/apis/protected/v8/user/share'

describe('WidgetContentShareService', () => {
  let service: WidgetContentShareService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WidgetContentShareService,
        {
          provide: ConfigurationsService,
          useValue: { sitePath: 'https://site.test', userProfile: { userName: 'Ann', email: 'ann@x.com' } },
        },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    service = TestBed.inject(WidgetContentShareService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('fetchConfigFile GETs common.json under the site path', () => {
    service.fetchConfigFile().subscribe()
    httpMock.expectOne('https://site.test/feature/common.json').flush({})
  })

  it('shareContent POSTs a built share request with the recipients (share type)', () => {
    const content = { identifier: 'c1', name: 'Course 1', track: [{ name: 't1' }] } as any
    const recipients = [{ email: 'bob@x.com' }]

    service.shareContent(content, recipients, 'hello').subscribe()

    const req = httpMock.expectOne(USER_SHARE)
    expect(req.request.method).toBe('POST')
    expect(req.request.body.emailType).toBe('share')
    expect(req.request.body.emailTo).toEqual(recipients)
    expect(req.request.body.artifacts[0].identifier).toBe('c1')
    expect(req.request.body.artifacts[0].track).toBe('t1')
    // ccTo carries the sharing user for non-attachment shares
    expect(req.request.body.ccTo[0].email).toBe('ann@x.com')
    req.flush({})
  })

  it('shareContent with attachment type sends the user as the recipient', () => {
    const content = { identifier: 'c2', name: 'Course 2' } as any

    service.shareContent(content, [{ email: 'bob@x.com' }], 'hi', 'attachment').subscribe()

    const req = httpMock.expectOne(USER_SHARE)
    expect(req.request.body.emailType).toBe('attachment')
    expect(req.request.body.emailTo[0].email).toBe('ann@x.com')
    expect(req.request.body.ccTo).toEqual([])
    req.flush({})
  })

  it('contentShareNew POSTs to the content-share endpoint', () => {
    service.contentShareNew({} as any).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/user/share/content')
    expect(req.request.method).toBe('POST')
    req.flush({})
  })
})
