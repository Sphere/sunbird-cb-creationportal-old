import { TestBed } from '@angular/core/testing'

import { LoaderCardComponent } from './loader-card.component'

/**
 * The markup moved here from the author root component so a dialog can render
 * it too. These pin the parts that matter: the class names the styles hang off,
 * and the accessible labelling.
 */
describe('LoaderCardComponent', () => {
  const render = () => {
    TestBed.configureTestingModule({ declarations: [LoaderCardComponent] })
    const fixture = TestBed.createComponent(LoaderCardComponent)
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  it('renders the overlay, card, spinner and label', () => {
    const el = render()
    const overlay = el.querySelector('.overlay')
    expect(overlay).toBeTruthy()
    expect(overlay!.querySelector('.loader-card')).toBeTruthy()
    expect(overlay!.querySelector('.loader-spinner')).toBeTruthy()
    expect(overlay!.querySelector('.loader-text')!.textContent).toContain('Please wait')
  })

  it('announces itself to assistive technology', () => {
    const overlay = render().querySelector('.overlay') as HTMLElement
    expect(overlay.getAttribute('aria-live')).toBe('polite')
    expect(overlay.getAttribute('aria-label')).toBe('Loading')
  })
})
