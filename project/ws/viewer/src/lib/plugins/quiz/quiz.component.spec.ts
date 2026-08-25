import { of } from 'rxjs'

import { QuizComponent } from './quiz.component'

/**
 * Direct-instantiation unit tests for QuizComponent.
 * The component pulls in MatDialog, jsPlumb and timers, so we construct it with
 * mocked collaborators and drive the answer/submit/scoring logic directly.
 */
describe('QuizComponent', () => {
  let events: any
  let dialog: any
  let quizSvc: any

  function build(): QuizComponent {
    events = { raiseInteractTelemetry: jest.fn() }
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(false) })) }
    quizSvc = {
      createAssessmentSubmitRequest: jest.fn((..._args: any[]) => ({ questions: [] })),
      sanitizeAssessmentSubmitRequest: jest.fn((r: any) => r),
      submitQuizV2: jest.fn(() => of({ correct: 2, inCorrect: 1, blank: 0, passPercent: 50, result: 60 })),
    }
    return new QuizComponent(events, dialog, quizSvc)
  }

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('constructs', () => {
    expect(build()).toBeTruthy()
  })

  it('ngOnInit seeds timeLeft from the quiz time limit', async () => {
    const c = build()
    c.quizJson = { timeLimit: 120, questions: [], isAssessment: false } as any
    await c.ngOnInit()
    expect(c.timeLeft).toBe(120)
  })

  it('ngOnChanges resets attempt state when a new quizJson arrives', () => {
    const c = build()
    c.isSubmitted = true
    c.currentQuestionIndex = 3
    c.numCorrectAnswers = 5
    const next = { timeLimit: 60, questions: [], isAssessment: false }
    c.ngOnChanges({ quizJson: { currentValue: next } } as any)
    expect(c.viewState).toBe('initial')
    expect(c.isSubmitted).toBe(false)
    expect(c.currentQuestionIndex).toBe(0)
    expect(c.numCorrectAnswers).toBe(0)
    expect(c.timeLeft).toBe(60)
  })

  it('overViewed("start") begins the quiz attempt', () => {
    jest.useFakeTimers()
    const c = build()
    c.quizJson = { timeLimit: -1, questions: [], isAssessment: false } as any
    c.overViewed('start' as any)
    expect(c.viewState).toBe('attempt')
    expect(c.startTime).toBeGreaterThan(0)
    c.ngOnDestroy()
  })

  it('startQuiz starts a countdown timer subscription when a time limit is set', () => {
    jest.useFakeTimers()
    const c = build()
    c.quizJson = { timeLimit: 1000, questions: [], isAssessment: false } as any
    c.startQuiz()
    expect(c.viewState).toBe('attempt')
    expect(c.timerSubscription).not.toBeNull()
    c.ngOnDestroy()
  })

  it('fillSelectedItems records a single-select answer', () => {
    const c = build()
    c.viewState = 'attempt'
    const q = { questionId: 'q1', multiSelection: false } as any
    c.fillSelectedItems(q, 'o1')
    expect(c.questionAnswerHash['q1']).toEqual(['o1'])
    expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('mark', 'click', { optionId: 'o1' })
  })

  it('fillSelectedItems toggles multi-select answers on and off', () => {
    const c = build()
    c.viewState = 'attempt'
    const q = { questionId: 'q1', multiSelection: true } as any
    c.fillSelectedItems(q, 'o1')
    c.fillSelectedItems(q, 'o2')
    expect(c.questionAnswerHash['q1']).toEqual(['o1', 'o2'])
    // toggling o1 off removes it
    c.fillSelectedItems(q, 'o1')
    expect(c.questionAnswerHash['q1']).toEqual(['o2'])
  })

  it('proceedToSubmit opens the confirm dialog when time remains', () => {
    const c = build()
    c.timeLeft = 30
    c.quizJson = { timeLimit: 30, questions: [{}], isAssessment: false } as any
    c.questionAnswerHash = {}
    c.proceedToSubmit()
    expect(c.submissionState).toBe('unanswered')
    expect(dialog.open).toHaveBeenCalled()
  })

  it('submitQuiz reviews results and applies the server response', () => {
    const c = build()
    c.quizJson = { timeLimit: 10, questions: [], isAssessment: false } as any
    c.identifier = 'id1'
    c.name = 'Quiz'
    c.collectionId = 'col1'
    c.submitQuiz()
    expect(c.isSubmitted).toBe(true)
    expect(c.viewState).toBe('review')
    expect(quizSvc.submitQuizV2).toHaveBeenCalled()
    expect(c.fetchingResultsStatus).toBe('done')
    expect(c.numCorrectAnswers).toBe(2)
    expect(c.numIncorrectAnswers).toBe(1)
    expect(c.result).toBe(60)
    expect(c.isCompleted).toBe(true)
  })

  it('submitQuiz sets the error status when the submit call fails', () => {
    const c = build()
    quizSvc.submitQuizV2 = jest.fn(() => ({
      subscribe: (_next: any, error: any) => error('boom'),
    }))
    c.quizJson = { timeLimit: 10, questions: [], isAssessment: true } as any
    c.submitQuiz()
    expect(c.viewState).toBe('answer')
    expect(c.fetchingResultsStatus).toBe('error')
  })

  it('calculateResults scores an mcq question correctly', () => {
    const c = build()
    c.quizJson = {
      timeLimit: 0,
      isAssessment: false,
      questions: [
        {
          questionId: 'q1',
          questionType: 'mcq-sca',
          options: [
            { optionId: 'a', isCorrect: true },
            { optionId: 'b', isCorrect: false },
          ],
        },
      ],
    } as any
    c.questionAnswerHash = { q1: ['a'] }
    c.calculateResults()
    expect(c.numCorrectAnswers).toBe(1)
    expect(c.numIncorrectAnswers).toBe(0)
    expect(c.numUnanswered).toBe(0)
  })

  it('calculateResults scores a fitb question correctly', () => {
    const c = build()
    c.quizJson = {
      timeLimit: 0,
      isAssessment: false,
      questions: [
        {
          questionId: 'q1',
          questionType: 'fitb',
          options: [{ text: 'cat', isCorrect: true }],
        },
      ],
    } as any
    c.questionAnswerHash = { q1: ['cat'] }
    c.calculateResults()
    expect(c.numCorrectAnswers).toBe(1)
  })

  it('isQuestionAttempted reflects the answer hash', () => {
    const c = build()
    c.questionAnswerHash = { q1: ['o1'] }
    expect(c.isQuestionAttempted('q1')).toBe(true)
    expect(c.isQuestionAttempted('q2')).toBe(false)
  })

  it('markQuestion toggles a question in the marked set', () => {
    const c = build()
    expect(c.isQuestionMarked('q1')).toBe(false)
    c.markQuestion('q1')
    expect(c.isQuestionMarked('q1')).toBe(true)
    c.markQuestion('q1')
    expect(c.isQuestionMarked('q1')).toBe(false)
  })

  it('raiseTelemetry emits optionId when provided, else the content id', () => {
    const c = build()
    c.identifier = 'id1'
    c.raiseTelemetry('mark', 'o1', 'click')
    expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('mark', 'click', { optionId: 'o1' })
    c.raiseTelemetry('quiz', null, 'submit')
    expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('quiz', 'submit', { contentId: 'id1' })
  })

  it('scroll is a safe no-op when the target element is absent', () => {
    const c = build()
    expect(() => c.scroll(0)).not.toThrow()
  })

  it('ngOnDestroy unsubscribes without error', () => {
    const c = build()
    expect(() => c.ngOnDestroy()).not.toThrow()
  })
})
