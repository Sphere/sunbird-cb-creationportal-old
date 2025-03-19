export interface IQuizQuestionType {
  fillInTheBlanks: 'fitb',
  matchTheFollowing: 'mtf',
  multipleChoiceQuestionSingleCorrectAnswer: 'mcq-sca',
  multipleChoiceQuestionMultipleCorrectAnswer: 'mcq-mca'
}

interface IVideoQuestionOption {
  text: string
  optionId: number
  isCorrect: boolean
  answerInfo: string
}

interface IVideoQuestion {
  text: string
  options: IVideoQuestionOption[]
}

interface IVideoQuestionTimestamp {
  hours: number
  minutes: number
  seconds: number
}

export interface IVideoQuestionData {
  timestampInSeconds: number
  timestamp: IVideoQuestionTimestamp
  question: IVideoQuestion[]
}