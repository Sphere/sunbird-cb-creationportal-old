import { DomSanitizer } from '@angular/platform-browser'

import { PipeSafeSanitizerPipe } from './pipe-safe-sanitizer.pipe'

describe('PipeSafeSanitizerPipe', () => {
  let sanitizer: jest.Mocked<DomSanitizer>
  let pipe: PipeSafeSanitizerPipe

  beforeEach(() => {
    sanitizer = {
      bypassSecurityTrustHtml: jest.fn().mockReturnValue('html'),
      bypassSecurityTrustStyle: jest.fn().mockReturnValue('style'),
      bypassSecurityTrustScript: jest.fn().mockReturnValue('script'),
      bypassSecurityTrustUrl: jest.fn().mockReturnValue('url'),
      bypassSecurityTrustResourceUrl: jest.fn().mockReturnValue('resourceUrl'),
    } as unknown as jest.Mocked<DomSanitizer>
    pipe = new PipeSafeSanitizerPipe(sanitizer)
  })

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('defaults to html sanitization', () => {
    expect(pipe.transform('<b>x</b>')).toBe('html')
    expect(sanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('<b>x</b>')
  })

  it('routes each supported type to the matching sanitizer call', () => {
    expect(pipe.transform('x', 'style')).toBe('style')
    expect(pipe.transform('x', 'script')).toBe('script')
    expect(pipe.transform('x', 'url')).toBe('url')
    expect(pipe.transform('x', 'resourceUrl')).toBe('resourceUrl')
  })

  it('throws for an invalid type', () => {
    expect(() => pipe.transform('x', 'bogus')).toThrow('Invalid safe type specified: bogus')
  })
})
