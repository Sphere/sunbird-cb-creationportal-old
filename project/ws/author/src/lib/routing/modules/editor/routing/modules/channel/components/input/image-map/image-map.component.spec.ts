import { FormBuilder } from '@angular/forms'
import { of, throwError } from 'rxjs'
import { ImageMapComponent } from './image-map.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'

describe('ImageMapComponent', () => {
  let component: ImageMapComponent
  let uploadService: any
  let snackBar: any
  let loader: any
  let context: any

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  /** A stubbed 2d canvas context plus the canvas element wrapper the view supplies. */
  const canvasStub = () => {
    context = {
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      setLineDash: jest.fn(),
      globalAlpha: 1,
      fillStyle: '',
      strokeStyle: '',
    }
    return {
      nativeElement: {
        width: 800,
        height: 600,
        getContext: jest.fn().mockReturnValue(context),
        getBoundingClientRect: jest.fn().mockReturnValue({ top: 10, left: 20 }),
        scrollIntoView: jest.fn(),
      },
    } as any
  }

  const mapEntry = (over: any = {}) => ({
    coords: [100, 100, 20, 20],
    alt: 'Alt',
    title: 'Title',
    link: './page/x#y',
    target: '_self',
    ...over,
  })

  const build = (content: any = {}) => {
    const c = new ImageMapComponent(uploadService, snackBar, new FormBuilder(), loader)
    c.content = { imageSrc: '', imageHeight: '', imageWidth: '', mapName: '', ...content }
    c.identifier = 'do_1.img'
    c.canvas = canvasStub()
    return c
  }

  beforeEach(() => {
    uploadService = {
      upload: jest.fn().mockReturnValue(of({ code: 200, artifactURL: 'https://host/a/b/pic.png' })),
    }
    snackBar = { openFromComponent: jest.fn() }
    loader = { changeLoad: { next: jest.fn() } }
    component = build()
  })

  it('should be created', () => {
    expect(component).toBeTruthy()
  })

  describe('ngOnInit', () => {
    it('builds the form with no map areas', () => {
      component.ngOnInit()
      expect(component.paths.length).toBe(0)
      expect(component.imageAvailable).toBe(false)
      expect(component.form.valid).toBe(false)
    })

    it('loads the configured map areas', () => {
      const c = build({ map: [mapEntry(), mapEntry()] })
      c.ngOnInit()
      expect(c.paths.length).toBe(2)
      expect(c.enableMouseClick).toBe(false)
      expect(c.paths.at(0).value.alt).toBe('Alt')
    })

    it('marks the image available when one is already set', () => {
      const c = build({ imageSrc: 'pic.png' })
      c.ngOnInit()
      expect(c.imageAvailable).toBe(true)
      expect(c.form.valid).toBe(true)
    })

    it('emits the widget and its validity when the form settles', () => {
      jest.useFakeTimers()
      const emitted: any[] = []
      component.ngOnInit()
      component.data.subscribe(v => emitted.push(v))
      component.form.controls.imageSrc.setValue('pic.png')
      jest.advanceTimersByTime(200)
      expect(emitted.length).toBe(1)
      expect(emitted[0].isValid).toBe(true)
      expect(emitted[0].content.imageSrc).toBe('pic.png')
      jest.useRealTimers()
    })
  })

  describe('ngAfterViewInit', () => {
    it('draws the canvas when an image is already set', () => {
      const c = build({ imageSrc: 'pic.png' })
      c.ngOnInit()
      const spy = jest.spyOn(c, 'initializeCanvas').mockImplementation(() => {})
      c.ngAfterViewInit()
      expect(spy).toHaveBeenCalledWith(true)
    })

    it('does nothing without an image', () => {
      component.ngOnInit()
      const spy = jest.spyOn(component, 'initializeCanvas').mockImplementation(() => {})
      component.ngAfterViewInit()
      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('form helpers', () => {
    beforeEach(() => component.ngOnInit())

    it('addImageMapToForm seeds a blank area', () => {
      component.addImageMapToForm()
      expect(component.paths.at(0).value).toEqual({
        coords: [0, 0, 0, 0],
        alt: '',
        title: '',
        link: '',
        target: '_self',
      })
    })

    it('addImageMapToForm seeds an area from existing data', () => {
      component.addImageMapToForm(mapEntry({ target: '_blank' }) as any)
      expect(component.paths.at(0).value).toEqual({
        coords: [100, 100, 20, 20],
        alt: 'Alt',
        title: 'Title',
        link: './page/x#y',
        target: '_blank',
      })
    })

    it('addImageMapToForm defaults missing coordinates to zero', () => {
      component.addImageMapToForm({ coords: [5] } as any)
      expect(component.paths.at(0).value.coords).toEqual([5, 0, 0, 0])
    })

    it('clearImagMapForm empties the area list', () => {
      component.addImageMapToForm()
      component.addImageMapToForm()
      component.clearImagMapForm()
      expect(component.paths.length).toBe(0)
    })

    it('setLinkValue builds an anchor link off the identifier', () => {
      component.addImageMapToForm()
      component.setLinkValue(0, 'section-1')
      expect(component.paths.at(0).value.link).toBe('./page/do_1#section-1')
    })

    it('selectionChange targets the same tab for an anchor', () => {
      component.addImageMapToForm()
      component.selectionChange({ value: 'anchor' }, 0)
      expect(component.paths.at(0).value.target).toBe('_self')
    })

    it('selectionChange targets a new tab for a URL', () => {
      component.addImageMapToForm()
      component.selectionChange({ value: 'url' }, 0)
      expect(component.paths.at(0).value.target).toBe('_blank')
    })

    it('selectionChange ignores an unknown link type', () => {
      component.addImageMapToForm()
      component.selectionChange({ value: 'other' }, 0)
      expect(component.paths.at(0).value.target).toBe('_self')
    })

    it('addImageMapForm appends an area and selects it', () => {
      component.addImageMapForm()
      expect(component.enableMouseClick).toBe(true)
      expect(component.selectedRadio).toBe(0)
      expect(component.paths.length).toBe(1)
    })

    it('addImageMapForm redraws once a second area exists', () => {
      component.addImageMapForm()
      component.addImageMapForm()
      expect(component.selectedRadio).toBe(1)
      expect(context.clearRect).toHaveBeenCalled()
    })

    it('removeButtonClick drops the area at the index', () => {
      component.addImageMapForm()
      component.addImageMapForm()
      component.removeButtonClick(0)
      expect(component.paths.length).toBe(1)
      expect(component.selectedRadio).toBe(0)
    })

    it('removeButtonClick reseeds a blank area when the last one goes', () => {
      component.addImageMapForm()
      component.removeButtonClick(0)
      expect(component.paths.length).toBe(1)
    })
  })

  describe('checkCoordsValue', () => {
    beforeEach(() => component.ngOnInit())

    it('is false for an area with no drawn box', () => {
      component.addImageMapToForm()
      expect(component.checkCoordsValue(0)).toBe(false)
    })

    it('is true once a coordinate is set', () => {
      component.addImageMapToForm(mapEntry() as any)
      expect(component.checkCoordsValue(0)).toBe(true)
    })

    it('is false for an unknown index', () => {
      expect(component.checkCoordsValue(9)).toBe(false)
    })
  })

  describe('canvas drawing', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.addImageMapToForm(mapEntry() as any)
    })

    it('drawAll fills a translucent box per area', () => {
      component.drawAll(context)
      expect(context.fillRect).toHaveBeenCalledWith(100, 100, 80, 80)
      expect(context.globalAlpha).toBe(0.3)
    })

    it('drawOutsideBorder outlines a drawn area and locks the mouse', () => {
      component.drawOutsideBorder(0)
      expect(component.enableMouseClick).toBe(false)
      expect(context.strokeRect).toHaveBeenCalledWith(100, 100, 80, 80)
    })

    it('drawOutsideBorder re-enables drawing for an empty area', () => {
      component.clearImagMapForm()
      component.addImageMapToForm()
      component.drawOutsideBorder(0)
      expect(component.enableMouseClick).toBe(true)
      expect(context.strokeRect).not.toHaveBeenCalled()
    })

    it('initializeCanvas sizes the canvas from the loaded image', () => {
      jest.useFakeTimers()
      component.form.controls.imageSrc.setValue('pic.png')
      component.initializeCanvas()
      const img = { naturalWidth: 400, naturalHeight: 300, onload: () => {}, onerror: () => {} } as any
      const ImageSpy = jest.spyOn(window as any, 'Image').mockImplementation(() => img)
      jest.advanceTimersByTime(200)
      img.onload()
      expect(component.form.controls.imageWidth.value).toBe(400)
      expect(component.form.controls.imageHeight.value).toBe(300)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
      ImageSpy.mockRestore()
      jest.useRealTimers()
    })

    it('initializeCanvas reports a broken image', () => {
      jest.useFakeTimers()
      const img = { onload: () => {}, onerror: () => {} } as any
      const ImageSpy = jest.spyOn(window as any, 'Image').mockImplementation(() => img)
      component.initializeCanvas()
      jest.advanceTimersByTime(200)
      img.onerror()
      expect(lastNotify()).toBe(Notify.UPLOAD_FAIL)
      ImageSpy.mockRestore()
      jest.useRealTimers()
    })
  })

  describe('mouse interaction', () => {
    beforeEach(() => {
      component.ngOnInit()
      component.addImageMapToForm(mapEntry() as any)
    })

    const mouse = (clientX: number, clientY: number) =>
      ({
        clientX,
        clientY,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
        target: { style: {} },
      }) as any

    it('isMouseInShape detects a point inside the box', () => {
      expect(component.isMouseInShape(50, 50, mapEntry() as any)).toBe(true)
      expect(component.isInsideShape).toBe(true)
    })

    it('isMouseInShape detects a point outside the box', () => {
      expect(component.isMouseInShape(500, 500, mapEntry() as any)).toBe(false)
      expect(component.isInsideShape).toBe(false)
    })

    it('mouseDownEvent is inert while drawing is locked', () => {
      component.enableMouseClick = false
      component.mouseDownEvent(mouse(100, 100))
      expect(component.drag).toBe(false)
    })

    it('mouseDownEvent starts a new box outside every shape', () => {
      component.enableMouseClick = true
      const event = mouse(500, 500)
      component.mouseDownEvent(event)
      expect(component.drag).toBe(true)
      expect(component.clickCount).toBe(1)
      expect(component.startX1).toBe(500)
      expect(event.target.style.cursor).toBe('crosshair')
    })

    it('mouseDownEvent records the second corner on the next click', () => {
      component.enableMouseClick = true
      component.mouseDownEvent(mouse(500, 500))
      component.mouseDownEvent(mouse(600, 600))
      expect(component.startX2).toBe(600)
      expect(component.clickCount).toBe(2)
    })

    it('mouseDownEvent selects an existing shape instead of drawing', () => {
      component.enableMouseClick = true
      component.mouseDownEvent(mouse(70, 70))
      expect(component.drag).toBe(false)
      expect(component.selectedShapeIndex).toBe(0)
    })

    it('handleMouseDown records the shape under the cursor', () => {
      component.handleMouseDown(mouse(70, 70))
      expect(component.selectedShapeIndex).toBe(0)
      expect(component.isDragging).toBe(true)
    })

    it('handleMouseUp ends a drag', () => {
      component.isDragging = true
      const event = mouse(0, 0)
      component.handleMouseUp(event)
      expect(component.isDragging).toBe(false)
      expect(event.preventDefault).toHaveBeenCalled()
    })

    it('handleMouseUp is inert when nothing is being dragged', () => {
      const event = mouse(0, 0)
      component.handleMouseUp(event)
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('mouseOutEvent ends a drag', () => {
      component.isDragging = true
      const event = mouse(0, 0)
      component.mouseOutEvent(event)
      expect(component.isDragging).toBe(false)
    })

    it('mouseOutEvent is inert when nothing is being dragged', () => {
      const event = mouse(0, 0)
      component.mouseOutEvent(event)
      expect(event.preventDefault).not.toHaveBeenCalled()
    })

    it('mouseMoveEvent sets the crosshair cursor while drawing is allowed', () => {
      component.enableMouseClick = true
      const event = mouse(100, 100)
      component.mouseMoveEvent(event)
      expect(event.target.style.cursor).toBe('crosshair')
    })

    it('mouseMoveEvent restores the default cursor while locked', () => {
      component.enableMouseClick = false
      const event = mouse(100, 100)
      component.mouseMoveEvent(event)
      expect(event.target.style.cursor).toBe('initial')
    })

    it('mouseMoveEvent previews the box while dragging', () => {
      component.enableMouseClick = true
      component.drag = true
      component.startX1 = 100
      component.startY1 = 100
      component.mouseMoveEvent(mouse(200, 200))
      expect(component.isDragging).toBe(true)
      expect(context.strokeRect).toHaveBeenCalledWith(80, 90, 100, 100)
    })

    it('mouseUpEvent commits the drawn box into the form', () => {
      jest.useFakeTimers()
      component.title = { filter: jest.fn().mockReturnValue([{ nativeElement: { focus: jest.fn() } }]) } as any
      component.isDragging = true
      component.startX1 = 100
      component.startY1 = 100
      component.mouseUpEvent(mouse(200, 200))
      expect(component.clickCount).toBe(0)
      expect(component.drag).toBe(false)
      expect(component.enableMouseClick).toBe(false)
      expect(context.fillRect).toHaveBeenCalledWith(80, 90, 100, 100)
      // addCoordsToForm stores the box as [startX, startY, endX, endY].
      expect(component.paths.at(0).value.coords).toEqual([80, 90, 180, 190])
      jest.advanceTimersByTime(500)
      jest.useRealTimers()
    })

    it('mouseUpEvent is inert when nothing is being dragged', () => {
      component.isDragging = false
      component.mouseUpEvent(mouse(200, 200))
      expect(context.fillRect).not.toHaveBeenCalled()
    })

    it('addCoordsToForm writes the box corners in storage order', () => {
      component.addCoordsToForm(10, 20, 30, 40)
      expect(component.paths.at(0).value.coords).toEqual([30, 40, 10, 20])
    })

    it('onRightClick suppresses the browser menu', () => {
      const event = mouse(0, 0)
      expect(component.onRightClick(event)).toBe(false)
      expect(event.preventDefault).toHaveBeenCalled()
      expect(event.stopPropagation).toHaveBeenCalled()
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

    it('uploads a first image and seeds a blank map area', () => {
      jest.spyOn(component, 'initializeCanvas').mockImplementation(() => {})
      component.upload(file('My Picture.png'))
      expect(uploadService.upload).toHaveBeenCalledWith(expect.any(FormData), expect.objectContaining({ contentId: 'do_1.img' }))
      expect(component.form.controls.mapName.value).toBe('MyPicture')
      expect(component.form.controls.imageSrc.value).toContain(encodeURIComponent('/pic.png'))
      expect(component.paths.length).toBe(1)
      expect(lastNotify()).toBe(Notify.UPLOAD_SUCCESS)
    })

    it('replaces the image without clearing the existing areas', () => {
      const c = build({ imageSrc: 'old.png', map: [mapEntry()] })
      c.ngOnInit()
      jest.spyOn(c, 'initializeCanvas').mockImplementation(() => {})
      c.upload(file('new.png'))
      expect(c.paths.length).toBe(1)
      expect(c.selectedRadio).toBe(0)
    })

    it('does nothing when the upload reports no code', () => {
      uploadService.upload.mockReturnValue(of({}))
      component.upload(file('pic.png'))
      expect(component.form.controls.imageSrc.value).toBe('')
    })

    it('reports a failed upload', () => {
      uploadService.upload.mockReturnValue(throwError(() => 'boom'))
      component.upload(file('pic.png'))
      expect(lastNotify()).toBe(Notify.UPLOAD_FAIL)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(false)
    })
  })
})
