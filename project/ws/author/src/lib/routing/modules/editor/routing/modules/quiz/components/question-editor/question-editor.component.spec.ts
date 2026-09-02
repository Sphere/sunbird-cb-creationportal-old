import { of, Subscription } from 'rxjs'

import { QuestionEditorComponent } from './question-editor.component'

describe('QuestionEditorComponent', () => {
  let component: QuestionEditorComponent
  let quizStoreSvc: any
  let snackBar: any
  let metaContentService: any

  const baseQuiz = (): any => ({
    question: 'Q?',
    options: [
      { optionId: '1', isCorrect: false, text: 'a' },
      { optionId: '2', isCorrect: true, text: 'b' },
    ],
  })

  beforeEach(() => {
    quizStoreSvc = {
      selectedQuizIndex: of(0),
      getQuiz: jest.fn().mockReturnValue(baseQuiz()),
      updateQuiz: jest.fn(),
      validateQuiz: jest.fn().mockReturnValue(''),
    }
    snackBar = { openFromComponent: jest.fn() }
    metaContentService = {
      changeActiveCont: of('id-1'),
      getOriginalMeta: jest.fn().mockReturnValue({ resourceType: 'Course' }),
    }
    component = new QuestionEditorComponent(quizStoreSvc, snackBar, metaContentService)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('should wire active content and set showHint true for non-Assessment', () => {
      component.ngOnInit()
      expect(component.currentId).toBe('id-1')
      expect(component.showHint).toBe(true)
      expect(component.quizIndex).toBe(0)
      expect(component.selectedQuiz).toBeTruthy()
    })

    it('should set showHint false for Assessment resource type', () => {
      metaContentService.getOriginalMeta.mockReturnValue({ resourceType: 'Assessment' })
      component.ngOnInit()
      expect(component.showHint).toBe(false)
    })

    it('should set selectedQuiz null when getQuiz returns falsy', () => {
      quizStoreSvc.getQuiz.mockReturnValue(null)
      component.ngOnInit()
      expect(component.selectedQuiz).toBeNull()
    })

    it('should show error notification when validateQuiz returns an error type', () => {
      quizStoreSvc.validateQuiz.mockReturnValue('EMPTY_QUESTION')
      component.ngOnInit()
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })
  })

  describe('ngOnChanges', () => {
    it('should validate when a quiz is selected and submit pressed', () => {
      component.selectedQuiz = baseQuiz()
      component.submitPressed = true
      const spy = jest.spyOn(component, 'validateNdShowError')
      component.ngOnChanges()
      expect(spy).toHaveBeenCalledWith(true)
    })

    it('should not validate when no quiz selected', () => {
      component.selectedQuiz = null
      component.submitPressed = true
      const spy = jest.spyOn(component, 'validateNdShowError')
      component.ngOnChanges()
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('updateSelectedQuiz', () => {
    beforeEach(() => {
      component.quizIndex = 0
    })

    it('should update only the question when type is "question"', () => {
      component.updateSelectedQuiz('New question', 'question')
      const [, updated] = quizStoreSvc.updateQuiz.mock.calls[0]
      expect(updated.question).toBe('New question')
    })

    it('should merge options and derive multiSelection false for single correct', () => {
      const event = { options: [{ isCorrect: false }, { isCorrect: true }] }
      component.updateSelectedQuiz(event, 'mcq-sca')
      const [, updated] = quizStoreSvc.updateQuiz.mock.calls[0]
      expect(updated.multiSelection).toBe(false)
      expect(updated.questionType).toBe('mcq-sca')
    })

    it('should derive multiSelection true and mcq-mca for multiple correct', () => {
      const event = { options: [{ isCorrect: true }, { isCorrect: true }] }
      component.updateSelectedQuiz(event, 'mcq-mca')
      const [, updated] = quizStoreSvc.updateQuiz.mock.calls[0]
      expect(updated.multiSelection).toBe(true)
      expect(updated.questionType).toBe('mcq-mca')
    })

    it('should re-validate when updated value is invalid', () => {
      const spy = jest.spyOn(component, 'validateNdShowError')
      const event = { isInValid: true, options: [{ isCorrect: true }, { isCorrect: false }] }
      component.updateSelectedQuiz(event, 'mcq-sca')
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('validateNdShowError', () => {
    it('should open notification when showError true and error present', () => {
      quizStoreSvc.validateQuiz.mockReturnValue('SOME_ERROR')
      component.validateNdShowError(true)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
    })

    it('should not open notification when no error', () => {
      quizStoreSvc.validateQuiz.mockReturnValue('')
      component.validateNdShowError(true)
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })

    it('should not open notification when showError falsy', () => {
      quizStoreSvc.validateQuiz.mockReturnValue('SOME_ERROR')
      component.validateNdShowError(false)
      expect(snackBar.openFromComponent).not.toHaveBeenCalled()
    })
  })

  describe('ngOnDestroy', () => {
    it('should unsubscribe existing subscriptions', () => {
      const s1 = new Subscription()
      const s2 = new Subscription()
      const spy1 = jest.spyOn(s1, 'unsubscribe')
      const spy2 = jest.spyOn(s2, 'unsubscribe')
      component.activeIndexSubscription = s1
      component.activeContentSubscription = s2
      component.ngOnDestroy()
      expect(spy1).toHaveBeenCalled()
      expect(spy2).toHaveBeenCalled()
    })

    it('should not throw when subscriptions are undefined', () => {
      component.activeIndexSubscription = undefined
      component.activeContentSubscription = undefined
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
