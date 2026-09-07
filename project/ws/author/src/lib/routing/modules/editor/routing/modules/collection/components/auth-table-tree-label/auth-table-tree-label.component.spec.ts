import { Subject } from 'rxjs'

import { AuthTableTreeLabelComponent } from './auth-table-tree-label.component'

describe('AuthTableTreeLabelComponent', () => {
  let storeService: any
  let resolverService: any
  let onContentChange: Subject<string>

  const build = () => new AuthTableTreeLabelComponent(storeService, resolverService)

  beforeEach(() => {
    onContentChange = new Subject<string>()
    storeService = {
      onContentChange,
      getUpdatedMeta: jest.fn().mockReturnValue({ name: 'Module One', contentType: 'CourseUnit' }),
    }
    resolverService = { getIcon: jest.fn().mockReturnValue('folder') }
  })

  it('starts with empty label state', () => {
    const comp = build()
    expect(comp.name).toBe('')
    expect(comp.icon).toBe('')
    expect(comp.isDragging).toBe(false)
    expect(comp.isInvalid).toBe(false)
  })

  describe('ngOnInit', () => {
    it('reads the current name and icon immediately', () => {
      const comp = build()
      comp.identifier = 'do_1'
      comp.ngOnInit()
      expect(storeService.getUpdatedMeta).toHaveBeenCalledWith('do_1')
      expect(comp.name).toBe('Module One')
      expect(comp.icon).toBe('folder')
    })

    it('refreshes when its own content changes', () => {
      const comp = build()
      comp.identifier = 'do_1'
      comp.ngOnInit()

      storeService.getUpdatedMeta.mockReturnValue({ name: 'Renamed', contentType: 'CourseUnit' })
      resolverService.getIcon.mockReturnValue('book')
      onContentChange.next('do_1')

      expect(comp.name).toBe('Renamed')
      expect(comp.icon).toBe('book')
    })

    it('ignores changes to a different node', () => {
      const comp = build()
      comp.identifier = 'do_1'
      comp.ngOnInit()

      storeService.getUpdatedMeta.mockReturnValue({ name: 'Other', contentType: 'CourseUnit' })
      onContentChange.next('do_2')

      expect(comp.name).toBe('Module One')
    })
  })

  describe('getUpdatedContent', () => {
    it('pulls the name and icon from the store and resolver', () => {
      const meta = { name: 'Resource A', contentType: 'Resource' }
      storeService.getUpdatedMeta.mockReturnValue(meta)
      resolverService.getIcon.mockReturnValue('pdf')

      const comp = build()
      comp.identifier = 'do_9'
      comp.getUpdatedContent()

      expect(comp.name).toBe('Resource A')
      expect(resolverService.getIcon).toHaveBeenCalledWith(meta)
      expect(comp.icon).toBe('pdf')
    })
  })
})
