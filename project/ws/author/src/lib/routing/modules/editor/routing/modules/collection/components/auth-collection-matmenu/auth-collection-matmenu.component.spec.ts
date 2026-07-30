import { AuthCollectionMatmenuComponent } from './auth-collection-matmenu.component'

describe('AuthCollectionMatmenuComponent', () => {
  let component: AuthCollectionMatmenuComponent
  let storeService: { uploadFileType: { next: jest.Mock } }

  beforeEach(() => {
    storeService = { uploadFileType: { next: jest.fn() } }
    component = new AuthCollectionMatmenuComponent(storeService as any)
  })

  it('should create', () => {
    expect(component).toBeTruthy()
    expect(component.concatItems).toBe(false)
  })

  describe('ngOnInit', () => {
    it('should append the four upload items when an "upload" entry is present', () => {
      component.childType = [
        { id: 'upload', name: 'Upload', children: [], icon: 'x' } as any,
        { id: 'course', name: 'Course', children: [], icon: 'y' } as any,
      ]

      component.ngOnInit()

      expect(component.concatItems).toBe(true)
      const subids = component.childType.map(c => (c as any).subid)
      expect(subids).toEqual(expect.arrayContaining(['pdf', 'audio', 'video', 'zip']))
      // 4 upload items appended
      expect(component.childType.filter(c => (c as any).id === 'upload').length).toBe(4)
    })

    it('should remove webModule entries without appending upload items', () => {
      component.childType = [
        { id: 'webModule', name: 'Web', children: [], icon: 'w' } as any,
        { id: 'course', name: 'Course', children: [], icon: 'y' } as any,
      ]

      component.ngOnInit()

      expect(component.concatItems).toBe(false)
      expect(component.childType.some(c => (c as any).id === 'webModule')).toBe(false)
    })

    it('should leave a list with no upload/webModule entries unchanged', () => {
      component.childType = [{ id: 'course', name: 'Course', children: [], icon: 'y' } as any]

      component.ngOnInit()

      expect(component.concatItems).toBe(false)
      expect(component.childType.length).toBe(1)
    })
  })

  describe('click', () => {
    it('should push the subid to the store when type is upload and subid provided', () => {
      const emitSpy = jest.spyOn(component.action, 'emit')

      component.click('someAction', 'upload', 'pdf')

      expect(storeService.uploadFileType.next).toHaveBeenCalledWith('pdf')
      expect(emitSpy).toHaveBeenCalledWith({ action: 'someAction', type: 'upload' })
    })

    it('should not touch the store when type is not upload', () => {
      const emitSpy = jest.spyOn(component.action, 'emit')

      component.click('create', 'course')

      expect(storeService.uploadFileType.next).not.toHaveBeenCalled()
      expect(emitSpy).toHaveBeenCalledWith({ action: 'create', type: 'course' })
    })

    it('should not touch the store when subid is missing even for upload type', () => {
      component.click('create', 'upload')

      expect(storeService.uploadFileType.next).not.toHaveBeenCalled()
    })

    it('should emit with undefined type when type omitted', () => {
      const emitSpy = jest.spyOn(component.action, 'emit')

      component.click('cancel')

      expect(emitSpy).toHaveBeenCalledWith({ action: 'cancel', type: undefined })
    })
  })
})
