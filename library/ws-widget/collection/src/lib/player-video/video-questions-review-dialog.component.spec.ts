import { NO_ERRORS_SCHEMA } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog'

import { VideoQuestionsReviewDialogComponent, formatVideoTime } from './video-questions-review-dialog.component'

describe('formatVideoTime', () => {
  it('formats as m:ss under an hour and h:mm:ss above', () => {
    expect(formatVideoTime(5)).toBe('0:05')
    expect(formatVideoTime('75')).toBe('1:15')
    expect(formatVideoTime(3725)).toBe('1:02:05')
  })

  it('treats bad input as 0:00', () => {
    expect(formatVideoTime('x')).toBe('0:00')
    expect(formatVideoTime(-4)).toBe('0:00')
  })
})

describe('VideoQuestionsReviewDialogComponent', () => {
  const close = jest.fn()

  const milestones = [
    {
      timestampInSeconds: 90,
      question: [
        {
          text: 'Second point',
          options: [
            { text: 'Yes', isCorrect: true, answerInfo: 'Because yes' },
            { text: 'No', isCorrect: false },
          ],
        },
      ],
    },
    { timestampInSeconds: 30, question: [{ text: 'First point', options: [{ text: 'A' }, { text: 'B' }] }, { text: 'Also first' }] },
    { timestampInSeconds: 60, question: [] },
  ]

  const render = () => {
    TestBed.configureTestingModule({
      declarations: [VideoQuestionsReviewDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: { close } },
        { provide: MAT_DIALOG_DATA, useValue: { milestones } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    const fixture = TestBed.createComponent(VideoQuestionsReviewDialogComponent)
    fixture.detectChanges()
    return fixture
  }

  beforeEach(() => close.mockReset())

  it('lists points in playback order, dropping ones with no questions', () => {
    const fixture = render()
    const c = fixture.componentInstance
    expect(c.milestones.map(m => m.timestampInSeconds)).toEqual([30, 90])
    expect(c.questionCount).toBe(3)
    const text = fixture.nativeElement.textContent
    expect(text).toContain('3 questions at 2 points')
    expect(text.indexOf('First point')).toBeLessThan(text.indexOf('Second point'))
    expect(text).toContain('0:30')
    expect(text).toContain('1:30')
  })

  it('marks the correct answer and shows its hint', () => {
    const el: HTMLElement = render().nativeElement
    const correct = el.querySelectorAll('.vqr-option--correct')
    expect(correct.length).toBe(1)
    expect(correct[0].textContent).toContain('Yes')
    expect(correct[0].textContent).toContain('Correct answer')
    expect(el.textContent).toContain('Hint shown: Because yes')
  })

  it('warns when a question has no correct option marked', () => {
    const el: HTMLElement = render().nativeElement
    expect(el.querySelectorAll('.vqr-warn').length).toBe(2)
  })

  it('Jump to closes with the point time; close closes without one', () => {
    const fixture = render()
    const buttons = fixture.nativeElement.querySelectorAll('.vqr-jump')
    buttons[1].click()
    expect(close).toHaveBeenCalledWith({ jumpTo: 90 })
    fixture.componentInstance.close()
    expect(close).toHaveBeenLastCalledWith()
  })
})
