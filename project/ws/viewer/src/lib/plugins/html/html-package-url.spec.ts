import { packageProxyUrl, packageStorageKey } from './html-package-url'

describe('html package urls', () => {
  describe('packageStorageKey', () => {
    it.each([
      ['https://static.sphere.aastrika.org/content/html/do_1-latest', '/content/html/do_1-latest'],
      ['https://sunbirdcontent.s3-ap-south-1.amazonaws.com/content/html/do_1-snapshot', '/content/html/do_1-snapshot'],
      ['https://sunbirdcontent.s3.ap-south-1.amazonaws.com/content/html/do_1-latest/', '/content/html/do_1-latest/'],
      ['https://s3.ap-south-1.amazonaws.com/sunbirdcontent/content/html/do_1-latest', '/content/html/do_1-latest'],
      ['https://host/content/do_1/artifact/x.zip', '/content/do_1/artifact/x.zip'],
      ['https://host/content/html/do_1-latest?v=2#top', '/content/html/do_1-latest'],
    ])('reads the key of %s', (url, key) => {
      expect(packageStorageKey(url)).toBe(key)
    })

    it('keeps the whole path of a url with no content folder', () => {
      expect(packageStorageKey('https://cdn.example.com/pkg/do_1')).toBe('/pkg/do_1')
    })

    it('accepts a relative path', () => {
      expect(packageStorageKey('content/html/do_1-latest')).toBe('/content/html/do_1-latest')
    })

    it('copes with a bare host', () => {
      expect(packageStorageKey('https://host')).toBe('/')
    })
  })

  describe('packageProxyUrl', () => {
    const folder = 'https://sunbirdcontent.s3-ap-south-1.amazonaws.com/content/html/do_1-latest'

    it('joins the folder and an entry point with one slash', () => {
      expect(packageProxyUrl(folder, '/index.html')).toBe('/apis/proxies/v8/getContents/content/html/do_1-latest/index.html')
      expect(packageProxyUrl(`${folder}/`, 'index.html')).toBe('/apis/proxies/v8/getContents/content/html/do_1-latest/index.html')
    })

    it('keeps a nested entry point', () => {
      expect(packageProxyUrl(folder, '/res/index_lms.html')).toBe(
        '/apis/proxies/v8/getContents/content/html/do_1-latest/res/index_lms.html',
      )
    })

    it('returns the folder as is when there is no entry point', () => {
      expect(packageProxyUrl(`${folder}/`, '')).toBe('/apis/proxies/v8/getContents/content/html/do_1-latest/')
    })

    it('does not repeat an entry file the url already ends with', () => {
      expect(packageProxyUrl(`${folder}/index.html`, '/index.html')).toBe(
        '/apis/proxies/v8/getContents/content/html/do_1-latest/index.html',
      )
    })
  })
})
