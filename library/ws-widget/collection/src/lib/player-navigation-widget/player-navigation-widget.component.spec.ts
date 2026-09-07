import { Subject } from 'rxjs'

import { PlayerNavigationWidgetComponent } from './player-navigation-widget.component'

describe('PlayerNavigationWidgetComponent', () => {
  let viewerDataSvc: any
  let router: any
  let playerState: Subject<any>

  const build = () => new PlayerNavigationWidgetComponent(viewerDataSvc, router)

  beforeEach(() => {
    playerState = new Subject<any>()
    viewerDataSvc = { playerState }
    router = { navigate: jest.fn() }
  })

  it('should construct with null defaults', () => {
    const comp = build()
    expect(comp).toBeTruthy()
    expect(comp.prevResourceUrl).toBeNull()
    expect(comp.nextResourceUrl).toBeNull()
    expect(comp.currentCompletionPercentage).toBeNull()
  })

  describe('ngOnInit', () => {
    it('should populate prev/next resource urls from player state', () => {
      const comp = build()
      comp.ngOnInit()
      playerState.next({
        tocAvailable: true,
        prevResource: '/prev/res',
        nextResource: '/next/res',
      })
      expect(comp.prevResourceUrl).toBe('/prev/res')
      expect(comp.nextResourceUrl).toBe('/next/res')
    })

    it('should ignore falsy player state emissions', () => {
      const comp = build()
      comp.ngOnInit()
      playerState.next(null)
      expect(comp.prevResourceUrl).toBeNull()
      expect(comp.nextResourceUrl).toBeNull()
    })
  })

  describe('navigateToPreResource', () => {
    it('should navigate when a previous url exists', () => {
      const comp = build()
      comp.prevResourceUrl = '/prev'
      comp.navigateToPreResource()
      expect(router.navigate).toHaveBeenCalledWith(['/prev'], { queryParamsHandling: 'preserve' })
    })

    it('should not navigate when there is no previous url', () => {
      const comp = build()
      comp.prevResourceUrl = null
      comp.navigateToPreResource()
      expect(router.navigate).not.toHaveBeenCalled()
    })
  })

  describe('navigateToNextResource', () => {
    it('should navigate to the next url when present', () => {
      const comp = build()
      comp.nextResourceUrl = '/next'
      comp.navigateToNextResource()
      expect(router.navigate).toHaveBeenCalledWith(['/next'], { queryParamsHandling: 'preserve' })
    })

    it('should navigate to root when the next url is missing', () => {
      const comp = build()
      comp.nextResourceUrl = null
      comp.navigateToNextResource()
      expect(router.navigate).toHaveBeenCalledWith([''], { queryParamsHandling: 'preserve' })
    })
  })

  describe('isProgressCheck getter', () => {
    it('should return false when completion percentage is not 100', () => {
      const comp = build()
      comp.currentCompletionPercentage = 50
      expect(comp.isProgressCheck).toBe(false)
    })

    it('should return true when completion percentage is exactly 100', () => {
      const comp = build()
      comp.currentCompletionPercentage = 100
      expect(comp.isProgressCheck).toBe(true)
    })
  })

  describe('stopPropagation', () => {
    it('should return undefined without throwing', () => {
      const comp = build()
      expect(comp.stopPropagation()).toBeUndefined()
    })
  })
})
