import { of } from 'rxjs'
import { PageEditorV2Component } from './page-editor-v2.component'

describe('PageEditorV2Component', () => {
  let store: any
  let contentService: any

  const build = () => new PageEditorV2Component(store, contentService)

  beforeEach(() => {
    store = {
      getUpdatedContent: jest.fn().mockReturnValue({ id: 'parent-1', data: { foo: 'bar' } }),
      updateContent: jest.fn(),
    }
    contentService = {
      changeActiveCont: of(true),
    }
  })

  it('should create', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('resolves the parent on active-content change and on init', () => {
      const c = build()
      const spy = jest.spyOn(c, 'getParent')
      c.ngOnInit()
      expect(spy).toHaveBeenCalledTimes(2)
    })
  })

  describe('getParent', () => {
    it('reads the parent id and flags it as basic-editor content', () => {
      const c = build()
      c.getParent()
      expect(c.parentId).toBe('parent-1')
      expect(store.updateContent).toHaveBeenCalledWith(
        'parent-1',
        expect.objectContaining({ id: 'parent-1', data: { foo: 'bar', fromBasicEditor: true } }),
        false,
      )
    })
  })

  describe('changeEditMode', () => {
    it('emits an editorChange event', () => {
      const c = build()
      const emitted: string[] = []
      c.data.subscribe(v => emitted.push(v))
      c.changeEditMode()
      expect(emitted).toEqual(['editorChange'])
    })
  })

  describe('dragstart_handler', () => {
    it('sets the plain-text drag payload', () => {
      const c = build()
      const ev = { dataTransfer: { setData: jest.fn() } }
      c.dragstart_handler(ev, 'payload')
      expect(ev.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'payload')
    })
  })
})
