import { Subject } from 'rxjs'
import { ImageCropComponent } from './image-crop.component'

describe('ImageCropComponent', () => {
  let component: ImageCropComponent
  let dialogRef: any
  let configSvc: any
  let snackBar: any
  let valueSvc: any
  let isXSmall$: Subject<boolean>

  const PNG_BASE64 = 'data:image/png;base64,aGVsbG8='

  const imageFile = () => new File(['x'], 'pic.png', { type: 'image/png' })

  const build = (over: any = {}) =>
    new ImageCropComponent(dialogRef, configSvc, snackBar, valueSvc, {
      isRoundCrop: false,
      imageFile: imageFile(),
      height: 200,
      width: 400,
      imageFileName: 'pic.png',
      ...over,
    } as any)

  /**
   * Drive the FileReader/Image callbacks the size check hangs off: stub Image so it
   * reports the given dimensions, then wait for the reader to hand it the data url.
   */
  const runSizeDetection = async (c: ImageCropComponent, width: number, height: number) => {
    const images: any[] = []
    const OriginalImage = (globalThis as any).Image
    ;(globalThis as any).Image = function (this: any) {
      const img: any = { width, height, src: '', onload: null }
      images.push(img)
      return img
    }

    try {
      c.thumbnailSizeDetection()
      for (let i = 0; i < 50 && !images.length; i += 1) {
        await new Promise(resolve => setTimeout(resolve, 1))
      }
      images.forEach(img => img.onload && img.onload())
    } finally {
      ;(globalThis as any).Image = OriginalImage
    }

    expect(images.length).toBeGreaterThan(0)
  }

  beforeEach(() => {
    isXSmall$ = new Subject<boolean>()
    dialogRef = { close: jest.fn(), updateSize: jest.fn() }
    configSvc = { instanceConfig: { logos: { defaultContent: 'default.png' } } }
    snackBar = { open: jest.fn() }
    valueSvc = { isXSmall$ }

    component = build()
  })

  describe('construction', () => {
    it('takes the file, name and target dimensions from the dialog data', () => {
      expect(component.imageFile.name).toBe('pic.png')
      expect(component.fileName).toBe('pic.png')
      expect(component.opHeight).toBe(200)
      expect(component.opWidth).toBe(400)
      expect(component.isRoundCrop).toBe(false)
    })

    it('ignores the target dimensions for a round crop', () => {
      const c = build({ isRoundCrop: true })

      expect(c.isRoundCrop).toBe(true)
      expect(c.opHeight).toBeUndefined()
      expect(c.opWidth).toBeUndefined()
    })

    it('tolerates dialog data with no file, name or dimensions', () => {
      const c = build({ imageFile: null, imageFileName: '', height: 0, width: 0 })

      expect(c.imageFile).toBeUndefined()
      expect(c.fileName).toBe('')
      expect(c.opHeight).toBeUndefined()
      expect(c.opWidth).toBeUndefined()
    })

    it('starts with no rotation or transform applied', () => {
      expect(component.canvasRotation).toBe(0)
      expect(component.transform).toEqual({})
      expect(component.resetValue).toBe(false)
      expect(component.isNotOfRequiredSize).toBe(false)
    })
  })

  describe('ngOnInit', () => {
    it('sizes the dialog for the current breakpoint', () => {
      component.ngOnInit()

      isXSmall$.next(true)
      expect(component.isXSmall).toBe(true)
      expect(dialogRef.updateSize).toHaveBeenCalledWith('90%')

      isXSmall$.next(false)
      expect(dialogRef.updateSize).toHaveBeenLastCalledWith('70%')
    })
  })

  describe('thumbnailSizeDetection', () => {
    it('tells the author that an exactly sized image needs no cropping', async () => {
      await runSizeDetection(component, 400, 200)

      expect(snackBar.open).toHaveBeenCalledWith(
        'Image is of the required dimensions of the thumbnail, croping is not available!',
        'X',
        expect.anything(),
      )
      expect(component.isNotOfRequiredSize).toBe(false)
    })

    it('warns when the image is smaller than the target', async () => {
      await runSizeDetection(component, 100, 100)

      expect(component.isNotOfRequiredSize).toBe(true)
      expect(component.width).toBe(100)
      expect(component.height).toBe(100)
    })

    it('accepts an image larger than the target', async () => {
      await runSizeDetection(component, 800, 600)

      expect(component.isNotOfRequiredSize).toBe(false)
      expect(snackBar.open).not.toHaveBeenCalled()
    })

    it('applies no dimension rules to a round crop', async () => {
      const c = build({ isRoundCrop: true })

      await runSizeDetection(c, 10, 10)

      expect(c.isNotOfRequiredSize).toBe(false)
      expect(snackBar.open).not.toHaveBeenCalled()
    })
  })

  describe('continueToImageCrop', () => {
    it('lets the author crop an undersized image anyway', () => {
      component.isNotOfRequiredSize = true

      component.continueToImageCrop()

      expect(component.isNotOfRequiredSize).toBe(false)
    })
  })

  describe('imageCropped', () => {
    it('stores the cropped image and its dimensions', () => {
      component.imageCropped({ base64: PNG_BASE64, height: 200, width: 400 } as any)

      expect(component.imageFileBase64).toBe(PNG_BASE64)
      expect(component.croppedHeight).toBe(200)
      expect(component.croppedWidth).toBe(400)
      expect(component.cropimageFile).toBeInstanceOf(File)
      expect(component.cropimageFile.name).toBe('pic.png')
    })
  })

  describe('base64ImageToBlob', () => {
    it('decodes the payload into a named jpeg file', () => {
      const file = component.base64ImageToBlob(PNG_BASE64)

      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('pic.png')
      expect(file.type).toBe('image/jpeg')
      expect(file.size).toBe(5)
    })
  })

  describe('rotation and flipping', () => {
    it('rotates left and swaps the flip axes', () => {
      component.transform = { flipH: true, flipV: false }

      component.rotateLeft()

      expect(component.canvasRotation).toBe(-1)
      expect(component.transform).toMatchObject({ flipH: false, flipV: true })
    })

    it('rotates right and swaps the flip axes', () => {
      component.transform = { flipH: false, flipV: true }

      component.rotateRight()

      expect(component.canvasRotation).toBe(1)
      expect(component.transform).toMatchObject({ flipH: true, flipV: false })
    })

    it('flips horizontally on and back off', () => {
      component.flipHorizontal()
      expect(component.transform.flipH).toBe(true)

      component.flipHorizontal()
      expect(component.transform.flipH).toBe(false)
    })
  })

  describe('zoom', () => {
    it('applies the requested scale and clears the reset flag', () => {
      component.resetValue = true

      component.zoom({ value: 1.5 })

      expect(component.transform.scale).toBe(1.5)
      expect(component.resetValue).toBe(false)
    })
  })

  describe('reset', () => {
    it('clears the rotation and every transform', () => {
      component.canvasRotation = 3
      component.transform = { scale: 2, flipH: true }

      component.reset()

      expect(component.resetValue).toBe(true)
      expect(component.canvasRotation).toBe(0)
      expect(component.transform).toEqual({})
    })
  })

  describe('changeToDefaultImg', () => {
    it('swaps a broken preview for the instance default', () => {
      const event = { target: { src: 'broken.png' } }

      component.changeToDefaultImg(event)

      expect(event.target.src).toBe('default.png')
    })

    it('clears the preview when the instance has no default', () => {
      configSvc.instanceConfig = null
      const event = { target: { src: 'broken.png' } }

      component.changeToDefaultImg(event)

      expect(event.target.src).toBe('')
    })
  })

  describe('closing', () => {
    it('returns the cropped file when applied', () => {
      component.imageCropped({ base64: PNG_BASE64, height: 1, width: 1 } as any)

      component.croppingImage()

      expect(dialogRef.close).toHaveBeenCalledWith(component.cropimageFile)
    })

    it('returns nothing when dismissed', () => {
      component.close()

      expect(dialogRef.close).toHaveBeenCalledWith()
    })
  })
})
