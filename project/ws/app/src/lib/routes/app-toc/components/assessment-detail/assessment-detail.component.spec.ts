import { AssessmentDetailComponent } from './assessment-detail.component'

/**
 * Direct-instantiation unit tests for AssessmentDetailComponent.
 * The component fetches a quiz JSON manifest over HttpClient and exposes it as
 * `assesmentdata`. HttpClient is mocked so no real request is made.
 */
describe('AssessmentDetailComponent', () => {
  let http: any

  function build(): AssessmentDetailComponent {
    http = {
      get: jest.fn(),
    }
    return new AssessmentDetailComponent(http)
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs with the default assessment data', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.forPreview).toBe(false)
    expect(c.assesmentdata.passPercentage).toBe(60)
    expect(c.assesmentdata.isAssessment).toBe(false)
    expect(c.assesmentdata.questions.length).toBe(1)
  })

  it('ngOnInit loads the quiz JSON from the artifactUrl into assesmentdata', async () => {
    const c = build()
    const quizJSON = { timeLimit: 120, isAssessment: true, questions: [] }
    http.get.mockReturnValue({ toPromise: () => Promise.resolve(quizJSON) })
    c.content = { artifactUrl: 'https://cdn/quiz.json' }

    await (c as any).initialiseAsync()

    expect(http.get).toHaveBeenCalledWith('https://cdn/quiz.json')
    expect(c.assesmentdata).toEqual(quizJSON)
  })

  it('ngOnInit leaves assesmentdata undefined when the content has no artifactUrl', async () => {
    const c = build()
    c.content = { name: 'no-artifact' }

    await (c as any).initialiseAsync()

    expect(http.get).not.toHaveBeenCalled()
    expect(c.assesmentdata).toBeUndefined()
  })

  it('ngOnInit swallows a failed manifest fetch and yields undefined data', async () => {
    const c = build()
    http.get.mockReturnValue({ toPromise: () => Promise.reject(new Error('MANIFEST_FETCH_FAILED')) })
    c.content = { artifactUrl: 'https://cdn/broken.json' }

    await expect((c as any).initialiseAsync()).resolves.toBeUndefined()
    expect(c.assesmentdata).toBeUndefined()
  })

  it('honours the resourceLink and forPreview inputs', () => {
    const c = build()
    c.forPreview = true
    c.resourceLink = 'some-link'
    expect(c.forPreview).toBe(true)
    expect(c.resourceLink).toBe('some-link')
  })
})
