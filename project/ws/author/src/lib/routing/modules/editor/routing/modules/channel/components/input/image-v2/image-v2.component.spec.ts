import { FormBuilder } from '@angular/forms'
import { of, throwError } from 'rxjs'
import { ImageV2Component } from './image-v2.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { FILE_MAX_SIZE } from '@ws/author/src/lib/constants/upload'
import { TEMPLATE_TYPES } from './image-v2.constant'

describe('ImageV2Component', () => {
  let component: ImageV2Component
  let snackBar: any
  let loader: any
  let uploadService: any

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  const build = (content: any = {}) => {
    const c = new ImageV2Component(new FormBuilder(), snackBar, loader, uploadService)
    c.content = { html: '', ...content }
    c.identifier = 'do_page1'
    return c
  }

  const imageFile = (size = 100, type = 'image/png', name = 'my pic!.png') => {
    const file = new File(['x'], name, { type })
    Object.defineProperty(file, 'size', { value: size })
    return file
  }

  beforeEach(() => {
    jest.useFakeTimers()
    snackBar = { openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() } }
    uploadService = {
      upload: jest.fn().mockReturnValue(of({ code: 200, artifactURL: 'https://host/a/b/pic.png' })),
    }
    component = build()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
    expect(component.minWidth).toBe(331)
    expect(component.canShow).toEqual([])
  })

  describe('ngOnChanges', () => {
    it('builds the form and seeds the defaults', () => {
      component.ngOnChanges()

      expect(component.form).toBeTruthy()
      expect(component.form.value).toEqual({
        title: '',
        template: '',
        description: '',
        link: '',
        target: '_blank',
        type: 'set1',
        category: '',
        imageSrc: '',
        width: 331,
      })
      expect(component.form.valid).toBe(false)
    })

    it('scales the minimum width by the column span', () => {
      component.size = 3
      component.ngOnChanges()

      expect(component.minWidth).toBe(993)
    })

    it('seeds the form from the stored template data', () => {
      const c = build({
        type: 'set4',
        template: 'card4',
        templateData: {
          title: 'A title',
          category: 'News',
          description: 'Some text',
          link: '/page/x',
          target: '_self',
          imageSrc: 'pic.png',
        },
      })

      c.ngOnChanges()

      expect(c.form.value).toMatchObject({
        title: 'A title',
        category: 'News',
        template: 'card4',
        description: 'Some text',
        link: '/page/x',
        target: '_self',
        type: 'set4',
        imageSrc: 'pic.png',
      })
      expect(c.form.valid).toBe(true)
    })

    it('resets the form on a second change instead of rebuilding it', () => {
      component.ngOnChanges()
      const form = component.form
      component.form.controls.title.setValue('typed')

      component.ngOnChanges()

      expect(component.form).toBe(form)
      expect(component.form.value.title).toBe('')
    })
  })

  describe('onSetChange', () => {
    beforeEach(() => component.ngOnChanges())

    it.each([
      ['set1', ['image']],
      ['set2', ['image', 'link']],
      ['set3', ['image', 'name']],
      ['set5', ['image', 'name']],
      ['set4', ['image', 'link', 'name']],
      ['set6', ['image', 'link', 'name']],
      ['set7', ['image', 'name', 'description']],
      ['set9', ['image', 'name', 'description']],
      ['set8', ['image', 'name', 'link', 'description']],
      ['set10', ['image', 'name', 'link', 'description']],
      ['set11', ['image', 'name', 'category', 'description']],
      ['set12', ['image', 'link', 'name', 'category', 'description']],
      ['title', ['name']],
      ['text', ['name', 'description', 'link']],
      ['unknown', ['image']],
    ])('shows the right fields for %s', (type, expected) => {
      component.form.controls.type.setValue(type)

      expect(component.canShow).toEqual(expected)
    })
  })

  describe('onMatCardClick', () => {
    it('selects the template set behind the clicked card', () => {
      component.ngOnChanges()

      component.onMatCardClick(7)

      expect(component.form.value.type).toBe('set7')
      expect(component.canShow).toEqual(['image', 'name', 'description'])
    })
  })

  describe('form value changes', () => {
    it('writes the widget content back and reports validity', () => {
      const spy = jest.fn()
      component.data.subscribe(spy)
      component.ngOnChanges()

      component.form.controls.imageSrc.setValue('pic.png')
      component.form.controls.title.setValue('A title')
      jest.advanceTimersByTime(100)

      expect(component.content.type).toBe('set1')
      expect(component.content.html).toBe('')
      expect(component.content.template).toBe(TEMPLATE_TYPES.set1)
      expect(component.content.templateData).toMatchObject({
        title: 'A title',
        imageSrc: 'pic.png',
      })
      expect(component.content.templateData.type).toBeUndefined()
      expect(component.content.templateData.template).toBeUndefined()
      expect(spy).toHaveBeenCalledWith({
        content: expect.objectContaining({ imageSrc: 'pic.png' }),
        isValid: true,
      })
    })

    it('preserves the existing container classes', () => {
      const c = build({ containerClass: 'foo bar' })
      c.ngOnChanges()

      c.form.controls.imageSrc.setValue('pic.png')
      jest.advanceTimersByTime(100)

      expect(c.content.containerClass).toBe('foo bar')
    })
  })

  describe('upload', () => {
    beforeEach(() => component.ngOnChanges())

    it('rejects a file that is not an image', () => {
      component.upload(imageFile(100, 'application/pdf', 'doc.pdf'))

      expect(uploadService.upload).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.INVALID_FORMAT)
    })

    it('rejects an image that is over the size limit', () => {
      component.upload(imageFile(FILE_MAX_SIZE + 1))

      expect(uploadService.upload).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.SIZE_ERROR)
    })

    it('strips unsafe characters out of the file name', () => {
      component.upload(imageFile())

      const formData = uploadService.upload.mock.calls[0][0]
      expect((formData.get('content') as File).name).toBe('mypic.png')
    })

    it('stores the uploaded artifact path on the form', () => {
      component.upload(imageFile())

      expect(component.form.value.imageSrc).toContain(encodeURIComponent('/b/pic.png'))
      expect(lastNotify()).toBe(Notify.UPLOAD_SUCCESS)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('uploads against the current content id', () => {
      component.upload(imageFile())

      expect(uploadService.upload).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ contentId: 'do_page1' }))
    })

    it('leaves the form alone when the upload returns no code', () => {
      uploadService.upload.mockReturnValue(of({ artifactURL: 'https://host/a/b/pic.png' }))

      component.upload(imageFile())

      expect(component.form.value.imageSrc).toBe('')
    })

    it('reports an upload failure', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('boom')))

      component.upload(imageFile())

      expect(lastNotify()).toBe(Notify.UPLOAD_FAIL)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  describe('addElevation', () => {
    it('adds the shadow class to a widget that has none', () => {
      component.addElevation()

      expect(component.content.containerClass).toContain('mat-elevation-z4')
    })

    it('removes the shadow class when it is already applied', () => {
      const c = build({ containerClass: 'foo mat-elevation-z4' })

      c.addElevation()

      expect(c.content.containerClass).toBe('foo')
    })

    it('does nothing without content', () => {
      component.content = null as any

      expect(() => component.addElevation()).not.toThrow()
    })
  })
})
