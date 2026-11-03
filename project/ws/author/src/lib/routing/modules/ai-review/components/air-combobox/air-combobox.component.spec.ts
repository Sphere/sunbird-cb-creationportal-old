import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AirIconComponent } from '../air-icon/air-icon.component'
import { AirComboboxComponent } from './air-combobox.component'

describe('AirComboboxComponent', () => {
  let fixture: ComponentFixture<AirComboboxComponent>
  let component: AirComboboxComponent
  let values: string[]

  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement
  const type = (text: string) => {
    input().value = text
    input().dispatchEvent(new Event('input'))
    fixture.detectChanges()
  }
  const key = (k: string) => {
    input().dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
    fixture.detectChanges()
  }
  const options = () => Array.from(fixture.nativeElement.querySelectorAll('.air-combo-option')).map(o => (o as HTMLElement).textContent?.trim())

  beforeEach(() => {
    TestBed.configureTestingModule({ declarations: [AirComboboxComponent, AirIconComponent] })
    fixture = TestBed.createComponent(AirComboboxComponent)
    component = fixture.componentInstance
    fixture.componentRef.setInput('suggestions', ['ANM', 'ASHA', 'Staff Nurse'])
    values = []
    component.valueChange.subscribe(v => values.push(v))
    fixture.detectChanges()
  })

  it('shows every suggestion when the field is opened', () => {
    input().dispatchEvent(new Event('focus'))
    fixture.detectChanges()
    expect(options()).toEqual(['ANM', 'ASHA', 'Staff Nurse'])
  })

  it('keeps any text typed, and narrows the suggestions to it', () => {
    type('nurse')
    expect(values).toEqual(['nurse'])
    expect(options()).toEqual(['Staff Nurse'])
    type('Block health officer')
    expect(values.at(-1)).toBe('Block health officer')
    expect(fixture.nativeElement.querySelector('.air-combo-empty')).toBeTruthy()
  })

  it('picks a suggestion with the keyboard or the mouse', () => {
    key('ArrowDown')
    key('ArrowDown')
    key('Enter')
    expect(values).toEqual(['ASHA'])
    expect(component.open()).toBe(false)

    type('st')
    ;(fixture.nativeElement.querySelector('.air-combo-option') as HTMLElement).click()
    expect(values.at(-1)).toBe('Staff Nurse')
  })

  it('closes on Escape, and has no list when there is nothing to suggest', () => {
    key('ArrowDown')
    expect(component.open()).toBe(true)
    key('Escape')
    expect(component.open()).toBe(false)

    fixture.componentRef.setInput('suggestions', [])
    fixture.detectChanges()
    component.openList()
    expect(component.open()).toBe(false)
    expect(fixture.nativeElement.querySelector('.air-combo-toggle')).toBeNull()
  })
})
