import { QuizStoreService } from './store.service'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

/**
 * Wave 18 — `removeQuestion`'s index bookkeeping, `updateErrorlog` and the
 * per-question rules in `validateQuiz`.
 */
describe('QuizStoreService (validation)', () => {
  let service: QuizStoreService

  /** A valid single-answer multiple choice question. */
  const mcq = (over: any = {}) => ({
    questionId: 'Q1',
    question: 'What is 2 + 2?',
    questionType: 'mcq-sca',
    options: [
      { text: '4', isCorrect: true, optionId: '' },
      { text: '5', isCorrect: false, optionId: '' },
    ],
    ...over,
  })

  beforeEach(() => {
    service = new QuizStoreService()
    service.currentId = 'q1'
    service.collectiveQuiz = { q1: [] }
    service.errorLog = {}
  })

  // --------------------------------------------------------- removeQuestion --

  describe('removeQuestion', () => {
    const seed = (count: number) => {
      service.collectiveQuiz.q1 = Array.from({ length: count }, (_v, i) => mcq({ questionId: `Q${i}` }))
    }

    it('drops the question and marks the quiz changed', () => {
      seed(3)
      service.removeQuestion(1)
      expect(service.collectiveQuiz.q1).toHaveLength(2)
      expect(service.hasChanged).toBe(true)
    })

    it('steps back when the open question is the last one', () => {
      seed(3)
      service.currentQuizIndex = 2
      service.removeQuestion(2)
      expect(service.currentQuizIndex).toBe(1)
    })

    it('stays in place when a middle question is the open one', () => {
      seed(3)
      service.currentQuizIndex = 1
      service.removeQuestion(1)
      expect(service.currentQuizIndex).toBe(1)
    })

    it('stays on the first question when it is the one removed', () => {
      seed(3)
      service.currentQuizIndex = 0
      service.removeQuestion(0)
      expect(service.currentQuizIndex).toBe(0)
    })

    it('steps back when the open question falls off the end', () => {
      seed(3)
      service.currentQuizIndex = 2
      service.removeQuestion(0)
      expect(service.currentQuizIndex).toBe(1)
    })

    it('leaves the selection alone when an earlier question is removed', () => {
      seed(4)
      service.currentQuizIndex = 1
      service.removeQuestion(3)
      expect(service.currentQuizIndex).toBe(1)
    })
  })

  // ----------------------------------------------------------- id generation --

  describe('id generation', () => {
    it('letters the options of a question', () => {
      expect(service.generateOptionId('Q101', 0)).toBe('Q101-a')
      expect(service.generateOptionId('Q101', 2)).toBe('Q101-c')
    })

    it('pads a single-digit question number', () => {
      expect(service.generateQuestionId(3)).toBe('Q103')
    })

    it('leaves a double-digit question number unpadded', () => {
      expect(service.generateQuestionId(12)).toBe('Q112')
    })

    it('takes the prefix from the resource type', () => {
      service.resourceType = 'Assessment'
      expect(service.generateQuestionId(1)).toBe('A101')
    })
  })

  // ---------------------------------------------------------- updateErrorlog --

  describe('updateErrorlog', () => {
    it('records a message against the question', () => {
      service.updateErrorlog({ type: 'question', quizNumber: 0, message: 'boom' })
      expect(service.errorLog[0].question).toBe('boom')
    })

    it('ignores an entry with no type', () => {
      service.updateErrorlog({ quizNumber: 0, message: 'boom' })
      expect(service.errorLog[0]).toBeUndefined()
    })

    it('does not open a log for a cleared message', () => {
      service.updateErrorlog({ type: 'question', quizNumber: 0, message: '' })
      expect(service.errorLog[0]).toBeUndefined()
    })

    it('clears a message on an existing log', () => {
      service.updateErrorlog({ type: 'question', quizNumber: 0, message: 'boom' })
      service.updateErrorlog({ type: 'question', quizNumber: 0, message: '' })
      expect(service.errorLog[0].question).toBe('')
    })
  })

  // ------------------------------------------------------------ validateQuiz --

  describe('validateQuiz', () => {
    const validate = (question: any) => {
      service.collectiveQuiz.q1 = [question]
      return service.validateQuiz(0)
    }

    it('accepts a well-formed question', () => {
      expect(validate(mcq())).toBeFalsy()
    })

    it('numbers the question and letters its options', () => {
      const question = mcq()
      validate(question)
      expect(question.questionId).toBe('Q100')
      expect(question.options[0].optionId).toBe('Q100-a')
      expect(question.options[1].optionId).toBe('Q100-b')
    })

    it('rejects an empty question', () => {
      expect(validate(mcq({ question: '' }))).toBe(Notify.QUESTION_EMPTY)
    })

    it('rejects a question that is only whitespace', () => {
      expect(validate(mcq({ question: '   ' }))).toBe(Notify.QUESTION_SPACES_ALONE)
    })

    it('rejects an empty option', () => {
      expect(validate(mcq({ options: [{ text: '', isCorrect: true }, { text: '5' }] }))).toBe(Notify.OPTION_EMPTY)
    })

    it('rejects an option that is only whitespace', () => {
      expect(validate(mcq({ options: [{ text: '  ', isCorrect: true }, { text: '5' }] }))).toBe(Notify.OPTION_SPACES_ALONE)
    })

    it('rejects a multiple choice question with no correct option', () => {
      expect(
        validate(
          mcq({
            options: [
              { text: '4', isCorrect: false },
              { text: '5', isCorrect: false },
            ],
          }),
        ),
      ).toBe(Notify.MCQ_NO_OPTION_CORRECT)
    })

    it('rejects a multiple choice question where every option is correct', () => {
      expect(
        validate(
          mcq({
            questionType: 'mcq-mca',
            options: [
              { text: '4', isCorrect: true },
              { text: '5', isCorrect: true },
            ],
          }),
        ),
      ).toBe(Notify.MCQ_ALL_OPTIONS_CORRECT)
    })

    it('promotes a single-answer question with two correct options', () => {
      const question = mcq({
        options: [
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: true },
          { text: '6', isCorrect: false },
        ],
      })
      validate(question)
      expect(question.questionType).toBe('mcq-mca')
    })

    it('rejects a fill-in-the-blank question with no blanks', () => {
      expect(
        validate(
          mcq({
            questionType: 'fitb',
            question: 'The capital is Delhi',
            options: [{ text: 'Delhi', isCorrect: true }],
          }),
        ),
      ).toBe(Notify.FILLUPS_BLANKS_OPTIONS)
    })

    it('rejects a fill-in-the-blank question whose blanks do not match its options', () => {
      expect(
        validate(
          mcq({
            questionType: 'fitb',
            question: 'The capital of <input> is <input>',
            options: [{ text: 'Delhi', isCorrect: true }],
          }),
        ),
      ).toBe(Notify.FILLUPS_BLANKS_OPTIONS)
    })

    it('accepts a fill-in-the-blank question with matching blanks', () => {
      expect(
        validate(
          mcq({
            questionType: 'fitb',
            question: 'The capital is <input>',
            options: [{ text: 'Delhi', isCorrect: true }],
          }),
        ),
      ).toBeFalsy()
    })

    it('rejects a match question with an empty pair', () => {
      expect(
        validate(
          mcq({
            questionType: 'mtf',
            options: [
              { text: '', match: '', isCorrect: true },
              { text: 'b', match: 'B', isCorrect: true },
            ],
          }),
        ),
      ).toBe(Notify.OPTION_EMPTY)
    })

    it('accepts a fully paired match question', () => {
      expect(
        validate(
          mcq({
            questionType: 'mtf',
            options: [
              { text: 'a', match: 'A', isCorrect: true },
              { text: 'b', match: 'B', isCorrect: true },
            ],
          }),
        ),
      ).toBeFalsy()
    })
  })
})
