import { FormArray, FormBuilder } from '@angular/forms'
import { of, Subject, throwError } from 'rxjs'
import { ContentStripSingleComponent } from './content-strip-single.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('ContentStripSingleComponent', () => {
  let component: ContentStripSingleComponent
  let interestSvc: any
  let snackBar: any
  let loader: any
  let uploadService: any
  let matDialog: any
  let afterClosed: Subject<any>

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  const build = (content: any = {}) => {
    const c = new ContentStripSingleComponent(new FormBuilder(), interestSvc, snackBar, loader, uploadService, matDialog)
    c.content = { title: 'Strip', image: '', ...content } as any
    c.identifier = 'do_1'
    return c
  }

  beforeEach(() => {
    afterClosed = new Subject<any>()
    interestSvc = { fetchAutocompleteInterestsV2: jest.fn().mockReturnValue(of([])) }
    snackBar = { openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() } }
    uploadService = {
      upload: jest.fn().mockReturnValue(of({ code: 200, artifactURL: 'https://host/a/b/c.png' })),
    }
    matDialog = { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit request-type detection', () => {
    it('defaults to the ids request type with no request', () => {
      component.ngOnInit()
      expect(component.requestType).toBe('ids')
      expect(component.form.controls.title.value).toBe('Strip')
    })

    it('preselects the configured content ids', () => {
      const c = build({ request: { ids: ['do_2', 'do_3'] } })
      c.ngOnInit()
      expect(c.requestType).toBe('ids')
      expect(Array.from(c.pickerContentData.preselected as Set<string>)).toEqual(['do_2', 'do_3'])
    })

    it('reads the knowledge-board search settings', () => {
      const c = build({
        request: {
          searchV6: {
            locale: ['en'],
            sort: [{ lastUpdatedOn: 'desc' }],
            filters: [{ andFilters: [{ keywords: ['angular'], collectionsId: ['do_9'] }] }],
          },
        },
      })
      c.ngOnInit()
      expect(c.requestType).toBe('KB')
      expect(c.language).toEqual(['en'])
      expect(c.keywords).toEqual(['angular'])
      expect(c.filterBy).toBe('lastUpdatedOn')
      expect(c.collectionId).toEqual(['do_9'])
      expect(Array.from(c.pickerContentData.preselected as Set<string>)).toEqual(['do_9'])
    })

    it('reads the collections search settings', () => {
      const c = build({
        searchV6Type: 'Collections',
        request: { searchV6: { filters: [{ andFilters: [{}] }] } },
      })
      c.ngOnInit()
      expect(c.requestType).toBe('Collections')
    })

    it('falls back to safe defaults for a malformed search body', () => {
      const c = build({ request: { searchV6: {} } })
      c.ngOnInit()
      expect(c.keywords).toEqual([])
      expect(c.filterBy).toBe('viewCount')
      expect(c.collectionId).toEqual([])
    })

    it('detects a plain search strip', () => {
      const c = build({ request: { search: {} } })
      c.ngOnInit()
      expect(c.requestType).toBe('search')
    })

    it('detects an api-backed strip', () => {
      const c = build({ request: { api: '/apis/x' } })
      c.ngOnInit()
      expect(c.requestType).toBe('api')
    })

    it('detects a manually curated strip', () => {
      const c = build({ request: { manualData: [{ title: 'One', url: 'http://x' }] } })
      c.ngOnInit()
      expect(c.requestType).toBe('manual')
      expect(c.paths.length).toBe(1)
      expect(c.paths.at(0).value.title).toBe('One')
    })

    it('detects a region-recommendation strip', () => {
      const c = build({ request: { searchRegionRecommendation: {} } })
      c.ngOnInit()
      expect(c.requestType).toBe('searchRegionRecommendation')
    })

    it('falls back to ids for an empty request object', () => {
      const c = build({ request: {} })
      c.ngOnInit()
      expect(c.requestType).toBe('ids')
    })

    it('mirrors the selected ids back into the picker', () => {
      component.ngOnInit()
      component.getPath('request', 'ids').setValue(['do_5'])
      expect(Array.from(component.pickerContentData.preselected as Set<string>)).toEqual(['do_5'])
    })

    it('emits the strip and its validity when the form settles', () => {
      jest.useFakeTimers()
      const emitted: any[] = []
      component.ngOnInit()
      component.data.subscribe(v => emitted.push(v))
      component.form.controls.title.setValue('New title')
      jest.advanceTimersByTime(200)
      expect(emitted.length).toBe(1)
      expect(emitted[0].content.title).toBe('New title')
      expect(emitted[0].isValid).toBe(true)
      jest.useRealTimers()
    })

    it('records the search type on the emitted strip for a knowledge board', () => {
      jest.useFakeTimers()
      const emitted: any[] = []
      component.ngOnInit()
      component.requestType = 'KB'
      component.data.subscribe(v => emitted.push(v))
      component.form.controls.title.setValue('New title')
      jest.advanceTimersByTime(200)
      expect(component.content.searchV6Type).toBe('KB')
      jest.useRealTimers()
    })

    it('clears the search type for a non-search strip', () => {
      jest.useFakeTimers()
      component.ngOnInit()
      component.requestType = 'ids'
      component.form.controls.title.setValue('New title')
      jest.advanceTimersByTime(200)
      expect(component.content.searchV6Type).toBeNull()
      jest.useRealTimers()
    })
  })

  describe('form helpers', () => {
    beforeEach(() => component.ngOnInit())

    it('getPath walks nested control keys', () => {
      expect(component.getPath('request', 'ids')).toBe(component.form.get('request')!.get('ids'))
    })

    it('getFormPath reads a key off a form-array row', () => {
      component.addManualDataForm({ title: 'One', url: 'http://x' } as any)
      expect(component.getFormPath(component.paths, 0, 'title')).toBe('One')
    })

    it('addForm appends a blank manual row with sensible defaults', () => {
      component.addForm()
      const row = component.paths.at(0).value
      expect(row.title).toBeNull()
      expect(row.target).toBe('_blank')
      expect(row.lastUpdatedOn instanceof Date).toBe(true)
    })

    it('addManualDataForm seeds the row from existing data', () => {
      component.addManualDataForm({
        title: 'One',
        url: 'http://x',
        target: '_self',
        lastUpdatedOn: '2026-01-01',
      } as any)
      const row = component.paths.at(0).value
      expect(row.title).toBe('One')
      expect(row.url).toBe('http://x')
      expect(row.target).toBe('_self')
    })

    it('removeButtonClick drops the row at the index', () => {
      component.addForm()
      component.addForm()
      component.removeButtonClick(0)
      expect(component.paths.length).toBe(1)
    })

    it('paths exposes the manual-data form array', () => {
      expect(component.paths instanceof FormArray).toBe(true)
    })

    it('update writes a value onto the named request control', () => {
      component.update('api', '/apis/x')
      expect(component.getPath('request', 'api').value).toBe('/apis/x')
    })
  })

  describe('keywords', () => {
    beforeEach(() => component.ngOnInit())

    it('optionSelected adds a keyword and refreshes the search body', () => {
      component.optionSelected('angular')
      expect(component.keywords).toEqual(['angular'])
      expect(component.getPath('request', 'searchV6').value.filters[0].andFilters[0].keywords).toEqual(['angular'])
    })

    it('optionSelected ignores a duplicate keyword', () => {
      component.keywords = ['angular']
      component.optionSelected('angular')
      expect(component.keywords).toEqual(['angular'])
    })

    it('removeKeyword drops the keyword and refreshes the search body', () => {
      component.keywords = ['angular', 'rxjs']
      component.removeKeyword('angular')
      expect(component.keywords).toEqual(['rxjs'])
    })

    it('addKeyword clears the chip input', () => {
      const input = { value: 'angular' } as HTMLInputElement
      component.addKeyword({ input } as any)
      expect(input.value).toBe('')
    })

    it('addKeyword tolerates a missing input', () => {
      expect(() => component.addKeyword({ input: null } as any)).not.toThrow()
    })
  })

  describe('onSelectionChange', () => {
    beforeEach(() => component.ngOnInit())

    it('restores the ids preselection without confirmation', () => {
      component.getPath('request', 'ids').setValue(['do_2'])
      component.requestType = 'ids'
      component.onSelectionChange()
      expect(Array.from(component.pickerContentData.preselected as Set<string>)).toEqual(['do_2'])
    })

    it('restores the collection preselection for a search strip', () => {
      component.requestType = 'KB'
      component.getPath('request', 'searchV6').setValue({
        sort: [{ lastUpdatedOn: 'desc' }],
        filters: [{ andFilters: [{ collectionsId: ['do_9'] }] }],
      })
      component.onSelectionChange()
      expect(component.filterBy).toBe('lastUpdatedOn')
      expect(Array.from(component.pickerContentData.preselected as Set<string>)).toEqual(['do_9'])
    })

    it('falls back to the default sort for a malformed search body', () => {
      component.requestType = 'KB'
      component.getPath('request', 'searchV6').setValue({})
      component.onSelectionChange()
      expect(component.filterBy).toBe('viewCount')
    })

    it('clears every request when the type change is confirmed', () => {
      component.keywords = ['angular']
      component.collectionId = ['do_9']
      component.language = ['en']
      component.requestType = 'api'
      component.onSelectionChange(true)
      afterClosed.next(true)
      expect(component.keywords).toEqual([])
      expect(component.collectionId).toEqual([])
      expect(component.language).toEqual([])
      expect(component.filterBy).toBe('viewCount')
      expect(component.getPath('request', 'ids').value).toBeNull()
      expect(component.backUpRequestType).toBe('api')
    })

    it('reverts the request type when the change is dismissed', () => {
      component.backUpRequestType = 'ids'
      component.requestType = 'api'
      component.onSelectionChange(true)
      afterClosed.next(false)
      expect(component.requestType).toBe('ids')
    })
  })

  describe('content selection', () => {
    beforeEach(() => component.ngOnInit())

    it('onIdChange replaces the selected ids', () => {
      component.onIdChange(['do_2', 'do_3'])
      expect(component.getPath('request', 'ids').value).toEqual(['do_2', 'do_3'])
      expect(Array.from(component.pickerContentData.preselected as Set<string>)).toEqual(['do_2', 'do_3'])
    })

    it('onIdChange tolerates a null selection', () => {
      component.onIdChange(null as any)
      expect((component.pickerContentData.preselected as Set<string>).size).toBe(0)
    })

    it('onContentSelectionChanged adds a checked content', () => {
      component.getPath('request', 'ids').setValue([])
      component.onContentSelectionChanged({ content: { identifier: 'do_5' }, checked: true } as any)
      expect(component.getPath('request', 'ids').value).toEqual(['do_5'])
      expect((component.pickerContentData.preselected as Set<string>).has('do_5')).toBe(true)
    })

    it('onContentSelectionChanged removes an unchecked content', () => {
      component.getPath('request', 'ids').setValue(['do_5'])
      ;(component.pickerContentData.preselected as Set<string>).add('do_5')
      component.onContentSelectionChanged({ content: { identifier: 'do_5' }, checked: false } as any)
      expect(component.getPath('request', 'ids').value).toEqual([])
      expect((component.pickerContentData.preselected as Set<string>).has('do_5')).toBe(false)
    })
  })

  describe('onSearchV6Change', () => {
    beforeEach(() => component.ngOnInit())

    it('writes the locale and sort onto the search body', () => {
      component.language = ['en', 'hi']
      component.filterBy = 'lastUpdatedOn'
      component.onSearchV6Change()
      const body = component.getPath('request', 'searchV6').value
      expect(body.locale).toEqual(['en', 'hi'])
      expect(body.sort).toEqual([{ lastUpdatedOn: 'desc' }])
    })

    it('scopes the search to a checked collection', () => {
      component.onSearchV6Change({ content: { identifier: 'do_9' }, checked: true } as any)
      expect(component.collectionId).toEqual(['do_9'])
      expect(component.getPath('request', 'searchV6').value.filters[0].andFilters[0].collectionsId).toEqual(['do_9'])
    })

    it('clears the collection scope when unchecked', () => {
      component.collectionId = ['do_9']
      component.onSearchV6Change({ content: { identifier: 'do_9' }, checked: false } as any)
      expect(component.collectionId).toEqual([])
      expect((component.pickerContentData.preselected as Set<string>).size).toBe(0)
    })

    it('accepts the collection list from the authoring chips', () => {
      component.onSearchV6Change({ content: { identifier: 'do_9' }, checked: true } as any, ['do_7', 'do_8'], true)
      expect(component.collectionId).toEqual(['do_9'])
    })

    it('carries the keywords onto the search body', () => {
      component.keywords = ['angular']
      component.onSearchV6Change()
      expect(component.getPath('request', 'searchV6').value.filters[0].andFilters[0].keywords).toEqual(['angular'])
    })

    it('drops the keyword filter when there are none', () => {
      component.keywords = []
      component.onSearchV6Change()
      const andFilters = component.getPath('request', 'searchV6').value.filters[0].andFilters
      expect(andFilters === undefined || andFilters[0].keywords === undefined).toBe(true)
    })

    it('keeps the first collection already stored on the search body', () => {
      component.getPath('request', 'searchV6').setValue({
        filters: [{ andFilters: [{ collectionsId: ['do_1', 'do_2'] }] }],
      })
      component.collectionId = []
      component.onSearchV6Change()
      expect(component.getPath('request', 'searchV6').value.filters[0].andFilters[0].collectionsId).toEqual(['do_1'])
    })
  })

  describe('upload', () => {
    const file = (name: string, type = 'image/png', size = 100) => {
      const f = new File(['x'], name, { type })
      Object.defineProperty(f, 'size', { value: size })
      return f
    }

    beforeEach(() => component.ngOnInit())

    it('rejects a non-image file', () => {
      component.upload(file('doc.pdf', 'application/pdf'))
      expect(lastNotify()).toBe(Notify.INVALID_FORMAT)
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('rejects an oversized image', () => {
      component.upload(file('big.png', 'image/png', 2000 * 1024 * 1024))
      expect(lastNotify()).toBe(Notify.SIZE_ERROR)
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('uploads a valid image and stores the authoring URL', () => {
      component.upload(file('logo.png'))
      expect(uploadService.upload).toHaveBeenCalledWith(expect.any(FormData), expect.objectContaining({ contentId: 'do_1' }))
      expect(component.form.controls.image.value).toContain(encodeURIComponent('/c.png'))
      expect(lastNotify()).toBe(Notify.UPLOAD_SUCCESS)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('does nothing when the upload reports no code', () => {
      uploadService.upload.mockReturnValue(of({}))
      component.upload(file('logo.png'))
      expect(component.form.controls.image.value).toBe('')
    })

    it('reports a failed upload', () => {
      uploadService.upload.mockReturnValue(throwError(() => 'boom'))
      component.upload(file('logo.png'))
      expect(lastNotify()).toBe(Notify.UPLOAD_FAIL)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })
})
