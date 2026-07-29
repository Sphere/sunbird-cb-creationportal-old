import { of, throwError } from 'rxjs'
import { GalleryV2Component } from './gallery-v2.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { FILE_MAX_SIZE } from '@ws/author/src/lib/constants/upload'

describe('GalleryV2Component', () => {
  let component: GalleryV2Component
  let uploadService: any
  let loader: any
  let snackBar: any

  const card = (title = 'Card') => ({
    cardData: { title, description: '', thumbnail: '' },
    widget: { widgetType: 'x', widgetSubType: 'y', widgetData: {} },
  })

  const build = (content: any = {}) => {
    const c = new GalleryV2Component(uploadService, loader, snackBar)
    c.content = { type: 'image', subType: 'set1', cardMenu: [card()], ...content } as any
    c.identifier = 'do_page1'
    return c
  }

  const imageFile = (size = 100, type = 'image/png', name = 'my pic!.png') => {
    const f = new File(['x'], name, { type })
    Object.defineProperty(f, 'size', { value: size })
    return f
  }

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  beforeEach(() => {
    uploadService = {
      upload: jest.fn().mockReturnValue(of({ code: 200, artifactURL: 'https://host/a/b/pic.png' })),
    }
    loader = { changeLoad: { next: jest.fn() } }
    snackBar = { openFromComponent: jest.fn() }

    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.index).toBe(0)
    expect(component.isCommon).toBe(true)
    expect(component.seriesAtEnd).toBe(true)
  })

  describe('ngOnInit', () => {
    it('selects the first card', () => {
      component.ngOnInit()

      expect(component.currentStrip).toBe(component.content.cardMenu[0])
    })

    it('defaults an image gallery to the second design', () => {
      component.ngOnInit()

      expect(component.content.designVal).toBe('set2')
    })

    it('keeps an explicitly chosen design', () => {
      const c = build({ designVal: 'set5' })

      c.ngOnInit()

      expect(c.content.designVal).toBe('set5')
    })

    it('leaves a non-image gallery without a design value', () => {
      const c = build({ type: 'video' })

      c.ngOnInit()

      expect(c.content.designVal).toBeUndefined()
    })
  })

  describe('onIndexChange', () => {
    it('selects the card at the given index', () => {
      const c = build({ cardMenu: [card('a'), card('b')] })

      c.onIndexChange(1)

      expect(c.index).toBe(1)
      expect(c.currentStrip).toBe(c.content.cardMenu[1])
    })
  })

  describe('addfront', () => {
    it('prepends a card and selects it', () => {
      component.ngOnInit()

      component.addfront()

      expect(component.content.cardMenu.length).toBe(2)
      expect(component.index).toBe(0)
      expect(component.currentStrip).toBe(component.content.cardMenu[0])
      expect(component.currentStrip.cardData).toEqual({
        title: '',
        description: '',
        thumbnail: '',
      })
    })
  })

  describe('addEnd', () => {
    it('appends a card and selects it', () => {
      component.ngOnInit()

      component.addEnd()

      expect(component.content.cardMenu.length).toBe(2)
      expect(component.index).toBe(1)
      expect(component.currentStrip).toBe(component.content.cardMenu[1])
    })

    it('keeps the current index when asked not to advance', () => {
      component.ngOnInit()

      component.addEnd(false)

      expect(component.content.cardMenu.length).toBe(2)
      expect(component.index).toBe(0)
    })
  })

  describe('removeStrip', () => {
    it('replaces the last remaining card with a fresh one', () => {
      component.ngOnInit()

      component.removeStrip()

      expect(component.content.cardMenu.length).toBe(1)
      expect(component.index).toBe(0)
      expect(component.currentStrip.cardData!.title).toBe('')
    })

    it('steps back when the removed card was the last of several', () => {
      const c = build({ cardMenu: [card('a'), card('b')] })
      c.ngOnInit()
      c.onIndexChange(1)

      c.removeStrip()

      expect(c.content.cardMenu.length).toBe(1)
      expect(c.index).toBe(0)
    })

    it('stays put when a card in the middle is removed', () => {
      const c = build({ cardMenu: [card('a'), card('b'), card('c')] })
      c.ngOnInit()

      c.removeStrip()

      expect(c.content.cardMenu.map(m => m.cardData!.title)).toEqual(['b', 'c'])
      expect(c.index).toBe(0)
    })
  })

  describe('metaUpdate', () => {
    beforeEach(() => component.ngOnInit())

    it('writes a field on the selected card', () => {
      component.metaUpdate('title', 'New title')

      expect(component.currentStrip.cardData!.title).toBe('New title')
    })

    it('creates the card metadata when the card has none', () => {
      component.currentStrip.cardData = undefined as any

      component.metaUpdate('description', 'Some text')

      expect(component.currentStrip.cardData).toEqual({
        title: '',
        description: 'Some text',
        thumbnail: '',
      })
    })
  })

  describe('generateWidget', () => {
    it.each(['video', 'audio', 'iframe'])('builds a %s widget', type => {
      const c = build({ type })

      const widget = c.generateWidget()

      expect(widget).toBeTruthy()
      expect(widget.widgetData.type).toBeUndefined()
    })

    it('builds an image widget carrying the configured subtype', () => {
      const widget = component.generateWidget()

      expect(widget.widgetData.type).toBe('set1')
    })

    it('returns a fresh copy of the library entry each time', () => {
      const first = component.generateWidget()
      const second = component.generateWidget()

      expect(first).not.toBe(second)
      expect(first).toEqual(second)
    })
  })

  describe('upload', () => {
    beforeEach(() => component.ngOnInit())

    it('rejects a file that is not an image', () => {
      component.upload(imageFile(100, 'application/pdf', 'doc.pdf'))

      expect(uploadService.upload).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.INVALID_FORMAT)
    })

    it('rejects an image that is over the size limit', () => {
      component.upload(imageFile(FILE_MAX_SIZE + 1))

      expect(uploadService.upload).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.SIZE_ERROR)
    })

    it('strips unsafe characters out of the file name', () => {
      component.upload(imageFile())

      const formData = uploadService.upload.mock.calls[0][0]
      expect((formData.get('content') as File).name).toBe('mypic.png')
    })

    it('stores the uploaded artifact as the card thumbnail', () => {
      component.upload(imageFile())

      expect(component.currentStrip.cardData!.thumbnail).toContain(encodeURIComponent('/b/pic.png'))
      expect(lastNotify()).toBe(Notify.UPLOAD_SUCCESS)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('uploads against the current content id', () => {
      component.upload(imageFile())

      expect(uploadService.upload).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ contentId: 'do_page1' }))
    })

    it('leaves the card alone when the upload returns no code', () => {
      uploadService.upload.mockReturnValue(of({ artifactURL: 'https://host/a/b/pic.png' }))

      component.upload(imageFile())

      expect(component.currentStrip.cardData!.thumbnail).toBe('')
    })

    it('reports an upload failure', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('boom')))

      component.upload(imageFile())

      expect(lastNotify()).toBe(Notify.UPLOAD_FAIL)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })
})
