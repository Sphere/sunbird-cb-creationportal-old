import { ChipsComponent } from './chips.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('ChipsComponent', () => {
  let component: ChipsComponent
  let snackBar: any
  let cdk: any

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  beforeEach(() => {
    snackBar = { openFromComponent: jest.fn() }
    cdk = { detach: jest.fn(), detectChanges: jest.fn() }
    component = new ChipsComponent(snackBar, cdk)
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('content setter', () => {
    it('splits a space-separated string in string mode', () => {
      component.type = 'string'
      component.content = 'red green blue'
      expect(component.value).toEqual(['red', 'green', 'blue'])
    })

    it('accepts an array directly in array mode', () => {
      component.type = 'array'
      component.content = ['red', 'green']
      expect(component.value).toEqual(['red', 'green'])
    })

    it('filters out empty/whitespace-only entries', () => {
      component.type = 'string'
      component.content = 'red   blue'
      expect(component.value).toEqual(['red', 'blue'])
    })

    it('defaults to an empty array for falsy content', () => {
      component.content = null
      expect(component.value).toEqual([])
    })
  })

  describe('add', () => {
    it('adds a new value and emits joined string in string mode', () => {
      const emitted: any[] = []
      component.type = 'string'
      component.value = ['red']
      component.data.subscribe(v => emitted.push(v))
      component.add('blue')
      expect(component.value).toEqual(['red', 'blue'])
      expect(emitted[0]).toBe('red blue')
    })

    it('emits the array in array mode', () => {
      const emitted: any[] = []
      component.type = 'array'
      component.value = ['red']
      component.data.subscribe(v => emitted.push(v))
      component.add('blue')
      expect(emitted[0]).toEqual(['red', 'blue'])
    })

    it('warns on a duplicate value', () => {
      component.value = ['red']
      component.add('red')
      expect(component.value).toEqual(['red'])
      expect(lastNotify()).toBe(Notify.DUPLICTE)
    })

    it('ignores an empty value', () => {
      component.value = []
      component.add('')
      expect(component.value).toEqual([])
    })
  })

  describe('addAll', () => {
    it('adds each comma-separated value and clears the input', () => {
      const input = { value: 'red, green ,blue' } as HTMLInputElement
      component.value = []
      component.addAll({ input, value: 'red, green ,blue' } as any)
      expect(component.value).toEqual(['red', 'green', 'blue'])
      expect(input.value).toBe('')
    })
  })

  describe('remove', () => {
    it('removes an existing value and emits', () => {
      const emitted: any[] = []
      component.type = 'string'
      component.value = ['red', 'blue']
      component.data.subscribe(v => emitted.push(v))
      component.remove('red')
      expect(component.value).toEqual(['blue'])
      expect(emitted[0]).toBe('blue')
    })

    it('does nothing when the value is absent', () => {
      const emitted: any[] = []
      component.value = ['red']
      component.data.subscribe(v => emitted.push(v))
      component.remove('green')
      expect(component.value).toEqual(['red'])
      expect(emitted.length).toBe(0)
    })
  })

  describe('drop', () => {
    it('reorders the values within the array', () => {
      component.value = ['a', 'b', 'c']
      component.drop({ previousIndex: 0, currentIndex: 2 } as any)
      expect(component.value).toEqual(['b', 'c', 'a'])
    })
  })

  describe('sort', () => {
    it('swaps the current and new index entries', () => {
      component.value = ['a', 'b', 'c']
      component.sort({ currentIndex: 0, newIndex: 2 } as any)
      expect(component.value).toEqual(['c', 'b', 'a'])
    })
  })

  describe('copyData', () => {
    it('copies the value to the clipboard and notifies', () => {
      const original = (document as any).execCommand
      const execSpy = jest.fn().mockReturnValue(true)
      ;(document as any).execCommand = execSpy
      component.value = ['red', 'blue']
      component.copyData()
      expect(execSpy).toHaveBeenCalledWith('copy')
      expect(lastNotify()).toBe(Notify.COPY)
      ;(document as any).execCommand = original
    })
  })

  describe('ngAfterViewInit', () => {
    it('reads the class placeholder', () => {
      component.placeholderType = 'class'
      component.class = { nativeElement: { innerHTML: 'Add class' } } as any
      component.ngAfterViewInit()
      expect(component.placeholder).toBe('Add class')
      expect(cdk.detectChanges).toHaveBeenCalled()
    })

    it('reads the collection placeholder', () => {
      component.placeholderType = 'collection'
      component.collection = { nativeElement: { innerHTML: 'Add collection' } } as any
      component.ngAfterViewInit()
      expect(component.placeholder).toBe('Add collection')
    })
  })

  describe('ngOnDestroy', () => {
    it('detaches the change detector', () => {
      component.ngOnDestroy()
      expect(cdk.detach).toHaveBeenCalled()
    })
  })
})
