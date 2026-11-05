/**
 * Checks an HTML package (a zip uploaded as an HTML resource) in the browser,
 * before it is uploaded, so the author learns what will not work while the file
 * is still in hand, instead of from learners.
 *
 * Two kinds of finding:
 * - `block`: the package cannot work (no entry page, Flash, unsafe paths, a SCORM
 *   package). The upload is stopped.
 * - `warn`: it plays, but something the author should know or fix: above all,
 *   that it never reports progress, so completion is never recorded.
 *
 * A scan can only see that the package contains the code. Whether progress really
 * reaches 100% shows in preview, in the resource's Debug dialog.
 */
import JSZip from 'jszip'

import { HTML_ENTRY_FILE, checkZipPackage, zipPackageMessage } from './zip-package.util'

export type HtmlPackageCheckLevel = 'block' | 'warn' | 'pass'

export interface IHtmlPackageFinding {
  id: string
  level: HtmlPackageCheckLevel
  title: string
  detail: string
  /** What to do about it. */
  fix?: string
  /** The files concerned, at most {@link MAX_LISTED_FILES}. */
  files?: string[]
  /** How many more files than those listed. */
  moreFiles?: number
}

export interface IHtmlPackageReport {
  findings: IHtmlPackageFinding[]
  blocking: number
  warnings: number
  fileCount: number
  /** Some text files were too large to read in the browser, so a few checks saw only part of the package. */
  partial: boolean
}

/** Text the checks need, keyed by the file's path in the zip. */
export type HtmlPackageTexts = Record<string, string>

export const MAX_LISTED_FILES = 8
/** Text files above this are not read (their name still counts). */
export const MAX_TEXT_FILE_BYTES = 3 * 1024 * 1024
/** Stop reading text once this much has been read. */
export const MAX_TEXT_TOTAL_BYTES = 30 * 1024 * 1024

const TEXT_FILE = /\.(html?|m?js|css)$/i
const HTML_FILE = /\.html?$/i
const SCRIPT_FILE = /\.(html?|m?js)$/i
const SAFE_NAME = /^[A-Za-z0-9_.\-/]+$/

const TELEMETRY = 'html-archive:telemetry'

/**
 * Well-known open-source libraries. Some use eval or new Function by design (Underscore's
 * templates, RequireJS's loader); that is not the package author's code, so the eval check
 * leaves them out. Recognised by file name, or by the licence banner at the top of the file.
 */
const LIBRARY_FILE =
  /(^|\/)(underscore|lodash|require|requirejs|jquery|jquery-ui|backbone|knockout|handlebars|mustache|angular|vue|react|react-dom|d3|three|createjs|easeljs|tweenjs|soundjs|preloadjs|phaser|pixi|gsap|tweenmax|howler|bootstrap|popper|modernizr|moment|hammer|velocity|anime|swiper|video|plyr)([.-][\w.]*)?\.m?js$/i
const LIBRARY_BANNER =
  /Underscore\.js|RequireJS|jQuery (JavaScript Library|v\d)|Lodash|lodash\.com|Backbone\.js|Handlebars|Knockout JavaScript library|CreateJS|Phaser|pixi\.js|GreenSock|howler\.js|Modernizr|Bootstrap v\d/

/** Whether a script file is a known third-party library rather than the package's own code. */
export function isKnownLibrary(name: string, text: string): boolean {
  return LIBRARY_FILE.test(name) || LIBRARY_BANNER.test(text.slice(0, 2000))
}

/**
 * Reads what the checks need from the zip: every entry name, and the text of its
 * HTML, JavaScript and CSS files (within the size limits).
 */
export async function readHtmlPackage(file: Blob): Promise<{ entries: string[]; texts: HtmlPackageTexts; partial: boolean }> {
  const zip = await JSZip.loadAsync(file)
  const entries: string[] = []
  const texts: HtmlPackageTexts = {}
  let read = 0
  let partial = false
  const files = Object.values(zip.files)
  for (const entry of files) {
    if (entry.dir) {
      continue
    }
    entries.push(entry.name)
  }
  for (const entry of files) {
    if (entry.dir || !TEXT_FILE.test(entry.name)) {
      continue
    }
    const size = uncompressedSize(entry)
    if (size > MAX_TEXT_FILE_BYTES || read + size > MAX_TEXT_TOTAL_BYTES) {
      partial = true
      continue
    }
    texts[entry.name] = await entry.async('string')
    read += texts[entry.name].length
  }
  return { entries, texts, partial }
}

/** Reads and checks a package in one go. */
export async function inspectHtmlPackage(file: Blob): Promise<IHtmlPackageReport> {
  const { entries, texts, partial } = await readHtmlPackage(file)
  return analyseHtmlPackage(entries, texts, partial)
}

/** The checks, on what {@link readHtmlPackage} read. Pure, so every rule is testable. */
export function analyseHtmlPackage(entries: string[], texts: HtmlPackageTexts, partial = false): IHtmlPackageReport {
  const files = entries.filter(name => !name.endsWith('/'))
  const findings: IHtmlPackageFinding[] = []
  const scripts = Object.keys(texts).filter(name => SCRIPT_FILE.test(name))
  const allScript = scripts.map(name => texts[name]).join('\n')

  // ---- the package cannot work: block -------------------------------------------------

  if (!files.length) {
    findings.push({
      id: 'empty',
      level: 'block',
      title: 'The zip is empty',
      detail: 'There are no files in it.',
      fix: 'Zip the package files and upload again.',
    })
  }

  const entry = checkZipPackage(files)
  findings.push(
    entry.valid
      ? { id: 'entry', level: 'pass', title: `${HTML_ENTRY_FILE} is at the top of the zip`, detail: 'The player opens this page first.' }
      : { id: 'entry', level: 'block', title: `${HTML_ENTRY_FILE} is not at the top of the zip`, detail: zipPackageMessage(entry) },
  )

  if (files.some(name => name.toLowerCase() === 'imsmanifest.xml')) {
    findings.push({
      id: 'scorm',
      level: 'block',
      title: 'This is a SCORM package',
      detail: 'It has an imsmanifest.xml, so it reports progress through SCORM, which an HTML resource does not read.',
      fix: 'Add it as a SCORM resource instead of HTML.',
    })
  }

  const flash = [
    ...files.filter(name => /\.swf$/i.test(name)),
    ...Object.keys(texts).filter(name => HTML_FILE.test(name) && /\.swf\b|application\/x-shockwave-flash/i.test(texts[name])),
  ]
  if (flash.length) {
    findings.push(
      withFiles(
        {
          id: 'flash',
          level: 'block',
          title: 'It uses Flash',
          detail: 'No browser or mobile app can play Flash, so this part would never show.',
          fix: 'Replace the Flash parts with HTML5 (video, canvas or plain HTML), then upload again.',
        },
        unique(flash),
      ),
    )
  }

  const unsafe = files.filter(name => /\\/.test(name) || name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.split('/').includes('..'))
  if (unsafe.length) {
    findings.push(
      withFiles(
        {
          id: 'paths',
          level: 'block',
          title: 'Some file paths are not safe',
          detail: 'Paths with "..", a leading "/", a drive letter or "\\" cannot be unpacked safely on the server.',
          fix: 'Zip the package folder again with a standard zip tool, so every path is relative.',
        },
        unsafe,
      ),
    )
  }

  // ---- it plays, but the author should know: warn --------------------------------------

  const hasTelemetry = allScript.includes(TELEMETRY)
  const reportsProgress = hasTelemetry && /['"`]PROGRESS['"`]/.test(allScript)
  const savesState = hasTelemetry && /['"`]STATE['"`]/.test(allScript)
  if (reportsProgress) {
    findings.push({
      id: 'progress',
      level: 'pass',
      title: 'Reports learner progress',
      detail: 'It sends PROGRESS events. After upload, open it in preview and check in Debug that it reaches 100%.',
    })
  } else {
    findings.push({
      id: 'progress',
      level: 'warn',
      title: 'Does not report learner progress',
      detail: hasTelemetry
        ? 'It uses html-archive:telemetry but never sends a PROGRESS event, so learner progress and course completion will not be recorded.'
        : /postMessage\s*\(/.test(allScript)
          ? 'It posts messages, but not in the html-archive:telemetry format the player reads, so learner progress and course completion will not be recorded.'
          : 'No code in it sends progress, so learner progress and course completion will not be recorded.',
      fix: "Have the package post window.top.postMessage({ type: 'html-archive:telemetry', event: { type: 'PROGRESS', id: '<package id>', extra: { pct: 40 } } }, '*') as the learner moves on, ending with pct: 100.",
    })
  }
  findings.push(
    savesState
      ? { id: 'state', level: 'pass', title: 'Saves where the learner left off', detail: 'It sends STATE events, so a learner can resume.' }
      : {
          id: 'state',
          level: 'warn',
          title: 'Does not save where the learner left off',
          detail: 'It never sends a STATE event, so learners start from the beginning each time.',
          fix: "Post { type: 'html-archive:telemetry', event: { type: 'STATE', extra: { state: { ... } } } } when the learner's place changes.",
        },
  )

  const refs = references(texts)
  const fileSet = new Set(files)
  const byLowerCase = new Map(files.map(name => [name.toLowerCase(), name]))
  const missing: string[] = []
  const wrongCase: string[] = []
  const rootRelative: string[] = []
  const insecure: string[] = []
  const external: string[] = []
  for (const { from, url } of refs) {
    if (url.startsWith('http://')) {
      insecure.push(`${from} → ${url}`)
    } else if (url.startsWith('https://') || url.startsWith('//')) {
      external.push(`${from} → ${url}`)
    } else if (url.startsWith('/')) {
      rootRelative.push(`${from} → ${url}`)
    } else {
      const target = resolve(from, url)
      if (!target || target.endsWith('/') || fileSet.has(target)) {
        continue
      }
      const actual = byLowerCase.get(target.toLowerCase())
      if (actual) {
        wrongCase.push(`${from} → ${url} (the file is ${actual})`)
      } else {
        missing.push(`${from} → ${url}`)
      }
    }
  }
  if (missing.length) {
    findings.push(
      withFiles(
        {
          id: 'missing',
          level: 'warn',
          title: 'Some linked files are not in the zip',
          detail: 'A page or stylesheet loads these, but they are not in the package, so they will not show.',
          fix: 'Add the files to the zip, or correct the links.',
        },
        unique(missing),
      ),
    )
  }
  if (wrongCase.length) {
    findings.push(
      withFiles(
        {
          id: 'case',
          level: 'warn',
          title: 'Some links differ from the file name in upper and lower case',
          detail: 'This works on Windows but not on the server, where Img.png and img.png are different files.',
          fix: 'Make each link match the file name exactly.',
        },
        unique(wrongCase),
      ),
    )
  }
  if (rootRelative.length) {
    findings.push(
      withFiles(
        {
          id: 'root',
          level: 'warn',
          title: 'Some links start with "/"',
          detail: 'The package is served from its own folder, so a link starting with "/" points outside it and breaks.',
          fix: 'Use relative links, e.g. "images/logo.png" instead of "/images/logo.png".',
        },
        unique(rootRelative),
      ),
    )
  }
  if (insecure.length) {
    findings.push(
      withFiles(
        {
          id: 'http',
          level: 'warn',
          title: 'Some files load over http://',
          detail: 'The portal runs on https, so the browser blocks these and they will not show.',
          fix: 'Put the files in the zip, or load them over https.',
        },
        unique(insecure),
      ),
    )
  }
  if (external.length) {
    findings.push(
      withFiles(
        {
          id: 'external',
          level: 'warn',
          title: 'Some files load from other websites',
          detail: 'They need an internet connection and that website, so they may not show offline in the mobile app.',
          fix: 'Where you can, put the files in the zip instead.',
        },
        unique(external),
      ),
    )
  }

  const evalFiles = scripts.filter(name => !isKnownLibrary(name, texts[name]) && /\beval\s*\(|\bnew\s+Function\s*\(/.test(texts[name]))
  if (evalFiles.length) {
    findings.push(
      withFiles(
        {
          id: 'eval',
          level: 'warn',
          title: 'It runs code from text (eval)',
          detail:
            "The package's own code uses eval or new Function, which are a security risk and not allowed by the zip guidelines. (Known libraries such as Underscore or RequireJS that do this are not counted.)",
          fix: 'Remove them, or ask the package author for a version without them.',
        },
        evalFiles,
      ),
    )
  }
  const iframeFiles = Object.keys(texts).filter(name => HTML_FILE.test(name) && /<iframe\b/i.test(texts[name]))
  if (iframeFiles.length) {
    findings.push(
      withFiles(
        {
          id: 'iframe',
          level: 'warn',
          title: 'It opens other pages inside frames',
          detail: 'The zip guidelines do not allow iframes without the Platform Admin.',
          fix: 'Remove the iframe, or contact the Platform Admin.',
        },
        iframeFiles,
      ),
    )
  }
  const oddNames = files.filter(name => !SAFE_NAME.test(name))
  if (oddNames.length) {
    findings.push(
      withFiles(
        {
          id: 'names',
          level: 'warn',
          title: 'Some file or folder names have spaces or special characters',
          detail: 'The zip guidelines allow only letters, numbers, "_", "-" and "." in names; others can break links on the server.',
          fix: 'Rename them and update the links that point to them.',
        },
        oddNames,
      ),
    )
  }

  const order: Record<HtmlPackageCheckLevel, number> = { block: 0, warn: 1, pass: 2 }
  findings.sort((a, b) => order[a.level] - order[b.level])
  return {
    findings,
    blocking: findings.filter(f => f.level === 'block').length,
    warnings: findings.filter(f => f.level === 'warn').length,
    fileCount: files.length,
    partial,
  }
}

// ---- helpers ----------------------------------------------------------------------------

/** Links that load a resource: src/poster/data attributes, <link href>, and CSS url(). */
export function references(texts: HtmlPackageTexts): { from: string; url: string }[] {
  const out: { from: string; url: string }[] = []
  for (const from of Object.keys(texts)) {
    const text = texts[from]
    const found: string[] = []
    if (HTML_FILE.test(from)) {
      for (const m of text.matchAll(
        /<(?:img|script|source|video|audio|track|embed|input|iframe|object)\b[^>]*?\s(?:src|poster|data)\s*=\s*["']([^"']+)["']/gi,
      )) {
        found.push(m[1])
      }
      for (const m of text.matchAll(/<link\b[^>]*?\shref\s*=\s*["']([^"']+)["']/gi)) {
        found.push(m[1])
      }
    }
    if (HTML_FILE.test(from) || /\.css$/i.test(from)) {
      for (const m of text.matchAll(/url\(\s*['"]?([^'")]+?)['"]?\s*\)/gi)) {
        found.push(m[1])
      }
    }
    for (const raw of found) {
      const url = raw.trim()
      if (isLoadable(url)) {
        out.push({ from, url })
      }
    }
  }
  return out
}

function isLoadable(url: string): boolean {
  if (!url || url.startsWith('#')) {
    return false
  }
  // data:/blob: are inline; others are not files; template placeholders are filled at run time.
  if (/^(data|blob|mailto|tel|javascript|about):/i.test(url) || /\{\{|\$\{|<%|\+/.test(url)) {
    return false
  }
  return true
}

/** A link resolved against the file it is in, as a path in the zip; null when it leaves the zip. */
export function resolve(from: string, url: string): string | null {
  let path = url.split(/[?#]/)[0]
  try {
    path = decodeURIComponent(path)
  } catch {
    // keep it as written
  }
  const parts = from.split('/').slice(0, -1)
  for (const part of path.split('/')) {
    if (part === '' || part === '.') {
      continue
    }
    if (part === '..') {
      if (!parts.length) {
        return null
      }
      parts.pop()
    } else {
      parts.push(part)
    }
  }
  const resolved = parts.join('/')
  return path.endsWith('/') ? `${resolved}/` : resolved
}

function withFiles(finding: IHtmlPackageFinding, files: string[]): IHtmlPackageFinding {
  return {
    ...finding,
    files: files.slice(0, MAX_LISTED_FILES),
    moreFiles: Math.max(0, files.length - MAX_LISTED_FILES),
  }
}

function unique(list: string[]): string[] {
  return [...new Set(list)]
}

function uncompressedSize(entry: JSZip.JSZipObject): number {
  const data = (entry as unknown as { _data?: { uncompressedSize?: number } })._data
  return data && typeof data.uncompressedSize === 'number' ? data.uncompressedSize : 0
}
