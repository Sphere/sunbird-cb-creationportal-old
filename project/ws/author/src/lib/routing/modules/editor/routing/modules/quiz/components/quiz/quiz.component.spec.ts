import { EMPTY, of } from 'rxjs'

import { QuizComponent } from './quiz.component'

// QuizComponent renders a heavy child-component tree (viewer, edit-meta, question
// editors) whose dependencies make full TestBed rendering brittle under jsdom. We
// instead instantiate the component directly with mocked collaborators and exercise
// its deterministic, side-effect-light logic.
describe('QuizComponent', () => {
  const initService = {
    uploadMessage: EMPTY,
    updateAssessmentMessage: EMPTY,
    isAssessmentOrQuizMessage: EMPTY,
  }

  const build = (overrides: Partial<Record<string, any>> = {}) => {
    const cdr = { detectChanges: jest.fn() }
    const quizStoreSvc = { changeQuiz: jest.fn() }
    const component = new QuizComponent(
      {} as any, // router
      {} as any, // activateRoute
      cdr as any,
      { observe: () => of({ matches: false }) } as any, // breakpointObserver
      {} as any, // dialog
      {} as any, // snackBar
      quizStoreSvc as any,
      {} as any, // loaderService
      {} as any, // metaContentService
      {} as any, // uploadService
      {} as any, // editorService
      {} as any, // notificationSvc
      initService as any,
      {} as any, // quizResolverSvc
      {} as any, // accessControl
    )
    Object.assign(component, overrides)
    return { component, cdr, quizStoreSvc }
  }

  it('should create', () => {
    const { component } = build()
    expect(component).toBeTruthy()
  })

  describe('isAtLeastOneQuestionPresent', () => {
    it('returns true when a question has text and an option with text', () => {
      const { component } = build({
        questionsArr: [{ question: 'What is 2+2?', options: [{ text: '4' }] }],
      })
      expect(component.isAtLeastOneQuestionPresent()).toBe(true)
    })

    it('returns false when all questions are empty', () => {
      const { component } = build({
        questionsArr: [{ question: '   ', options: [{ text: '' }] }],
      })
      expect(component.isAtLeastOneQuestionPresent()).toBe(false)
    })
  })

  describe('customStepper', () => {
    it('disables the cursor on step 1', () => {
      const { component } = build()
      component.customStepper(1)
      expect(component.disableCursor).toBe(true)
    })

    it('sets the current step for other steps', () => {
      const { component } = build()
      component.customStepper(3)
      expect(component.currentStep).toBe(3)
    })
  })

  describe('changeQuiz', () => {
    it('moves the quiz index by the given step count via the store', () => {
      const { component, quizStoreSvc } = build({ selectedQuizIndex: 1 })
      component.changeQuiz(2)
      expect(quizStoreSvc.changeQuiz).toHaveBeenCalledWith(3)
    })
  })

  describe('shuffle', () => {
    it('returns an array with the same elements', () => {
      const { component } = build()
      const input = [1, 2, 3, 4, 5]
      const result = component.shuffle([...input])
      expect(result).toHaveLength(input.length)
      expect([...result].sort()).toEqual(input)
    })
  })
})
