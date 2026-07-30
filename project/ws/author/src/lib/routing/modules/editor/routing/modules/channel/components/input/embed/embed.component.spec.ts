import { EmbedComponent } from './embed.component'

describe('EmbedComponent', () => {
  const build = (content: any = {}) => {
    const c = new EmbedComponent()
    c.content = { title: 'Embed', iframeSrc: '', ...content } as any
    return c
  }

  it('should create', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('assigns an iframeId when missing and emits validity', () => {
      const c = build({ iframeSrc: 'https://x' })
      const emitted: any[] = []
      c.data.subscribe(v => emitted.push(v))
      c.ngOnInit()
      expect(c.content.iframeId).toBeTruthy()
      expect(emitted[0].isValid).toBe(true)
      expect(emitted[0].content).toBe(c.content)
    })

    it('keeps an existing iframeId', () => {
      const c = build({ iframeId: 'fixed-id', iframeSrc: 'https://x' })
      c.ngOnInit()
      expect(c.content.iframeId).toBe('fixed-id')
    })

    it('emits invalid when there is no iframe source', () => {
      const c = build({ iframeSrc: '' })
      const emitted: any[] = []
      c.data.subscribe(v => emitted.push(v))
      c.ngOnInit()
      expect(emitted[0].isValid).toBe(false)
    })
  })

  describe('update', () => {
    it('emits a merged content patch with validity', () => {
      const c = build({ iframeSrc: 'https://x' })
      const emitted: any[] = []
      c.data.subscribe(v => emitted.push(v))
      c.update('title', 'New title')
      expect(emitted[0].content.title).toBe('New title')
      expect(emitted[0].content.iframeSrc).toBe('https://x')
      expect(emitted[0].isValid).toBe(true)
    })

    it('reports invalid when iframeSrc is empty', () => {
      const c = build({ iframeSrc: '' })
      const emitted: any[] = []
      c.data.subscribe(v => emitted.push(v))
      c.update('title', 'x')
      expect(emitted[0].isValid).toBe(false)
    })
  })
})
