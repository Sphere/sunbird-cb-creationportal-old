import { of, throwError } from 'rxjs'
import { UploadAudioComponent } from './upload-audio.component'

describe('UploadAudioComponent', () => {
  let snackBar: any
  let uploadService: any
  let loaderService: any
  let dialogRef: any
  let data: any

  const build = () => new UploadAudioComponent(snackBar, uploadService, loaderService, data, dialogRef)

  beforeEach(() => {
    snackBar = { openFromComponent: jest.fn() }
    uploadService = { upload: jest.fn().mockReturnValue(of({ result: { artifactUrl: 'https://host.example/path/audio.mp3' } })) }
    loaderService = { changeLoad: { next: jest.fn() } }
    dialogRef = { close: jest.fn() }
    data = {
      id: 'do_1',
      srclang: 'en',
      languages: [{ srclang: 'en', label: 'English' }],
    }
  })

  it('should be created and seed the srclang from the dialog data', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.uploadedAudio.srclang).toBe('en')
  })

  it('ngOnInit copies the languages list from the dialog data', () => {
    const c = build()
    c.ngOnInit()
    expect(c.allLanguages).toEqual([{ srclang: 'en', label: 'English' }])
  })

  describe('onDrop', () => {
    it('rejects a non-mp3 file with a notification', () => {
      const c = build()
      const uploadSpy = jest.spyOn(c, 'upload').mockImplementation(() => undefined)
      c.onDrop({ name: 'notes.txt' })
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(uploadSpy).not.toHaveBeenCalled()
    })

    it('accepts an mp3 file and triggers the upload', () => {
      const c = build()
      const uploadSpy = jest.spyOn(c, 'upload').mockImplementation(() => undefined)
      const file = { name: 'my song.mp3' }
      c.onDrop(file)
      expect(c.file).toBe(file)
      expect(uploadSpy).toHaveBeenCalled()
    })
  })

  describe('upload', () => {
    it('uploads, notifies success, closes the dialog with the audio object', () => {
      const c = build()
      c.ngOnInit()
      c.file = new File(['data'], 'audio.mp3')
      c.upload()
      expect(uploadService.upload).toHaveBeenCalledWith(expect.any(FormData), expect.objectContaining({ contentId: 'do_1' }))
      expect(c.isUploading).toBe(false)
      expect(loaderService.changeLoad.next).toHaveBeenCalledWith(false)
      expect(c.uploadedAudio.title).toBe('audio.mp3')
      expect(c.uploadedAudio.label).toBe('English')
      expect(c.uploadedAudio.URL).toBe('/path/audio.mp3')
      expect(dialogRef.close).toHaveBeenCalledWith(c.uploadedAudio)
    })

    it('does nothing on the success handler when the response has no result', () => {
      uploadService.upload.mockReturnValue(of({}))
      const c = build()
      c.ngOnInit()
      c.file = new File(['data'], 'audio.mp3')
      c.upload()
      expect(dialogRef.close).not.toHaveBeenCalled()
    })

    it('notifies a failure and clears the loading flags', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('boom')))
      const c = build()
      c.ngOnInit()
      c.file = new File(['data'], 'audio.mp3')
      c.upload()
      expect(c.isUploading).toBe(false)
      expect(loaderService.changeLoad.next).toHaveBeenLastCalledWith(false)
      expect(snackBar.openFromComponent).toHaveBeenCalled()
      expect(dialogRef.close).not.toHaveBeenCalled()
    })
  })
})
