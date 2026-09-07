import { VIEWER_ROUTE_FROM_MIME, viewerRouteGenerator } from './viewer-route-util'
import { NsContent } from './widget-content.model'

describe('viewer-route-util', () => {
  describe('VIEWER_ROUTE_FROM_MIME', () => {
    const cases: Array<[NsContent.EMimeTypes, string]> = [
      [NsContent.EMimeTypes.MP3, 'audio'],
      [NsContent.EMimeTypes.M4A, 'audio-native'],
      [NsContent.EMimeTypes.COLLECTION, 'html'],
      [NsContent.EMimeTypes.CERTIFICATION, 'certification'],
      [NsContent.EMimeTypes.CHANNEL, 'certification'], // falls through to CERTIFICATION
      [NsContent.EMimeTypes.HTML, 'html'],
      [NsContent.EMimeTypes.ZIP, 'html'],
      [NsContent.EMimeTypes.TEXT_WEB, 'html'],
      [NsContent.EMimeTypes.IAP, 'iap'],
      [NsContent.EMimeTypes.ILP_FP, 'ilp-fp'],
      [NsContent.EMimeTypes.PDF, 'pdf'],
      [NsContent.EMimeTypes.MP4, 'video'],
      [NsContent.EMimeTypes.M3U8, 'video'],
      [NsContent.EMimeTypes.YOUTUBE, 'youtube'],
      [NsContent.EMimeTypes.WEB_MODULE, 'web-module'],
      [NsContent.EMimeTypes.WEB_MODULE_EXERCISE, 'web-module'],
      [NsContent.EMimeTypes.CLASS_DIAGRAM, 'class-diagram'],
      [NsContent.EMimeTypes.HANDS_ON, 'hands-on'],
      [NsContent.EMimeTypes.RDBMS_HANDS_ON, 'rdbms-hands-on'],
      [NsContent.EMimeTypes.HTML_PICKER, 'html-picker'],
      [NsContent.EMimeTypes.QUIZ, 'quiz'],
      [NsContent.EMimeTypes.APPLICATION_JSON, 'quiz'],
      [NsContent.EMimeTypes.COLLECTION_RESOURCE, 'resource-collection'],
    ]

    it.each(cases)('maps %s to route "%s"', (mime, route) => {
      expect(VIEWER_ROUTE_FROM_MIME(mime)).toBe(route)
    })

    it('returns empty string for an unmapped mime type', () => {
      expect(VIEWER_ROUTE_FROM_MIME(NsContent.EMimeTypes.UNKNOWN)).toBe('')
    })
  })

  describe('viewerRouteGenerator', () => {
    it('builds a basic viewer url with empty query params', () => {
      const result = viewerRouteGenerator('id-1', NsContent.EMimeTypes.PDF)
      expect(result.url).toBe('/viewer/pdf/id-1')
      expect(result.queryParams).toEqual({})
    })

    it('prefixes /author when forPreview is true', () => {
      const result = viewerRouteGenerator('id-2', NsContent.EMimeTypes.MP4, undefined, undefined, true)
      expect(result.url).toBe('/author/viewer/video/id-2')
    })

    it('includes primaryCategory in query params when provided', () => {
      const result = viewerRouteGenerator('id-3', NsContent.EMimeTypes.PDF, undefined, undefined, false, 'Learning Resource')
      expect(result.queryParams).toEqual({ primaryCategory: 'Learning Resource' })
    })

    it('includes collectionId/collectionType for a player-supported collection type', () => {
      const result = viewerRouteGenerator(
        'id-4',
        NsContent.EMimeTypes.PDF,
        'coll-1',
        'Course', // in PLAYER_SUPPORTED_COLLECTION_TYPES
      )
      expect(result.queryParams).toEqual({ collectionId: 'coll-1', collectionType: 'Course' })
    })

    it('drops collection info for an unsupported collection type', () => {
      const result = viewerRouteGenerator(
        'id-5',
        NsContent.EMimeTypes.PDF,
        'coll-2',
        'Resource', // NOT in PLAYER_SUPPORTED_COLLECTION_TYPES
      )
      // collectionId is still truthy so the branch runs, but collId/collType were nulled
      expect(result.queryParams).toEqual({ collectionId: undefined, collectionType: undefined })
    })

    it('collection params take precedence over primaryCategory when both present', () => {
      const result = viewerRouteGenerator('id-6', NsContent.EMimeTypes.PDF, 'coll-3', 'Course', false, 'SomeCategory')
      expect(result.queryParams).toEqual({ collectionId: 'coll-3', collectionType: 'Course' })
    })

    it('keeps primaryCategory when collectionType is missing', () => {
      const result = viewerRouteGenerator('id-7', NsContent.EMimeTypes.PDF, 'coll-4', undefined, false, 'CatX')
      // collectionType missing => collection branch skipped, primaryCategory retained
      expect(result.queryParams).toEqual({ primaryCategory: 'CatX' })
    })
  })
})
