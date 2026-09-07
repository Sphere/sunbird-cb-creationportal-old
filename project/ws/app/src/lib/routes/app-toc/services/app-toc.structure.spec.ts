import { provideHttpClient } from '@angular/common/http'
import { provideHttpClientTesting } from '@angular/common/http/testing'
import { TestBed } from '@angular/core/testing'

import { ConfigurationsService } from '@ws-widget/utils'
import { NsContent } from '@ws-widget/collection/src/lib/_services/widget-content.model'

import { AppTocService } from './app-toc.service'

/**
 * Covers the getTocStructure mime-type mapping and the filterToc / filterUnitContent
 * category branches the base app-toc.service.spec.ts only samples.
 */
describe('AppTocService (toc structure + filters)', () => {
  let service: AppTocService

  const emptyStructure = (): any => ({
    assessment: 0,
    course: 0,
    handsOn: 0,
    interactiveVideo: 0,
    learningModule: 0,
    other: 0,
    pdf: 0,
    podcast: 0,
    quiz: 0,
    video: 0,
    webModule: 0,
    webPage: 0,
    youtube: 0,
  })

  const resource = (mimeType: any, over: any = {}): any => ({
    contentType: 'Resource',
    mimeType,
    children: [],
    ...over,
  })

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppTocService, ConfigurationsService, provideHttpClient(), provideHttpClientTesting()],
    })
    service = TestBed.inject(AppTocService)
  })

  describe('getTocStructure mime mapping', () => {
    const cases: Array<[string, any, string]> = [
      ['hands-on', NsContent.EMimeTypes.HANDS_ON, 'handsOn'],
      ['mp3', NsContent.EMimeTypes.MP3, 'podcast'],
      ['mp4', NsContent.EMimeTypes.MP4, 'video'],
      ['m3u8', NsContent.EMimeTypes.M3U8, 'video'],
      ['interaction', NsContent.EMimeTypes.INTERACTION, 'interactiveVideo'],
      ['pdf', NsContent.EMimeTypes.PDF, 'pdf'],
      ['html', NsContent.EMimeTypes.HTML, 'webPage'],
      ['web-module', NsContent.EMimeTypes.WEB_MODULE, 'webModule'],
      ['youtube', NsContent.EMimeTypes.YOUTUBE, 'youtube'],
    ]

    it.each(cases)('counts a %s resource as %s', (_label, mimeType, bucket) => {
      const out: any = service.getTocStructure(resource(mimeType), emptyStructure())
      expect(out[bucket]).toBe(1)
    })

    it('counts an unrecognised mime type as other', () => {
      const out: any = service.getTocStructure(resource('application/unknown'), emptyStructure())
      expect(out.other).toBe(1)
    })

    it('separates an assessment from a plain quiz', () => {
      const asAssessment: any = service.getTocStructure(
        resource(NsContent.EMimeTypes.QUIZ, { resourceType: 'Assessment' }),
        emptyStructure(),
      )
      expect(asAssessment.assessment).toBe(1)
      expect(asAssessment.quiz).toBe(0)

      const asQuiz: any = service.getTocStructure(resource(NsContent.EMimeTypes.QUIZ, { resourceType: 'Quiz' }), emptyStructure())
      expect(asQuiz.quiz).toBe(1)
      expect(asQuiz.assessment).toBe(0)
    })

    it('counts a Knowledge Artifact through the resource path', () => {
      const out: any = service.getTocStructure(
        { contentType: 'Knowledge Artifact', mimeType: NsContent.EMimeTypes.PDF } as any,
        emptyStructure(),
      )
      expect(out.pdf).toBe(1)
    })

    it('counts a Collection as a learning module', () => {
      const out: any = service.getTocStructure({ contentType: 'Collection', children: [] } as any, emptyStructure())
      expect(out.learningModule).toBe(1)
    })

    it('recurses through a course into nested resources', () => {
      const out: any = service.getTocStructure(
        {
          contentType: 'Course',
          children: [
            {
              contentType: 'Collection',
              children: [resource(NsContent.EMimeTypes.PDF), resource(NsContent.EMimeTypes.MP4)],
            },
          ],
        } as any,
        emptyStructure(),
      )
      expect(out.course).toBe(1)
      expect(out.learningModule).toBe(1)
      expect(out.pdf).toBe(1)
      expect(out.video).toBe(1)
    })

    it('tolerates a collection with no children', () => {
      const out: any = service.getTocStructure({ contentType: 'Course' } as any, emptyStructure())
      expect(out.course).toBe(1)
    })

    it('returns the structure untouched for null content', () => {
      const structure = emptyStructure()
      expect(service.getTocStructure(null as any, structure)).toEqual(structure)
    })
  })

  describe('filterUnitContent', () => {
    it('accepts everything under the ALL category', () => {
      expect(service.filterUnitContent(resource('any'), NsContent.EFilterCategory.ALL)).toBe(true)
    })

    it('defaults to accepting everything', () => {
      expect(service.filterUnitContent(resource('any'))).toBe(true)
    })

    it('LEARN excludes practice and assessment resource types', () => {
      expect(service.filterUnitContent(resource('any', { resourceType: 'Assessment' }), NsContent.EFilterCategory.LEARN)).toBe(false)
      expect(service.filterUnitContent(resource('any', { resourceType: 'Learning Content' }), NsContent.EFilterCategory.LEARN)).toBe(true)
    })

    it('ASSESS keeps only assessment resource types', () => {
      expect(service.filterUnitContent(resource('any', { resourceType: 'Assessment' }), NsContent.EFilterCategory.ASSESS)).toBe(true)
      expect(service.filterUnitContent(resource('any', { resourceType: 'Learning Content' }), NsContent.EFilterCategory.ASSESS)).toBe(false)
    })

    it('PRACTICE keeps only practice resource types', () => {
      expect(service.filterUnitContent(resource('any', { resourceType: 'Learning Content' }), NsContent.EFilterCategory.PRACTICE)).toBe(
        false,
      )
    })
  })

  describe('filterToc', () => {
    it('keeps a matching leaf resource', () => {
      const leaf = resource(NsContent.EMimeTypes.PDF, { identifier: 'r1' })
      expect(service.filterToc(leaf, NsContent.EFilterCategory.ALL)).toBe(leaf)
    })

    it('drops a leaf resource that fails the filter', () => {
      const leaf = resource(NsContent.EMimeTypes.PDF, { identifier: 'r1', resourceType: 'Assessment' })
      expect(service.filterToc(leaf, NsContent.EFilterCategory.LEARN)).toBeNull()
    })

    it('keeps a collection whose children survive the filter', () => {
      const tree: any = {
        contentType: 'Collection',
        identifier: 'c1',
        children: [
          resource(NsContent.EMimeTypes.PDF, { identifier: 'keep', resourceType: 'Learning Content' }),
          resource(NsContent.EMimeTypes.QUIZ, { identifier: 'drop', resourceType: 'Assessment' }),
        ],
      }

      const out: any = service.filterToc(tree, NsContent.EFilterCategory.LEARN)

      expect(out).toBeTruthy()
      expect(out.children).toHaveLength(1)
      expect(out.children[0].identifier).toBe('keep')
    })

    it('drops a collection whose children all fail the filter', () => {
      const tree: any = {
        contentType: 'Collection',
        identifier: 'c1',
        children: [resource(NsContent.EMimeTypes.QUIZ, { identifier: 'drop', resourceType: 'Assessment' })],
      }
      expect(service.filterToc(tree, NsContent.EFilterCategory.LEARN)).toBeNull()
    })

    it('drops a collection with no children at all', () => {
      expect(service.filterToc({ contentType: 'Collection', identifier: 'c1' } as any)).toBeNull()
    })

    it('preserves the collection metadata on the filtered copy', () => {
      const tree: any = {
        contentType: 'Collection',
        identifier: 'c1',
        name: 'Module One',
        children: [resource(NsContent.EMimeTypes.PDF, { identifier: 'keep' })],
      }

      const out: any = service.filterToc(tree, NsContent.EFilterCategory.ALL)

      expect(out.name).toBe('Module One')
      expect(out.identifier).toBe('c1')
    })
  })
})
