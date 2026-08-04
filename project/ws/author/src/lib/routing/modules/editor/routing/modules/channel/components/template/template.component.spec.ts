import { of, throwError } from 'rxjs'
import { TemplateComponent } from './template.component'
import { template1Data, template2Data } from './template.constant'

describe('TemplateComponent', () => {
  let component: TemplateComponent
  let editorService: any
  let loader: any
  let accessService: any
  let sanitizer: any

  const searchResponse = (result: any[] = [], totalHits = 0) => ({
    result: { response: { result, totalHits } },
  })

  beforeEach(() => {
    editorService = {
      searchContent: jest.fn().mockReturnValue(of(searchResponse([{ identifier: 'do_1' }], 1))),
      copy: jest.fn().mockReturnValue(of('copied')),
      readJSON: jest.fn().mockReturnValue(of({ pageLayout: { id: 'ID_TOKEN' } })),
    }
    loader = { changeLoad: { next: jest.fn() } }
    accessService = { userId: 'user-1', rootOrg: 'acme' }
    sanitizer = { bypassSecurityTrustStyle: jest.fn((v: string) => v) }
    component = new TemplateComponent(editorService, loader, accessService, sanitizer)
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  it('ngOnInit does not throw', () => {
    expect(() => component.ngOnInit()).not.toThrow()
  })

  describe('send', () => {
    it('emits null for index 1', () => {
      const spy = jest.fn()
      component.data.subscribe(spy)
      component.send(1)
      expect(spy).toHaveBeenCalledWith(null)
    })

    it('emits template1Data for index 2', () => {
      const spy = jest.fn()
      component.data.subscribe(spy)
      component.send(2)
      expect(spy).toHaveBeenCalledWith(template1Data)
    })

    it('emits template2Data for any other index', () => {
      const spy = jest.fn()
      component.data.subscribe(spy)
      component.send(3)
      expect(spy).toHaveBeenCalledWith(template2Data)
    })
  })

  describe('onIndexChange', () => {
    it('stores the index and fetches content the first time index 1 is opened', () => {
      const spy = jest.spyOn(component, 'fetchContent')
      component.onIndexChange(1)
      expect(component.selectedIndex).toBe(1)
      expect(spy).toHaveBeenCalled()
    })

    it('does not re-fetch when content already exists', () => {
      component.contents = [{ identifier: 'do_1' }] as any
      const spy = jest.spyOn(component, 'fetchContent')
      component.onIndexChange(1)
      expect(spy).not.toHaveBeenCalled()
    })

    it('does not fetch for other indices', () => {
      const spy = jest.spyOn(component, 'fetchContent')
      component.onIndexChange(0)
      expect(component.selectedIndex).toBe(0)
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('fetchContent', () => {
    it('appends the search results and total, and toggles the loader', () => {
      component.fetchContent()
      expect(loader.changeLoad.next).toHaveBeenNthCalledWith(1, true)
      expect(component.contents).toEqual([{ identifier: 'do_1' }])
      expect(component.totalContent).toBe(1)
      expect(component.noData).toBe(false)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('sends the current index and access details in the request body', () => {
      component.fetchContent()
      const body = editorService.searchContent.mock.calls[0][0]
      expect(body.request.pageNo).toBe(0)
      expect(body.request.uuid).toBe('user-1')
      expect(body.request.rootOrg).toBe('acme')
      expect(body.request.filters.contentType).toEqual(['Channel'])
    })

    it('increments the page index when loading more', () => {
      component.fetchContent(true)
      const body = editorService.searchContent.mock.calls[0][0]
      expect(component.currentIndex).toBe(1)
      expect(body.request.pageNo).toBe(1)
    })

    it('flags noData when the response is empty', () => {
      editorService.searchContent.mockReturnValue(of(searchResponse([], 0)))
      component.fetchContent()
      expect(component.contents).toEqual([])
      expect(component.noData).toBe(true)
    })

    it('flags an error and hides the loader when the search fails', () => {
      editorService.searchContent.mockReturnValue(throwError(() => new Error('boom')))
      component.fetchContent()
      expect(component.error).toBe(true)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  describe('fetchJson', () => {
    it('copies, reads and emits the transformed page layout', () => {
      const spy = jest.fn()
      component.currentContent = 'do_current.img'
      component.data.subscribe(spy)
      component.fetchJson('http://host/layout.json', 'ID_TOKEN')
      expect(editorService.copy).toHaveBeenCalledWith('do_current.img', 'http://host/layout.json')
      expect(editorService.readJSON).toHaveBeenCalledWith('http://host/layout.json')
      // ID_TOKEN gets replaced with currentContent minus '.img'
      expect(spy).toHaveBeenCalledWith({ id: 'do_current' })
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('flags an error and hides the loader when the read fails', () => {
      editorService.readJSON.mockReturnValue(throwError(() => new Error('boom')))
      component.currentContent = 'do_current.img'
      component.fetchJson('http://host/layout.json', 'ID_TOKEN')
      expect(component.error).toBe(true)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  describe('generateBackGroundImage', () => {
    it('builds a sanitized background url', () => {
      const result = component.generateBackGroundImage('a b/c.png')
      expect(result).toBe(`url(/apis/authContent/${encodeURIComponent('a b/c.png')})`)
    })
  })
})
