import { CKEditorResolverService } from './ckeditor-resolve.service'

describe('CKEditorResolverService', () => {
  let service: CKEditorResolverService
  let appended: any[]

  beforeEach(() => {
    service = new CKEditorResolverService()
    appended = []
    jest.spyOn(document.body, 'appendChild').mockImplementation((el: any) => {
      appended.push(el)
      return el
    })
    delete (window as any).CKEDITOR
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete (window as any).CKEDITOR
  })

  it('injects the ckeditor script tag on the first call', () => {
    service.inject().subscribe()
    expect(appended).toHaveLength(1)
    expect(appended[0].type).toBe('text/javascript')
    expect(appended[0].src).toContain('/assets/authoring/ckeditor/ckeditor.js')
  })

  it('emits true and completes once the script loads', done => {
    const emitted: boolean[] = []
    service.inject().subscribe({
      next: v => emitted.push(v),
      complete: () => {
        expect(emitted).toEqual([true])
        done()
      },
    })
    appended[0].onload()
  })

  it('silences the CKEditor version banner when the global exposes a config', done => {
    ;(window as any).CKEDITOR = { config: { versionCheck: true } }
    service.inject().subscribe({
      complete: () => {
        expect((window as any).CKEDITOR.config.versionCheck).toBe(false)
        done()
      },
    })
    appended[0].onload()
  })

  it('tolerates a global without a config object', done => {
    ;(window as any).CKEDITOR = {}
    service.inject().subscribe({ complete: () => done() })
    appended[0].onload()
  })

  it('does not re-inject the script once it has loaded', done => {
    service.inject().subscribe()
    appended[0].onload()

    const emitted: boolean[] = []
    service.inject().subscribe({
      next: v => emitted.push(v),
      complete: () => {
        expect(emitted).toEqual([true])
        expect(appended).toHaveLength(1)
        done()
      },
    })
  })

  it('errors when the script fails to load', done => {
    service.inject().subscribe({
      error: e => {
        expect(e).toBe(false)
        done()
      },
    })
    appended[0].onerror()
  })
})
