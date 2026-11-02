import { checkZipPackage, HTML_ENTRY_FILE, snapshotFolderUrl, zipPackageMessage } from './zip-package.util'

describe('zip package rules', () => {
  describe('checkZipPackage', () => {
    it('accepts a zip with index.html at the top level', () => {
      expect(checkZipPackage(['index.html', 'js/', 'js/app.js'])).toEqual({ valid: true })
    })

    it('accepts a SCORM zip that also has a root index.html', () => {
      expect(checkZipPackage(['imsmanifest.xml', 'index_lms.html', HTML_ENTRY_FILE]).valid).toBe(true)
    })

    it('names the folder when the zip was made from the parent folder', () => {
      expect(checkZipPackage(['site/', 'site/index.html', 'site/css/a.css'])).toEqual({
        valid: false,
        problem: 'indexInsideFolder',
        folder: 'site',
      })
    })

    it('picks the shallowest nested index.html', () => {
      const check = checkZipPackage(['a/b/c/index.html', 'a/index.html', 'a/b/index.html'])
      expect(check.folder).toBe('a')
    })

    it('rejects a zip with no index.html anywhere', () => {
      expect(checkZipPackage(['index_lms.html', 'imsmanifest.xml'])).toEqual({ valid: false, problem: 'missingRootIndex' })
      expect(checkZipPackage([])).toEqual({ valid: false, problem: 'missingRootIndex' })
    })

    it('matches the file name exactly, as the content service does', () => {
      expect(checkZipPackage(['Index.html']).valid).toBe(false)
      expect(checkZipPackage(['myindex.html']).problem).toBe('missingRootIndex')
    })
  })

  describe('zipPackageMessage', () => {
    it('tells the author how to re-zip a nested package', () => {
      expect(zipPackageMessage({ valid: false, problem: 'indexInsideFolder', folder: 'site' })).toContain('inside the folder "site"')
    })

    it('asks for a root index.html otherwise', () => {
      expect(zipPackageMessage({ valid: false, problem: 'missingRootIndex' })).toContain('index.html file at the top level')
    })
  })

  describe('snapshotFolderUrl', () => {
    const fallback = 'https://fallback.example.com/content/'

    it('uses the host of the uploaded zip', () => {
      expect(
        snapshotFolderUrl('do_1', 'https://stage-new-public.s3.ap-south-1.amazonaws.com/content/do_1/artifact/site.zip', fallback),
      ).toBe('https://stage-new-public.s3.ap-south-1.amazonaws.com/content/html/do_1-snapshot')
    })

    it('keeps the bucket of a path-style url', () => {
      expect(snapshotFolderUrl('do_1', 'https://s3.ap-south-1.amazonaws.com/sunbirdcontent/content/do_1/artifact/a.zip', fallback)).toBe(
        'https://s3.ap-south-1.amazonaws.com/sunbirdcontent/content/html/do_1-snapshot',
      )
    })

    it('falls back to the configured base when the artifactUrl has another shape', () => {
      expect(snapshotFolderUrl('do_1', '', fallback)).toBe('https://fallback.example.com/content/html/do_1-snapshot')
      expect(snapshotFolderUrl('do_1', 'https://elsewhere/pkg.zip', fallback)).toBe(
        'https://fallback.example.com/content/html/do_1-snapshot',
      )
    })
  })
})
