/**
 * Builds the iframe URL for an html-archive (HTML or SCORM) package.
 *
 * Packages are served through the portal proxy (`/apis/proxies/v8/getContents/<key>`),
 * which reads `<key>` from the content bucket. `streamingUrl` holds the unzipped
 * package folder: `content/html/<id>-snapshot` before publish, `-latest` after.
 * It can be on any storage host (old S3 hosts, the CDN, path- or
 * virtual-hosted-style S3 URLs), so the storage key is found by its
 * `content/html/` prefix rather than by cutting a fixed number of characters off
 * the host.
 */

const PROXY_PREFIX = '/apis/proxies/v8/getContents'

/** The storage key (with a leading slash) behind a streamingUrl. */
export function packageStorageKey(streamingUrl: string): string {
  let path = streamingUrl.trim()
  const scheme = path.indexOf('://')
  if (scheme > -1) {
    const slash = path.indexOf('/', scheme + 3)
    path = slash > -1 ? path.slice(slash) : '/'
  }
  path = path.split(/[?#]/)[0]
  for (const marker of ['/content/html/', '/content/']) {
    const at = path.indexOf(marker)
    if (at > -1) {
      return path.slice(at)
    }
  }
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * `streamingUrl` + `entryPoint` as a proxy URL. Drafts saved before this fix
 * carry the entry file in streamingUrl already; it is not appended twice.
 */
export function packageProxyUrl(streamingUrl: string, entryPoint: string): string {
  const key = packageStorageKey(streamingUrl)
  const folder = key.replace(/\/+$/, '')
  const entry = (entryPoint || '').replace(/^\/+/, '')
  if (!entry || folder.endsWith(`/${entry}`)) {
    return `${PROXY_PREFIX}${key}`
  }
  return `${PROXY_PREFIX}${folder}/${entry}`
}
