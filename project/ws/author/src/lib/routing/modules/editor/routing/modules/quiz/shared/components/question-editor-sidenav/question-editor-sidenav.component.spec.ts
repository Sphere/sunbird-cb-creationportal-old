import { of, Subject } from 'rxjs'
import { QUIZ_QUESTION_TYPE } from '../../../constants/quiz-constants'
import { QuestionEditorSidenavComponent } from './question-editor-sidenav.component'

describe('QuestionEditorSidenavComponent', () => {
  let component: QuestionEditorSidenavComponent
  let quizStoreSvc: any
  let dialog: any
  let breakpointObserver: any
  let selectedQuizIndex$: Subject<number>

  beforeEach(() => {
    selectedQuizIndex$ = new Subject<number>()
    quizStoreSvc = {
      getQuizConfig: jest.fn().mockReturnValue({ minQues: 1 }),
      selectedQuizIndex: selectedQuizIndex$,
      addQuestion: jest.fn(),
      removeQuestion: jest.fn(),
      changeQuiz: jest.fn(),
      hasChanged: false,
    }
    dialog = { open: jest.fn() }
    breakpointObserver = { observe: jest.fn().mockReturnValue(of({ matches: true })) }
    component = new QuestionEditorSidenavComponent(quizStoreSvc, dialog, breakpointObserver)
  })

  it('should create with default question type', () => {
    expect(component).toBeTruthy()
    expect(component.questionType).toBe(QUIZ_QUESTION_TYPE.multipleChoiceQuestionSingleCorrectAnswer)
  })

  describe('ngOnInit', () => {
    it('loads quiz config for assessment type', () => {
      component.type = 'assessment'
      component.ngOnInit()
      expect(quizStoreSvc.getQuizConfig).toHaveBeenCalledWith('ques')
      expect(component.entityMinMaxConfig).toEqual({ minQues: 1 })
    })

    it('leaves config null for non-assessment type', () => {
      component.type = 'practice'
      component.ngOnInit()
      expect(quizStoreSvc.getQuizConfig).not.toHaveBeenCalled()
      expect(component.entityMinMaxConfig).toBeNull()
    })

    it('subscribes to selectedQuizIndex and updates it', () => {
      component.ngOnInit()
      selectedQuizIndex$.next(3)
      expect(component.selectedQuizIndex).toBe(3)
    })

    it('sets mediumScreen from breakpoint observer', () => {
      component.ngOnInit()
      expect(component.mediumScreen).toBe(true)
    })
  })

  describe('addEntity', () => {
    it('emits question type and adds the question', () => {
      const emitSpy = jest.spyOn(component.questionTypeChanged, 'emit')
      component.questionType = QUIZ_QUESTION_TYPE.fillInTheBlanks
      component.addEntity()
      expect(emitSpy).toHaveBeenCalledWith(QUIZ_QUESTION_TYPE.fillInTheBlanks)
      expect(quizStoreSvc.addQuestion).toHaveBeenCalledWith(QUIZ_QUESTION_TYPE.fillInTheBlanks)
    })
  })

  describe('removeEntity', () => {
    it('stops propagation and removes on confirm', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(true) })
      const event = { stopPropagation: jest.fn() } as any
      component.removeEntity(2, event)
      expect(event.stopPropagation).toHaveBeenCalled()
      expect(dialog.open).toHaveBeenCalled()
      expect(quizStoreSvc.removeQuestion).toHaveBeenCalledWith(2)
    })

    it('does not remove when dialog is dismissed', () => {
      dialog.open.mockReturnValue({ afterClosed: () => of(false) })
      const event = { stopPropagation: jest.fn() } as any
      component.removeEntity(1, event)
      expect(quizStoreSvc.removeQuestion).not.toHaveBeenCalled()
    })
  })

  describe('selectEntity', () => {
    it('changes quiz and dismisses snackbar when present', () => {
      const dismiss = jest.fn()
      component.snackbarRef = { dismiss } as any
      component.selectEntity(4)
      expect(quizStoreSvc.changeQuiz).toHaveBeenCalledWith(4)
      expect(dismiss).toHaveBeenCalled()
    })

    it('changes quiz without error when no snackbar', () => {
      component.selectEntity(0)
      expect(quizStoreSvc.changeQuiz).toHaveBeenCalledWith(0)
    })
  })

  describe('drop', () => {
    it('reorders data and flags change', () => {
      component.data = ['a', 'b', 'c']
      component.selectedQuizIndex = 5
      component.drop({ previousIndex: 0, currentIndex: 2 } as any)
      expect(component.data).toEqual(['b', 'c', 'a'])
      expect(quizStoreSvc.hasChanged).toBe(true)
    })

    it('reselects the dragged card when it was the selected one', () => {
      component.data = ['a', 'b', 'c']
      component.selectedQuizIndex = 0
      component.drop({ previousIndex: 0, currentIndex: 2 } as any)
      expect(quizStoreSvc.changeQuiz).toHaveBeenCalledWith(2)
    })
  })

  describe('ngOnDestroy', () => {
    it('unsubscribes the active index subscription', () => {
      component.ngOnInit()
      const unsubscribe = jest.spyOn(component.activeIndexSubscription as any, 'unsubscribe')
      component.ngOnDestroy()
      expect(unsubscribe).toHaveBeenCalled()
    })

    it('does not throw when no subscription exists', () => {
      expect(() => component.ngOnDestroy()).not.toThrow()
    })
  })
})
