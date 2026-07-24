import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing'
import { provideHttpClient } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'

import { QuizService } from './quiz.service'

describe('QuizService', () => {
  let service: QuizService
  let httpMock: HttpTestingController

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [QuizService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(QuizService)
    httpMock = TestBed.inject(HttpTestingController)
  })

  afterEach(() => httpMock.verify())

  it('submitQuizV2 POSTs to the assessment submit endpoint', () => {
    service.submitQuizV2({ questions: [] } as any).subscribe()
    const req = httpMock.expectOne('/apis/protected/v8/assessment/submit/v2')
    expect(req.request.method).toBe('POST')
    req.flush({})
  })

  it('createAssessmentSubmitRequest marks mcq answers, fills fitb responses, blanks unanswered mtf', () => {
    const quiz = {
      questions: [
        { questionId: 'q1', questionType: 'mcq-sca', options: [{ optionId: 'o1' }, { optionId: 'o2' }] },
        { questionId: 'q2', questionType: 'fitb', options: [{}, {}] },
        { questionId: 'q3', questionType: 'mtf', options: [{ text: 'x' }] },
      ],
    }
    const hash = { q1: ['o1'], q2: ['a,b'] }

    const out = service.createAssessmentSubmitRequest('id1', 'Quiz', 'course1', quiz as any, hash as any)

    expect(out.identifier).toBe('id1')
    expect(out.title).toBe('Quiz')
    expect(out.courseId).toBe('course1')
    expect(out.questions[0].options[0].userSelected).toBe(true)
    expect(out.questions[0].options[1].userSelected).toBe(false)
    expect(out.questions[1].options[0].response).toBe('a')
    expect(out.questions[1].options[1].response).toBe('b')
    expect(out.questions[2].options[0].response).toBe('')
  })

  it('sanitizeAssessmentSubmitRequest strips question text and non-fitb/mtf option text', () => {
    const requestData = {
      questions: [
        { question: 'keep?', questionType: 'mcq-sca', options: [{ hint: 'h', text: 'answer' }] },
        { question: 'blank?', questionType: 'fitb', options: [{ hint: 'h', text: 'kept' }] },
      ],
    }

    const out = service.sanitizeAssessmentSubmitRequest(requestData as any)

    expect(out.questions[0].question).toBe('')
    expect(out.questions[0].options[0].hint).toBe('')
    expect(out.questions[0].options[0].text).toBe('')
    // fitb keeps its option text
    expect(out.questions[1].options[0].text).toBe('kept')
  })
})
