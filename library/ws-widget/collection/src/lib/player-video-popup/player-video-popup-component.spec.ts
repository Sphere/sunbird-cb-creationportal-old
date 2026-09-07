import { of } from 'rxjs'
import { PlayerVideoPopupComponent } from './player-video-popup-component'

describe('PlayerVideoPopupComponent', () => {
  let valueSvc: { isXSmall$: any }
  let snackBar: { open: jest.Mock }
  let dialogRef: { close: jest.Mock }
  let data: { questions: Array<{ text: string; options: any[] }> }
  let component: PlayerVideoPopupComponent

  const questions = [
    {
      text: 'Q1',
      options: [
        { label: 'A', isCorrect: true },
        { label: 'B', isCorrect: false },
      ],
    },
    {
      text: 'Q2',
      options: [
        { label: 'C', isCorrect: false },
        { label: 'D', isCorrect: true },
      ],
    },
  ]

  const build = () => new PlayerVideoPopupComponent(valueSvc as any, snackBar as any, dialogRef as any, data as any)

  beforeEach(() => {
    valueSvc = { isXSmall$: of(false) }
    snackBar = { open: jest.fn() }
    dialogRef = { close: jest.fn() }
    data = { questions }
    component = build()
  })

  it('should be created and seed questions/answers from dialog data', () => {
    expect(component).toBeTruthy()
    expect(component.questions).toBe(questions)
    expect(component.answers.length).toBe(2)
    expect(component.answers).toEqual([null, null])
  })

  describe('ngOnInit', () => {
    it('sets rowView layout when not extra small', () => {
      valueSvc.isXSmall$ = of(false)
      const c = build()
      c.ngOnInit()
      expect(c.layoutDirection).toBe('rowView')
    })

    it('sets columnView layout when extra small', () => {
      valueSvc.isXSmall$ = of(true)
      const c = build()
      c.ngOnInit()
      expect(c.layoutDirection).toBe('columnView')
    })
  })

  describe('currentQuestion getter', () => {
    it('returns the question at the current index', () => {
      expect(component.currentQuestion).toBe(questions[0])
      component.currentIndex = 1
      expect(component.currentQuestion).toBe(questions[1])
    })
  })

  describe('onOptionSelected', () => {
    it('marks Correct for a correct option', () => {
      component.onOptionSelected({ isCorrect: true })
      expect(component.selectedOption).toEqual({ isCorrect: true })
      expect(component.resultMessage).toBe('Correct')
    })

    it('marks Wrong for an incorrect option', () => {
      component.onOptionSelected({ isCorrect: false })
      expect(component.resultMessage).toBe('Wrong')
    })
  })

  describe('navigation', () => {
    it('moveToNext advances index and hides answer info', () => {
      component.showAnswerInfo = true
      component.moveToNext()
      expect(component.currentIndex).toBe(1)
      expect(component.showAnswerInfo).toBe(false)
    })

    it('moveToNext does not advance past the last question', () => {
      component.currentIndex = 1
      component.moveToNext()
      expect(component.currentIndex).toBe(1)
    })

    it('moveToPrevious decrements index and hides answer info', () => {
      component.currentIndex = 1
      component.showAnswerInfo = true
      component.moveToPrevious()
      expect(component.currentIndex).toBe(0)
      expect(component.showAnswerInfo).toBe(false)
    })

    it('moveToPrevious does not go below zero', () => {
      component.currentIndex = 0
      component.moveToPrevious()
      expect(component.currentIndex).toBe(0)
    })
  })

  describe('submitQuiz', () => {
    it('shows answer info and hides reset when correct', () => {
      component.resultMessage = 'Correct'
      component.submitQuiz()
      expect(component.showAnswerInfo).toBe(true)
      expect(component.showReset).toBe(false)
    })

    it('shows answer info and shows reset when wrong', () => {
      component.resultMessage = 'Wrong'
      component.submitQuiz()
      expect(component.showAnswerInfo).toBe(true)
      expect(component.showReset).toBe(true)
    })

    it('does nothing when no result message', () => {
      component.resultMessage = null
      component.submitQuiz()
      expect(component.showAnswerInfo).toBe(false)
    })
  })

  describe('reset', () => {
    it('clears reset and answer info flags', () => {
      component.showReset = true
      component.showAnswerInfo = true
      component.reset()
      expect(component.showReset).toBe(false)
      expect(component.showAnswerInfo).toBe(false)
    })
  })

  describe('continue', () => {
    it('closes the dialog with submit event and answers', () => {
      component.continue()
      expect(dialogRef.close).toHaveBeenCalledWith({ event: 'submit', answers: component.answers })
    })
  })

  describe('sendAction', () => {
    it('hides answer info and closes with the given event', () => {
      component.showAnswerInfo = true
      component.sendAction('retry')
      expect(component.showAnswerInfo).toBe(false)
      expect(dialogRef.close).toHaveBeenCalledWith({ event: 'retry' })
    })
  })

  describe('closePopup', () => {
    it('closes the dialog with skip', () => {
      component.closePopup()
      expect(dialogRef.close).toHaveBeenCalledWith('skip')
    })
  })
})
