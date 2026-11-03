import { TestBed } from '@angular/core/testing'
import { AIR_ICONS, AirIconComponent } from './air-icon.component'

describe('AirIconComponent', () => {
  it('draws the named icon at the given size, hidden from screen readers', () => {
    TestBed.configureTestingModule({ declarations: [AirIconComponent] })
    const fixture = TestBed.createComponent(AirIconComponent)
    fixture.componentRef.setInput('name', 'video')
    fixture.componentRef.setInput('size', 18)
    fixture.detectChanges()
    const svg = fixture.nativeElement.querySelector('svg') as SVGElement
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(svg.getAttribute('width')).toBe('18')
    expect(svg.querySelector('path')!.getAttribute('d')).toBe(AIR_ICONS.video)
  })

  it('has a path for every icon', () => {
    Object.values(AIR_ICONS).forEach(d => expect(d).toMatch(/^M/))
  })
})
