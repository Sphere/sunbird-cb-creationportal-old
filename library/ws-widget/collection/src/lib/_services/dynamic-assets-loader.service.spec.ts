import { DynamicAssetsLoaderService } from './dynamic-assets-loader.service'

describe('DynamicAssetsLoaderService', () => {
  let svc: DynamicAssetsLoaderService

  beforeEach(() => {
    svc = new DynamicAssetsLoaderService()
    document.body.innerHTML = ''
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('loadScript returns true immediately for an already-loaded url', async () => {
    svc.urlLoadStatus.set('a.js', true)
    await expect(svc.loadScript('a.js')).resolves.toBe(true)
  })

  it('loadScript appends a <script> and registers the element mapping', () => {
    svc.loadScript('https://cdn/x.js')
    const el = svc.urlElemMapping.get('https://cdn/x.js')
    expect(el).toBeInstanceOf(HTMLScriptElement)
    expect(el!.src).toContain('x.js')
    expect(document.body.contains(el!)).toBe(true)
  })

  it('loadScript resolves true and marks loaded when the script fires "load"', async () => {
    const p = svc.loadScript('https://cdn/y.js')
    const el = svc.urlElemMapping.get('https://cdn/y.js')!
    el.dispatchEvent(new Event('load'))
    await expect(p).resolves.toBe(true)
    expect(svc.urlLoadStatus.get('https://cdn/y.js')).toBe(true)
    expect(svc.urlElemMapping.has('https://cdn/y.js')).toBe(false)
  })

  it('loadStyle appends a stylesheet link and returns true', async () => {
    await expect(svc.loadStyle('https://cdn/s.css')).resolves.toBe(true)
    const link = document.querySelector('link[rel="stylesheet"]') as HTMLLinkElement
    expect(link).toBeTruthy()
    expect(link.href).toContain('s.css')
    expect(svc.urlLoadStatus.get('https://cdn/s.css')).toBe(true)
  })

  it('loadStyle returns true immediately for an already-loaded url', async () => {
    svc.urlLoadStatus.set('s.css', true)
    await expect(svc.loadStyle('s.css')).resolves.toBe(true)
  })
})
