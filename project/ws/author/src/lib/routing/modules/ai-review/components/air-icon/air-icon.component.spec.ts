import { TestBed } from '@angular/core/testing'
import { AIR_FILLED, AIR_ICONS, AirIconComponent } from './air-icon.component'

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
    // Drawn as a line, as AI Studio's icons are.
    expect(svg.getAttribute('stroke-width')).toBe('1.75')
    expect(svg.querySelector('path')!.getAttribute('fill')).toBe('none')
  })

  it('draws the shape glyphs solid', () => {
    TestBed.configureTestingModule({ declarations: [AirIconComponent] })
    const fixture = TestBed.createComponent(AirIconComponent)
    fixture.componentRef.setInput('name', 'sparkle')
    fixture.detectChanges()
    const path = fixture.nativeElement.querySelector('path') as SVGPathElement
    expect(path.getAttribute('fill')).toBe('currentColor')
    expect(path.getAttribute('stroke')).toBe('none')
    expect(AIR_FILLED.has('partial')).toBe(true)
  })

  it('has a path for every icon', () => {
    Object.values(AIR_ICONS).forEach(d => expect(d).toMatch(/^M/))
  })

  it('draws nothing for a name it does not know, rather than breaking the layout', () => {
    TestBed.configureTestingModule({ declarations: [AirIconComponent] })
    const fixture = TestBed.createComponent(AirIconComponent)
    fixture.componentRef.setInput('name', 'nope' as never)
    fixture.detectChanges()
    expect(fixture.nativeElement.querySelector('path').getAttribute('d')).toBe('')
  })
})
