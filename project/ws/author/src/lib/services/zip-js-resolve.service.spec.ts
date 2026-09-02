import { ZipJSResolverService } from './zip-js-resolve.service'

describe('ZipJSResolverService', () => {
  let svc: ZipJSResolverService

  beforeEach(() => {
    svc = new ZipJSResolverService()
    document.body.innerHTML = ''
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('inject emits true immediately when the script already exists', done => {
    ;(svc as any).isExist = true
    svc.inject().subscribe(v => {
      expect(v).toBe(true)
      done()
    })
  })

  it('inject appends a zip.js script and resolves true on load', done => {
    svc.inject().subscribe(v => {
      expect(v).toBe(true)
      expect((svc as any).isExist).toBe(true)
      done()
    })
    const script = document.querySelector('script[src="/assets/authoring/zip-js/zip.js"]') as HTMLScriptElement
    expect(script).toBeTruthy()
    script.onload!(new Event('load') as any)
  })

  it('inject errors when the script fails to load', done => {
    svc.inject().subscribe({
      error: e => {
        expect(e).toBe(false)
        done()
      },
    })
    const script = document.querySelector('script[src="/assets/authoring/zip-js/zip.js"]') as HTMLScriptElement
    script.onerror!(new Event('error') as any)
  })
})
