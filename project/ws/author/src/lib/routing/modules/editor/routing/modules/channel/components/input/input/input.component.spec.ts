import { of, throwError } from 'rxjs'
import { InputComponent } from './input.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { FILE_MAX_SIZE } from './../../../../../../../../../constants/upload'

describe('InputComponent', () => {
  let component: InputComponent
  let uploadService: any
  let loader: any
  let snackBar: any
  let dialogRef: any

  const widget = (over: any = {}): any => ({
    widgetSubType: 'gridLayout',
    data: {},
    isValid: false,
    addOnData: { thumbnail: '' },
    ...over,
  })

  const fakeFile = (type: string, size: number, name = 'my pic!.png'): any => ({
    name,
    type,
    size,
  })

  // A real File is required for tests that reach FormData.append (jsdom rejects plain objects).
  const realImage = (name = 'my pic!.png'): File => new File([new Uint8Array(100)], name, { type: 'image/png' })

  const build = (data: any = { widget: widget(), parentType: 'gridLayout', identifier: 'id-1' }) =>
    new InputComponent(uploadService, loader, snackBar, dialogRef, data)

  beforeEach(() => {
    uploadService = { upload: jest.fn().mockReturnValue(of({ code: 200, artifactURL: 'https://h/a/b/c/pic.png' })) }
    loader = { changeLoad: { next: jest.fn() } }
    snackBar = { openFromComponent: jest.fn() }
    dialogRef = { close: jest.fn() }

    component = build()
  })

  it('is created with data copied from the dialog', () => {
    expect(component).toBeTruthy()
    expect(component.parentType).toBe('gridLayout')
    expect(component.identifier).toBe('id-1')
    expect(component.widget.widgetSubType).toBe('gridLayout')
  })

  describe('ngOnInit', () => {
    it('shows the parent option for a supported parent type', () => {
      component.ngOnInit()

      expect(component.canShowParent).toBe(true)
    })

    it('hides the parent option for an unsupported parent type', () => {
      component = build({ widget: widget(), parentType: 'other', identifier: 'id-1' })

      component.ngOnInit()

      expect(component.canShowParent).toBe(false)
    })

    it('enables edit for a supported widget sub type', () => {
      component.ngOnInit()

      expect(component.canShowEdit).toBe(true)
    })

    it('disables edit for an unsupported widget sub type', () => {
      component = build({ widget: widget({ widgetSubType: 'unknownType' }), parentType: 'gridLayout', identifier: 'id-1' })

      component.ngOnInit()

      expect(component.canShowEdit).toBe(false)
    })
  })

  describe('close / save', () => {
    it('closes with the widget', () => {
      component.close()

      expect(dialogRef.close).toHaveBeenCalledWith(component.widget)
    })

    it('saves wrapping the widget in a data envelope', () => {
      component.save()

      expect(dialogRef.close).toHaveBeenCalledWith({ data: component.widget })
    })
  })

  describe('update', () => {
    it('copies changed content into the widget data', () => {
      component.update({ content: { foo: 'bar' } as any, isValid: true })

      expect(component.widget.data).toEqual({ foo: 'bar' })
      expect(component.widget.isValid).toBe(true)
    })

    it('leaves data unchanged when content matches', () => {
      component.widget.data = { foo: 'bar' }

      component.update({ content: { foo: 'bar' } as any, isValid: false })

      expect(component.widget.data).toEqual({ foo: 'bar' })
      expect(component.widget.isValid).toBe(false)
    })

    it('ignores an empty payload', () => {
      component.widget.data = { keep: 1 }

      component.update({ content: null as any, isValid: true })

      expect(component.widget.data).toEqual({ keep: 1 })
      expect(component.widget.isValid).toBe(true)
    })
  })

  describe('upload', () => {
    it('rejects a non-image file', () => {
      component.upload(fakeFile('application/pdf', 100))

      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.INVALID_FORMAT } }),
      )
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('rejects an oversized image', () => {
      component.upload(fakeFile('image/png', FILE_MAX_SIZE + 1))

      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.SIZE_ERROR } }),
      )
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('uploads a valid image and sets the thumbnail on success', () => {
      component.upload(realImage())

      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      expect(uploadService.upload).toHaveBeenCalledWith(expect.any(FormData), expect.objectContaining({ contentId: 'id-1' }))
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      expect(component.widget.addOnData.thumbnail).toContain('%2Fc%2Fpic.png')
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.UPLOAD_SUCCESS } }),
      )
    })

    it('shows a failure snackbar when the upload errors', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('fail')))

      component.upload(realImage())

      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: { type: Notify.UPLOAD_FAIL } }),
      )
    })
  })
})
