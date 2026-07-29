import { of, throwError } from 'rxjs'
import { AudioVideoComponent } from './audio-video.component'
import { Notify } from '@ws/author/src/lib/constants/notificationMessage'
import { IMAGE_MAX_SIZE, VIDEO_MAX_SIZE } from '@ws/author/src/lib/constants/upload'

describe('AudioVideoComponent', () => {
  let component: AudioVideoComponent
  let snackBar: any
  let uploadService: any
  let authInitService: any
  let loader: any

  const subTitles = [
    { srclang: 'en', label: 'English' },
    { srclang: 'hi', label: 'Hindi' },
  ]

  const build = (content: any = {}, over: any = {}) => {
    const c = new AudioVideoComponent(snackBar, uploadService, authInitService, loader)
    c.content = { url: '', identifier: '', ...content }
    c.identifier = 'do_page1'
    c.inputType = 'upload'
    Object.assign(c, over)
    return c
  }

  const file = (name: string, type = '', size = 100) => {
    const f = new File(['x'], name, { type })
    Object.defineProperty(f, 'size', { value: size })
    return f
  }

  const lastNotify = () => {
    const calls = snackBar.openFromComponent.mock.calls
    return calls[calls.length - 1][1].data.type
  }

  beforeEach(() => {
    snackBar = { openFromComponent: jest.fn() }
    uploadService = {
      upload: jest.fn().mockReturnValue(of({ code: 200, artifactURL: 'https://host/a/b/clip.mp4' })),
    }
    authInitService = { ordinals: { subTitles } }
    loader = { changeLoad: { next: jest.fn() } }

    component = build()
  })

  it('should be created with an empty picker', () => {
    expect(component).toBeTruthy()
    expect(component.contentId).toEqual([])
    expect(component.pickerContentData.preselected.size).toBe(0)
    expect(component.filters.contentType).toEqual(['Resource'])
    expect(() => component.ngOnInit()).not.toThrow()
  })

  describe('initData', () => {
    it('preselects the linked content when picking by id', () => {
      const c = build({ identifier: 'do_video1' }, { inputType: 'id' })

      c.ngOnChanges()

      expect(c.contentId).toEqual(['do_video1'])
      expect(Array.from(c.pickerContentData.preselected)).toEqual(['do_video1'])
    })

    it('clears the picker when uploading instead', () => {
      component.ngOnChanges()

      expect(component.content.identifier).toBe('')
      expect(component.contentId).toEqual([])
      expect(component.pickerContentData.preselected.size).toBe(0)
    })

    it('leaves an uploaded clip that already carries an id alone', () => {
      const c = build({ identifier: 'do_video1' })

      c.ngOnChanges()

      expect(c.contentId).toEqual([])
      expect(c.content.identifier).toBe('do_video1')
    })

    it('seeds an empty subtitle list', () => {
      component.ngOnChanges()

      expect(component.content.subtitles).toEqual([])
      expect(component.subTitles).toEqual(subTitles)
    })

    it('keeps existing subtitles', () => {
      const c = build({ subtitles: [{ url: 'a.vtt', srclang: 'en', label: 'English' }] })

      c.ngOnChanges()

      expect(c.content.subtitles!.length).toBe(1)
    })

    it('reports the clip as invalid until it has a url', () => {
      const spy = jest.fn()
      component.data.subscribe(spy)

      component.ngOnChanges()

      expect(spy).toHaveBeenCalledWith({ content: component.content, isValid: false })
    })

    it('reports the clip as valid once it has a url', () => {
      const c = build({ url: 'clip.mp4' })
      const spy = jest.fn()
      c.data.subscribe(spy)

      c.ngOnChanges()

      expect(spy).toHaveBeenCalledWith({ content: c.content, isValid: true })
    })
  })

  describe('update', () => {
    it('writes the field and re-reports validity', () => {
      const spy = jest.fn()
      component.data.subscribe(spy)

      component.update('url', 'clip.mp4')

      expect(component.content.url).toBe('clip.mp4')
      expect(spy).toHaveBeenCalledWith({ content: component.content, isValid: true })
    })
  })

  describe('removeSubtitle', () => {
    it('drops the subtitle at the given index', () => {
      const c = build({
        subtitles: [
          { url: 'a.vtt', srclang: 'en', label: 'English' },
          { url: 'b.vtt', srclang: 'hi', label: 'Hindi' },
        ],
      })

      c.removeSubtitle(0)

      expect(c.content.subtitles!.map((s: any) => s.srclang)).toEqual(['hi'])
    })

    it('tolerates a clip with no subtitles', () => {
      expect(() => component.removeSubtitle(0)).not.toThrow()
    })
  })

  describe('upload', () => {
    beforeEach(() => component.ngOnChanges())

    it.each([
      ['video', 'clip.txt', ''],
      ['image', 'poster.mp4', 'video/mp4'],
      ['subtitle', 'subs.txt', ''],
      ['audio', 'track.wav', ''],
    ])('rejects the wrong file for a %s upload', (type, name, mime) => {
      component.upload(file(name, mime), type as any)

      expect(uploadService.upload).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.INVALID_FORMAT)
      expect(component.selectedSubtitle).toBeUndefined()
    })

    it('rejects an oversized image', () => {
      component.upload(file('poster.png', 'image/png', IMAGE_MAX_SIZE + 1), 'image')

      expect(uploadService.upload).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.SIZE_ERROR)
    })

    it.each(['clip.mp4', 'track.mp3'])('rejects an oversized %s', name => {
      const type = name.endsWith('.mp4') ? 'video' : 'audio'

      component.upload(file(name, '', VIDEO_MAX_SIZE + 1), type as any)

      expect(uploadService.upload).not.toHaveBeenCalled()
      expect(lastNotify()).toBe(Notify.SIZE_ERROR)
    })

    it('strips unsafe characters out of the file name', () => {
      component.upload(file('my clip!.mp4'), 'video')

      const formData = uploadService.upload.mock.calls[0][0]
      expect((formData.get('content') as File).name).toBe('myclip.mp4')
    })

    it('stores an uploaded video as the clip url', () => {
      component.upload(file('clip.mp4'), 'video')

      expect(component.content.url).toContain(encodeURIComponent('/b/clip.mp4'))
      expect(lastNotify()).toBe(Notify.UPLOAD_SUCCESS)
      expect(loader.changeLoad.next).toHaveBeenCalledWith(true)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })

    it('stores an uploaded audio track as the clip url', () => {
      component.upload(file('track.mp3'), 'audio')

      expect(component.content.url).toBeTruthy()
    })

    it('stores an uploaded image as the poster', () => {
      component.upload(file('poster.png', 'image/png'), 'image')

      expect(component.content.posterImage).toBeTruthy()
      expect(component.content.url).toBe('')
    })

    it('adds an uploaded subtitle in the selected language', () => {
      component.selectedSubtitle = { srclang: 'en', label: 'English' }

      component.upload(file('subs.vtt'), 'subtitle')

      expect(component.content.subtitles).toEqual([{ url: expect.any(String), srclang: 'en', label: 'English' }])
      expect(component.selectedSubtitle).toBeUndefined()
    })

    it.each(['authArtifactUrl', 'authArtifactURL'])('accepts an upload response carrying %s', field => {
      uploadService.upload.mockReturnValue(of({ code: 200, [field]: 'https://host/a/b/clip.mp4' }))

      component.upload(file('clip.mp4'), 'video')

      expect(component.content.url).toContain(encodeURIComponent('/b/clip.mp4'))
    })

    it('handles an upload response with no artifact at all', () => {
      uploadService.upload.mockReturnValue(of({ code: 200 }))

      component.upload(file('clip.mp4'), 'video')

      expect(component.content.url).toBeTruthy()
      expect(lastNotify()).toBe(Notify.UPLOAD_SUCCESS)
    })

    it('leaves the clip alone when the upload returns no code', () => {
      uploadService.upload.mockReturnValue(of({ artifactURL: 'https://host/a/b/clip.mp4' }))

      component.upload(file('clip.mp4'), 'video')

      expect(component.content.url).toBe('')
    })

    it('reports an upload failure', () => {
      uploadService.upload.mockReturnValue(throwError(() => new Error('boom')))

      component.upload(file('clip.mp4'), 'video')

      expect(lastNotify()).toBe(Notify.UPLOAD_FAIL)
      expect(loader.changeLoad.next).toHaveBeenLastCalledWith(false)
    })
  })

  describe('onContentSelection', () => {
    it('links the ticked content', () => {
      component.onContentSelection({ content: { identifier: 'do_video1' }, checked: true } as any)

      expect(component.content.identifier).toBe('do_video1')
      expect(component.contentId).toEqual(['do_video1'])
      expect(Array.from(component.pickerContentData.preselected)).toEqual(['do_video1'])
    })

    it('falls back to the first remaining id when content is unticked', () => {
      component.onContentSelection({ content: { identifier: 'do_video1' }, checked: false } as any, ['do_video2'])

      expect(component.content.identifier).toBe('do_video2')
      expect(component.contentId).toEqual(['do_video2'])
    })

    it('clears the link when nothing is left selected', () => {
      component.onContentSelection(undefined, [])

      expect(component.content.identifier).toBe('')
      expect(component.contentId).toEqual([])
      expect(component.pickerContentData.preselected.size).toBe(0)
    })

    it('clears the link when called with nothing at all', () => {
      component.onContentSelection()

      expect(component.content.identifier).toBe('')
      expect(component.contentId).toEqual([])
    })

    it('handles ticked content that carries no identifier', () => {
      component.onContentSelection({ content: {}, checked: true } as any)

      expect(component.content.identifier).toBe('')
      expect(component.contentId).toEqual([])
    })
  })
})
