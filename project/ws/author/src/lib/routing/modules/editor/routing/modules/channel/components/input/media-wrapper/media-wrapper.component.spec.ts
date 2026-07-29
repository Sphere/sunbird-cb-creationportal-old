import { of } from 'rxjs'

import { MediaWrapperComponent } from './media-wrapper.component'

/**
 * Direct-instantiation unit tests for MediaWrapperComponent.
 * MatDialog is mocked; ngOnChanges branch selection and the confirm-dialog
 * driven onSelectionChange reset are exercised without rendering.
 */
describe('MediaWrapperComponent', () => {
  let matDialog: any

  function build(afterClosedValue: any = true): MediaWrapperComponent {
    matDialog = {
      open: jest.fn(() => ({ afterClosed: () => of(afterClosedValue) })),
    }
    return new MediaWrapperComponent(matDialog)
  }

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('constructs with default upload input types', () => {
    const c = build()
    expect(c).toBeTruthy()
    expect(c.inputType).toBe('upload')
    expect(c.backUpType).toBe('upload')
    expect(c.isVideo).toBe(false)
  })

  it('ngOnInit is a no-op', () => {
    const c = build()
    expect(() => c.ngOnInit()).not.toThrow()
  })

  it('ngOnChanges selects "external" when external iframeSrc is present', () => {
    const c = build()
    c.content = { externalData: { iframeSrc: 'http://x' } } as any
    c.ngOnChanges()
    expect(c.inputType).toBe('external')
    expect(c.backUpType).toBe('external')
  })

  it('ngOnChanges selects "id" when video identifier is present', () => {
    const c = build()
    c.content = { videoData: { identifier: 'vid-1' } } as any
    c.ngOnChanges()
    expect(c.inputType).toBe('id')
    expect(c.backUpType).toBe('id')
  })

  it('ngOnChanges falls back to "upload" when neither external nor id is present', () => {
    const c = build()
    c.content = { videoData: {} } as any
    c.ngOnChanges()
    expect(c.inputType).toBe('upload')
    expect(c.backUpType).toBe('upload')
  })

  it('onSelectionChange resets media data and emits when confirmed', () => {
    const c = build(true)
    c.content = {
      externalData: { title: 'old', iframeSrc: 'http://old' },
      videoData: { identifier: 'vid', url: 'http://vid' },
    } as any
    const emitSpy = jest.spyOn(c.data, 'emit')

    c.onSelectionChange()

    expect(matDialog.open).toHaveBeenCalled()
    expect(c.content.externalData).toEqual({ title: '', iframeSrc: '' })
    expect(c.content.videoData).toEqual({})
    expect(emitSpy).toHaveBeenCalledWith({ content: c.content, isValid: false })
  })

  it('onSelectionChange reverts to the backup type when the dialog is dismissed', () => {
    const c = build(false)
    c.backUpType = 'id'
    c.inputType = 'external'
    c.content = { videoData: { identifier: 'vid' } } as any
    const emitSpy = jest.spyOn(c.data, 'emit')

    c.onSelectionChange()

    expect(c.inputType).toBe('id')
    expect(c.backUpType).toBe('id')
    expect(emitSpy).not.toHaveBeenCalled()
  })
})
