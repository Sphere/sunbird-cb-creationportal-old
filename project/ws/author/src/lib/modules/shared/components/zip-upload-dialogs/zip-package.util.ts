/**
 * Rules for the zip packages uploaded as `application/vnd.ekstep.html-archive`
 * (HTML and SCORM resources), shared by the module creation and file upload
 * screens.
 *
 * The content service (knowlg `HtmlMimeTypeMgrImpl`) only accepts a zip that
 * has `index.html` at its root — it looks the entry up by that exact name, so
 * the check here is case-sensitive too. Checking in the browser lets the author
 * see why before the upload, instead of a generic upload error after it.
 */

export const HTML_ENTRY_FILE = 'index.html'

export type ZipPackageProblem = 'missingRootIndex' | 'indexInsideFolder'

export interface IZipPackageCheck {
  valid: boolean
  problem?: ZipPackageProblem
  /** The folder holding index.html when the zip was made from its parent folder. */
  folder?: string
}

/** Checks the entry names listed from a zip (as zip.js returns them). */
export function checkZipPackage(entryNames: string[]): IZipPackageCheck {
  if (entryNames.includes(HTML_ENTRY_FILE)) {
    return { valid: true }
  }
  const nested = entryNames
    .filter(name => name.endsWith(`/${HTML_ENTRY_FILE}`))
    .sort((a, b) => a.split('/').length - b.split('/').length)[0]
  if (nested) {
    return { valid: false, problem: 'indexInsideFolder', folder: nested.slice(0, -HTML_ENTRY_FILE.length - 1) }
  }
  return { valid: false, problem: 'missingRootIndex' }
}

/** The message shown to the author for a zip that failed {@link checkZipPackage}. */
export function zipPackageMessage(check: IZipPackageCheck): string {
  if (check.problem === 'indexInsideFolder') {
    return `index.html is inside the folder "${check.folder}". Open that folder, select everything inside it and zip those files, so that index.html is at the top of the zip.`
  }
  return 'The zip must have an index.html file at the top level. Add it and upload the zip again.'
}

/**
 * The folder the content service unzips an uploaded package into,
 * `content/html/<id>-snapshot`, on the same storage host as the uploaded zip.
 *
 * The host comes from the upload's `artifactUrl` (`<host>/content/<id>/artifact/<file>.zip`)
 * so it is right for whichever bucket the environment uses. `fallbackBase` is
 * used only when the artifactUrl does not have that shape.
 *
 * This is the URL before publish; publish copies the folder to `-latest` and
 * sets `streamingUrl` itself.
 */
export function snapshotFolderUrl(contentId: string, artifactUrl: string, fallbackBase: string): string {
  const marker = '/content/'
  const at = artifactUrl ? artifactUrl.indexOf(marker) : -1
  const base = at > 0 ? artifactUrl.slice(0, at + marker.length - 1) : fallbackBase.replace(/\/+$/, '')
  return `${base}/html/${contentId}-snapshot`
}
