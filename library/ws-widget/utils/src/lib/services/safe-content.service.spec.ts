import { TestBed } from '@angular/core/testing'
import { DomSanitizer } from '@angular/platform-browser'

import { SafeContentService } from './safe-content.service'

describe('SafeContentService', () => {
  let sanitizer: any

  beforeEach(() => {
    sanitizer = {
      bypassSecurityTrustHtml: jest.fn((v: string) => `html:${v}`),
      bypassSecurityTrustStyle: jest.fn((v: string) => `style:${v}`),
      bypassSecurityTrustScript: jest.fn((v: string) => `script:${v}`),
      bypassSecurityTrustUrl: jest.fn((v: string) => `url:${v}`),
      bypassSecurityTrustResourceUrl: jest.fn((v: string) => `resource:${v}`),
    }
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => jest.restoreAllMocks())

  describe('static form, used by the existing call sites', () => {
    it.each([
      ['trustedHtml', 'bypassSecurityTrustHtml', 'html:<b>hi</b>'],
      ['trustedStyle', 'bypassSecurityTrustStyle', 'style:<b>hi</b>'],
      ['trustedScript', 'bypassSecurityTrustScript', 'script:<b>hi</b>'],
      ['trustedUrl', 'bypassSecurityTrustUrl', 'url:<b>hi</b>'],
      ['trustedResourceUrl', 'bypassSecurityTrustResourceUrl', 'resource:<b>hi</b>'],
    ])('%s goes through %s', (method, bypass, expected) => {
      const result = (SafeContentService as any)[method](sanitizer, '<b>hi</b>')

      expect(sanitizer[bypass]).toHaveBeenCalledWith('<b>hi</b>')
      expect(result).toBe(expected)
    })

    it('uses the sanitizer it is handed, not one of its own', () => {
      const other = { bypassSecurityTrustHtml: jest.fn(() => 'other') }
      SafeContentService.trustedHtml(other as any, 'x')

      expect(other.bypassSecurityTrustHtml).toHaveBeenCalledWith('x')
      expect(sanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled()
    })
  })

  describe('executable-scheme guard', () => {
    it.each([
      ['trustedHtml', 'bypassSecurityTrustHtml'],
      ['trustedStyle', 'bypassSecurityTrustStyle'],
      ['trustedUrl', 'bypassSecurityTrustUrl'],
      ['trustedResourceUrl', 'bypassSecurityTrustResourceUrl'],
    ])('%s refuses a javascript: value', (method, bypass) => {
      ;(SafeContentService as any)[method](sanitizer, 'javascript:alert(1)')

      expect(sanitizer[bypass]).toHaveBeenCalledWith('')
    })

    it.each([
      ['upper case', 'JAVASCRIPT:alert(1)'],
      ['mixed case', 'JaVaScRiPt:alert(1)'],
      ['leading whitespace', '  javascript:alert(1)'],
      ['space before the colon', 'javascript :alert(1)'],
      ['vbscript', 'vbscript:msgbox(1)'],
    ])('refuses %s', (_label, value) => {
      SafeContentService.trustedUrl(sanitizer, value)

      expect(sanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith('')
    })

    it('says so, rather than blanking the value silently', () => {
      SafeContentService.trustedUrl(sanitizer, 'javascript:alert(1)')

      expect(console.error).toHaveBeenCalled()
    })

    it.each([
      ['a data-URI svg, which certificate previews rely on', 'data:image/svg+xml;base64,PHN2Zy8+'],
      ['an https url', 'https://example.com/a.png'],
      ['a relative asset path', 'cbp-assets/icons/pin.svg'],
      ['a css url()', 'url(https://example.com/a.png)'],
      ['markup that merely mentions the word javascript', '<p>about javascript</p>'],
    ])('still allows %s', (_label, value) => {
      SafeContentService.trustedUrl(sanitizer, value)

      expect(sanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith(value)
    })

    it('does not guard trustedScript, whose whole purpose is executable code', () => {
      SafeContentService.trustedScript(sanitizer, 'javascript:alert(1)')

      expect(sanitizer.bypassSecurityTrustScript).toHaveBeenCalledWith('javascript:alert(1)')
    })

    it('passes a non-string through untouched', () => {
      SafeContentService.trustedHtml(sanitizer, undefined as any)

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith(undefined)
    })
  })

  describe('type-keyed dispatch', () => {
    it.each([
      ['html', 'bypassSecurityTrustHtml'],
      ['style', 'bypassSecurityTrustStyle'],
      ['script', 'bypassSecurityTrustScript'],
      ['url', 'bypassSecurityTrustUrl'],
      ['resourceUrl', 'bypassSecurityTrustResourceUrl'],
    ])('routes %s', (type, bypass) => {
      SafeContentService.trust(sanitizer, 'v', type)

      expect(sanitizer[bypass]).toHaveBeenCalledWith('v')
    })

    it('defaults to html', () => {
      SafeContentService.trust(sanitizer, 'v')

      expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('v')
    })

    it('rejects an unknown type', () => {
      expect(() => SafeContentService.trust(sanitizer, 'v', 'nope')).toThrow('Invalid safe type specified: nope')
    })
  })

  describe('injected form, for the pipe and new code', () => {
    let service: SafeContentService

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [{ provide: DomSanitizer, useValue: sanitizer }],
      })
      service = TestBed.inject(SafeContentService)
    })

    it.each([
      ['trustedHtml', 'bypassSecurityTrustHtml'],
      ['trustedStyle', 'bypassSecurityTrustStyle'],
      ['trustedScript', 'bypassSecurityTrustScript'],
      ['trustedUrl', 'bypassSecurityTrustUrl'],
      ['trustedResourceUrl', 'bypassSecurityTrustResourceUrl'],
    ])('%s uses the injected sanitizer', (method, bypass) => {
      ;(service as any)[method]('v')

      expect(sanitizer[bypass]).toHaveBeenCalledWith('v')
    })

    it('applies the same guard as the static form', () => {
      service.trustedUrl('javascript:alert(1)')

      expect(sanitizer.bypassSecurityTrustUrl).toHaveBeenCalledWith('')
    })

    it('dispatches by type', () => {
      service.trust('v', 'resourceUrl')

      expect(sanitizer.bypassSecurityTrustResourceUrl).toHaveBeenCalledWith('v')
    })
  })
})
