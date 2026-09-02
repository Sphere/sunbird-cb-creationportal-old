import { FormArray, FormBuilder } from '@angular/forms'
import { Subject } from 'rxjs'
import { MatchTheFollowingComponent } from './match-the-following.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('MatchTheFollowingComponent', () => {
  let component: MatchTheFollowingComponent
  let dialog: any
  let snackBar: any
  let quizStoreSvc: any
  let breakpointObserver: any
  let selectedQuizIndex: Subject<number>
  let afterClosed$: Subject<any>
  let breakpoints: Record<string, Subject<{ matches: boolean }>>

  const mtfQuiz = (
    options: any[] = [
      { text: 'One', match: 'Uno' },
      { text: 'Two', match: 'Dos' },
    ],
  ) => ({
    questionType: 'mtf',
    question: 'Match them',
    questionId: 'q1',
    options,
  })

  const options = () => component.quizForm.controls['options'] as FormArray

  const build = () => {
    const c = new MatchTheFollowingComponent(new FormBuilder(), dialog, snackBar, quizStoreSvc, breakpointObserver)
    c.currentId = 'do_quiz1'
    return c
  }

  /** ngOnInit + push a quiz index so the form is built. */
  const load = (quiz: any = mtfQuiz(), index = 0) => {
    quizStoreSvc.getQuiz.mockReturnValue(quiz)
    component.ngOnInit()
    selectedQuizIndex.next(index)
  }

  beforeEach(() => {
    jest.useFakeTimers()
    selectedQuizIndex = new Subject<number>()
    afterClosed$ = new Subject<any>()
    breakpoints = {
      '(max-width:449px)': new Subject(),
      '(max-width:700px)': new Subject(),
    }

    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed$ }) }
    snackBar = { openFromComponent: jest.fn() }
    quizStoreSvc = {
      selectedQuizIndex,
      getQuiz: jest.fn().mockReturnValue(mtfQuiz()),
      getQuizConfig: jest.fn().mockReturnValue({ minOptions: 2, maxOptions: 4 }),
    }
    breakpointObserver = { observe: jest.fn((q: string) => breakpoints[q]) }

    component = build()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.canUpdate).toBe(true)
    expect(component.contentLoaded).toBe(false)
    expect(component.isSmallScreen).toBe(false)
    expect(component.isSmallScreenMobile).toBe(false)
  })

  describe('ngOnInit', () => {
    it('tracks both responsive breakpoints', () => {
      component.ngOnInit()

      breakpoints['(max-width:700px)'].next({ matches: true })
      breakpoints['(max-width:449px)'].next({ matches: true })

      expect(component.isSmallScreen).toBe(true)
      expect(component.isSmallScreenMobile).toBe(true)
    })

    it('builds the form for a match-the-following question', () => {
      load()

      expect(component.selectedQuiz).toBeDefined()
      expect(component.selectedIndez).toBe(0)
      expect(component.contentLoaded).toBe(true)
      expect(options().length).toBe(2)
      expect(options().at(0).value).toEqual({ text: 'One', match: 'Uno', hint: '' })
    })

    it('ignores a question of another type', () => {
      load({ questionType: 'mcq', options: [] })

      expect(component.selectedQuiz).toBeUndefined()
      expect(component.contentLoaded).toBe(false)
    })

    it('ignores a missing question', () => {
      load(null)

      expect(component.selectedQuiz).toBeUndefined()
      expect(component.contentLoaded).toBe(false)
    })

    it('tops the options up to the configured minimum', () => {
      load(mtfQuiz([{ text: 'Only', match: 'Uno' }]))

      expect(component.selectedQuiz!.options.length).toBe(2)
      expect(options().length).toBe(2)
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
    it('marks the text and match controls dirty for an invalid question', () => {
      load()
      quizStoreSvc.getQuiz.mockReturnValue({ ...mtfQuiz(), isInValid: true })

      component.assignForm()

      const first = options().at(0)
      expect(first.get('text')!.dirty).toBe(true)
      expect(first.get('text')!.touched).toBe(true)
      expect(first.get('match')!.touched).toBe(true)
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
    it('appends an empty correct option', () => {
      load()

      component.addOption()

      expect(component.selectedQuiz!.options.length).toBe(3)
      expect(options().length).toBe(3)
      expect(options().at(2).value).toEqual({ text: '', match: '', hint: '' })
      expect(component.selectedQuiz!.options[2].isCorrect).toBe(true)
    })

    it('warns once the maximum has been reached', () => {
      load(mtfQuiz([1, 2, 3, 4].map(n => ({ text: `t${n}`, match: `m${n}` }))))

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
      load(mtfQuiz([1, 2, 3].map(n => ({ text: `t${n}`, match: `m${n}` }))))

      component.removeOption(1)
      afterClosed$.next(true)

      expect(component.selectedQuiz!.options.map(o => o.text)).toEqual(['t1', 't3'])
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
      component.updateContentService('a hint', 0)

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

  describe('updateContentService', () => {
    it('writes the hint into the addressed option', () => {
      load()

      component.updateContentService('<p>hint</p>', 0)

      expect(options().at(0).get('hint')!.value).toBe('<p>hint</p>')
    })

    it('ignores an out-of-range option', () => {
      load()

      expect(() => component.updateContentService('<p>hint</p>', 9)).not.toThrow()
    })
  })

  describe('editColNameFn', () => {
    beforeEach(() => {
      load()
      component.colAInput = { first: { nativeElement: { focus: jest.fn() } } } as any
      component.colBInput = { first: { nativeElement: { focus: jest.fn() } } } as any
    })

    it('focuses the column A input', () => {
      component.editColNameFn('colAName')
      jest.advanceTimersByTime(100)

      expect(component.editColName).toBe('colAName')
      expect(component.canUpdate).toBe(false)
      expect(component.colAInput.first.nativeElement.focus).toHaveBeenCalled()
    })

    it('focuses the column B input', () => {
      component.editColNameFn('colBName')
      jest.advanceTimersByTime(100)

      expect(component.colBInput.first.nativeElement.focus).toHaveBeenCalled()
    })
  })

  describe('form value changes', () => {
    it('emits the debounced form value with every option marked correct', () => {
      const spy = jest.fn()
      component.value.subscribe(spy)
      load()

      options().at(0).get('text')!.setValue('Changed')
      jest.advanceTimersByTime(100)

      expect(spy).toHaveBeenCalledWith({
        options: [
          { text: 'Changed', match: 'Uno', hint: '', isCorrect: true },
          { text: 'Two', match: 'Dos', hint: '', isCorrect: true },
        ],
      })
    })
  })

  describe('ngOnDestroy', () => {
    it('stops listening for quiz selection changes', () => {
      load()
      const before = component.selectedIndez

      component.ngOnDestroy()
      selectedQuizIndex.next(5)

      expect(component.selectedIndez).toBe(before)
    })

    it('is safe before init', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
