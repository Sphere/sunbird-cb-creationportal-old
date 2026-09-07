import { SimpleChange, SimpleChanges } from '@angular/core'
import { LearningCardComponent } from './learning-card.component'

describe('LearningCardComponent', () => {
  let component: LearningCardComponent
  let events: any
  let configSvc: any
  let domSanitizer: any

  const build = () => new LearningCardComponent(events, configSvc, domSanitizer)

  beforeEach(() => {
    events = { raiseInteractTelemetry: jest.fn() }
    configSvc = {
      instanceConfig: { logos: { defaultContent: 'default.png' } },
    }
    domSanitizer = {
      bypassSecurityTrustHtml: jest.fn((html: string) => `safe:${html}`),
    }
    component = build()
  })

  it('should be created with default field values', () => {
    expect(component).toBeTruthy()
    expect(component.displayType).toBe('basic')
    expect(component.contentProgress).toBe(0)
    expect(component.isExpanded).toBe(false)
    expect(component.defaultThumbnail).toBe('')
    expect(component.description).toBe('')
  })

  describe('ngOnInit', () => {
    it('sets the default thumbnail from the instance config', () => {
      component.ngOnInit()
      expect(component.defaultThumbnail).toBe('default.png')
    })

    it('leaves the thumbnail empty when there is no instance config', () => {
      configSvc.instanceConfig = null
      const c = build()
      c.ngOnInit()
      expect(c.defaultThumbnail).toBe('')
    })
  })

  describe('ngOnChanges', () => {
    it('strips <br> tags and sanitizes the description when content changes', () => {
      component.content = { description: 'hello<br>world' } as any
      const changes: SimpleChanges = {
        content: new SimpleChange(null, component.content, true),
      }
      component.ngOnChanges(changes)
      expect(component.content.description).toBe('helloworld')
      expect(domSanitizer.bypassSecurityTrustHtml).toHaveBeenCalledWith('helloworld')
      expect(component.description).toBe('safe:helloworld')
    })

    it('does nothing for the content prop when there is no description', () => {
      component.content = {} as any
      const changes: SimpleChanges = {
        content: new SimpleChange(null, component.content, true),
      }
      component.ngOnChanges(changes)
      expect(domSanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled()
      expect(component.description).toBe('')
    })

    it('ignores non-content property changes', () => {
      component.content = { description: 'x<br>y' } as any
      const changes: SimpleChanges = {
        displayType: new SimpleChange('basic', 'advanced', false),
      }
      component.ngOnChanges(changes)
      expect(domSanitizer.bypassSecurityTrustHtml).not.toHaveBeenCalled()
    })
  })

  describe('raiseTelemetry', () => {
    it('raises an interact telemetry event with the content identifier', () => {
      component.content = { identifier: 'id-1' } as any
      component.raiseTelemetry()
      expect(events.raiseInteractTelemetry).toHaveBeenCalledWith('click', 'cardSearch', {
        contentId: 'id-1',
      })
    })
  })
})
