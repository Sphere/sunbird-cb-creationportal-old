import JSZip from 'jszip'

import { analyseHtmlPackage, inspectHtmlPackage, isKnownLibrary, MAX_LISTED_FILES, references, resolve } from './html-package-check'

const TELEMETRY_JS = `
  function report(type, extra) {
    window.top.postMessage({ type: 'html-archive:telemetry', event: { type: type, id: 'pkg', extra: extra } }, '*')
  }
  report('PROGRESS', { pct: 100 })
  report('STATE', { state: {} })
`

const finding = (report: ReturnType<typeof analyseHtmlPackage>, id: string) => report.findings.find(f => f.id === id)

/** A package that passes every check. */
function goodPackage(): { entries: string[]; texts: Record<string, string> } {
  return {
    entries: ['index.html', 'js/app.js', 'css/site.css', 'img/logo.png', 'img/bg.png'],
    texts: {
      'index.html':
        '<html><head><link rel="stylesheet" href="css/site.css"><script src="js/app.js"></script></head>' +
        '<body><img src="img/logo.png"></body></html>',
      'js/app.js': TELEMETRY_JS,
      'css/site.css': 'body { background: url("../img/bg.png") }',
    },
  }
}

describe('HTML package check', () => {
  it('passes a well-formed package that reports progress and state', () => {
    const { entries, texts } = goodPackage()
    const report = analyseHtmlPackage(entries, texts)
    expect(report.blocking).toBe(0)
    expect(report.warnings).toBe(0)
    expect(report.findings.map(f => [f.id, f.level])).toEqual([
      ['entry', 'pass'],
      ['progress', 'pass'],
      ['state', 'pass'],
    ])
    expect(report.fileCount).toBe(5)
  })

  describe('blocks a package that cannot work', () => {
    it('without index.html at the top, saying where it is', () => {
      const report = analyseHtmlPackage(['course/index.html', 'course/a.js'], {})
      expect(finding(report, 'entry')).toMatchObject({ level: 'block', detail: expect.stringContaining('inside the folder "course"') })
    })

    it('when the zip is empty', () => {
      expect(finding(analyseHtmlPackage(['folder/'], {}), 'empty')!.level).toBe('block')
    })

    it('when it is a SCORM package', () => {
      const report = analyseHtmlPackage(['index.html', 'imsmanifest.xml'], { 'index.html': '<html></html>' })
      expect(finding(report, 'scorm')).toMatchObject({ level: 'block', fix: expect.stringContaining('SCORM resource') })
    })

    it('when it uses Flash, as a file or from a page', () => {
      const report = analyseHtmlPackage(['index.html', 'movie.swf'], {
        'index.html': '<object type="application/x-shockwave-flash" data="intro.swf"></object>',
      })
      expect(finding(report, 'flash')).toMatchObject({ level: 'block', files: ['movie.swf', 'index.html'] })
    })

    it('when paths could leave the package folder', () => {
      const report = analyseHtmlPackage(['index.html', '../evil.js', '/abs.js', 'C:/win.js', 'dir\\file.js'], { 'index.html': '' })
      expect(finding(report, 'paths')).toMatchObject({ level: 'block', files: ['../evil.js', '/abs.js', 'C:/win.js', 'dir\\file.js'] })
    })
  })

  describe('progress and resume state', () => {
    it('warns, as the first thing to check, that a package with no progress code records no completion', () => {
      const report = analyseHtmlPackage(['index.html'], { 'index.html': '<html><body>Hello</body></html>' })
      expect(finding(report, 'progress')).toMatchObject({
        level: 'warn',
        detail: expect.stringContaining('No code in it sends progress'),
        fix: expect.stringContaining("type: 'PROGRESS'"),
      })
      expect(finding(report, 'state')!.level).toBe('warn')
    })

    it('says when it posts messages in another format', () => {
      const report = analyseHtmlPackage(['index.html'], { 'index.html': '<script>parent.postMessage({ done: true }, "*")</script>' })
      expect(finding(report, 'progress')!.detail).toContain('not in the html-archive:telemetry format')
    })

    it('says when it uses telemetry but never sends PROGRESS', () => {
      const report = analyseHtmlPackage(['index.html', 'a.js'], {
        'index.html': '',
        'a.js': "postMessage({ type: 'html-archive:telemetry', event: { type: 'STATE' } }, '*')",
      })
      expect(finding(report, 'progress')!.detail).toContain('never sends a PROGRESS event')
      expect(finding(report, 'state')!.level).toBe('pass')
    })
  })

  describe('links', () => {
    it('finds files a page or stylesheet loads that are not in the zip', () => {
      const report = analyseHtmlPackage(['index.html', 'a.js'], {
        'index.html': `<script src="a.js"></script><img src="img/missing.png"><link rel="icon" href="fav.ico">${TELEMETRY_JS}`,
      })
      expect(finding(report, 'missing')).toMatchObject({
        level: 'warn',
        files: ['index.html → img/missing.png', 'index.html → fav.ico'],
      })
    })

    it('names a link that only differs in upper and lower case, with the real file name', () => {
      const report = analyseHtmlPackage(['index.html', 'img/Logo.PNG'], { 'index.html': '<img src="img/logo.png">' })
      expect(finding(report, 'case')!.files).toEqual(['index.html → img/logo.png (the file is img/Logo.PNG)'])
      expect(finding(report, 'missing')).toBeUndefined()
    })

    it('flags links starting with "/", over http, and to other websites, each on its own', () => {
      const report = analyseHtmlPackage(['index.html'], {
        'index.html':
          '<img src="/img/a.png"><script src="http://cdn.example.com/x.js"></script><link href="https://fonts.example.com/f.css">',
      })
      expect(finding(report, 'root')!.files).toEqual(['index.html → /img/a.png'])
      expect(finding(report, 'http')!.files).toEqual(['index.html → http://cdn.example.com/x.js'])
      expect(finding(report, 'external')!.files).toEqual(['index.html → https://fonts.example.com/f.css'])
    })

    it('ignores links that are not files: anchors, inline data, mailto, javascript and template placeholders', () => {
      const html =
        '<a href="#top">x</a><img src="data:image/png;base64,AAA"><img src="blob:abc"><script src="javascript:void(0)"></script>' +
        '<img src="{{ image }}"><img src="${path}"><a href="mailto:a@b.c">m</a>'
      expect(references({ 'index.html': html })).toEqual([])
    })

    it('resolves a link against the file it is in, with ./, ../, a query and spaces', () => {
      expect(resolve('pages/one/page.html', '../img/a%20b.png?v=2#x')).toBe('pages/img/a b.png')
      expect(resolve('index.html', './js/app.js')).toBe('js/app.js')
      expect(resolve('index.html', '../outside.js')).toBeNull()
    })
  })

  describe('the zip guidelines', () => {
    it('warns about eval, iframes and names with spaces or special characters', () => {
      const report = analyseHtmlPackage(['index.html', 'my file.js', 'a.js'], {
        'index.html': '<iframe src="https://example.com"></iframe>',
        'a.js': 'var f = new Function("return 1"); eval("2")',
      })
      expect(finding(report, 'eval')!.files).toEqual(['a.js'])
      expect(finding(report, 'iframe')!.files).toEqual(['index.html'])
      expect(finding(report, 'names')!.files).toEqual(['my file.js'])
    })
  })

  it('does not count eval in well-known libraries, by file name or licence banner, only in the package code', () => {
    const report = analyseHtmlPackage(['index.html', 'assets/js/underscore.js', 'assets/js/require.js', 'vendor/bundle.js', 'js/app.js'], {
      'index.html': '',
      'assets/js/underscore.js': 'var t = new Function("obj", source)',
      'assets/js/require.js': 'req.exec = function (text) { return eval(text) }',
      'vendor/bundle.js': '/*! jQuery v3.7.1 | (c) OpenJS Foundation */ eval("x")',
      'js/app.js': 'eval(userCode)',
    })
    expect(finding(report, 'eval')!.files).toEqual(['js/app.js'])
    expect(isKnownLibrary('lib/lodash.min.js', '')).toBe(true)
    expect(isKnownLibrary('js/required-fields.js', '')).toBe(false)
  })

  it('lists at most a few files per finding, and says how many more', () => {
    const names = Array.from({ length: MAX_LISTED_FILES + 3 }, (_, i) => `img ${i}.png`)
    const report = analyseHtmlPackage(['index.html', ...names], { 'index.html': '' })
    expect(finding(report, 'names')).toMatchObject({ files: names.slice(0, MAX_LISTED_FILES), moreFiles: 3 })
  })

  it('orders findings: what blocks first, then warnings, then what passed', () => {
    const report = analyseHtmlPackage(['index.html', 'movie.swf'], { 'index.html': '' })
    const levels = report.findings.map(f => f.level)
    expect(levels).toEqual([...levels].sort((a, b) => ['block', 'warn', 'pass'].indexOf(a) - ['block', 'warn', 'pass'].indexOf(b)))
    expect(report.blocking).toBe(1)
  })

  it('reads a real zip: every file name, and the text of its pages, scripts and stylesheets', async () => {
    const zip = new JSZip()
    const { texts } = goodPackage()
    Object.keys(texts).forEach(name => zip.file(name, texts[name]))
    zip.file('img/logo.png', new Uint8Array([137, 80, 78, 71]))
    zip.file('img/bg.png', new Uint8Array([137, 80, 78, 71]))
    zip.folder('empty')
    const bytes = await zip.generateAsync({ type: 'uint8array' })

    const report = await inspectHtmlPackage(bytes as unknown as Blob)
    expect(report).toMatchObject({ blocking: 0, warnings: 0, fileCount: 5, partial: false })
  })
})
