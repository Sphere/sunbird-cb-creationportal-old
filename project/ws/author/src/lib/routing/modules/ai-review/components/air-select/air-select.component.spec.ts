import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AirIconComponent } from '../air-icon/air-icon.component'
import { AirSelectComponent, AirSelectOption } from './air-select.component'

describe('AirSelectComponent', () => {
  let fixture: ComponentFixture<AirSelectComponent>
  let component: AirSelectComponent
  let chosen: string[]
  const options: AirSelectOption[] = [
    { value: 'auto', label: 'Detect automatically' },
    { value: 'hi', label: 'Hindi' },
    { value: 'en', label: 'English', hint: 'For English videos' },
  ]

  const trigger = () => fixture.nativeElement.querySelector('.air-select-trigger') as HTMLButtonElement
  const key = (k: string) => {
    trigger().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
    fixture.detectChanges()
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [AirSelectComponent, AirIconComponent] })
    fixture = TestBed.createComponent(AirSelectComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('options', options)
    fixture.componentRef.setInput('value', 'hi')
    chosen = []
    component.valueChange.subscribe(v => chosen.push(v))
    fixture.detectChanges()
  })

  it('shows the selected label, or the placeholder', () => {
    expect(trigger().textContent).toContain('Hindi')
    fixture.componentRef.setInput('value', null)
    fixture.componentRef.setInput('placeholder', 'Pick a level')
    fixture.detectChanges()
    expect(trigger().textContent).toContain('Pick a level')
  })

  it('opens on click with the selected option active, and closes on choosing', () => {
    trigger().click()
    fixture.detectChanges()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(component.active()).toBe(1)
    const items = fixture.nativeElement.querySelectorAll('[role="option"]')
    expect(items.length).toBe(3)
    expect(items[1].getAttribute('aria-selected')).toBe('true')
    expect(fixture.nativeElement.textContent).toContain('For English videos')
    ;(items[2] as HTMLElement).click()
    fixture.detectChanges()
    expect(chosen).toEqual(['en'])
    expect(component.open()).toBe(false)
  })

  it('works from the keyboard', () => {
    key('ArrowDown')
    expect(component.open()).toBe(true)
    expect(trigger().getAttribute('aria-activedescendant')).toBe(`${component.id}-opt-1`)
    key('ArrowDown')
    key('ArrowDown')
    expect(component.active()).toBe(2)
    key('Home')
    expect(component.active()).toBe(0)
    key('End')
    expect(component.active()).toBe(2)
    key('Enter')
    expect(chosen).toEqual(['en'])
    key(' ')
    expect(component.open()).toBe(true)
    key('Escape')
    expect(component.open()).toBe(false)
  })

  it('jumps to an option by its first letter', () => {
    key('e')
    expect(component.open()).toBe(true)
    expect(component.active()).toBe(2)
    key('d')
    expect(component.active()).toBe(0)
  })

  it('closes on Tab and on a click outside', () => {
    key('ArrowDown')
    key('Tab')
    expect(component.open()).toBe(false)
    key('ArrowDown')
    document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    expect(component.open()).toBe(false)
  })

  it('does nothing without options', () => {
    fixture.componentRef.setInput('options', [])
    fixture.detectChanges()
    key('ArrowDown')
    expect(component.open()).toBe(false)
  })

  describe('with search, for long lists', () => {
    const search = () => fixture.nativeElement.querySelector('.air-select-search input') as HTMLInputElement
    const typeInSearch = (text: string) => {
      search().value = text
      search().dispatchEvent(new Event('input'))
      fixture.detectChanges()
    }
    const keyInSearch = (k: string) => {
      search().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
      fixture.detectChanges()
    }

    beforeEach(() => {
      fixture.componentRef.setInput('searchable', true)
      fixture.detectChanges()
    })

    it('narrows the list by label or hint, and Enter picks the first match', () => {
      trigger().click()
      fixture.detectChanges()
      typeInSearch('english')
      expect(component.visible().map(o => o.value)).toEqual(['en'])
      keyInSearch('Enter')
      expect(chosen).toEqual(['en'])
      expect(component.open()).toBe(false)
    })

    it('opens with the letter typed on the closed button, and keeps spaces as text', () => {
      key('H')
      expect(component.open()).toBe(true)
      expect(component.query()).toBe('H')
      keyInSearch(' ')
      expect(chosen).toEqual([])
      expect(component.open()).toBe(true)
    })

    it('says so when there is nothing to choose at all', () => {
      fixture.componentRef.setInput('options', [])
      fixture.detectChanges()
      trigger().click()
      fixture.detectChanges()
      expect(fixture.nativeElement.querySelector('.air-select-empty').textContent).toContain('No options to choose from.')
    })

    it('says so when nothing matches', () => {
      trigger().click()
      fixture.detectChanges()
      typeInSearch('zzz')
      expect(fixture.nativeElement.querySelector('.air-select-empty').textContent).toContain('zzz')
      keyInSearch('Enter')
      expect(chosen).toEqual([])
    })
  })
})
