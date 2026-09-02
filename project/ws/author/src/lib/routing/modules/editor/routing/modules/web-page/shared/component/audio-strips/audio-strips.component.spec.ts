import { of, Subject } from 'rxjs'

import { AudioStripsComponent } from './audio-strips.component'

/**
 * Direct-instantiation unit tests for AudioStripsComponent.
 * Constructed with a mocked MatDialog; exercises the data setter regex mapping,
 * the download-url replacer, audio playback toggling and delete confirmation.
 */
describe('AudioStripsComponent', () => {
  let dialog: any

  function build(): AudioStripsComponent {
    dialog = { open: jest.fn(() => ({ afterClosed: () => of(true) })) }
    return new AudioStripsComponent(dialog)
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs', () => {
    expect(build()).toBeTruthy()
  })

  it('data setter rewrites content-store URLs when doRegex is true', () => {
    const c = build()
    c.doRegex = true
    c.data = [{ title: 't', label: 'l', srclang: 'en', URL: 'https://host/content-store/audio/file.mp3"' } as any]
    expect(c.audioData.length).toBe(1)
    // the content-store path segment must be encoded via the replacer
    expect(JSON.stringify(c.audioData)).toContain('content-store')
  })

  it('data setter yields an empty array when doRegex is false', () => {
    const c = build()
    c.doRegex = false
    c.data = [{ title: 't', label: 'l', srclang: 'en', URL: 'x' } as any]
    expect(c.audioData).toEqual([])
  })

  it('regexDownloadReplace builds an encoded authoring content url', () => {
    const c = build()
    const out = c.regexDownloadReplace('', '/content-store/a b/f.mp3', '"')
    expect(out).toContain(encodeURIComponent('/content-store/a b/f.mp3'))
    expect(out.endsWith('"')).toBe(true)
  })

  it('regexDownloadReplace defaults the first argument', () => {
    const c = build()
    expect(() => c.regexDownloadReplace(undefined as any, '/content-store/x', '"')).not.toThrow()
  })

  it('ngOnInit does not throw', () => {
    const c = build()
    expect(() => c.ngOnInit()).not.toThrow()
  })

  it('audioControl plays a stopped audio element and wires the ended listener', () => {
    const c = build()
    const endedSubject = new Subject<Event>()
    const audioEl: any = {
      play: jest.fn(),
      pause: jest.fn(),
      currentTime: 5,
      addEventListener: jest.fn((_evt: string, handler: any) => {
        endedSubject.subscribe(e => handler(e))
      }),
      removeEventListener: jest.fn(),
    }
    jest.spyOn(document, 'getElementById').mockReturnValue(audioEl)
    c.isAudioPlaying = false
    c.audioControl('audio-1')
    expect(audioEl.play).toHaveBeenCalled()
    expect(c.isAudioPlaying).toBe(true)
    // firing 'ended' resets the playing flag
    endedSubject.next({} as Event)
    expect(c.isAudioPlaying).toBe(false)
  })

  it('audioControl pauses and resets a playing audio element', () => {
    const c = build()
    const audioEl: any = {
      play: jest.fn(),
      pause: jest.fn(),
      currentTime: 42,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }
    jest.spyOn(document, 'getElementById').mockReturnValue(audioEl)
    c.isAudioPlaying = true
    c.audioControl('audio-1')
    expect(audioEl.pause).toHaveBeenCalled()
    expect(audioEl.currentTime).toBe(0)
    expect(c.isAudioPlaying).toBe(false)
  })

  it('deleteAudio removes the item and emits the index when confirmed', () => {
    const c = build()
    dialog.open = jest.fn(() => ({ afterClosed: () => of(true) }))
    c.audioData = [
      { title: 'a', label: 'a', srclang: 'en', URL: 'a' },
      { title: 'b', label: 'b', srclang: 'en', URL: 'b' },
    ]
    const emitSpy = jest.spyOn(c.audioDeleted, 'emit')
    c.deleteAudio(0)
    expect(c.audioData.length).toBe(1)
    expect(c.audioData[0].title).toBe('b')
    expect(emitSpy).toHaveBeenCalledWith(0)
  })

  it('deleteAudio does nothing when the dialog is dismissed', () => {
    const c = build()
    dialog.open = jest.fn(() => ({ afterClosed: () => of(false) }))
    c.audioData = [{ title: 'a', label: 'a', srclang: 'en', URL: 'a' }]
    const emitSpy = jest.spyOn(c.audioDeleted, 'emit')
    c.deleteAudio(0)
    expect(c.audioData.length).toBe(1)
    expect(emitSpy).not.toHaveBeenCalled()
  })

  it('ngOnDestroy unsubscribes the ended listener when present', () => {
    const c = build()
    const unsubscribe = jest.fn()
    c.listener = { unsubscribe } as any
    c.ngOnDestroy()
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('ngOnDestroy is a no-op when no listener exists', () => {
    const c = build()
    c.listener = undefined
    expect(() => c.ngOnDestroy()).not.toThrow()
  })
})
