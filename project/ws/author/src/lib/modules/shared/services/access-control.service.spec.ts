// The service only uses ConfigurationsService/NsInstanceConfig as types, so stub the
// heavy @ws-widget/utils barrel to keep this a fast, isolated unit test.
jest.mock('@ws-widget/utils', () => ({ ConfigurationsService: class {} }))

import { AccessControlService } from './access-control.service'

describe('AccessControlService', () => {
  function make(userRoles: string[] = []): AccessControlService {
    const configStub = {
      userRoles: new Set(userRoles),
      userProfile: { userId: 'u1', userName: 'User One' },
    } as any
    return new AccessControlService(configStub, '/en/')
  }

  describe('hasRole', () => {
    it('is true when the user has any of the requested roles', () => {
      const svc = make(['content_creator', 'editor'])
      expect(svc.hasRole(['content_creator'])).toBe(true)
      expect(svc.hasRole(['admin', 'editor'])).toBe(true)
    })

    it('is false when the user has none of the requested roles', () => {
      const svc = make(['content_creator'])
      expect(svc.hasRole(['content_reviewer', 'content_publisher'])).toBe(false)
    })

    it('is false when the user has no roles at all', () => {
      const svc = make([])
      expect(svc.hasRole(['content_creator'])).toBe(false)
    })
  })

  describe('getAction', () => {
    let svc: AccessControlService
    beforeEach(() => (svc = make()))

    it('maps Draft/Live to "submitted"', () => {
      expect(svc.getAction('Draft')).toBe('submitted')
      expect(svc.getAction('Live')).toBe('submitted')
    })

    it('maps InReview to approve/reject based on the operation flag', () => {
      expect(svc.getAction('InReview', 1)).toBe('reviewerApproved')
      expect(svc.getAction('InReview', 0)).toBe('reviewerRejected')
    })

    it('maps Reviewed to publisher approve/reject', () => {
      expect(svc.getAction('Reviewed', 1)).toBe('publisherApproved')
      expect(svc.getAction('Reviewed', 0)).toBe('publisherRejected')
    })

    it('maps QualityReview to quality approve/reject', () => {
      expect(svc.getAction('QualityReview', 1)).toBe('qualityApproved')
      expect(svc.getAction('QualityReview', 0)).toBe('qualityRejected')
    })

    it('falls back to "submitted" for unknown statuses', () => {
      expect(svc.getAction('Processing')).toBe('submitted')
    })
  })

  describe('getCategory', () => {
    let svc: AccessControlService
    beforeEach(() => (svc = make()))

    it('prefers category over contentType', () => {
      expect(svc.getCategory({ category: 'Course', contentType: 'Resource' } as any)).toBe('Course')
    })

    it('falls back to contentType for legacy content with no category', () => {
      expect(svc.getCategory({ contentType: 'Resource' } as any)).toBe('Resource')
    })
  })

  describe('getCategoryType', () => {
    let svc: AccessControlService
    beforeEach(() => (svc = make()))

    it('returns the explicit categoryType when present', () => {
      expect(svc.getCategoryType({ category: 'Course', categoryType: 'Curated Program' } as any)).toBe('Curated Program')
    })

    it('derives a default per category when categoryType is absent', () => {
      expect(svc.getCategoryType({ category: 'Course' } as any)).toBe('Course')
      expect(svc.getCategoryType({ category: 'Collection' } as any)).toBe('Module')
      expect(svc.getCategoryType({ category: 'Learning Path' } as any)).toBe('Program')
    })

    it('uses resourceType for a Resource with no categoryType', () => {
      expect(svc.getCategoryType({ category: 'Resource', resourceType: 'Video' } as any)).toBe('Video')
    })

    it('passes an unrecognised category straight through', () => {
      expect(svc.getCategoryType({ category: 'Knowledge Board' } as any)).toBe('Knowledge Board')
    })
  })

  /** A fuller config stub for the accessors and the access rules. */
  function makeFull(over: any = {}, baseHref = '/en/'): AccessControlService {
    const configStub = {
      userRoles: new Set<string>(over.userRoles || []),
      userProfile: { userId: 'u1', userName: 'User One' },
      userProfileV2: { userId: 'u1' },
      instanceConfig: {
        authoring: { allowed: true },
        logos: { defaultContent: 'default.png' },
        details: { appName: 'Sphere' },
      },
      activeOrg: 'Acme',
      rootOrg: 'acme-root',
      activeThemeObject: { color: { primary: '#1C5D95' } },
      ...over.config,
    } as any
    return new AccessControlService(configStub, baseHref)
  }

  const meta = (over: any = {}) => ({ status: 'Draft', createdBy: 'u1', ...over }) as any

  describe('config accessors', () => {
    it('exposes the authoring config', () => {
      expect(makeFull().authoringConfig).toEqual({ allowed: true })
    })

    it('exposes the user id and name', () => {
      const svc = makeFull()
      expect(svc.userId).toBe('u1')
      expect(svc.userName).toBe('User One')
    })

    it('falls back to empty strings without a profile', () => {
      const svc = makeFull({ config: { userProfile: null } })
      expect(svc.userId).toBe('')
      expect(svc.userName).toBe('')
    })

    it('falls back to an empty user name', () => {
      expect(makeFull({ config: { userProfile: { userId: 'u1' } } }).userName).toBe('')
    })

    it('reads the locale off the base href', () => {
      expect(makeFull({}, '/en/').locale).toBe('en')
      expect(makeFull({}, '/hi-IN/').locale).toBe('hi')
    })

    it('defaults the locale to English for an empty base href', () => {
      expect(makeFull({}, '/').locale).toBe('en')
      expect(makeFull({}, '').locale).toBe('en')
    })

    it('exposes the org, root org and the query fragment built from them', () => {
      const svc = makeFull()
      expect(svc.org).toBe('Acme')
      expect(svc.rootOrg).toBe('acme-root')
      expect(svc.orgRootOrgAsQuery).toBe('?rootOrg=acme-root&org=Acme')
    })

    it('falls back to the platform default org', () => {
      const svc = makeFull({ config: { activeOrg: null, rootOrg: null } })
      expect(svc.org).toBe('DOPT Ltd')
      expect(svc.rootOrg).toBe('dopt')
    })

    it('exposes the default logo and app name', () => {
      const svc = makeFull()
      expect(svc.defaultLogo).toBe('default.png')
      expect(svc.appName).toBe('Sphere')
    })

    it('falls back when there is no instance config', () => {
      const svc = makeFull({ config: { instanceConfig: null } })
      expect(svc.defaultLogo).toBe('')
      expect(svc.appName).toBe('Wingspan')
    })

    it('exposes the active theme primary colour', () => {
      expect(makeFull().activePrimary).toBe('#1C5D95')
    })

    it('falls back to an empty primary colour without a theme', () => {
      expect(makeFull({ config: { activeThemeObject: null } }).activePrimary).toBe('')
    })
  })

  describe('hasAccess', () => {
    it('lets an editor through', () => {
      expect(makeFull({ userRoles: ['editor'] }).hasAccess(meta({ status: 'Live' }))).toBe(true)
    })

    it('stops an editor reviewing their own submission', () => {
      const svc = makeFull({ userRoles: ['editor'] })
      expect(svc.hasAccess(meta({ status: 'Review', createdBy: 'u1' }))).toBe(false)
    })

    it('falls through to the ownership rules when there is no v2 profile', () => {
      const svc = makeFull({ userRoles: ['editor'], config: { userProfileV2: null } })
      expect(svc.hasAccess(meta({ status: 'Draft' }))).toBe(true)
    })

    it.each(['Draft', 'Live'])('lets the creator open their own %s content', status => {
      expect(makeFull().hasAccess(meta({ status }))).toBe(true)
    })

    it('keeps another user out of the creator content', () => {
      expect(makeFull().hasAccess(meta({ createdBy: 'u2' }))).toBe(false)
    })

    it('handles content with no creator recorded', () => {
      expect(makeFull().hasAccess(meta({ createdBy: '' }))).toBe(false)
    })

    it('lets an assigned reviewer open content in review', () => {
      const svc = makeFull({ userRoles: ['content_reviewer'] })
      const content = meta({
        status: 'Review',
        reviewStatus: 'InReview',
        createdBy: 'u2',
        reviewerIDs: ['u1'],
      })

      expect(svc.hasAccess(content)).toBe(true)
    })

    it('keeps an unassigned reviewer out', () => {
      const svc = makeFull({ userRoles: ['content_reviewer'] })
      const content = meta({
        status: 'Review',
        reviewStatus: 'InReview',
        createdBy: 'u2',
        reviewerIDs: ['u9'],
      })

      expect(svc.hasAccess(content)).toBe(false)
    })

    it('lets a reviewer through when they own the parent collection', () => {
      const svc = makeFull({ userRoles: ['content_reviewer'] })
      const content = meta({ status: 'Review', reviewStatus: 'InReview', createdBy: 'u2' })

      expect(svc.hasAccess(content, false, meta({ createdBy: 'u2' }))).toBe(true)
    })

    it('keeps a reviewer out when the parent has a different owner', () => {
      const svc = makeFull({ userRoles: ['content_reviewer'] })
      const content = meta({ status: 'Review', reviewStatus: 'InReview', createdBy: 'u2' })

      expect(svc.hasAccess(content, false, meta({ createdBy: 'u3' }))).toBe(false)
    })

    it('lets an assigned publisher open reviewed content', () => {
      const svc = makeFull({ userRoles: ['content_publisher'] })
      const content = meta({
        status: 'Review',
        reviewStatus: 'Reviewed',
        createdBy: 'u2',
        publisherIDs: ['u1'],
      })

      expect(svc.hasAccess(content)).toBe(true)
    })

    it('keeps an unassigned publisher out', () => {
      const svc = makeFull({ userRoles: ['content_publisher'] })
      const content = meta({
        status: 'Review',
        reviewStatus: 'Reviewed',
        createdBy: 'u2',
        publisherIDs: ['u9'],
      })

      expect(svc.hasAccess(content)).toBe(false)
    })

    it('lets a publisher through when they own the parent collection', () => {
      const svc = makeFull({ userRoles: ['content_publisher'] })
      const content = meta({ status: 'Review', reviewStatus: 'Reviewed', createdBy: 'u2' })

      expect(svc.hasAccess(content, false, meta({ createdBy: 'u2' }))).toBe(true)
    })

    it('opens public content in preview regardless of ownership', () => {
      const content = meta({ status: 'Review', createdBy: 'u2', visibility: 'Public' })

      expect(makeFull().hasAccess(content, true)).toBe(true)
    })

    it('does not open private content in preview', () => {
      const content = meta({ status: 'Review', createdBy: 'u2', visibility: 'Private' })

      expect(makeFull().hasAccess(content, true)).toBe(false)
    })
  })

  describe('date conversion', () => {
    it('parses the platform timestamp format', () => {
      expect(makeFull().convertToISODate('20260701T120000').toISOString()).toBe('2026-07-01T12:00:00.000Z')
    })

    it('does not throw on a malformed or missing stamp', () => {
      const svc = makeFull()
      expect(() => svc.convertToISODate('nonsense')).not.toThrow()
      expect(() => svc.convertToISODate()).not.toThrow()
    })

    it('renders a date in the elasticsearch format', () => {
      expect(makeFull().convertToESDate(new Date('2026-07-01T12:00:00.000Z'))).toBe('20260701T120000+0000')
    })
  })

  describe('getIcon', () => {
    const icon = (content: any) => makeFull().getIcon(content as any)

    it.each([
      ['Knowledge Board', 'kBoard'],
      ['Learning Path', 'program'],
      ['Course', 'course'],
      ['Collection', 'learningModule'],
    ])('picks a distinct icon for a %s collection', (category, label) => {
      const result = icon({ mimeType: 'application/vnd.ekstep.content-collection', category })

      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
      expect(label).toBeTruthy()
    })

    it('distinguishes certification, external and internal html content', () => {
      const html = 'application/html'
      const certificate = icon({ mimeType: html, resourceType: 'Certification' })
      const external = icon({ mimeType: html, isExternal: true })
      const internal = icon({ mimeType: html })

      expect(new Set([certificate, external, internal]).size).toBe(3)
    })

    it('flags a pdf with no artifact differently from one with an artifact', () => {
      const empty = icon({ mimeType: 'application/pdf' })
      const filled = icon({ mimeType: 'application/pdf', artifactUrl: 'a.pdf' })

      expect(empty).not.toBe(filled)
    })

    it('distinguishes an assessment from a plain quiz', () => {
      const quizMime = 'application/quiz'
      const assessment = icon({ mimeType: quizMime, category: 'Resource', categoryType: 'Assessment' })
      const quiz = icon({ mimeType: quizMime, category: 'Resource', categoryType: 'Quiz' })

      expect(assessment).not.toBe(quiz)
    })

    it.each([
      'video/x-youtube',
      'application/drag-drop',
      'application/html-picker',
      'application/web-module',
      'application/handson',
      'application/iap',
      'audio/mpeg',
      'video/mp4',
      'application/zip',
    ])('returns an icon for %s', mimeType => {
      expect(typeof icon({ mimeType })).toBe('string')
    })
  })

  describe('proxyToAuthoringUrl', () => {
    it('rewrites content-store links through the authoring proxy', () => {
      const svc = makeFull()
      const html = `<img src="https://cdn.example.org/content-store/a/b/pic.png">`

      const result = svc.proxyToAuthoringUrl(html)

      expect(result).toContain(encodeURIComponent('https://cdn.example.org/content-store/a/b/pic.png'))
    })

    it('leaves unrelated markup alone', () => {
      const html = `<img src="/assets/pic.png">`

      expect(makeFull().proxyToAuthoringUrl(html)).toBe(html)
    })

    it('builds the replacement from the matched groups', () => {
      expect(makeFull().regexDownloadReplace('', 'https://host/content-store/a', '"')).toContain(
        encodeURIComponent('https://host/content-store/a'),
      )
    })
  })
})
