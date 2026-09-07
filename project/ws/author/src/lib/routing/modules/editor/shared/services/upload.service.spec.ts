import { of } from 'rxjs'

import { UploadService } from './upload.service'
import { CONTENT_BASE_ENCODE, CONTENT_VIDEO_ENCODE } from '@ws/author/src/lib/constants/apiEndpoints'

describe('UploadService', () => {
  let apiService: any
  let accessService: any
  let http: any
  let configSvc: any
  let service: UploadService

  const makeFormData = (fileName: string) => {
    const file = new File(['hello'], fileName, { type: 'text/plain' })
    const fd = new FormData()
    fd.append('content', file)
    return fd
  }

  beforeEach(() => {
    apiService = {
      post: jest.fn().mockReturnValue(of({ ok: true })),
      patch: jest.fn().mockReturnValue(of({ ok: true })),
      base64: jest.fn().mockReturnValue({ data: 'encoded-text' }),
    }
    accessService = { rootOrg: 'Root Org', org: 'My Org' }
    http = { post: jest.fn().mockReturnValue(of({ ok: true })) }
    configSvc = { rootOrg: 'cfg-root', org: 'cfg-org' }
    service = new UploadService(apiService, accessService, http, configSvc)
  })

  it('is created', () => {
    expect(service).toBeInstanceOf(UploadService)
  })

  describe('appendToFilename', () => {
    it('inserts a timestamp before the extension', () => {
      const result = service.appendToFilename('picture.png')
      expect(result).toMatch(/^picture\d+\.png$/)
    })
    it('appends a timestamp when there is no extension', () => {
      const result = service.appendToFilename('picture')
      expect(result).toMatch(/^picture\d+$/)
    })
  })

  describe('templateToBatch', () => {
    it('patches the certificate template endpoint', () => {
      service.templateToBatch({ id: 1 })
      expect(apiService.patch).toHaveBeenCalledWith('apis/protected/v8/creatorCertificateTemplate/template/add', { id: 1 })
    })
  })

  describe('upload', () => {
    it('renames a normal file and posts it to the upload endpoint', () => {
      const fd = makeFormData('image.png')
      service.upload(fd, { contentId: 'do_99' } as any, { headers: {} })
      expect(apiService.post).toHaveBeenCalledTimes(1)
      const [url, body, flag, options] = apiService.post.mock.calls[0]
      expect(url).toBe('apis/proxies/v8/upload/action/content/v3/upload/do_99')
      expect(body).toBeInstanceOf(FormData)
      expect(flag).toBe(false)
      expect(options).toEqual({ headers: {} })
    })

    it('keeps fixed file names unchanged', () => {
      const appendSpy = jest.spyOn(service, 'appendToFilename')
      const fd = makeFormData('channel.json')
      service.upload(fd, { contentId: 'do_1' } as any)
      expect(appendSpy).not.toHaveBeenCalled()
    })
  })

  describe('zipUpload', () => {
    it('posts the raw form data to the upload endpoint', () => {
      const fd = makeFormData('bundle.zip')
      service.zipUpload(fd, { contentId: 'do_5' } as any)
      expect(apiService.post).toHaveBeenCalledWith('apis/proxies/v8/upload/action/content/v3/upload/do_5', fd, false, undefined)
    })
  })

  describe('encodedUpload', () => {
    it('posts base64-encoded content to the encode endpoint', () => {
      service.encodedUpload('rawdata', 'file.txt', { contentId: 'do_2.img', contentType: 'Resource' } as any)
      expect(apiService.base64).toHaveBeenCalledWith(CONTENT_BASE_ENCODE, 'rawdata')
      const [url, body] = apiService.post.mock.calls[0]
      expect(url).toBe(CONTENT_BASE_ENCODE)
      expect(body.fileName).toBe('file.txt')
      expect(body.text).toBe('encoded-text')
      expect(body.location).toBe('Root_Org/My_Org/Public/do_2Resource')
    })
  })

  describe('encodedUploadAWS', () => {
    it('posts the file to the upload endpoint', () => {
      const fd = makeFormData('doc.pdf')
      service.encodedUploadAWS(fd, 'doc.pdf', { contentId: 'do_3' } as any)
      const [url, , flag, options] = apiService.post.mock.calls[0]
      expect(url).toBe('apis/proxies/v8/upload/action/content/v3/upload/do_3')
      expect(flag).toBe(false)
      expect(options).toBeNull()
    })
  })

  describe('startEncoding', () => {
    it('posts the artifact url to the video encode endpoint', () => {
      service.startEncoding('http://cdn/vid.mp4', 'do_7.img')
      expect(apiService.post).toHaveBeenCalledWith(CONTENT_VIDEO_ENCODE + 'do_7', { authArtifactURL: 'http://cdn/vid.mp4' })
    })
  })

  describe('fetchCatalog', () => {
    it('posts the org context to the catalog endpoint', () => {
      service.fetchCatalog()
      expect(http.post).toHaveBeenCalledWith('/apis/protected/v8/social/catalog', { rootOrg: 'cfg-root', org: 'cfg-org' })
    })
  })
})
