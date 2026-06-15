import { of } from 'rxjs'

import { NewImageCropComponent } from './new-image-crop.component'

// This component pulls in ngx-image-cropper and a heavy template; rendering it via
// TestBed is brittle under jsdom. We exercise the constructor/ngOnInit logic directly
// with mocked collaborators, which is the part that carries real behaviour.
describe('NewImageCropComponent', () => {
  const dialogRef = { close: jest.fn(), updateSize: jest.fn() }
  const valueSvc = { isXSmall$: of(false) }
  const snackBar = { open: jest.fn() }
  const configSvc = { instanceConfig: { logos: {} } }

  const build = (data: any) => new NewImageCropComponent(dialogRef as any, configSvc as any, snackBar as any, valueSvc as any, data)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates and reads round-crop flag and file name from the dialog data', () => {
    const component = build({ isRoundCrop: true, imageFileName: 'pic.png' })
    expect(component).toBeTruthy()
    expect(component.isRoundCrop).toBe(true)
    expect(component.fileName).toBe('pic.png')
  })

  it('applies output height/width only for non-round crops', () => {
    const component = build({ isRoundCrop: false, height: 120, width: 240 })
    expect(component.opHeight).toBe(120)
    expect(component.opWidth).toBe(240)
  })

  const imageFile = new File(['x'], 'p.png', { type: 'image/png' })

  it('updates the dialog size based on the small-screen state on init', () => {
    const component = build({ isRoundCrop: false, imageFile })
    component.ngOnInit()
    expect(dialogRef.updateSize).toHaveBeenCalledWith('70%')
  })

  it('uses the wide size when the screen is small', () => {
    const component = new NewImageCropComponent(dialogRef as any, configSvc as any, snackBar as any, { isXSmall$: of(true) } as any, {
      isRoundCrop: false,
      imageFile,
    })
    component.ngOnInit()
    expect(dialogRef.updateSize).toHaveBeenCalledWith('90%')
  })
})
