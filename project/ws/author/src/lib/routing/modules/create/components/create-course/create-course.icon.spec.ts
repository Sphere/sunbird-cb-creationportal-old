import { FormBuilder } from '@angular/forms'
import { EMPTY, of, Subject, throwError } from 'rxjs'

import { CreateCourseComponent } from './create-course.component'

/**
 * Wave 18 — `uploadAppIcon`'s guards and upload chain, `generateUrl` and the
 * competency display formatter of CreateCourseComponent.
 */
describe('CreateCourseComponent (app icon and helpers)', () => {
  let afterClosed: Subject<any>

  const build = (overrides: Partial<Record<string, any>> = {}) => {
    afterClosed = new Subject<any>()
    const fb = new FormBuilder()
    const mocks: any = {
      snackBar: { openFromComponent: jest.fn(), open: jest.fn() },
      svc: { createV2: jest.fn().mockReturnValue(of({ identifier: 'do_new' })), createForum: jest.fn().mockReturnValue(of({})) },
      router: { navigateByUrl: jest.fn() },
      loaderService: { changeLoad: { next: jest.fn() }, changeLoadState: jest.fn() },
      dialog: { open: jest.fn().mockReturnValue({ afterClosed: () => afterClosed.asObservable() }) },
      authInitService: { creationEntity: [], uploadData: jest.fn() },
      accessControlSvc: { locale: 'en', userId: 'u1', userName: 'User One' },
      editorService: { getAllEntities: jest.fn().mockReturnValue(of({ result: { entity: [] } })) },
      configSvc: {
        instanceConfig: { logos: { defaultContent: 'default.png' } },
        userProfile: { userId: 'u1', userName: 'User One' },
      },
      loader: { changeLoad: { next: jest.fn() } },
      http: { post: jest.fn().mockReturnValue(of({ result: { identifier: 'asset_1' } })) },
      route: { queryParams: of({}) },
      uploadService: { upload: jest.fn().mockReturnValue(of({ name: 'ok', artifactUrl: 'https://cdn/bucket/i.png' })) },
      storeService: { parentNode: [] },
      editorStore: {},
      resolverService: {},
      progressSvc: {},
      cdr: { detectChanges: jest.fn() },
      ...overrides,
    }
    const component = new CreateCourseComponent(
      fb,
      mocks.snackBar,
      mocks.svc,
      mocks.router,
      mocks.loaderService,
      mocks.dialog,
      mocks.authInitService,
      mocks.accessControlSvc,
      mocks.editorService,
      fb,
      mocks.configSvc,
      mocks.loader,
      mocks.http,
      mocks.route,
      mocks.uploadService,
      mocks.storeService,
      mocks.editorStore,
      mocks.resolverService,
      mocks.progressSvc,
      mocks.cdr,
    )
    ;(window as any).env = { azureBucket: 'bucket' }
    return { component, mocks }
  }

  const imageFile = (name = 'icon.png', size = 1000) => ({ name, size }) as File
  const cropped = () => new File(['bytes'], 'icon.png', { type: 'image/png' })

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    jest.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => jest.restoreAllMocks())

  // ------------------------------------------------------------ generateUrl --

  describe('generateUrl', () => {
    it('keeps a url that lives in the configured bucket', () => {
      const { component } = build()
      expect(component.generateUrl('https://cdn/bucket/x.png')).toBe('https://cdn/bucket/x.png')
    })

    it('drops a url from anywhere else', () => {
      const { component } = build()
      expect(component.generateUrl('https://elsewhere/x.png')).toBeUndefined()
    })
  })

  // ----------------------------------------------------- displayCompetency --

  describe('displayCompetency', () => {
    it('shows nothing for an empty selection', () => {
      const { component } = build()
      expect(component.displayCompetency(null)).toBe('')
    })

    it('passes a plain string straight through', () => {
      const { component } = build()
      expect(component.displayCompetency('Immunisation')).toBe('Immunisation')
    })

    it('prefixes the code when the competency has one', () => {
      const { component } = build()
      expect(component.displayCompetency({ code: 'C2', name: 'Immunisation' })).toBe('C2 - Immunisation')
    })

    it('falls back to the bare name with no code', () => {
      const { component } = build()
      expect(component.displayCompetency({ name: 'Immunisation' })).toBe('Immunisation')
    })

    it('shows nothing for a competency with neither', () => {
      const { component } = build()
      expect(component.displayCompetency({})).toBe('')
    })
  })

  // ------------------------------------------------------------ uploadAppIcon --

  describe('uploadAppIcon', () => {
    beforeEach(() => {
      // The upload writes straight into these two forms.
      jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    })

    const ready = (component: CreateCourseComponent) => {
      component.createCourseForm = new FormBuilder().group({ appIcon: [''] }) as any
      component.contentForm = new FormBuilder().group({ thumbnail: [''] }) as any
    }

    it('rejects a file that is not an image', () => {
      const { component, mocks } = build()
      ready(component)
      component.uploadAppIcon(imageFile('notes.txt'))
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })

    it('rejects an oversized image', () => {
      const { component, mocks } = build()
      ready(component)
      component.uploadAppIcon(imageFile('icon.png', 100 * 1024 * 1024))
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
      expect(mocks.dialog.open).not.toHaveBeenCalled()
    })

    it('uploads the cropped icon onto both forms', () => {
      const { component, mocks } = build()
      ready(component)
      component.uploadAppIcon(imageFile())
      expect(mocks.dialog.open).toHaveBeenCalled()
      afterClosed.next(cropped())
      expect(mocks.http.post).toHaveBeenCalled()
      expect(mocks.uploadService.upload).toHaveBeenCalled()
      expect(component.createCourseForm.controls.appIcon.value).toBe('https://cdn/bucket/i.png')
      expect(component.contentForm.controls.thumbnail.value).toBe('https://cdn/bucket/i.png')
      expect(component.canUpdate).toBe(true)
      expect(mocks.authInitService.uploadData).toHaveBeenCalledWith('thumbnail')
    })

    it('surfaces the message when the upload returns an error payload', () => {
      const { component, mocks } = build()
      mocks.uploadService.upload.mockReturnValue(of({ name: 'Error', message: 'too big' }))
      ready(component)
      component.uploadAppIcon(imageFile())
      afterClosed.next(cropped())
      expect(mocks.snackBar.open).toHaveBeenCalledWith('too big', undefined, { duration: 2000 })
    })

    it('notifies a failure when the upload rejects', () => {
      const { component, mocks } = build()
      mocks.uploadService.upload.mockReturnValue(throwError(() => new Error('network')))
      ready(component)
      component.uploadAppIcon(imageFile())
      afterClosed.next(cropped())
      expect(mocks.snackBar.openFromComponent).toHaveBeenCalled()
      expect(mocks.loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('strips unsafe characters out of the file name', () => {
      const { component, mocks } = build()
      ready(component)
      component.uploadAppIcon(imageFile('my icon (final).png'))
      expect(mocks.dialog.open).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ data: expect.objectContaining({ imageFileName: 'myiconfinal.png' }) }),
      )
    })
  })
})
