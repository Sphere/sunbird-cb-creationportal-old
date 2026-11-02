jest.mock('jsplumb', () => ({ jsPlumb: { getInstance: jest.fn() } }))

import { NO_ERRORS_SCHEMA } from '@angular/core'
import { TestBed } from '@angular/core/testing'

import { QuestionComponent } from './question.component'

/**
 * The creator-portal quiz preview is an answer key for creators, reviewers and publishers:
 * correct options are marked, nothing is clickable, and every option's hint shows without
 * submitting. Multiple choice used to be clickable while single choice was not, and hints
 * only appeared after Submit for the picked option.
 */
describe('QuestionComponent answer key (creator preview)', () => {
  const question = (questionType: 'mcq-sca' | 'mcq-mca') => ({
    questionId: 'q1',
    questionType,
    multiSelection: questionType === 'mcq-mca',
    question: 'Pick',
    options: [
      { optionId: 'o1', text: 'Right', isCorrect: true, hint: '<p>Because right</p>' },
      { optionId: 'o2', text: 'Also right', isCorrect: questionType === 'mcq-mca' },
      { optionId: 'o3', text: 'Wrong', isCorrect: false, hint: 'Not this one' },
    ],
  })

  const render = (q: ReturnType<typeof question>) => {
    TestBed.configureTestingModule({ declarations: [QuestionComponent], schemas: [NO_ERRORS_SCHEMA] })
    const fixture = TestBed.createComponent(QuestionComponent)
    fixture.componentInstance.question = q as any
    fixture.detectChanges()
    return fixture
  }

  for (const type of ['mcq-sca', 'mcq-mca'] as const) {
    describe(type, () => {
      it('marks the correct options, and every input is read-only', () => {
        const el: HTMLElement = render(question(type)).nativeElement
        const inputs = Array.from(el.querySelectorAll<HTMLInputElement>('.option-check'))
        expect(inputs.length).toBe(3)
        expect(inputs.every(i => i.disabled)).toBe(true)
        const expected = type === 'mcq-mca' ? [true, true, false] : [true, false, false]
        expect(inputs.map(i => i.checked)).toEqual(expected)
        expect(el.querySelectorAll('.answer-key-badge').length).toBe(expected.filter(Boolean).length)
      })

      it('shows every hint without submitting, green on the correct option', () => {
        const el: HTMLElement = render(question(type)).nativeElement
        const hints = Array.from(el.querySelectorAll('.answer-key-hint'))
        expect(hints.map(h => h.textContent)).toEqual([expect.stringContaining('Because right'), expect.stringContaining('Not this one')])
        expect(hints[0].classList).toContain('answer-key-hint--correct')
        expect(hints[1].classList).not.toContain('answer-key-hint--correct')
      })

      it('does not emit a selection when an option is clicked', () => {
        const fixture = render(question(type))
        const emitted = jest.fn()
        fixture.componentInstance.itemSelected.subscribe(emitted)
        ;(fixture.nativeElement.querySelector('.option-row') as HTMLElement).click()
        expect(emitted).not.toHaveBeenCalled()
      })
    })
  }
})
