import { of } from 'rxjs'

import { QuizComponent } from './quiz.component'

describe('QuizComponent', () => {
  let component: QuizComponent
  let activatedRoute: any
  let viewerDataSvc: { playerState: any }

  const buildRoute = (queryParams: any = {}) => ({
    snapshot: { queryParams },
  })

  const buildPlayerState = (prevResource: string | null = 'prev-url', nextResource: string | null = 'next-url') => ({
    playerState: of({
      tocAvailable: true,
      prevResource,
      nextResource,
    }),
  })

  beforeEach(() => {
    activatedRoute = buildRoute()
    viewerDataSvc = buildPlayerState()
    component = new QuizComponent(activatedRoute, viewerDataSvc as any)
  })

  it('should create with default input values', () => {
    expect(component).toBeTruthy()
    expect(component.isFetchingDataComplete).toBe(false)
    expect(component.isTypeOfCollection).toBe(false)
    expect(component.collectionId).toBeNull()
    expect(component.quizJson).toEqual({ timeLimit: 0, questions: [], isAssessment: false })
  })

  describe('ngOnInit', () => {
    it('should not flag collection and leave collectionId null when no collectionType query param', () => {
      component.ngOnInit()

      expect(component.isTypeOfCollection).toBe(false)
      expect(component.collectionId).toBeNull()
    })

    it('should set collection flag and id when collectionType query param present', () => {
      activatedRoute.snapshot.queryParams = {
        collectionType: 'course',
        collectionId: 'do_123',
      }

      component.ngOnInit()

      expect(component.isTypeOfCollection).toBe(true)
      expect(component.collectionId).toBe('do_123')
    })

    it('should populate prev/next resource urls from the player state stream', () => {
      component.ngOnInit()

      expect(component.prevResourceUrl).toBe('prev-url')
      expect(component.nextResourceUrl).toBe('next-url')
      expect(component.viewerDataServiceSubscription).toBeDefined()
    })

    it('should handle null prev/next resources', () => {
      viewerDataSvc.playerState = of({
        tocAvailable: false,
        prevResource: null,
        nextResource: null,
      })
      component = new QuizComponent(activatedRoute, viewerDataSvc as any)

      component.ngOnInit()

      expect(component.prevResourceUrl).toBeNull()
      expect(component.nextResourceUrl).toBeNull()
    })
  })
})
