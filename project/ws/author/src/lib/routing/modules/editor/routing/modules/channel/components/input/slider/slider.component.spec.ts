import { FormArray, FormBuilder } from '@angular/forms'
import { of, throwError } from 'rxjs'
import { SliderComponent } from './slider.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('SliderComponent', () => {
  let component: SliderComponent
  let uploadService: any
  let snackBar: any
  let loader: any

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  const file = (name: string, type = 'image/png', size = 100) => {
    const f = new File(['x'], name, { type })
    Object.defineProperty(f, 'size', { value: size })
    return f
  }

  const build = () => {
    const c = new SliderComponent(uploadService, snackBar, new FormBuilder(), loader)
    c.identifier = 'do_1'
    return c
  }

  beforeEach(() => {
    uploadService = {
      upload: jest.fn().mockReturnValue(of({ code: 200, artifactURL: 'https://host/a/b/c.png' })),
    }
    snackBar = { openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() } }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('seeds one blank row when there is no content', () => {
      component.content = [] as any
      component.ngOnInit()
      expect(component.paths.length).toBe(1)
      expect(component.paths.at(0).value.openInNewTab).toBe('_blank')
    })

    it('creates a row for each carousel item', () => {
      component.content = [
        { title: 'A', redirectUrl: 'http://a', openInNewTab: '_self', banners: { xs: 'x', s: 's', m: 'm', l: 'l', xl: 'xl' } },
        { title: 'B', redirectUrl: 'http://b', banners: {} },
      ] as any
      component.ngOnInit()
      expect(component.paths.length).toBe(2)
      expect(component.paths.at(0).value.title).toBe('A')
      expect(component.paths.at(0).value.banners.xs).toBe('x')
      expect(component.paths.at(1).value.openInNewTab).toBe('_blank')
    })

    it('emits the carousel and validity when the form settles', () => {
      jest.useFakeTimers()
      const emitted: any[] = []
      component.content = [] as any
      component.ngOnInit()
      component.data.subscribe(v => emitted.push(v))
      component.paths.at(0).get('title')!.setValue('New')
      jest.advanceTimersByTime(200)
      expect(emitted.length).toBe(1)
      expect(emitted[0].isValid).toBe(false)
      jest.useRealTimers()
    })
  })

  describe('form helpers', () => {
    beforeEach(() => {
      component.content = [] as any
      component.ngOnInit()
    })

    it('paths exposes the iCarousel form array', () => {
      expect(component.paths instanceof FormArray).toBe(true)
    })

    it('addImageDetailsToForm appends a blank row', () => {
      component.addImageDetailsToForm()
      expect(component.paths.length).toBe(2)
      expect(component.paths.at(1).value.title).toBe('')
    })

    it('addImageDetailsToForm seeds a row from data', () => {
      component.addImageDetailsToForm({
        title: 'T',
        redirectUrl: 'http://t',
        openInNewTab: '_self',
        banners: { xs: 'a', s: 'b', m: 'c', l: 'd', xl: 'e' },
      } as any)
      const row = component.paths.at(1).value
      expect(row.title).toBe('T')
      expect(row.redirectUrl).toBe('http://t')
      expect(row.openInNewTab).toBe('_self')
      expect(row.banners.xl).toBe('e')
    })

    it('removeButtonClick drops the row at the index', () => {
      component.addImageDetailsToForm()
      component.removeButtonClick(0)
      expect(component.paths.length).toBe(1)
    })
  })

  describe('upload', () => {
    beforeEach(() => {
      component.content = [] as any
      component.ngOnInit()
    })

    it('rejects a non-image file', () => {
      component.upload(file('doc.pdf', 'application/pdf'), 0, 'xs')
      expect(lastNotify()).toBe(Notify.INVALID_FORMAT)
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('rejects an oversized image', () => {
      component.upload(file('big.png', 'image/png', 2000 * 1024 * 1024), 0, 'xs')
      expect(lastNotify()).toBe(Notify.SIZE_ERROR)
      expect(uploadService.upload).not.toHaveBeenCalled()
    })

    it('uploads a valid image and stores the authoring URL', () => {
      component.upload(file('logo.png'), 0, 'xs')
      expect(uploadService.upload).toHaveBeenCalledWith(expect.any(FormData), expect.objectContaining({ contentId: 'do_1' }))
      const value = (component.paths.at(0).get('banners') as FormArray).get('xs')!.value
      expect(value).toContain(encodeURIComponent('/c.png'))
      expect(lastNotify()).toBe(Notify.UPLOAD_SUCCESS)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })

    it('strips special characters from the file name', () => {
      component.upload(file('my file@!.png'), 0, 'xs')
      const fd = uploadService.upload.mock.calls[0][0] as FormData
      expect(fd.get('content')).toBeInstanceOf(File)
      expect((fd.get('content') as File).name).toBe('myfile.png')
    })

    it('does nothing further when the upload reports no code', () => {
      uploadService.upload.mockReturnValue(of({}))
      component.upload(file('logo.png'), 0, 'xs')
      const value = (component.paths.at(0).get('banners') as FormArray).get('xs')!.value
      expect(value).toBe('')
    })

    it('reports a failed upload', () => {
      uploadService.upload.mockReturnValue(throwError(() => 'boom'))
      component.upload(file('logo.png'), 0, 'xs')
      expect(lastNotify()).toBe(Notify.UPLOAD_FAIL)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })
})
