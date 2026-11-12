import { ComponentFixture, TestBed } from '@angular/core/testing'
import { IAiReviewItem } from '../../models/ai-review.model'
import { AirIconComponent } from '../air-icon/air-icon.component'
import {
  AirEvidence,
  AirEvidenceComponent,
  clock,
  isPackagePreviewUrl,
  packagePageAt,
  packageVideoAt,
  questionsNamed,
  safeFileUrl,
} from './air-evidence.component'

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

  it("trusts only the review API's own package preview path", () => {
    expect(isPackagePreviewUrl('/apis/public/v8/courseReview/package/r1/do_h/1790000000.sig/index.html')).toBe(true)
    expect(isPackagePreviewUrl('https://evil.example/apis/public/v8/courseReview/package/r/c/t/index.html')).toBe(false)
    expect(isPackagePreviewUrl('/apis/public/v8/courseReview/package/r/c/t/../../reviews/x')).toBe(false)
    expect(isPackagePreviewUrl('/apis/protected/v8/courseReview/v1/reviews/r1')).toBe(false)
    expect(isPackagePreviewUrl('javascript:alert(1)')).toBe(false)
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

    it('shows an HTML package in a sandboxed frame, with a way to open it in a tab', () => {
      const url = '/apis/public/v8/courseReview/package/r1/do_h/1790000000.sig/index.html'
      component.open(
        evidence({
          item: item({
            kind: 'html',
            mimeType: 'application/vnd.ekstep.html-archive',
            artifactUrl: 'https://cdn.example/p.zip',
            packageUrl: url,
          }),
          atSec: undefined,
          at: undefined,
        }),
      )
      fixture.detectChanges()
      const frame = el().querySelector('iframe.air-ev-html')!
      expect(frame.getAttribute('src')).toBe(url)
      // Scripts run, but never with this site's origin (no allow-same-origin).
      expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups allow-modals')
      expect(el().textContent).not.toContain('No preview for this resource.')
      const tab = el().querySelector('a[target="_blank"].air-link-btn') as HTMLAnchorElement
      expect(tab.getAttribute('href')).toBe(url)
      expect(tab.getAttribute('rel')).toBe('noopener noreferrer')
    })

    it("opens the package's own video the finding names, at its moment, with the page a click away", () => {
      const url = '/apis/public/v8/courseReview/package/r1/do_h/1790000000.sig/index.html'
      const pkg = {
        files: 9,
        pages: 1,
        images: 0,
        stills: 12,
        questions: 0,
        reportsProgress: true,
        savesState: false,
        videos: [
          { path: 'assets/video/s1.mp4', durationSec: 68 },
          { path: 'assets/video/s2.mp4', durationSec: 149 },
        ],
      }
      component.open(
        evidence({
          item: item({
            kind: 'html',
            mimeType: 'application/vnd.ekstep.html-archive',
            packageUrl: url,
            result: { htmlPackage: pkg } as never,
          }),
          notes: ['Concrete examples are supplied for each task (s2 at 1:19).'],
          at: '1:19',
          atSec: 79,
        }),
      )
      fixture.detectChanges()
      expect(el().querySelector('video')!.getAttribute('src')).toBe(
        '/apis/public/v8/courseReview/package/r1/do_h/1790000000.sig/assets/video/s2.mp4#t=79',
      )
      expect(el().textContent).toContain('Starts at 1:19')
      expect(el().textContent).toContain('assets/video/s2.mp4')
      const toPage = Array.from(el().querySelectorAll('button')).find(b => b.textContent!.includes('Show the package page instead'))!
      toPage.click()
      fixture.detectChanges()
      expect(el().querySelector('video')).toBeNull()
      expect(el().querySelector('iframe.air-ev-html')!.getAttribute('src')).toBe(url)
      expect(el().textContent).not.toContain('Starts at 1:19')
      const back = Array.from(el().querySelectorAll('button')).find(b => b.textContent!.includes('Back to the video at 1:19'))!
      back.click()
      fixture.detectChanges()
      expect(el().querySelector('video')).toBeTruthy()
    })

    it('picks a package video only when the finding names one, or the package has just one', () => {
      const pkgItem = (videos: { path: string; durationSec: number | null }[]) =>
        item({
          kind: 'html',
          result: {
            htmlPackage: { files: 1, pages: 1, images: 0, stills: 0, questions: 0, reportsProgress: false, savesState: false, videos },
          } as never,
        })
      const two = pkgItem([
        { path: 'v/a.mp4', durationSec: 60 },
        { path: 'v/b.mp4', durationSec: 60 },
      ])
      expect(packageVideoAt({ item: two, notes: ['Shown in b.mp4 at 0:30'], atSec: 30 })).toEqual({ path: 'v/b.mp4', atSec: 30 })
      expect(packageVideoAt({ item: two, notes: ['Shown at 0:30'], atSec: 30 })).toBeNull()
      expect(packageVideoAt({ item: two, notes: ['In a and b at 0:30'], atSec: 30 })).toBeNull()
      // "a" alone is too short to be a name: "a" in a sentence is not the video a.mp4.
      expect(packageVideoAt({ item: two, notes: ['Shown in v/a.mp4 at 0:30'], atSec: 30 })).toEqual({ path: 'v/a.mp4', atSec: 30 })
      const one = pkgItem([{ path: 'media/intro.mp4', durationSec: 6 }])
      expect(packageVideoAt({ item: one, notes: ['At 0:04 the title shows'], atSec: 4 })).toEqual({ path: 'media/intro.mp4', atSec: 4 })
      expect(packageVideoAt({ item: one, notes: ['At 1:30'], atSec: 90 })).toBeNull()
      expect(packageVideoAt({ item: one, notes: ['No moment'] })).toBeNull()
    })

    it('with several videos named, opens the one named just before the moment', () => {
      const videos = [
        { path: 'assets/video/s1.mp4', durationSec: 68 },
        { path: 'assets/video/s2.mp4', durationSec: 149 },
        { path: 'assets/video/s3.mp4', durationSec: 172 },
      ]
      const html = item({
        kind: 'html',
        result: {
          htmlPackage: { files: 9, pages: 1, images: 0, stills: 0, questions: 0, reportsProgress: true, savesState: false, videos },
        } as never,
      })
      const notes = ['Video s2 at 0:25 shows it, and video s3 at 1:32 repeats it.']
      expect(packageVideoAt({ item: html, notes, at: '1:32', atSec: 92 })).toEqual({ path: 'assets/video/s3.mp4', atSec: 92 })
      expect(packageVideoAt({ item: html, notes, at: '0:25', atSec: 25 })).toEqual({ path: 'assets/video/s2.mp4', atSec: 25 })
      // The "at" naming the video wins (newer reviews write it so).
      expect(packageVideoAt({ item: html, notes, at: 'assets/video/s1.mp4 at 0:40', atSec: 40 })).toEqual({
        path: 'assets/video/s1.mp4',
        atSec: 40,
      })
    })

    it('opens the package page a finding names, when the package lists its pages', () => {
      const url = '/apis/public/v8/courseReview/package/r1/do_h/1790000000.sig/index.html'
      const pkg = {
        files: 3,
        pages: 2,
        pagePaths: ['index.html', 'lessons/2.html'],
        images: 0,
        stills: 0,
        questions: 0,
        reportsProgress: true,
        savesState: false,
        videos: [],
      }
      component.open(
        evidence({
          item: item({ kind: 'html', packageUrl: url, result: { htmlPackage: pkg } as never }),
          notes: ['The quiz on lessons/2.html gives no feedback.'],
          at: undefined,
          atSec: undefined,
        }),
      )
      fixture.detectChanges()
      expect(el().querySelector('iframe.air-ev-html')!.getAttribute('src')).toBe(
        '/apis/public/v8/courseReview/package/r1/do_h/1790000000.sig/lessons/2.html',
      )
      expect(packagePageAt({ item: item({ result: { htmlPackage: pkg } as never }), notes: ['Nothing named'] })).toBeNull()
      // A package's footer button downloads its zip, and says so.
      expect(el().textContent).toContain('Download the package (.zip)')
    })

    it('shows the questions a quiz finding names, and says when it is about the whole quiz', () => {
      const quiz = item({
        kind: 'quiz',
        mimeType: 'application/json',
        result: { questions: [{ n: 9, question: 'What is the dose of MgSO4?', verdict: 'issue', issues: [] }] } as never,
      })
      component.open(evidence({ item: quiz, code: 'C2', notes: ['Q9 misstates the dose.'], at: undefined, atSec: undefined, page: 1 }))
      fixture.detectChanges()
      expect(el().querySelector('.air-ev-question')!.textContent).toContain('What is the dose of MgSO4?')
      expect(el().textContent).toContain('Q9')
      // A page of a quiz file is not a place to open.
      expect(el().textContent).not.toContain('Opened at page 1')
      component.open(evidence({ item: quiz, code: 'C5', notes: ['The quiz has no feedback.'], at: undefined, atSec: undefined }))
      fixture.detectChanges()
      expect(el().textContent).toContain('This finding is about the quiz as a whole')
      expect(questionsNamed('Q3 and question 7, and Q3 again')).toEqual([3, 7])
    })

    it("shows a package's own question check as the question, not the package", () => {
      const url = '/apis/public/v8/courseReview/package/r1/do_h/1790000000.sig/index.html'
      component.open(
        evidence({
          item: item({ kind: 'html', packageUrl: url }),
          code: 'Q4',
          title: 'Which sign is a danger sign?',
          verdict: 'issue',
          atSec: undefined,
          at: undefined,
        }),
      )
      fixture.detectChanges()
      expect(el().querySelector('iframe')).toBeNull()
      expect(el().querySelector('.air-ev-question')!.textContent).toContain('Which sign is a danger sign?')
    })

    it('plays an audio resource at its moment', () => {
      component.open(
        evidence({ item: item({ kind: 'audio', mimeType: 'audio/mpeg', artifactUrl: 'https://cdn.example/a.mp3' }), atSec: 42 }),
      )
      fixture.detectChanges()
      expect(el().querySelector('video')!.getAttribute('src')).toBe('https://cdn.example/a.mp3#t=42')
    })

    it('frames no HTML package without its preview link, or with a foreign one', () => {
      component.open(evidence({ item: item({ kind: 'html', artifactUrl: 'https://cdn.example/p.zip', packageUrl: null }) }))
      fixture.detectChanges()
      expect(el().querySelector('iframe')).toBeNull()
      expect(el().textContent).toContain('No preview for this resource.')
      component.open(evidence({ item: item({ kind: 'html', packageUrl: 'https://evil.example/x.html' }) }))
      fixture.detectChanges()
      expect(el().querySelector('iframe')).toBeNull()
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
