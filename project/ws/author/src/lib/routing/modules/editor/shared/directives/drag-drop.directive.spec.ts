import { DragDropDirective } from './drag-drop.directive'

describe('DragDropDirective', () => {
  let directive: DragDropDirective

  const evt = (over: any = {}): any => ({
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    ...over,
  })

  beforeEach(() => {
    directive = new DragDropDirective()
  })

  it('starts fully opaque', () => {
    expect(directive.opacity).toBe('1')
  })

  describe('onDragOver', () => {
    it('dims the drop zone and swallows the event', () => {
      const e = evt()
      directive.onDragOver(e)
      expect(e.preventDefault).toHaveBeenCalled()
      expect(e.stopPropagation).toHaveBeenCalled()
      expect(directive.opacity).toBe('0.4')
    })
  })

  describe('onDragLeave', () => {
    it('restores the opacity and swallows the event', () => {
      const e = evt()
      directive.onDragOver(evt())
      directive.onDragLeave(e)
      expect(e.preventDefault).toHaveBeenCalled()
      expect(e.stopPropagation).toHaveBeenCalled()
      expect(directive.opacity).toBe('1.0')
    })
  })

  describe('ondrop', () => {
    it('emits the first dropped file and restores the opacity', () => {
      const file = new File(['x'], 'a.pdf')
      const emitted: any[] = []
      directive.fileDropped.subscribe(v => emitted.push(v))
      const e = evt({ dataTransfer: { files: [file] } })

      directive.ondrop(e)

      expect(e.preventDefault).toHaveBeenCalled()
      expect(e.stopPropagation).toHaveBeenCalled()
      expect(directive.opacity).toBe('1.0')
      expect(emitted).toEqual([file])
    })

    it('emits nothing when the drop carried no files', () => {
      const emitted: any[] = []
      directive.fileDropped.subscribe(v => emitted.push(v))

      directive.ondrop(evt({ dataTransfer: { files: [] } }))

      expect(emitted).toEqual([])
      expect(directive.opacity).toBe('1.0')
    })

    it('only emits the first file of a multi-file drop', () => {
      const first = new File(['a'], 'a.pdf')
      const second = new File(['b'], 'b.pdf')
      const emitted: any[] = []
      directive.fileDropped.subscribe(v => emitted.push(v))

      directive.ondrop(evt({ dataTransfer: { files: [first, second] } }))

      expect(emitted).toEqual([first])
    })
  })
})
