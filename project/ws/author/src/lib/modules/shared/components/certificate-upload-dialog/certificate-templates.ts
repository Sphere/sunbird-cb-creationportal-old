/**
 * The standard certificate designs a creator can start from instead of
 * supplying their own artwork.
 *
 * They are not bundled with the portal. The list lives under
 * `certificateTemplates` in the shared cbp-data.json config on S3, and each
 * entry links to its SVG on S3, so a design is added or changed by uploading
 * the file and editing that list -- no portal build or deploy.
 *
 * Each design should be 1350 x 808 -- the size the upload dialog advertises --
 * use only fonts the certificate renderer has, and mark its wording and rules
 * editable. How to build and add one is in docs/certificate-templates/README.md.
 */
export interface ICertTemplate {
  id: string
  name: string
  description: string
  /** Where the SVG is served from; it doubles as its own thumbnail. */
  url: string
}

/** The key in cbp-data.json that holds the list. */
export const CERT_TEMPLATES_KEY = 'certificateTemplates'

/**
 * Up to this many designs are shown beside the upload card on one screen. With
 * more, the creator first chooses between a ready-made design and their own.
 */
export const CERT_TEMPLATE_CHOICE_AFTER = 5

/**
 * Reads the list from the config, keeping only entries that can be used.
 *
 * The config is edited by hand, so an entry with no id, name or https link, or
 * a repeated id, is dropped rather than shown as a card that cannot open. A
 * missing or malformed list is simply no designs: the creator can still upload
 * their own.
 */
export function parseCertTemplates(raw: unknown): ICertTemplate[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const seen = new Set<string>()
  const templates: ICertTemplate[] = []
  raw.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object') {
      return
    }
    const item = entry as Record<string, unknown>
    const id = typeof item['id'] === 'string' ? item['id'].trim() : ''
    const name = typeof item['name'] === 'string' ? item['name'].trim() : ''
    const url = typeof item['url'] === 'string' ? item['url'].trim() : ''
    const description = typeof item['description'] === 'string' ? item['description'].trim() : ''
    if (!id || !name || !/^https:\/\//i.test(url) || seen.has(id)) {
      return
    }
    seen.add(id)
    templates.push({ id, name, description, url })
  })
  return templates
}
