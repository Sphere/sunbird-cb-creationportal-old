import { NO_ERRORS_SCHEMA, Type } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute } from '@angular/router'
import { of } from 'rxjs'

import { ConfigurationsService } from '../../../../../../library/ws-widget/utils/src/public-api'
import { PlayerStateService } from '../player-state.service'
import { AudioComponent } from './audio/audio.component'
import { PdfComponent } from './pdf/pdf.component'
import { VideoComponent } from './video/video.component'

/**
 * A resource saved without a file used to reach the players anyway: the PDF
 * viewer showed an empty "Page 1 of 0" and video.js a format error. Each player
 * now shows the "File not uploaded" state instead.
 */
describe('players for a resource with no file', () => {
  function render<T>(component: Type<T>, input: string, data: object) {
    TestBed.configureTestingModule({
      declarations: [component],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { queryParams: {} } } },
        { provide: ConfigurationsService, useValue: { restrictedFeatures: new Set<string>() } },
        { provide: PlayerStateService, useValue: { playerState: of({}) } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
    const fixture = TestBed.createComponent(component)
    const instance = fixture.componentInstance as any
    instance[input] = data
    instance.isFetchingDataComplete = true
    if ('isNotEmbed' in instance) {
      instance.isNotEmbed = true
    }
    fixture.detectChanges()
    return fixture.nativeElement as HTMLElement
  }

  const cases: [string, Type<unknown>, string][] = [
    ['PDF', PdfComponent, 'pdfData'],
    ['video', VideoComponent, 'videoData'],
    ['audio', AudioComponent, 'audioData'],
  ]

  for (const [name, component, input] of cases) {
    it(`shows "File not uploaded" for a ${name} with no artifactUrl`, () => {
      const el = render(component, input, { identifier: 'do_1', artifactUrl: '' })
      expect(el.querySelector('viewer-no-file')).toBeTruthy()
    })

    it(`puts the ${name} player and Previous / Next in the shared player box`, () => {
      const el = render(component, input, { identifier: 'do_1', artifactUrl: '' })
      expect(el.querySelector('.player-layout > .player-box > .player-stage viewer-no-file')).toBeTruthy()
      expect(el.querySelector('.player-box > .player-nav-links app-player-navigation-widget')).toBeTruthy()
    })

    it(`plays a ${name} that has a file`, () => {
      const el = render(component, input, { identifier: 'do_1', artifactUrl: 'https://cdn/x/file' })
      expect(el.querySelector('viewer-no-file')).toBeNull()
    })
  }
})
