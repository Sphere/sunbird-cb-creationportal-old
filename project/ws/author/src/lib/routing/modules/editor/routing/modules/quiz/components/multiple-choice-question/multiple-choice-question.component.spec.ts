import { FormArray, FormBuilder } from '@angular/forms'
import { Subject } from 'rxjs'
import { MultipleChoiceQuestionComponent } from './multiple-choice-question.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('MultipleChoiceQuestionComponent', () => {
  let component: MultipleChoiceQuestionComponent
  let dialog: any
  let snackBar: any
  let quizStoreSvc: any
  let breakpointObserver: any
  let selectedQuizIndex: Subject<number>
  let afterClosed$: Subject<any>
  let smallScreen$: Subject<{ matches: boolean }>
  let snackbarRef: any

  const mcqQuiz = (
    options: any[] = [
      { text: 'One', isCorrect: true },
      { text: 'Two', isCorrect: false },
    ],
    questionType = 'mcq-sca',
  ) => ({
    questionType,
    question: 'Pick one',
    questionId: 'q1',
    options,
  })

  const options = () => component.quizForm.controls['options'] as FormArray

  /** ngOnInit + push a quiz index so the form is built. */
  const load = (quiz: any = mcqQuiz(), index = 0) => {
    quizStoreSvc.getQuiz.mockReturnValue(quiz)
    component.ngOnInit()
    selectedQuizIndex.next(index)
  }

  beforeEach(() => {
    jest.useFakeTimers()
    selectedQuizIndex = new Subject<number>()
    afterClosed$ = new Subject<any>()
    smallScreen$ = new Subject<{ matches: boolean }>()
    snackbarRef = { dismiss: jest.fn() }

    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed$ }) }
    snackBar = { openFromComponent: jest.fn().mockReturnValue(snackbarRef) }
    quizStoreSvc = {
      selectedQuizIndex,
      getQuiz: jest.fn().mockReturnValue(mcqQuiz()),
      getQuizConfig: jest.fn().mockReturnValue({ minOptions: 2, maxOptions: 4 }),
    }
    breakpointObserver = { observe: jest.fn().mockReturnValue(smallScreen$) }

    component = new MultipleChoiceQuestionComponent(new FormBuilder(), dialog, snackBar, quizStoreSvc, breakpointObserver)
    component.currentId = 'do_quiz1'
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.selectedCount).toBe(0)
    expect(component.contentLoaded).toBe(false)
    expect(component.isSmallScreen).toBe(false)
  })

  describe('ngOnInit', () => {
    it('tracks the small-screen breakpoint', () => {
      component.ngOnInit()
      smallScreen$.next({ matches: true })

      expect(component.isSmallScreen).toBe(true)
    })

    it.each(['mcq-sca', 'mcq-mca'])('builds the form for a %s question', questionType => {
      load(mcqQuiz(undefined, questionType))

      expect(component.selectedQuiz).toBeDefined()
      expect(component.index).toBe(0)
      expect(component.contentLoaded).toBe(true)
      expect(options().length).toBe(2)
      expect(options().at(0).value).toEqual({ text: 'One', isCorrect: true, hint: '' })
    })

    it('counts the options already marked correct', () => {
      load(
        mcqQuiz([
          { text: 'One', isCorrect: true },
          { text: 'Two', isCorrect: true },
        ]),
      )

      expect(component.selectedCount).toBe(2)
    })

    it('ignores a question of another type', () => {
      load(mcqQuiz(undefined, 'mtf'))

      expect(component.selectedQuiz).toBeUndefined()
      expect(component.contentLoaded).toBe(false)
    })

    it('ignores a missing question', () => {
      load(null)

      expect(component.selectedQuiz).toBeUndefined()
    })

    it('tops the options up to the configured minimum', () => {
      load(mcqQuiz([{ text: 'Only', isCorrect: true }]))

      expect(component.selectedQuiz!.options.length).toBe(2)
      expect(options().length).toBe(2)
    })

    it('seeds the minimum options for a question that arrives with none', () => {
      load({ questionType: 'mcq-sca', options: null })

      expect(options().length).toBe(2)
      expect(component.selectedCount).toBe(0)
    })
  })

  describe('ngOnChanges', () => {
    it('does nothing before the form exists', () => {
      component.submitPressed = true

      expect(() => component.ngOnChanges()).not.toThrow()
    })

    it('does nothing until submit is pressed', () => {
      load()
      const spy = jest.spyOn(component, 'assignForm')

      component.ngOnChanges()

      expect(spy).not.toHaveBeenCalled()
    })

    it('re-validates the form once submit is pressed', () => {
      load()
      const spy = jest.spyOn(component, 'assignForm')
      component.submitPressed = true

      component.ngOnChanges()

      expect(spy).toHaveBeenCalled()
    })
  })

  describe('assignForm', () => {
    it('marks the option text dirty for an invalid question', () => {
      load()
      quizStoreSvc.getQuiz.mockReturnValue({ ...mcqQuiz(), isInValid: true })

      component.assignForm()

      const first = options().at(0)
      expect(first.get('text')!.dirty).toBe(true)
      expect(first.get('text')!.touched).toBe(true)
      expect(first.get('hint')!.touched).toBe(false)
    })

    it('leaves a valid question untouched', () => {
      load()

      component.assignForm()

      expect(options().at(0).get('text')!.touched).toBe(false)
    })

    it('tolerates a question that has gone away', () => {
      load()
      quizStoreSvc.getQuiz.mockReturnValue(null)

      expect(() => component.assignForm()).not.toThrow()
    })
  })

  describe('addOption', () => {
    it('appends an empty incorrect option', () => {
      load()

      component.addOption()

      expect(component.selectedQuiz!.options.length).toBe(3)
      expect(options().at(2).value).toEqual({ text: '', isCorrect: false, hint: '' })
    })

    it('warns once the maximum has been reached', () => {
      load(mcqQuiz([1, 2, 3, 4].map(n => ({ text: `t${n}`, isCorrect: false }))))

      component.addOption()

      expect(component.selectedQuiz!.options.length).toBe(4)
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.MAX_OPTIONS_REACHED } }),
      )
    })

    it('does nothing without a selected question', () => {
      component.selectedQuiz = undefined

      expect(() => component.addOption()).not.toThrow()
    })
  })

  describe('removeOption', () => {
    it('opens a confirmation before removing', () => {
      load()

      component.removeOption(0)

      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        width: '400px',
        data: 'delete',
      })
    })

    it('keeps the option when the removal is cancelled', () => {
      load()

      component.removeOption(0)
      afterClosed$.next(false)

      expect(options().length).toBe(2)
    })

    it('tops the list back up to the minimum after a removal', () => {
      load()

      component.removeOption(0)
      afterClosed$.next(true)

      expect(component.selectedQuiz!.options.length).toBe(2)
      expect(component.selectedQuiz!.options[0].text).toBe('Two')
      expect(component.selectedQuiz!.options[1].text).toBe('')
    })

    it('just removes the option when the list stays above the minimum', () => {
      load(mcqQuiz([1, 2, 3].map(n => ({ text: `t${n}`, isCorrect: false }))))

      component.removeOption(1)
      afterClosed$.next(true)

      expect(component.selectedQuiz!.options.map(o => o.text)).toEqual(['t1', 't3'])
    })
  })

  describe('onSelected', () => {
    beforeEach(() => {
      load(
        mcqQuiz([
          { text: 'One', isCorrect: false },
          { text: 'Two', isCorrect: false },
        ]),
      )
    })

    it('counts a newly ticked option', () => {
      component.onSelected({ checked: true })

      expect(component.selectedCount).toBe(1)
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })

    it('warns when every option has been marked correct', () => {
      component.onSelected({ checked: true })
      component.onSelected({ checked: true })

      expect(component.selectedCount).toBe(2)
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.MCQ_ALL_OPTIONS_CORRECT } }),
      )
    })

    it('dismisses the warning once an option is unticked', () => {
      component.onSelected({ checked: true })
      component.onSelected({ checked: true })

      component.onSelected({ checked: false })

      expect(component.selectedCount).toBe(1)
      expect(snackbarRef.dismiss).toHaveBeenCalled()
    })
  })

  describe('drop', () => {
    it('reorders the options', () => {
      load()

      component.drop({ previousIndex: 0, currentIndex: 1 } as any)

      expect(options().value.map((o: any) => o.text)).toEqual(['Two', 'One'])
    })
  })

  describe('openCkEditor', () => {
    it('opens the hint editor seeded with the current hint', () => {
      load()
      options().at(0).get('hint')!.setValue('a hint')

      component.openCkEditor(0)

      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        width: '800px',
        data: { content: 'a hint', identifier: 'do_quiz1', type: 'HINT_EDITOR', index: 1 },
      })
    })

    it('writes the edited hint back into the form', () => {
      load()

      component.openCkEditor(1)
      afterClosed$.next('<p>new hint</p>')

      expect(options().at(1).get('hint')!.value).toBe('<p>new hint</p>')
    })

    it('leaves the hint alone when the editor is dismissed', () => {
      load()

      component.openCkEditor(1)
      afterClosed$.next(undefined)

      expect(options().at(1).get('hint')!.value).toBe('')
    })
  })

  describe('form value changes', () => {
    it('emits the debounced form value', () => {
      const spy = jest.fn()
      component.value.subscribe(spy)
      load()

      options().at(0).get('text')!.setValue('Changed')
      jest.advanceTimersByTime(100)

      expect(spy).toHaveBeenCalledWith({
        options: [
          { text: 'Changed', isCorrect: true, hint: '' },
          { text: 'Two', isCorrect: false, hint: '' },
        ],
      })
    })
  })

  describe('ngOnDestroy', () => {
    it('stops listening for quiz selection changes', () => {
      load()

      component.ngOnDestroy()
      selectedQuizIndex.next(5)

      expect(component.index).toBe(0)
    })

    it('is safe before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
