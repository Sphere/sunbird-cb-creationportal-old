import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter, RouterLink } from '@angular/router'
import { AiReviewMarksService, IAiReviewMark } from '../../../ai-review/services/ai-review-marks.service'
import { AiReviewedMarkComponent } from './ai-reviewed-mark.component'

describe('AiReviewedMarkComponent', () => {
  let fixture: ComponentFixture<AiReviewedMarkComponent>
  const marks = signal<ReadonlyMap<string, IAiReviewMark>>(new Map())
  const svc = { marks, request: jest.fn() }

  const show = (courseId: string, contentType: string) => {
    fixture = TestBed.createComponent(AiReviewedMarkComponent)
    fixture.componentRef.setInput('courseId', courseId)
    fixture.componentRef.setInput('contentType', contentType)
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  beforeEach(() => {
    svc.request.mockClear()
    marks.set(new Map())
    TestBed.configureTestingModule({
      imports: [RouterLink],
      declarations: [AiReviewedMarkComponent],
      providers: [provideRouter([]), { provide: AiReviewMarksService, useValue: svc }],
    })
  })

  it('looks up a course, and links its mark to the AI review report', () => {
    marks.set(new Map([['do_a', { courseId: 'do_a', reviewId: 'r1', status: 'done', finishedAt: '2026-11-16T10:00:00Z' }]]))
    const el = show('do_a', 'Course')
    expect(svc.request).toHaveBeenCalledWith('do_a')
    const a = el.querySelector('a.ai-reviewed-mark') as HTMLAnchorElement
    expect(a.textContent).toContain('AI reviewed')
    expect(a.getAttribute('href')).toBe('/author/ai-review/courses/do_a?review=r1')
    expect(a.getAttribute('title')).toContain('AI reviewed on')
  })

  it('shows nothing for a course without a report, and never asks about other content', () => {
    expect(show('do_a', 'Course').querySelector('a')).toBeNull()
    svc.request.mockClear()
    expect(show('do_r', 'Resource').querySelector('a')).toBeNull()
    expect(svc.request).not.toHaveBeenCalled()
  })

  it('keeps a click on the mark from opening the card underneath', () => {
    marks.set(new Map([['do_a', { courseId: 'do_a', reviewId: 'r1', status: 'done', finishedAt: null }]]))
    const el = show('do_a', 'Course')
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    const stop = jest.spyOn(event, 'stopPropagation')
    el.querySelector('a')!.dispatchEvent(event)
    expect(stop).toHaveBeenCalled()
    expect(fixture.componentInstance.when()).toBe('Open the AI review report')
  })
})
