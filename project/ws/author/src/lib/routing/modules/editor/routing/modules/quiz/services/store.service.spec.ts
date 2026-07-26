import { QuizStoreService } from './store.service'
import { QUESTION_CONFIG } from '../constants/quiz-constants'

describe('QuizStoreService', () => {
  let service: QuizStoreService

  beforeEach(() => {
    service = new QuizStoreService()
    service.currentId = 'q1'
    service.collectiveQuiz = { q1: [] }
  })

  it('is created with default state', () => {
    expect(service).toBeInstanceOf(QuizStoreService)
    expect(service.resourceType).toBe('Quiz')
    expect(service.currentQuizIndex).toBe(0)
  })

  describe('changeQuiz', () => {
    it('updates the index and emits it', done => {
      service.selectedQuizIndex.subscribe(idx => {
        if (idx === 2) {
          expect(service.currentQuizIndex).toBe(2)
          done()
        }
      })
      service.changeQuiz(2)
    })
  })

  describe('getQuizConfig', () => {
    it('lazily loads the question config and resolves by type', () => {
      const config = service.getQuizConfig('mcq-sca')
      expect(service.questionConfig).toBe(QUESTION_CONFIG)
      expect(config).toBe(QUESTION_CONFIG.mcqOptionsConfig)
    })
  })

  describe('addQuestion', () => {
    it('adds an MCQ question and selects it', () => {
      service.addQuestion('mcq-sca')
      expect(service.collectiveQuiz.q1.length).toBe(1)
      expect(service.collectiveQuiz.q1[0].questionType).toBe('mcq-sca')
      expect(service.collectiveQuiz.q1[0].options.length).toBe(QUESTION_CONFIG.mcqOptionsConfig.minOptions)
      expect(service.hasChanged).toBe(true)
      expect(service.currentQuizIndex).toBe(0)
    })

    it('adds a fill-in-the-blanks question', () => {
      service.addQuestion('fitb')
      expect(service.collectiveQuiz.q1[0].questionType).toBe('fitb')
      expect(service.collectiveQuiz.q1[0].options.length).toBe(QUESTION_CONFIG.fillUpsOptionsConfig.minOptions)
    })

    it('adds a match-the-following question', () => {
      service.addQuestion('mtf')
      expect(service.collectiveQuiz.q1[0].questionType).toBe('mtf')
      expect(service.collectiveQuiz.q1[0].options.length).toBe(QUESTION_CONFIG.matchOptionsConfig.minOptions)
    })
  })

  describe('updateQuiz / getQuiz', () => {
    it('stores a quiz object and returns a deep copy', () => {
      const obj = { question: 'Q', options: [] }
      service.updateQuiz(0, obj)
      expect(service.hasChanged).toBe(true)
      const fetched = service.getQuiz(0)
      expect(fetched).toEqual(obj)
      expect(fetched).not.toBe(obj)
    })

    it('returns null when no quiz exists at the index', () => {
      expect(service.getQuiz(5)).toBeNull()
    })
  })

  describe('removeQuestion', () => {
    it('removes the current question and reselects the previous one', () => {
      service.collectiveQuiz.q1 = [{}, {}, {}]
      service.currentQuizIndex = 2
      service.removeQuestion(2)
      expect(service.collectiveQuiz.q1.length).toBe(2)
      expect(service.currentQuizIndex).toBe(1)
      expect(service.hasChanged).toBe(true)
    })
  })

  describe('id generators', () => {
    it('generateOptionId appends a letter for the option index', () => {
      expect(service.generateOptionId('Q100', 0)).toBe('Q100-a')
      expect(service.generateOptionId('Q100', 2)).toBe('Q100-c')
    })
    it('generateQuestionId pads numbers below ten', () => {
      expect(service.generateQuestionId(3)).toBe('Q103')
      expect(service.generateQuestionId(12)).toBe('Q112')
    })
  })

  describe('updateErrorlog', () => {
    it('records an error message under quiz number and type', () => {
      service.updateErrorlog({ type: 'question', quizNumber: 0, message: 'bad' })
      expect(service.errorLog[0].question).toBe('bad')
    })
    it('ignores entries without a type', () => {
      service.updateErrorlog({ quizNumber: 0, message: 'bad' })
      expect(service.errorLog[0]).toBeUndefined()
    })
  })

  describe('validateQuiz', () => {
    it('returns no error for a valid single-answer MCQ', () => {
      service.collectiveQuiz.q1 = [
        {
          question: 'What is 2+2?',
          questionType: 'mcq-sca',
          options: [
            { text: '4', isCorrect: true },
            { text: '5', isCorrect: false },
          ],
        },
      ]
      const err = service.validateQuiz(0)
      expect(err).toBe('')
      expect(service.collectiveQuiz.q1[0].isInValid).toBe(false)
      expect(service.collectiveQuiz.q1[0].questionId).toBe('Q100')
    })

    it('flags an empty question', () => {
      service.collectiveQuiz.q1 = [
        {
          question: '',
          questionType: 'mcq-sca',
          options: [
            { text: '4', isCorrect: true },
            { text: '5', isCorrect: false },
          ],
        },
      ]
      const err = service.validateQuiz(0)
      expect(err).toBeTruthy()
      expect(service.collectiveQuiz.q1[0].isInValid).toBe(true)
    })

    it('converts a single-answer MCQ to multi when more than one option is correct', () => {
      service.collectiveQuiz.q1 = [
        {
          question: 'Pick the even numbers',
          questionType: 'mcq-sca',
          options: [
            { text: '2', isCorrect: true },
            { text: '4', isCorrect: true },
            { text: '5', isCorrect: false },
          ],
        },
      ]
      const err = service.validateQuiz(0)
      expect(err).toBe('')
      expect(service.collectiveQuiz.q1[0].questionType).toBe('mcq-mca')
      expect(service.collectiveQuiz.q1[0].multiSelection).toBe(true)
    })
  })
})
