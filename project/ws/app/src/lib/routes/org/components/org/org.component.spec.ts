import { of } from 'rxjs'
import { OrgComponent } from './org.component'

describe('OrgComponent', () => {
  let activateRoute: any
  let orgService: any
  let router: any
  let configSvc: any
  let cdr: any

  const build = () => new OrgComponent(activateRoute, orgService, router, configSvc, cdr)

  beforeEach(() => {
    activateRoute = {
      snapshot: { queryParams: { orgId: 'org-a' } },
      data: of({
        orgData: { data: { sources: [{ sourceName: 'org-a', title: 'Org A' }] } },
      }),
    }
    orgService = {
      getSearchResults: jest.fn().mockReturnValue(of({ result: { content: [] } })),
      hideHeaderFooter: { next: jest.fn() },
    }
    router = { navigate: jest.fn() }
    configSvc = { unMappedUser: undefined }
    cdr = { markForCheck: jest.fn() }
  })

  it('is created', () => {
    expect(build()).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('builds the rating array from the star count', () => {
      const c = build()
      c.ngOnInit()
      expect(c.ratingArr).toEqual([0, 1, 2, 3, 4])
    })

    it('resolves the current org from the route data', () => {
      const c = build()
      c.ngOnInit()
      expect(c.orgName).toBe('org-a')
      expect(c.currentOrgData).toEqual({ sourceName: 'org-a', title: 'Org A' })
      expect(cdr.markForCheck).toHaveBeenCalled()
    })

    it('populates course data and competencies from the search results', () => {
      orgService.getSearchResults.mockReturnValue(
        of({
          result: {
            content: [
              {
                identifier: 'do_1',
                sourceName: 'org-a',
                competencies_v1: JSON.stringify([{ competencyName: 'Comp A', level: '2' }, { competencyName: 'NoLevel' }]),
              },
              { identifier: 'do_2', sourceName: 'other-org' },
            ],
          },
        }),
      )
      const c = build()
      c.ngOnInit()
      expect(orgService.getSearchResults).toHaveBeenCalledWith('org-a')
      expect(c.courseData).toHaveLength(1)
      expect(c.cometencyData).toEqual([{ identifier: 'do_1', name: 'Comp A', levels: ' Level 2' }])
    })

    it('sets the button text to Login when the user is unmapped/undefined', () => {
      const c = build()
      c.ngOnInit()
      expect(c.btnText).toBe('Login')
    })

    it('sets the button text to View Course when the user is mapped', () => {
      configSvc.unMappedUser = false
      const c = build()
      c.ngOnInit()
      expect(c.btnText).toBe('View Course')
    })
  })

  describe('toggleCardLimit', () => {
    it('expands the limit to the full course length', () => {
      const c = build()
      c.courseData = [1, 2, 3, 4, 5, 6, 7]
      c.cardLimit = 5
      c.toggleCardLimit()
      expect(c.cardLimit).toBe(7)
    })

    it('collapses back to 5', () => {
      const c = build()
      c.cardLimit = 10
      c.toggleCardLimit()
      expect(c.cardLimit).toBe(5)
    })
  })

  describe('gotoOverview', () => {
    it('navigates to the author toc overview route', () => {
      const c = build()
      c.gotoOverview('do_123')
      expect(router.navigate).toHaveBeenCalledWith(['/author/toc/do_123/overview'])
    })
  })

  describe('goToLink', () => {
    it('opens the url in a new tab', () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
      const c = build()
      c.goToLink('https://example.com')
      expect(openSpy).toHaveBeenCalledWith('https://example.com', '_blank')
      openSpy.mockRestore()
    })
  })

  describe('ngOnDestroy', () => {
    it('re-shows the header and footer', () => {
      const c = build()
      c.ngOnDestroy()
      expect(orgService.hideHeaderFooter.next).toHaveBeenCalledWith(false)
    })
  })
})
