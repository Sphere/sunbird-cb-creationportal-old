import { ErrorParserComponent } from './error-parser.component'

describe('ErrorParserComponent', () => {
  let dialogRef: any

  const makeComponent = (data: any) => new ErrorParserComponent(dialogRef, data)

  beforeEach(() => {
    dialogRef = { close: jest.fn() }
  })

  it('should be created', () => {
    const component = makeComponent({ errorFromBackendData: { errors: [] } })
    expect(component).toBeTruthy()
    expect(component.processErrorData).toBeNull()
    expect(component.errorMsg).toBeNull()
  })

  describe('ngOnInit', () => {
    it('sets errorMsg when the first error message is a string', () => {
      const component = makeComponent({
        errorFromBackendData: { errors: [{ code: 'E1', message: 'Something failed' }] },
      })
      component.ngOnInit()
      expect(component.errorMsg).toBe('Something failed')
      expect(component.processErrorData).toBeNull()
    })

    it('builds processErrorData from an object message using dataMapping names', () => {
      const dataMapping = new Map<string, any>([
        ['id-1', { name: 'Course One' }],
        ['id-2', { name: 'Course Two' }],
      ])
      const component = makeComponent({
        errorFromBackendData: {
          errors: [
            {
              code: 'E2',
              message: {
                'id-1': ['msg a', 'msg b'],
                'id-2': ['msg c'],
              },
            },
          ],
        },
        dataMapping,
      })
      component.ngOnInit()
      expect(component.errorMsg).toBeNull()
      expect(component.processErrorData).toEqual([
        { id: 'id-1', name: 'Course One', message: ['msg a', 'msg b'] },
        { id: 'id-2', name: 'Course Two', message: ['msg c'] },
      ])
    })

    it('falls back to an empty name when dataMapping is missing', () => {
      const component = makeComponent({
        errorFromBackendData: {
          errors: [{ code: 'E3', message: { 'id-x': ['boom'] } }],
        },
      })
      component.ngOnInit()
      expect(component.processErrorData).toEqual([{ id: 'id-x', name: '', message: ['boom'] }])
    })

    it('sets processErrorData to null when dataMapping has no matching entry (get returns undefined)', () => {
      const dataMapping = new Map<string, any>([['other', { name: 'Other' }]])
      const component = makeComponent({
        errorFromBackendData: {
          errors: [{ code: 'E4', message: { 'id-y': ['bang'] } }],
        },
        dataMapping,
      })
      component.ngOnInit()
      // get('id-y') is undefined, so contentData.name throws and the catch resets to null
      expect(component.processErrorData).toBeNull()
    })

    it('uses processErrorData from data when there is no backend error message', () => {
      const preProcessed = [{ id: 1, name: 'Pre', message: ['x'] }]
      const component = makeComponent({
        errorFromBackendData: { errors: [] },
        processErrorData: preProcessed,
      })
      component.ngOnInit()
      expect(component.processErrorData).toBe(preProcessed)
    })

    it('leaves state untouched when nothing matches', () => {
      const component = makeComponent({ errorFromBackendData: { errors: [] } })
      component.ngOnInit()
      expect(component.processErrorData).toBeNull()
      expect(component.errorMsg).toBeNull()
    })

    it('handles a missing errors array without throwing', () => {
      const component = makeComponent({ errorFromBackendData: {} })
      expect(() => component.ngOnInit()).not.toThrow()
      expect(component.processErrorData).toBeNull()
    })
  })

  describe('close', () => {
    it('closes the dialog with the provided id', () => {
      const component = makeComponent({ errorFromBackendData: { errors: [] } })
      component.close('abc')
      expect(dialogRef.close).toHaveBeenCalledWith('abc')
    })

    it('closes the dialog with undefined when no id is passed', () => {
      const component = makeComponent({ errorFromBackendData: { errors: [] } })
      component.close()
      expect(dialogRef.close).toHaveBeenCalledWith(undefined)
    })
  })
})
