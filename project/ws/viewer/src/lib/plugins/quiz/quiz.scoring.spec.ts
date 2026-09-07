import { of, throwError } from 'rxjs'

import { QuizComponent } from './quiz.component'

/**
 * Wave 18 — the scoring and submission paths of the viewer QuizComponent:
 * `scroll`, `startQuiz`'s timer, `fillSelectedItems`, `proceedToSubmit`,
 * `submitQuiz`, `calculateResults` (fitb / mtf / mcq) and the answer reveal.
 */
describe('QuizComponent (scoring and submission)', () => {
  let events: any
  let dialog: any
  let quizSvc: any
  let afterClosed: any

  function build(): QuizComponent {
    events = { raiseInteractTelemetry: jest.fn() }
    afterClosed = of(false)
    dialog = { open: jest.fn(() => ({ afterClosed: () => afterClosed })) }
    quizSvc = {
      createAssessmentSubmitRequest: jest.fn((..._args: any[]) => ({ questions: [] })),
      sanitizeAssessmentSubmitRequest: jest.fn((r: any) => r),
      submitQuizV2: jest.fn(() => of({ correct: 2, inCorrect: 1, blank: 0, passPercent: 50, result: 60 })),
    }
    return new QuizComponent(events, dialog, quizSvc)
  }

  /** An mcq question with one correct option. */
  const mcq = (over: any = {}) => ({
    questionId: 'Q1',
    questionType: 'mcq-sca',
    multiSelection: false,
    options: [
      { optionId: 'a', isCorrect: true },
      { optionId: 'b', isCorrect: false },
    ],
    ...over,
  })

  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  // ----------------------------------------------------------------- scroll --

  describe('scroll', () => {
    it('brings the requested question into view', () => {
      const c = build()
      const scrollIntoView = jest.fn()
      jest.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView } as any)
      c.sidenavOpenDefault = true
      c.scroll(2)
      expect(document.getElementById).toHaveBeenCalledWith('question2')
      expect(scrollIntoView).toHaveBeenCalled()
    })

    it('closes the question list first on a narrow screen', () => {
      const c = build()
      const close = jest.fn()
      c.sideNav = { close } as any
      c.sidenavOpenDefault = false
      jest.spyOn(document, 'getElementById').mockReturnValue(null)
      c.scroll(1)
      expect(close).toHaveBeenCalled()
    })

    it('survives a missing question element', () => {
      const c = build()
      c.sidenavOpenDefault = false
      c.sideNav = undefined as any
      jest.spyOn(document, 'getElementById').mockReturnValue(null)
      expect(() => c.scroll(1)).not.toThrow()
    })
  })

  // -------------------------------------------------------------- lifecycle --

  describe('lifecycle', () => {
    it('drops a running timer when a new quiz arrives', () => {
      const c = build()
      const unsubscribe = jest.fn()
      c.timerSubscription = { unsubscribe } as any
      c.ngOnChanges({ quizJson: { currentValue: { timeLimit: 60, questions: [] } } } as any)
      expect(unsubscribe).toHaveBeenCalled()
      expect(c.timerSubscription).toBeNull()
    })

    it('ignores an unrelated change', () => {
      const c = build()
      c.viewState = 'attempt'
      c.ngOnChanges({ somethingElse: { currentValue: 1 } } as any)
      expect(c.viewState).toBe('attempt')
    })

    it('leaves the timer alone for a quiz with no time limit', () => {
      const c = build()
      c.timeLeft = 42
      c.ngOnChanges({ quizJson: { currentValue: { questions: [] } } } as any)
      expect(c.timeLeft).toBe(42)
    })

    it('releases every subscription it owns', () => {
      const c = build()
      const timer = { unsubscribe: jest.fn() }
      const assessment = { unsubscribe: jest.fn() }
      const telemetry = { unsubscribe: jest.fn() }
      c.timerSubscription = timer as any
      c.getAssessment = assessment as any
      c.telemetrySubscription = telemetry as any
      c.ngOnDestroy()
      expect(timer.unsubscribe).toHaveBeenCalled()
      expect(assessment.unsubscribe).toHaveBeenCalled()
      expect(telemetry.unsubscribe).toHaveBeenCalled()
    })

    it('survives with nothing to release', () => {
      const c = build()
      expect(() => c.ngOnDestroy()).not.toThrow()
    })

    it('does nothing when the learner skips the overview', () => {
      const c = build()
      const start = jest.spyOn(c, 'startQuiz').mockImplementation(() => undefined)
      c.overViewed('skip' as any)
      expect(start).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------- startQuiz --

  describe('startQuiz', () => {
    it('counts down and auto-submits when the time runs out', () => {
      jest.useFakeTimers()
      const c = build()
      const submit = jest.spyOn(c, 'submitQuiz').mockImplementation(() => undefined)
      c.quizJson = { timeLimit: 0.15, questions: [], isAssessment: false } as any
      c.startQuiz()
      expect(c.viewState).toBe('attempt')
      jest.advanceTimersByTime(300)
      expect(c.isIdeal).toBe(true)
      expect(c.timeLeft).toBe(0)
      expect(submit).toHaveBeenCalled()
    })

    it('opens the question list briefly on start', () => {
      jest.useFakeTimers()
      const c = build()
      c.quizJson = { timeLimit: -1, questions: [], isAssessment: false } as any
      c.startQuiz()
      expect(c.sidenavOpenDefault).toBe(true)
      jest.advanceTimersByTime(600)
      expect(c.sidenavOpenDefault).toBe(false)
    })

    it('runs no timer for a quiz with no limit', () => {
      jest.useFakeTimers()
      const c = build()
      c.quizJson = { timeLimit: -1, questions: [], isAssessment: false } as any
      c.startQuiz()
      expect(c.timerSubscription).toBeFalsy()
    })

    it('runs no timer without a quiz at all', () => {
      jest.useFakeTimers()
      const c = build()
      c.quizJson = undefined as any
      c.startQuiz()
      expect(c.timerSubscription).toBeFalsy()
    })
  })

  // ------------------------------------------------------- fillSelectedItems --

  describe('fillSelectedItems', () => {
    it('records a single-select answer', () => {
      const c = build()
      c.fillSelectedItems(mcq() as any, 'a')
      expect(c.questionAnswerHash.Q1).toEqual(['a'])
      expect(c.viewState).toBe('attempt')
    })

    it('replaces a single-select answer', () => {
      const c = build()
      c.questionAnswerHash = { Q1: ['a'] }
      c.fillSelectedItems(mcq() as any, 'b')
      expect(c.questionAnswerHash.Q1).toEqual(['b'])
    })

    it('adds a multi-select answer', () => {
      const c = build()
      c.questionAnswerHash = { Q1: ['a'] }
      c.fillSelectedItems(mcq({ multiSelection: true }) as any, 'b')
      expect(c.questionAnswerHash.Q1).toEqual(['a', 'b'])
    })

    it('removes a multi-select answer that was toggled off', () => {
      const c = build()
      c.questionAnswerHash = { Q1: ['a', 'b'] }
      c.fillSelectedItems(mcq({ multiSelection: true }) as any, 'b')
      expect(c.questionAnswerHash.Q1).toEqual(['a'])
    })

    it('forgets the question once the last option is unticked', () => {
      const c = build()
      c.questionAnswerHash = { Q1: ['a'] }
      c.fillSelectedItems(mcq({ multiSelection: true }) as any, 'a')
      expect(c.questionAnswerHash.Q1).toBeUndefined()
    })

    it('clears the revealed answers before a fresh attempt', () => {
      const c = build()
      const reset = jest.fn()
      c.viewState = 'answer'
      c.questionsReference = [{ reset }] as any
      c.fillSelectedItems(mcq() as any, 'a')
      expect(reset).toHaveBeenCalled()
      expect(c.viewState).toBe('attempt')
    })

    it('survives a reveal with no rendered questions', () => {
      const c = build()
      c.viewState = 'answer'
      c.questionsReference = undefined as any
      expect(() => c.fillSelectedItems(mcq() as any, 'a')).not.toThrow()
    })
  })

  // -------------------------------------------------------- proceedToSubmit --

  describe('proceedToSubmit', () => {
    beforeEach(() => jest.spyOn(document, 'getElementById').mockReturnValue(null))

    it('does nothing once the time is up', () => {
      const c = build()
      c.timeLeft = 0
      c.proceedToSubmit()
      expect(dialog.open).not.toHaveBeenCalled()
    })

    it('warns about unanswered questions', () => {
      const c = build()
      c.timeLeft = 10
      c.quizJson = { questions: [mcq(), mcq({ questionId: 'Q2' })] } as any
      c.questionAnswerHash = { Q1: ['a'] }
      c.proceedToSubmit()
      expect(c.submissionState).toBe('unanswered')
    })

    it('warns about questions still marked for review', () => {
      const c = build()
      c.timeLeft = 10
      c.quizJson = { questions: [mcq()] } as any
      c.questionAnswerHash = { Q1: ['a'] }
      c.markedQuestions = new Set(['Q1'])
      c.proceedToSubmit()
      expect(c.submissionState).toBe('marked')
    })

    it('reports a fully answered quiz', () => {
      const c = build()
      c.timeLeft = 10
      c.quizJson = { questions: [mcq()] } as any
      c.questionAnswerHash = { Q1: ['a'] }
      c.proceedToSubmit()
      expect(c.submissionState).toBe('answered')
    })

    it('submits once the learner confirms', () => {
      const c = build()
      const submit = jest.spyOn(c, 'submitQuiz').mockImplementation(() => undefined)
      afterClosed = of(true)
      c.timeLeft = 10
      c.quizJson = { questions: [] } as any
      c.proceedToSubmit()
      expect(submit).toHaveBeenCalled()
    })

    it('stays put when the learner cancels', () => {
      const c = build()
      const submit = jest.spyOn(c, 'submitQuiz').mockImplementation(() => undefined)
      c.timeLeft = 10
      c.quizJson = { questions: [] } as any
      c.proceedToSubmit()
      expect(submit).not.toHaveBeenCalled()
    })
  })

  // ------------------------------------------------------------- submitQuiz --

  describe('submitQuiz', () => {
    const withScroll = () => {
      const scrollIntoView = jest.fn()
      jest.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView } as any)
      return scrollIntoView
    }

    it('scores a practice quiz locally and shows the review', () => {
      withScroll()
      const c = build()
      const calculate = jest.spyOn(c, 'calculateResults').mockImplementation(() => undefined)
      c.quizJson = { timeLimit: 60, questions: [mcq()], isAssessment: false } as any
      c.submitQuiz()
      expect(c.isSubmitted).toBe(true)
      expect(c.viewState).toBe('review')
      expect(calculate).toHaveBeenCalled()
    })

    it('waits for the server verdict on an assessment', () => {
      withScroll()
      const c = build()
      c.quizJson = { timeLimit: 60, questions: [mcq()], isAssessment: true } as any
      c.submitQuiz()
      expect(c.viewState).toBe('answer')
      expect(c.isIdeal).toBe(true)
    })

    it('records the server result and marks a pass', () => {
      withScroll()
      const c = build()
      c.artifactUrl = 'https://cdn/quiz.json'
      c.quizJson = { timeLimit: 60, questions: [mcq()], isAssessment: true } as any
      c.submitQuiz()
      expect(quizSvc.submitQuizV2).toHaveBeenCalled()
      expect(c.numCorrectAnswers).toBe(2)
      expect(c.numIncorrectAnswers).toBe(1)
      expect(c.numUnanswered).toBe(0)
      expect(c.result).toBe(60)
      expect(c.isCompleted).toBe(true)
      expect(c.fetchingResultsStatus).toBe('done')
    })

    it('leaves the quiz incomplete below the pass mark', () => {
      withScroll()
      const c = build()
      quizSvc.submitQuizV2.mockReturnValue(of({ correct: 0, inCorrect: 3, blank: 0, passPercent: 50, result: 10 }))
      c.quizJson = { timeLimit: 60, questions: [mcq()], isAssessment: true } as any
      c.submitQuiz()
      expect(c.isCompleted).toBe(false)
    })

    it('reports a failed submission', () => {
      withScroll()
      const c = build()
      quizSvc.submitQuizV2.mockReturnValue(throwError(() => new Error('offline')))
      c.quizJson = { timeLimit: 60, questions: [mcq()], isAssessment: true } as any
      c.submitQuiz()
      expect(c.fetchingResultsStatus).toBe('error')
    })

    it('survives a page with no scroll anchor', () => {
      jest.spyOn(document, 'getElementById').mockReturnValue(null)
      const c = build()
      jest.spyOn(c, 'calculateResults').mockImplementation(() => undefined)
      c.quizJson = { timeLimit: 60, questions: [mcq()], isAssessment: false } as any
      expect(() => c.submitQuiz()).not.toThrow()
    })
  })

  // ------------------------------------------------------- calculateResults --

  describe('calculateResults', () => {
    // The component derives the correct answers from each question's own options,
    // so the fixtures below describe options rather than a pre-built answer key.
    const answer = (over: any = {}) => ({
      questionId: 'Q1',
      questionType: 'mcq-sca',
      options: [
        { optionId: 'a', isCorrect: true },
        { optionId: 'b', isCorrect: false },
      ],
      ...over,
    })

    const fitb = (texts: string[]) => answer({ questionType: 'fitb', options: texts.map(text => ({ text, isCorrect: true })) })

    const mtf = (matches: string[]) => answer({ questionType: 'mtf', options: matches.map(match => ({ match, isCorrect: true })) })

    const scoreWith = (c: QuizComponent, answers: any[], hash: any) => {
      c.quizJson = { questions: answers, isAssessment: false, timeLimit: 60 } as any
      c.questionAnswerHash = hash
      c.calculateResults()
    }

    it('scores a correct single-select answer', () => {
      const c = build()
      scoreWith(c, [answer()], { Q1: ['a'] })
      expect(c.numCorrectAnswers).toBe(1)
      expect(c.numIncorrectAnswers).toBe(0)
      expect(c.numUnanswered).toBe(0)
    })

    it('scores an incorrect single-select answer', () => {
      const c = build()
      scoreWith(c, [answer()], { Q1: ['b'] })
      expect(c.numIncorrectAnswers).toBe(1)
    })

    it('counts a skipped question as unanswered', () => {
      const c = build()
      scoreWith(c, [answer()], {})
      expect(c.numCorrectAnswers).toBe(0)
      expect(c.numIncorrectAnswers).toBe(0)
      expect(c.numUnanswered).toBe(1)
    })

    it('scores a correct fill-in-the-blank answer', () => {
      const c = build()
      jest.spyOn(c, 'showFitbAnswers').mockImplementation(() => undefined)
      scoreWith(c, [fitb(['Delhi', 'Mumbai'])], { Q1: ['delhi , Mumbai '] })
      expect(c.numCorrectAnswers).toBe(1)
    })

    it('scores a wrong fill-in-the-blank answer', () => {
      const c = build()
      jest.spyOn(c, 'showFitbAnswers').mockImplementation(() => undefined)
      scoreWith(c, [fitb(['Delhi'])], { Q1: ['Chennai'] })
      expect(c.numIncorrectAnswers).toBe(1)
    })

    it('scores a fill-in-the-blank answer with the wrong number of blanks', () => {
      const c = build()
      jest.spyOn(c, 'showFitbAnswers').mockImplementation(() => undefined)
      scoreWith(c, [fitb(['Delhi', 'Mumbai'])], { Q1: ['Delhi'] })
      expect(c.numIncorrectAnswers).toBe(1)
    })

    it('scores a correct match-the-following answer', () => {
      const c = build()
      const element = {
        sourceId: 'src1',
        target: { innerHTML: ' Answer ' },
        setPaintStyle: jest.fn(),
      }
      jest.spyOn(c, 'setBorderColor').mockImplementation(() => undefined)
      scoreWith(c, [mtf(['Answer'])], { Q1: [[element]] })
      expect(element.setPaintStyle).toHaveBeenCalledWith({ stroke: '#357a38' })
      expect(c.numCorrectAnswers).toBe(1)
    })

    it('scores a wrong match-the-following answer', () => {
      const c = build()
      const element = {
        sourceId: 'src1',
        target: { innerHTML: 'Wrong' },
        setPaintStyle: jest.fn(),
      }
      jest.spyOn(c, 'setBorderColor').mockImplementation(() => undefined)
      scoreWith(c, [mtf(['Answer'])], { Q1: [[element]] })
      expect(element.setPaintStyle).toHaveBeenCalledWith({ stroke: '#f44336' })
      expect(c.numIncorrectAnswers).toBe(1)
    })

    it('counts an untouched match-the-following question as unanswered', () => {
      const c = build()
      scoreWith(c, [mtf(['Answer'])], { Q1: [[]] })
      expect(c.numUnanswered).toBe(1)
    })

    it('marks an incomplete match-the-following answer wrong', () => {
      const c = build()
      const element = { sourceId: 'src1', target: { innerHTML: 'Answer' }, setPaintStyle: jest.fn() }
      jest.spyOn(c, 'setBorderColor').mockImplementation(() => undefined)
      scoreWith(c, [mtf(['Answer', 'Second'])], { Q1: [[element]] })
      expect(c.numIncorrectAnswers).toBe(1)
    })
  })

  // ---------------------------------------------------------- answer reveal --

  describe('answer reveal', () => {
    it('reveals both match and blank answers', () => {
      const c = build()
      const matchShowAnswer = jest.fn()
      const functionChangeBlankBorder = jest.fn()
      c.questionsReference = [{ matchShowAnswer, functionChangeBlankBorder }] as any
      c.showAnswers()
      expect(matchShowAnswer).toHaveBeenCalled()
      expect(functionChangeBlankBorder).toHaveBeenCalled()
      expect(c.viewState).toBe('answer')
    })

    it('survives with no rendered questions', () => {
      const c = build()
      c.questionsReference = undefined as any
      expect(() => c.showAnswers()).not.toThrow()
    })

    it('paints both ends of a connection', () => {
      const c = build()
      const source = { style: { borderColor: '' } }
      const target = { style: { borderColor: '' } }
      jest.spyOn(document, 'getElementById').mockImplementation((id: string) => (id === 's' ? source : target) as any)
      c.setBorderColor({ sourceId: 's', targetId: 't' } as any, '#357a38')
      expect(source.style.borderColor).toBe('#357a38')
      expect(target.style.borderColor).toBe('#357a38')
    })

    it('survives a connection whose ends are gone', () => {
      const c = build()
      jest.spyOn(document, 'getElementById').mockReturnValue(null)
      expect(() => c.setBorderColor({ sourceId: 's', targetId: 't' } as any, '#357a38')).not.toThrow()
    })

    it('knows whether a question was attempted', () => {
      const c = build()
      c.questionAnswerHash = { Q1: ['a'] }
      expect(c.isQuestionAttempted('Q1')).toBe(true)
      expect(c.isQuestionAttempted('Q2')).toBe(false)
    })
  })
})
