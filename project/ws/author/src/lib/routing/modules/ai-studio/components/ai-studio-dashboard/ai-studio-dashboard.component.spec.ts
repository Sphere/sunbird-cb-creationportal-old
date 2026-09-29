import { NO_ERRORS_SCHEMA } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router'
import { BehaviorSubject } from 'rxjs'

import { AIStudioDashboardComponent } from './ai-studio-dashboard.component'
import { AI_STUDIO_FEATURES } from '../../ai-studio.features'

/**
 * The component answers to two callers and must keep both working: the routed
 * URL and the [feature] input used inside my-content. These cover each, and
 * the case that used to render a blank page.
 */
describe('AIStudioDashboardComponent', () => {
  let component: AIStudioDashboardComponent
  let fixture: ComponentFixture<AIStudioDashboardComponent>
  let params: BehaviorSubject<ParamMap>

  /** Builds the component with whatever the route currently says. */
  const build = (feature?: string) => {
    params = new BehaviorSubject<ParamMap>(convertToParamMap(feature ? { feature } : {}))

    TestBed.configureTestingModule({
      declarations: [AIStudioDashboardComponent],
      providers: [
        {
          provide: ActivatedRoute,
          // snapshot is a getter, not a value captured at build time: the real
          // ActivatedRoute updates it as the URL changes, and a frozen one
          // reported "no feature" after a navigation — an artefact of the stub
          // rather than of the component.
          useValue: {
            paramMap: params.asObservable(),
            get snapshot() {
              return { paramMap: params.value }
            },
          },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })

    fixture = TestBed.createComponent(AIStudioDashboardComponent)
    component = fixture.componentInstance
  }

  afterEach(() => TestBed.resetTestingModule())

  it('should create', () => {
    build()
    fixture.detectChanges()
    expect(component).toBeTruthy()
  })

  it('shows the feature named in the route', () => {
    build('assessment')
    fixture.detectChanges()
    expect(component.active).toBe('assessment')
    expect(component.routed).toBe(true)
  })

  it('falls back to the input when there is no route parameter', () => {
    build()
    component.feature = 'reports'
    fixture.detectChanges()
    expect(component.active).toBe('reports')
    // No URL of its own, so no tabs: the sidebar is already on screen.
    expect(component.routed).toBe(false)
  })

  it('lets the route win over the input', () => {
    build('contentStudio')
    component.feature = 'reports'
    fixture.detectChanges()
    expect(component.active).toBe('contentStudio')
  })

  it('follows the route when the feature changes without rebuilding', () => {
    // Moving between features reuses the instance; a single read would leave
    // the first feature on screen.
    //
    // The assertion is on the component, not on a rendered frame: the emission
    // is pushed synchronously here, whereas the router emits between change
    // detection passes. Calling detectChanges() straight after the push checks
    // a state the router never produces.
    build('contentStudio')
    fixture.detectChanges()
    expect(component.active).toBe('contentStudio')

    params.next(convertToParamMap({ feature: 'reports' }))

    expect(component.active).toBe('reports')
    expect(component.routed).toBe(true)
  })

  it('offers every feature as a tab', () => {
    build('contentStudio')
    fixture.detectChanges()
    expect(component.features).toEqual(AI_STUDIO_FEATURES)
  })
})
