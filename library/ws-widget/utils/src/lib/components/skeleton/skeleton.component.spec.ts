import { Component } from '@angular/core'
import { TestBed } from '@angular/core/testing'

import { SkeletonModule } from './skeleton.module'

@Component({
  standalone: false,
  template: `
    <ws-skeleton-group label="Loading the course">
      <ws-skeleton id="line" />
      <ws-skeleton id="title" shape="line" width="40%" height="24px" />
      <ws-skeleton id="block" shape="block" />
      <ws-skeleton id="circle" shape="circle" height="32px" />
      <ws-skeleton id="pill" shape="pill" radius="8px" />
    </ws-skeleton-group>
  `,
})
class HostComponent {}

describe('Skeleton (shimmer placeholders)', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ declarations: [HostComponent], imports: [SkeletonModule] })
    const fixture = TestBed.createComponent(HostComponent)
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  afterEach(() => TestBed.resetTestingModule())

  it('announces the loading area once, with its label, and hides every shape from screen readers', () => {
    const el = render()
    const group = el.querySelector('ws-skeleton-group')!
    expect(group.getAttribute('role')).toBe('status')
    expect(group.getAttribute('aria-busy')).toBe('true')
    expect(group.querySelector('.ws-skeleton-sr')!.textContent).toBe('Loading the course')
    el.querySelectorAll('ws-skeleton').forEach(s => expect(s.getAttribute('aria-hidden')).toBe('true'))
  })

  it('sizes each shape: a full-width text line by default, and what it is given', () => {
    const el = render()
    const style = (id: string) => (el.querySelector(`#${id}`) as HTMLElement).style
    expect(style('line').width).toBe('100%')
    expect(style('line').height).toBe('14px')
    expect([style('title').width, style('title').height]).toEqual(['40%', '24px'])
    // A block keeps its 16:9 shape from the stylesheet, so no height is set inline.
    expect(style('block').height).toBe('')
    // A circle is as wide as it is tall.
    expect([style('circle').width, style('circle').height]).toEqual(['32px', '32px'])
    expect([style('pill').width, style('pill').borderRadius]).toEqual(['96px', '8px'])
  })

  it('marks each shape with its class, for its rounded corners', () => {
    const el = render()
    expect(el.querySelector('#block')!.classList).toContain('ws-skeleton--block')
    expect(el.querySelector('#circle')!.classList).toContain('ws-skeleton--circle')
    expect(el.querySelector('#line')!.classList).toContain('ws-skeleton')
  })
})
