import { of, throwError, Subject } from 'rxjs'
import { DashboardComponent } from './dashboard.component'
import { REVIEW_ROLE, PUBLISH_ROLE, CREATE_ROLE, RESOURCE, KBOARD, CHANNEL } from '@ws/author/src/lib/constants/content-role'

describe('DashboardComponent', () => {
  let component: DashboardComponent
  let snackBar: any
  let svc: any
  let router: any
  let loaderService: any
  let accessService: any

  beforeEach(() => {
    snackBar = { openFromComponent: jest.fn() }
    svc = { create: jest.fn().mockReturnValue(of('do_123')) }
    router = { navigateByUrl: jest.fn() }
    loaderService = {
      changeLoadState: jest.fn(),
      changeLoad: new Subject<boolean>(),
    }
    accessService = { hasRole: jest.fn().mockReturnValue(true) }
    component = new DashboardComponent(snackBar, svc, router, loaderService, accessService)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
    expect(component.options).toContain('Create content')
  })

  describe('ngOnInit', () => {
    it('should turn off the loader', () => {
      component.ngOnInit()
      expect(loaderService.changeLoadState).toHaveBeenCalledWith(false)
    })
  })

  describe('filteredOptions', () => {
    it('should filter options case-insensitively as the control value changes', () => {
      const emitted: string[][] = []
      component.filteredOptions.subscribe(v => emitted.push(v))
      component.createControl.setValue('CREATE')
      expect(emitted[emitted.length - 1]).toEqual(['Create content'])
    })

    it('should return no options when nothing matches', () => {
      const emitted: string[][] = []
      component.filteredOptions.subscribe(v => emitted.push(v))
      component.createControl.setValue('zzz')
      expect(emitted[emitted.length - 1]).toEqual([])
    })
  })

  describe('contentClicked', () => {
    it('should create a url/Resource content and navigate on success', () => {
      const nextSpy = jest.spyOn(loaderService.changeLoad, 'next')
      component.contentClicked('url')
      expect(nextSpy).toHaveBeenNthCalledWith(1, true)
      expect(svc.create).toHaveBeenCalledWith({
        contentType: 'Resource',
        mimeType: 'application/html',
      })
      expect(nextSpy).toHaveBeenLastCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(router.navigateByUrl).toHaveBeenCalledWith('/author/editor/do_123')
    })

    it('should map channel content type/mime', () => {
      component.contentClicked('channel')
      expect(svc.create).toHaveBeenCalledWith({
        contentType: 'Channel',
        mimeType: 'application/channel',
      })
    })

    it('should map kboard content type/mime', () => {
      component.contentClicked('kboard')
      expect(svc.create).toHaveBeenCalledWith({
        contentType: 'Knowledge Board',
        mimeType: 'application/vnd.ekstep.content-collection',
      })
    })

    it('should send empty type/mime for an unknown content', () => {
      component.contentClicked('unknown')
      expect(svc.create).toHaveBeenCalledWith({ contentType: '', mimeType: '' })
    })

    it('should show a failure notification and not navigate on error', () => {
      svc.create.mockReturnValue(throwError(() => new Error('boom')))
      const nextSpy = jest.spyOn(loaderService.changeLoad, 'next')
      component.contentClicked('url')
      expect(nextSpy).toHaveBeenLastCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(router.navigateByUrl).not.toHaveBeenCalled()
    })
  })

  describe('canShow', () => {
    it('should map access roles to the right role constant', () => {
      component.canShow('review')
      expect(accessService.hasRole).toHaveBeenCalledWith(REVIEW_ROLE)
      component.canShow('publish')
      expect(accessService.hasRole).toHaveBeenCalledWith(PUBLISH_ROLE)
      component.canShow('author')
      expect(accessService.hasRole).toHaveBeenCalledWith(CREATE_ROLE)
    })

    it('should return false for an unknown access role', () => {
      expect(component.canShow('nope')).toBe(false)
    })

    it('should map non-access roles to the right role constant', () => {
      component.canShow('curate', 'other')
      expect(accessService.hasRole).toHaveBeenCalledWith(RESOURCE)
      component.canShow('kboard', 'other')
      expect(accessService.hasRole).toHaveBeenCalledWith(KBOARD)
      component.canShow('channel', 'other')
      expect(accessService.hasRole).toHaveBeenCalledWith(CHANNEL)
    })

    it('should return false for an unknown non-access role', () => {
      expect(component.canShow('nope', 'other')).toBe(false)
    })

    it('should reflect the hasRole result', () => {
      accessService.hasRole.mockReturnValue(false)
      expect(component.canShow('review')).toBe(false)
    })
  })
})
