import { ComponentFixture, TestBed } from '@angular/core/testing'
import { IAiReviewItem } from '../../models/ai-review.model'
import { AirIconComponent } from '../air-icon/air-icon.component'
import { AirEvidence, AirEvidenceComponent, clock, safeFileUrl } from './air-evidence.component'

const item = (over: Partial<IAiReviewItem> = {}): IAiReviewItem => ({
  contentId: 'do_v',
  name: 'Measuring blood pressure',
  kind: 'video',
  mimeType: 'video/mp4',
  artifactUrl: 'https://s3.ap-south-1.amazonaws.com/sunbirdcontent/v.mp4',
  status: 'done',
  stage: null,
  skipReason: null,
  error: null,
  result: null,
  ...over,
})

const evidence = (over: Partial<AirEvidence> = {}): AirEvidence => ({
  item: item(),
  code: 'C2',
  source: 'CBP / ADDIE checklist',
  title: 'Procedure is demonstrated correctly',
  verdict: 'no',
  notes: ['The cuff is placed over clothing at 0:12.'],
  fix: 'Re-shoot with the cuff on the bare upper arm.',
  at: '0:12',
  atSec: 12,
  ...over,
})

describe('AirEvidenceComponent', () => {
  it('accepts only plain https file URLs', () => {
    expect(safeFileUrl('https://cdn.example/v.mp4')).toBe('https://cdn.example/v.mp4')
    expect(safeFileUrl('http://cdn.example/v.mp4')).toBeNull()
    expect(safeFileUrl('javascript:alert(1)')).toBeNull()
    expect(safeFileUrl('data:text/html,hi')).toBeNull()
    expect(safeFileUrl('https://user:pass@cdn.example/v.mp4')).toBeNull()
    expect(safeFileUrl('not a url')).toBeNull()
    expect(safeFileUrl(null)).toBeNull()
  })

  it('formats seconds as a clock', () => {
    expect(clock(12)).toBe('0:12')
    expect(clock(125)).toBe('2:05')
    expect(clock(3725)).toBe('1:02:05')
  })

  describe('rendered', () => {
    let fixture: ComponentFixture<AirEvidenceComponent>
    let component: AirEvidenceComponent
    const el = () => fixture.nativeElement as HTMLElement

    beforeEach(() => {
      TestBed.configureTestingModule({ declarations: [AirEvidenceComponent, AirIconComponent] })
      fixture = TestBed.createComponent(AirEvidenceComponent)
      component = fixture.componentInstance
      fixture.detectChanges()
    })

    it('opens a video at the moment, with the finding and the fix', () => {
      component.open(evidence())
      fixture.detectChanges()
      const dialog = el().querySelector('dialog')!
      expect(dialog.hasAttribute('open')).toBe(true)
      expect(el().querySelector('video')!.getAttribute('src')).toBe('https://s3.ap-south-1.amazonaws.com/sunbirdcontent/v.mp4#t=12')
      const text = el().textContent || ''
      expect(text).toContain('Starts at 0:12')
      expect(text).toContain('Procedure is demonstrated correctly')
      expect(text).toContain('Not met')
      expect(text).toContain('Re-shoot with the cuff on the bare upper arm.')
      expect(text).toContain('Video · MP4')
      const link = el().querySelector('a[target="_blank"]')!
      expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    })

    it('says so when the video cannot be loaded, and starts fresh for the next issue', () => {
      component.open(evidence())
      fixture.detectChanges()
      el().querySelector('video')!.dispatchEvent(new Event('error'))
      fixture.detectChanges()
      expect(el().querySelector('video')).toBeNull()
      expect(el().textContent).toContain('The video could not be loaded. If this report has been open a while, its link may have expired')
      component.open(evidence())
      fixture.detectChanges()
      expect(el().querySelector('video')).toBeTruthy()
    })

    it('opens a PDF on the page', () => {
      component.open(
        evidence({
          item: item({ kind: 'pdf', mimeType: 'application/pdf', artifactUrl: 'https://cdn.example/n.pdf' }),
          atSec: undefined,
          at: 'page 3',
          page: 3,
        }),
      )
      fixture.detectChanges()
      expect(el().querySelector('video')).toBeNull()
      expect(el().querySelector('iframe')!.getAttribute('src')).toBe('https://cdn.example/n.pdf#page=3')
      expect(el().textContent).toContain('Opened at page 3')
    })

    it('shows a quiz question rather than a file', () => {
      component.open(
        evidence({
          item: item({ kind: 'quiz', mimeType: 'application/json', artifactUrl: null }),
          code: 'Q3',
          source: 'Question check',
          title: 'When should an ANM refer?',
          verdict: 'issue',
          notes: ['Two options are correct'],
          atSec: undefined,
          at: undefined,
        }),
      )
      fixture.detectChanges()
      expect(el().querySelector('.air-ev-question')!.textContent).toContain('When should an ANM refer?')
      expect(el().textContent).toContain('Needs attention')
      expect(el().querySelector('a[target="_blank"]')).toBeNull()
    })

    it('never frames or plays an unsafe URL', () => {
      component.open(evidence({ item: item({ artifactUrl: 'javascript:alert(1)' }) }))
      fixture.detectChanges()
      expect(el().querySelector('video')).toBeNull()
      expect(el().textContent).toContain('No preview for this resource.')
    })

    it('closes from the button and from the backdrop, dropping the media', () => {
      component.open(evidence())
      fixture.detectChanges()
      ;(el().querySelector('.air-ev-close') as HTMLButtonElement).click()
      fixture.detectChanges()
      expect(component.evidence()).toBeNull()
      expect(el().querySelector('video')).toBeNull()

      component.open(evidence())
      fixture.detectChanges()
      const dialog = el().querySelector('dialog')!
      dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      fixture.detectChanges()
      expect(component.evidence()).toBeNull()
    })

    it('holds the page still behind the open dialog, and lets it scroll again after', () => {
      component.open(evidence())
      expect(document.documentElement.style.overflow).toBe('hidden')
      component.close()
      expect(document.documentElement.style.overflow).toBe('')
    })

    it('labels every verdict', () => {
      expect(component.verdictLabel('partial')).toBe('Partly covered')
      expect(component.verdictTone('covered')).toBe('green')
      expect(component.verdictTone('na')).toBe('amber')
      expect(component.verdictTone('missing')).toBe('red')
    })
  })
})
