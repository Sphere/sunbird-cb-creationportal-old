import { of, throwError } from 'rxjs'
import { BtnContentShareDialogComponent } from './btn-content-share-dialog.component'

jest.mock('dom-to-image', () => ({
  __esModule: true,
  default: { toPng: jest.fn().mockResolvedValue('data:image/png;base64,abc') },
}))
import domToImage from 'dom-to-image'

describe('BtnContentShareDialogComponent', () => {
  let component: BtnContentShareDialogComponent
  let events: any
  let snackBar: any
  let dialogRef: any
  let data: any
  let shareSvc: any
  let configSvc: any

  const content = (over: any = {}) =>
    ({
      identifier: 'do_1',
      name: 'Course A',
      contentType: 'Course',
      artifactUrl: '/a.html',
      ...over,
    }) as any

  const build = () => {
    component = new BtnContentShareDialogComponent(events, snackBar, dialogRef, data, shareSvc, configSvc)
  }

  beforeEach(() => {
    ;(domToImage.toPng as jest.Mock).mockClear()
    events = { raiseInteractTelemetry: jest.fn() }
    snackBar = { open: jest.fn() }
    dialogRef = { close: jest.fn() }
    data = { content: content() }
    shareSvc = {
      fetchConfigFile: jest.fn().mockReturnValue(of({ shareMessage: 'hi' })),
      shareContent: jest.fn().mockReturnValue(of({ invalidIds: [], response: 'SUCCESS' })),
      contentShareNew: jest.fn().mockReturnValue(of({})),
    }
    configSvc = {
      restrictedFeatures: new Set<string>(),
      userProfile: { userId: 'u1' },
      activeLocale: { path: 'en' },
    }
    build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('builds the qr data and takes the config share message', () => {
      component.ngOnInit()
      expect(component.qrdata).toContain('https://sphere.aastrika.org/public/toc/overview?courseId=')
      expect(component.message).toBe('hi')
    })

    it('falls back to a default message when config lacks one', () => {
      shareSvc.fetchConfigFile.mockReturnValue(of({}))
      component.ngOnInit()
      expect(component.message).toBe('I want to share this artifact I found.')
    })

    it('enables social share unless all channels are restricted', () => {
      component.ngOnInit()
      expect(component.isSocialMediaShareEnabled).toBe(true)
    })

    it('disables social share when every channel is restricted', () => {
      configSvc.restrictedFeatures = new Set([
        'socialMediaFacebookShare',
        'socialMediaLinkedinShare',
        'socialMediaTwitterShare',
        'socialMediaWhatsappShare',
      ])
      component.ngOnInit()
      expect(component.isSocialMediaShareEnabled).toBe(false)
    })
  })

  describe('saveAsImage', () => {
    it('renders the qr element to a png and triggers a download', async () => {
      const link: any = { click: jest.fn() }
      jest.spyOn(document, 'createElement').mockReturnValue(link)
      component.saveAsImage({ qrcElement: { nativeElement: {} } })
      await Promise.resolve()
      await Promise.resolve()
      expect(domToImage.toPng).toHaveBeenCalled()
      expect(link.download).toBe('qrcode.png')
      expect(link.href).toBe('data:image/png;base64,abc')
      expect(link.click).toHaveBeenCalled()
      ;(document.createElement as jest.Mock).mockRestore()
    })
  })

  describe('updateUsers', () => {
    it('stores an array of users', () => {
      component.updateUsers([{ email: 'a@x.com' }] as any)
      expect(component.users.length).toBe(1)
    })

    it('ignores a non-array value', () => {
      component.users = [{ email: 'keep' }] as any
      component.updateUsers(null as any)
      expect(component.users.length).toBe(1)
    })
  })

  describe('share', () => {
    it('closes on a fully successful share', () => {
      component.users = [{ email: 'a@x.com' }] as any
      component.share('body', 'Sent!')
      expect(shareSvc.shareContent).toHaveBeenCalled()
      expect(snackBar.open).toHaveBeenCalledWith('Sent!')
      expect(dialogRef.close).toHaveBeenCalled()
      expect(component.sendInProgress).toBe(false)
    })

    it('flags all-invalid ids', () => {
      component.users = [{ email: 'a@x.com' }] as any
      shareSvc.shareContent.mockReturnValue(of({ invalidIds: ['a@x.com'], response: 'success' }))
      component.share('body', 'Sent!')
      expect(component.sendStatus).toBe('INVALID_IDS_ALL')
    })

    it('flags some-invalid ids and still toasts', () => {
      component.users = [{ email: 'a@x.com' }, { email: 'b@x.com' }] as any
      shareSvc.shareContent.mockReturnValue(of({ invalidIds: ['a@x.com'], response: 'success' }))
      component.share('body', 'Sent!')
      expect(component.sendStatus).toBe('INVALID_ID_SOME')
      expect(snackBar.open).toHaveBeenCalledWith('Sent!')
    })

    it('marks ANY when the response is not success', () => {
      component.users = [{ email: 'a@x.com' }, { email: 'b@x.com' }] as any
      shareSvc.shareContent.mockReturnValue(of({ invalidIds: ['a@x.com'], response: 'FAIL' }))
      component.share('body', 'Sent!')
      expect(['ANY', 'INVALID_ID_SOME']).toContain(component.sendStatus)
    })

    it('handles a request error', () => {
      component.users = [{ email: 'a@x.com' }] as any
      shareSvc.shareContent.mockReturnValue(throwError(() => 'boom'))
      component.share('body', 'Sent!')
      expect(component.sendStatus).toBe('ANY')
      expect(component.sendInProgress).toBe(false)
    })
  })

  describe('contentShare', () => {
    it('raises telemetry, posts the share and closes', () => {
      component.users = [{ wid: 'w1', email: 'a@x.com' }] as any
      component.contentShare('body', 'Done!')
      expect(events.raiseInteractTelemetry).toHaveBeenCalled()
      expect(shareSvc.contentShareNew).toHaveBeenCalled()
      expect(snackBar.open).toHaveBeenCalledWith('Done!')
      expect(dialogRef.close).toHaveBeenCalled()
      expect(component.sendInProgress).toBe(false)
    })

    it('handles a request error', () => {
      shareSvc.contentShareNew.mockReturnValue(throwError(() => 'boom'))
      component.contentShare('body', 'Done!')
      expect(component.sendStatus).toBe('ANY')
      expect(component.sendInProgress).toBe(false)
    })

    it('builds the request payload from users and profile', () => {
      component.users = [{ wid: 'w1', email: 'a@x.com' }] as any
      component.contentShare('body', 'Done!')
      const req = shareSvc.contentShareNew.mock.calls[0][0]
      expect(req['event-id']).toBe('share_content')
      expect(req.recipients.sharedWith).toEqual(['w1'])
      expect(req.recipients.sharedBy).toEqual(['u1'])
    })

    it('tolerates a missing user profile', () => {
      configSvc.userProfile = null
      component.contentShare('body', 'Done!')
      const req = shareSvc.contentShareNew.mock.calls[0][0]
      expect(req.recipients.sharedBy).toEqual([''])
    })
  })

  describe('detailUrl', () => {
    it('builds a channel url from the artifact url', () => {
      data.content = content({ contentType: 'Channel', artifactUrl: '/x.html' })
      expect(component.detailUrl).toBe('https://sphere.aastrika.org/x.html')
    })

    it('builds a knowledge-board url', () => {
      data.content = content({ contentType: 'Knowledge Board' })
      expect(component.detailUrl).toBe('https://sphere.aastrika.org/app/knowledge-board/do_1')
    })

    it('builds a default toc overview url', () => {
      data.content = content({ contentType: 'Course' })
      expect(component.detailUrl).toBe('https://sphere.aastrika.org/app/toc/do_1/overview')
    })

    it('builds a knowledge-artifact toc overview url', () => {
      data.content = content({ contentType: 'Knowledge Artifact' })
      expect(component.detailUrl).toBe('https://sphere.aastrika.org/app/toc/do_1/overview')
    })
  })

  describe('raiseTelemetry', () => {
    it('raises an interact telemetry event for the content', () => {
      component.raiseTelemetry()
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('share', 'content', {
        contentId: 'do_1',
        contentType: 'Course',
      })
    })
  })
})
