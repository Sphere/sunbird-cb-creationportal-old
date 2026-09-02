import { of } from 'rxjs'

import { NewImageCropComponent } from './new-image-crop.component'

/**
 * Covers the crop / transform behaviour the sibling new-image-crop.component.spec.ts
 * leaves out: imageCropped, base64ImageToBlob, thumbnailSizeDetection, the rotate /
 * flip / zoom transforms and the dialog close paths.
 */
describe('NewImageCropComponent (crop + transform)', () => {
  let dialogRef: any
  let configSvc: any
  let snackBar: any
  let valueSvc: any

  const file = (name = 'pic.png') => new File(['x'], name, { type: 'image/png' })

  const build = (data: any = {}) => {
    dialogRef = { close: jest.fn(), updateSize: jest.fn() }
    configSvc = { instanceConfig: { logos: { defaultContent: 'default.png' } } }
    snackBar = { open: jest.fn() }
    valueSvc = { isXSmall$: of(false) }
    return new NewImageCropComponent(dialogRef, configSvc, snackBar, valueSvc, {
      isRoundCrop: false,
      imageFile: file(),
      height: 200,
      width: 400,
      imageFileName: 'pic.png',
      ...data,
    })
  }

  afterEach(() => jest.restoreAllMocks())

  describe('changeToDefaultImg', () => {
    it('swaps in the configured fallback', () => {
      const comp = build()
      const target = { src: 'broken.png' }
      comp.changeToDefaultImg({ target } as any)
      expect(target.src).toBe('default.png')
    })

    it('blanks the image with no instance config', () => {
      const comp = build()
      configSvc.instanceConfig = undefined
      const target = { src: 'broken.png' }
      comp.changeToDefaultImg({ target } as any)
      expect(target.src).toBe('')
    })
  })

  describe('imageCropped', () => {
    it('stores the base64 result and the cropped dimensions', () => {
      const comp = build()
      const blobFile = file('cropped.png')
      jest.spyOn(comp, 'base64ImageToBlob').mockReturnValue(blobFile)

      comp.imageCropped({ base64: 'data:image/png;base64,AAA', height: 100, width: 150 } as any)

      expect(comp.imageFileBase64).toBe('data:image/png;base64,AAA')
      expect(comp.cropimageFile).toBe(blobFile)
      expect(comp.croppedHeight).toBe(100)
      expect(comp.croppedWidth).toBe(150)
    })
  })

  describe('base64ImageToBlob', () => {
    it('decodes a data url into a named jpeg file', () => {
      const comp = build()
      const base64 = `data:image/png;base64,${btoa('hello')}`

      const out = comp.base64ImageToBlob(base64)

      expect(out).toBeInstanceOf(File)
      expect(out.name).toBe('pic.png')
      expect(out.type).toBe('image/jpeg')
      expect(out.size).toBe(5)
    })

    it('handles a bare base64 payload with no data-url prefix', () => {
      const comp = build()
      expect(() => comp.base64ImageToBlob(btoa('hi'))).not.toThrow()
    })
  })

  describe('openSnackBar', () => {
    it('shows a dismissible message', () => {
      const comp = build()
      comp.openSnackBar('hello')
      expect(snackBar.open).toHaveBeenCalledWith('hello', 'X', { duration: 2000 })
    })
  })

  describe('continueToImageCrop', () => {
    it('clears the too-small warning', () => {
      const comp = build()
      comp.isNotOfRequiredSize = true
      comp.continueToImageCrop()
      expect(comp.isNotOfRequiredSize).toBe(false)
    })
  })

  describe('thumbnailSizeDetection', () => {
    /** Drives the FileReader + Image load handlers the method installs. */
    const runDetection = (comp: NewImageCropComponent, imgSize: { width: number; height: number }) => {
      const reader: any = { readAsDataURL: jest.fn(), result: 'data:image/png;base64,AAA', onload: null }
      jest.spyOn(global as any, 'FileReader').mockImplementation(() => reader)
      const img: any = { onload: null, src: '' }
      jest.spyOn(global as any, 'Image').mockImplementation(() => img)

      comp.thumbnailSizeDetection()
      reader.onload()
      Object.assign(img, imgSize)
      img.onload()
    }

    it('warns and stops when the image already matches the target size', () => {
      const comp = build({ height: 200, width: 400 })
      runDetection(comp, { width: 400, height: 200 })

      expect(snackBar.open).toHaveBeenCalledWith('Image is of the required dimensions of the thumbnail, croping is not available!', 'X', {
        duration: 2000,
      })
      expect(comp.isNotOfRequiredSize).toBe(false)
    })

    it('flags an image smaller than the target height', () => {
      const comp = build({ height: 200, width: 400 })
      runDetection(comp, { width: 400, height: 100 })
      expect(comp.isNotOfRequiredSize).toBe(true)
    })

    it('flags an image narrower than the target width', () => {
      const comp = build({ height: 200, width: 400 })
      runDetection(comp, { width: 100, height: 200 })
      expect(comp.isNotOfRequiredSize).toBe(true)
    })

    it('accepts an image larger than the target', () => {
      const comp = build({ height: 200, width: 400 })
      runDetection(comp, { width: 800, height: 600 })
      expect(comp.isNotOfRequiredSize).toBe(false)
      expect(snackBar.open).not.toHaveBeenCalled()
    })

    it('records the measured dimensions', () => {
      const comp = build({ height: 200, width: 400 })
      runDetection(comp, { width: 800, height: 600 })
      expect(comp.width).toBe(800)
      expect(comp.height).toBe(600)
    })

    it('skips the size checks entirely for a round crop', () => {
      const comp = build({ isRoundCrop: true })
      runDetection(comp, { width: 10, height: 10 })
      expect(comp.isNotOfRequiredSize).toBe(false)
      expect(snackBar.open).not.toHaveBeenCalled()
    })
  })

  describe('rotation and flipping', () => {
    it('rotateLeft steps the canvas back and swaps the flip axes', () => {
      const comp = build()
      comp.transform = { flipH: true, flipV: false }

      comp.rotateLeft()

      expect(comp.canvasRotation).toBe(-1)
      expect(comp.transform.flipH).toBe(false)
      expect(comp.transform.flipV).toBe(true)
    })

    it('rotateRight steps the canvas forward and swaps the flip axes', () => {
      const comp = build()
      comp.transform = { flipH: false, flipV: true }

      comp.rotateRight()

      expect(comp.canvasRotation).toBe(1)
      expect(comp.transform.flipH).toBe(true)
      expect(comp.transform.flipV).toBe(false)
    })

    it('flipHorizontal toggles the horizontal flip', () => {
      const comp = build()
      comp.flipHorizontal()
      expect(comp.transform.flipH).toBe(true)
      comp.flipHorizontal()
      expect(comp.transform.flipH).toBe(false)
    })

    it('preserves other transform values when flipping', () => {
      const comp = build()
      comp.transform = { scale: 2 }
      comp.flipHorizontal()
      expect(comp.transform.scale).toBe(2)
    })
  })

  describe('zoom', () => {
    it('applies the slider scale and clears the reset flag', () => {
      const comp = build()
      comp.resetValue = true

      comp.zoom({ value: 1.5 })

      expect(comp.transform.scale).toBe(1.5)
      expect(comp.resetValue).toBe(false)
    })
  })

  describe('reset', () => {
    it('clears the rotation and every transform', () => {
      const comp = build()
      comp.canvasRotation = 3
      comp.transform = { scale: 2, flipH: true }

      comp.reset()

      expect(comp.resetValue).toBe(true)
      expect(comp.canvasRotation).toBe(0)
      expect(comp.transform).toEqual({})
    })
  })

  describe('dialog close paths', () => {
    it('croppingImage returns the cropped file', () => {
      const comp = build()
      const cropped = file('cropped.png')
      comp.cropimageFile = cropped

      comp.croppingImage()

      expect(dialogRef.close).toHaveBeenCalledWith(cropped)
    })

    it('close dismisses without a result', () => {
      const comp = build()
      comp.close()
      expect(dialogRef.close).toHaveBeenCalledWith()
    })
  })
})
