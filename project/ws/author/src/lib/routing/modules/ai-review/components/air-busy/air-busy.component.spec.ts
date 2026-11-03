import { ComponentFixture, TestBed } from '@angular/core/testing'
import { AirIconComponent } from '../air-icon/air-icon.component'
import { AirBusyComponent } from './air-busy.component'

describe('AirBusyComponent', () => {
  let fixture: ComponentFixture<AirBusyComponent>
  const text = () => (fixture.nativeElement.textContent as string).replace(/\s+/g, ' ').trim()

  beforeEach(() => {
    jest.useFakeTimers()
    TestBed.configureTestingModule({ declarations: [AirBusyComponent, AirIconComponent] })
    fixture = TestBed.createComponent(AirBusyComponent)
    fixture.componentRef.setInput('label', 'Reading the course')
    fixture.componentRef.setInput('detail', 'Finding its videos')
    fixture.componentRef.setInput('typicalSec', 10)
    fixture.detectChanges()
  })

  afterEach(() => jest.useRealTimers())

  it('says what it is doing, for how long, and how long it usually takes', () => {
    expect(text()).toContain('Reading the course…')
    expect(text()).toContain('Finding its videos')
    expect(text()).toContain('0 s · usually under 10 s')
    jest.advanceTimersByTime(4000)
    fixture.detectChanges()
    expect(text()).toContain('4 s · usually under 10 s')
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy()
  })

  it('says when it is taking longer than usual, and counts minutes', () => {
    jest.advanceTimersByTime(11000)
    fixture.detectChanges()
    expect(text()).toContain('11 s · taking longer than usual')
    expect(fixture.nativeElement.querySelector('.air-busy-time--slow')).toBeTruthy()
    jest.advanceTimersByTime(55000)
    fixture.detectChanges()
    expect(fixture.componentInstance.elapsedText()).toBe('1 min 6 s')
  })

  it('shows no usual time when none is given', () => {
    fixture.componentRef.setInput('typicalSec', 0)
    fixture.detectChanges()
    expect(text()).not.toContain('usually')
    expect(fixture.componentInstance.slow()).toBe(false)
  })
})
