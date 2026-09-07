import { of } from 'rxjs'

import { ReviewerChecklist } from './reviewer-checklist.component'

describe('ReviewerChecklist', () => {
  let component: ReviewerChecklist
  let qualityService: any
  let router: any
  let editorService: any
  let loader: any
  let authAccessService: any
  let dialog: any

  const build = (
    opts: {
      qualityResult?: any
      content?: any
      hasRole?: (roles: string[]) => boolean
    } = {},
  ): ReviewerChecklist => {
    qualityService = {
      fetchresult: jest.fn().mockReturnValue(
        of(
          opts.qualityResult ?? {
            result: { resources: [{ finalWeightedScore: 87.456 }] },
          },
        ),
      ),
    }
    router = { url: '/author/editor/CONTENT_ID/step', navigate: jest.fn() }
    editorService = {
      readcontentV3: jest.fn().mockReturnValue(of(opts.content ?? { identifier: 'CONTENT_ID' })),
    }
    loader = { changeLoad: { next: jest.fn() } }
    authAccessService = { hasRole: jest.fn(opts.hasRole ?? (() => false)) }
    dialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of('closed') }) }
    return new ReviewerChecklist(qualityService, router, editorService, loader, authAccessService, dialog)
  }

  beforeEach(() => {
    component = build()
  })

  it('should create and load content + quality result in constructor', () => {
    expect(component).toBeTruthy()
    expect(editorService.readcontentV3).toHaveBeenCalledWith('CONTENT_ID')
    expect(component.content).toEqual({ identifier: 'CONTENT_ID' })
    expect(qualityService.fetchresult).toHaveBeenCalledWith({
      resourceId: 'CONTENT_ID',
      resourceType: 'content',
      getLatestRecordEnabled: true,
    })
    expect(component.qualityResponse).toEqual({ finalWeightedScore: 87.456 })
    expect(component.loading).toBe(false)
    expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
  })

  it('should not set qualityResponse when resources length is not 1', () => {
    const cmp = build({ qualityResult: { result: { resources: [] } } })
    expect(cmp.qualityResponse).toBeUndefined()
    expect(cmp.loading).toBe(false)
  })

  it('should handle empty/missing quality result gracefully', () => {
    const cmp = build({ qualityResult: {} })
    expect(cmp.qualityResponse).toBeUndefined()
  })

  describe('getQualityPercent', () => {
    it('should return final weighted score fixed to 1 decimal', () => {
      expect(component.getQualityPercent).toBe('87.5')
    })

    it('should default to 0.0 when finalWeightedScore is falsy', () => {
      component.qualityResponse = {} as any
      expect(component.getQualityPercent).toBe('0.0')
    })
  })

  describe('redirectBack', () => {
    it('should navigate to overview for content_reviewer role', () => {
      const cmp = build({ hasRole: roles => roles.includes('content_reviewer') })
      cmp.redirectBack()
      expect(router.navigate).toHaveBeenCalledWith(['/author/toc/CONTENT_ID/overview'])
    })

    it('should navigate to overview for content_creator role', () => {
      const cmp = build({ hasRole: roles => roles.includes('content_creator') })
      cmp.redirectBack()
      expect(router.navigate).toHaveBeenCalledWith(['/author/toc/CONTENT_ID/overview'])
    })

    it('should navigate to overview for content_publisher role', () => {
      const cmp = build({ hasRole: roles => roles.includes('content_publisher') })
      cmp.redirectBack()
      expect(router.navigate).toHaveBeenCalledWith(['/author/toc/CONTENT_ID/overview'])
    })

    it('should not navigate when no matching role', () => {
      component.redirectBack()
      expect(router.navigate).not.toHaveBeenCalled()
    })
  })

  describe('openComments', () => {
    it('should open the comments dialog with the question data', () => {
      const question = { id: 'q1' }
      component.openComments(question)
      expect(dialog.open).toHaveBeenCalledWith(expect.anything(), {
        width: '450px',
        height: '250px',
        data: question,
      })
    })
  })

  it('lifecycle hooks should be no-ops without error', () => {
    expect(() => {
      component.ngOnInit()
      component.ngAfterViewInit()
      component.ngOnDestroy()
    }).not.toThrow()
  })
})
