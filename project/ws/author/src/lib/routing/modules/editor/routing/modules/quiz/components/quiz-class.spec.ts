import { FillUps, MatchOption, MatchQuiz, McqQuiz, Option, Question } from './quiz-class'

describe('quiz-class models', () => {
  describe('Question', () => {
    it('applies defaults when given an empty init', () => {
      const q = new Question({})
      expect(q.questionId).toBe('')
      expect(q.question).toBe('')
      expect(q.questionType).toBe('mcq-sca')
    })

    it('uses supplied values', () => {
      const q = new Question({ questionId: 'q1', question: 'Why?', questionType: 'ftb' })
      expect(q.questionId).toBe('q1')
      expect(q.question).toBe('Why?')
      expect(q.questionType).toBe('ftb')
    })
  })

  describe('Option', () => {
    it('applies defaults for missing text/optionId', () => {
      const o = new Option({})
      expect(o.text).toBe('')
      expect(o.optionId).toBe('')
      expect(o.isCorrect).toBeUndefined()
    })

    it('maps provided values', () => {
      const o = new Option({ text: 'A', optionId: 'o1', isCorrect: true })
      expect(o.text).toBe('A')
      expect(o.optionId).toBe('o1')
      expect(o.isCorrect).toBe(true)
    })
  })

  describe('MatchOption', () => {
    it('extends Option and defaults match to empty string', () => {
      const mo = new MatchOption({ text: 'left', optionId: 'm1' })
      expect(mo).toBeInstanceOf(Option)
      expect(mo.text).toBe('left')
      expect(mo.match).toBe('')
    })

    it('maps the match value', () => {
      const mo = new MatchOption({ match: 'right' })
      expect(mo.match).toBe('right')
    })
  })

  describe('FillUps', () => {
    it('defaults options to an empty array', () => {
      const f = new FillUps({})
      expect(f).toBeInstanceOf(Question)
      expect(f.options).toEqual([])
    })

    it('maps options into Option instances', () => {
      const f = new FillUps({ options: [{ text: 'a', optionId: 'o1', isCorrect: false }] })
      expect(f.options).toHaveLength(1)
      expect(f.options[0]).toBeInstanceOf(Option)
      expect(f.options[0].text).toBe('a')
    })
  })

  describe('McqQuiz', () => {
    it('defaults options to [] and multiSelection to false', () => {
      const m = new McqQuiz({})
      expect(m.options).toEqual([])
      expect(m.multiSelection).toBe(false)
    })

    it('maps options and honours multiSelection', () => {
      const m = new McqQuiz({
        options: [{ text: 'x', isCorrect: true }],
        multiSelection: true,
      })
      expect(m.options[0]).toBeInstanceOf(Option)
      expect(m.options[0].isCorrect).toBe(true)
      expect(m.multiSelection).toBe(true)
    })
  })

  describe('MatchQuiz', () => {
    it('defaults options to an empty array', () => {
      const mq = new MatchQuiz({})
      expect(mq.options).toEqual([])
    })

    it('maps options into MatchOption instances', () => {
      const mq = new MatchQuiz({ options: [{ text: 'l', match: 'r', optionId: 'o1' }] })
      expect(mq.options).toHaveLength(1)
      expect(mq.options[0]).toBeInstanceOf(MatchOption)
      expect(mq.options[0].match).toBe('r')
    })
  })
})
