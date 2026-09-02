import { FormArray, FormBuilder } from '@angular/forms'
import { Subject } from 'rxjs'
import { ConfirmDialogComponent } from './confirm-dialog.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent
  let breakpointObserver: any
  let quizStoreSvc: any
  let snackBar: any
  let selectedQuizIndex: Subject<number>
  let smallScreen$: Subject<{ matches: boolean }>
  let snackbarRef: any

  const mcqQuiz = (
    options: any[] = [
      { text: 'One', isCorrect: true },
      { text: 'Two', isCorrect: false },
    ],
    questionType = 'mcq-sca',
  ) => ({ questionType, question: 'Pick one', questionId: 'q1', options })

  const options = () => component.quizForm.controls['options'] as FormArray

  const build = (data: any = 'delete') => new ConfirmDialogComponent(data, breakpointObserver, quizStoreSvc, snackBar, new FormBuilder())

  const assessment = (questionType = 'mcq-sca') => ({
    type: 'editAssessment',
    data: { questionType },
  })

  /** Open the dialog on an assessment and push a quiz index so the form is built. */
  const load = (quiz: any = mcqQuiz(), data: any = assessment()) => {
    component = build(data)
    quizStoreSvc.getQuiz.mockReturnValue(quiz)
    component.ngOnInit()
    selectedQuizIndex.next(0)
  }

  beforeEach(() => {
    jest.useFakeTimers()
    selectedQuizIndex = new Subject<number>()
    smallScreen$ = new Subject<{ matches: boolean }>()
    snackbarRef = { dismiss: jest.fn() }

    breakpointObserver = { observe: jest.fn().mockReturnValue(smallScreen$) }
    quizStoreSvc = {
      selectedQuizIndex,
      getQuiz: jest.fn().mockReturnValue(mcqQuiz()),
      getQuizConfig: jest.fn().mockReturnValue({ minOptions: 2, maxOptions: 4 }),
    }
    snackBar = { openFromComponent: jest.fn().mockReturnValue(snackbarRef) }

    component = build()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should be created holding the dialog data', () => {
    expect(component).toBeTruthy()
    expect(component.data).toBe('delete')
    expect(component.quizForm).toBeUndefined()
  })

  describe('ngOnInit', () => {
    it('does nothing for a plain confirmation dialog', () => {
      component.ngOnInit()

      selectedQuizIndex.next(0)

      expect(component.quizForm).toBeUndefined()
      expect(component.activeIndexSubscription).toBeUndefined()
    })

    it('builds the editor for a single-answer assessment', () => {
      load()

      expect(component.index).toBe(0)
      expect(component.contentLoaded).toBe(true)
      expect(options().length).toBe(2)
      expect(options().at(0).value).toEqual({ text: 'One', isCorrect: true, hint: '' })
      expect(component.selectedCount).toBe(1)
    })

    it('tracks the small-screen breakpoint', () => {
      load()

      smallScreen$.next({ matches: true })

      expect(component.isSmallScreen).toBe(true)
    })

    it('accepts a multi-answer question pushed into the same editor', () => {
      load(mcqQuiz(undefined, 'mcq-mca'))

      expect(component.selectedQuiz).toBeDefined()
      expect(component.contentLoaded).toBe(true)
    })

    it('ignores a question of an unsupported type', () => {
      load(mcqQuiz(undefined, 'mtf'))

      expect(component.selectedQuiz).toBeUndefined()
      expect(component.contentLoaded).toBe(false)
    })

    it('ignores a missing question', () => {
      load(null)

      expect(component.selectedQuiz).toBeUndefined()
    })

    it.each(['fitb', 'mtf'])('builds no editor for a %s assessment', questionType => {
      component = build(assessment(questionType))

      component.ngOnInit()

      expect(component.activeIndexSubscription).toBeUndefined()
      expect(component.quizForm).toBeUndefined()
    })

    it('tops the options up to the configured minimum', () => {
      load(mcqQuiz([{ text: 'Only', isCorrect: true }]))

      expect(component.selectedQuiz!.options.length).toBe(2)
      expect(options().length).toBe(2)
    })
  })

  describe('assignForm', () => {
    it('marks the option text dirty for an invalid question', () => {
      load()
      quizStoreSvc.getQuiz.mockReturnValue({ ...mcqQuiz(), isInValid: true })

      component.assignForm()

      expect(options().at(0).get('text')!.dirty).toBe(true)
      expect(options().at(0).get('text')!.touched).toBe(true)
      expect(options().at(0).get('hint')!.touched).toBe(false)
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
      expect(() => component.addOption()).not.toThrow()
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

  describe('form value changes', () => {
    it('emits the debounced options on both outputs', () => {
      load()
      const onChange = jest.fn()
      const onValue = jest.fn()
      component.onFormChange.subscribe(onChange)
      component.value.subscribe(onValue)

      options().at(0).get('text')!.setValue('Changed')
      jest.advanceTimersByTime(100)

      const expected = {
        options: [
          { text: 'Changed', isCorrect: true, hint: '' },
          { text: 'Two', isCorrect: false, hint: '' },
        ],
      }
      expect(onChange).toHaveBeenCalledWith(expected)
      expect(onValue).toHaveBeenCalledWith(expected)
    })

    it('emits the debounced question text', () => {
      load()
      const spy = jest.fn()
      component.onFormQuestion.subscribe(spy)

      component.questionForm.controls.question.setValue('New question')
      jest.advanceTimersByTime(100)

      expect(spy).toHaveBeenCalledWith({ question: 'New question' })
    })
  })

  describe('ngOnDestroy', () => {
    it('stops listening for quiz selection changes', () => {
      load()

      component.ngOnDestroy()
      selectedQuizIndex.next(5)

      expect(component.index).toBe(0)
    })

    it('is safe for a plain confirmation dialog', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
