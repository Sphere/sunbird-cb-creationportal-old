/**
 * The fields a certificate template can carry.
 *
 * This list is deliberately closed: a template can only show what the issued
 * credential actually carries, and that is decided by `credentialSubject` in
 * `credential_template.json` on the registry side. Adding a new field needs four
 * coordinated changes -- that template, the certificate generator job, the SVG,
 * and the `TrainingCertificate` registry schema -- so a creator can place these
 * but cannot invent one. Anything placed that the credential does not carry
 * renders blank on the issued certificate, with no error.
 *
 * Keep in step with `credentialSubject` in credential_template.json.
 */
export interface ICertField {
  /** Element id written into the SVG, and the credential key it maps to. */
  key: string
  /** The handlebars token the platform substitutes at render time. */
  token: string
  /** Shown in the field palette. */
  label: string
  /** What it resolves to, in one line, for the palette. */
  hint: string
  /** A short sample, for a representative preview. */
  sample: string
  /**
   * A realistically long sample. Previewing short values is how badly placed
   * fields reach production: `Test User` fits anywhere, while a real facility
   * name is wide enough to collide with the label beside it.
   */
  longSample: string
  /** Text is placed as a <text> node; the QR code is an <image>. */
  kind: 'text' | 'image'
}

/** Placeholder text shown for a field whose value the preview cannot know. */
export const CERT_SAMPLE_FALLBACK = 'Sample'

export const CERT_FIELDS: ICertField[] = [
  {
    key: 'recipientName',
    token: '{{credentialSubject.recipientName}}',
    label: 'Recipient name',
    hint: 'The learner who earned the certificate',
    sample: 'Aastrika User',
    longSample: 'Lakshmi Venkataraman Subramanian',
    kind: 'text',
  },
  {
    // Templates identify this field as courseName; the credential calls it
    // trainingName. The id is only a handle -- the token is what renders.
    key: 'courseName',
    token: '{{credentialSubject.trainingName}}',
    label: 'Course name',
    hint: 'The course the certificate is issued for',
    sample: 'Normal Labour Course',
    longSample: 'Comprehensive Emergency Obstetric and Newborn Care Refresher',
    kind: 'text',
  },
  {
    // A plain mapping, no dateFormat helper: the certificate job sends the date
    // already formatted ("30 September 2026"), as the legacy flow printed it.
    key: 'issuedDate',
    token: '{{credentialSubject.issuedDate}}',
    label: 'Issued date',
    hint: 'The date the certificate was issued',
    sample: '29 September 2026',
    longSample: '29 September 2026',
    kind: 'text',
  },
  {
    key: 'recipientDesignation',
    token: '{{credentialSubject.recipientDesignation}}',
    label: 'Designation',
    hint: "The learner's role, from their profile",
    sample: 'ANM-MP',
    longSample: 'Auxiliary Nurse Midwife (Senior Grade)',
    kind: 'text',
  },
  {
    key: 'recipientFacility',
    token: '{{credentialSubject.recipientFacility}}',
    label: 'Facility',
    hint: 'The health facility the learner works at',
    sample: 'SHC Bapcha',
    longSample: 'SHC Bapcha 4741754370 - 6314',
    kind: 'text',
  },
  {
    key: 'recipientNIN',
    token: '{{credentialSubject.recipientNIN}}',
    label: 'NIN number',
    hint: 'National identification number, where recorded',
    sample: '1234567890',
    longSample: '1234 5678 9012 3456',
    kind: 'text',
  },
  {
    key: 'recipientBlock',
    token: '{{credentialSubject.recipientBlock}}',
    label: 'Block',
    hint: "The block of the learner's facility",
    sample: 'Susner',
    longSample: 'Nalkheda Development Block',
    kind: 'text',
  },
  {
    key: 'recipientDistrict',
    token: '{{credentialSubject.recipientDistrict}}',
    label: 'District',
    hint: "The district of the learner's facility",
    sample: 'Agar Malwa',
    longSample: 'Dakshina Kannada District',
    kind: 'text',
  },
  // State, country, organisation and provider are sent by the certificate job
  // but credential_template.json does not map them into credentialSubject, so
  // they would print blank. Add them here only once the credential carries them.
  {
    key: 'rmNumber',
    token: '{{credentialSubject.rmNumber}}',
    label: 'RM number',
    hint: 'Registered nurse / midwife registration number',
    sample: '#09123',
    longSample: 'RNRM/2019/0091234',
    kind: 'text',
  },
  {
    key: 'maxScore',
    token: '{{credentialSubject.maxScore}}',
    label: 'Score',
    hint: 'The score achieved, for courses with an assessment',
    sample: '100%',
    longSample: '100%',
    kind: 'text',
  },
  {
    key: 'trainingId',
    token: '{{credentialSubject.trainingId}}',
    label: 'Course ID',
    hint: 'The identifier of the course',
    sample: 'do_21466843525398528012',
    longSample: 'do_21466843525398528012',
    kind: 'text',
  },
  {
    key: 'QrCode',
    token: '{{qrCode}}',
    label: 'QR code',
    hint: 'Verification QR code, generated by the platform',
    sample: '',
    longSample: '',
    kind: 'image',
  },
]

/**
 * Names older templates used for the same fields, in their `${...}` ids. Those
 * templates were filled by a substitution step the platform no longer runs, so
 * reading them under their new keys is what lets one be reused without a
 * developer converting it by hand.
 */
export const CERT_LEGACY_KEYS: { [legacy: string]: string } = {
  courseName: 'courseName',
  trainingName: 'courseName',
  issuedDate: 'issuedDate',
  qrCodeImage: 'QrCode',
  qrCode: 'QrCode',
  // What the date is called inside the credential and the registry row.
  issuanceDate: 'issuedDate',
  osCreatedAt: 'issuedDate',
  // The Aastrika fields as the legacy templates named them.
  designation: 'recipientDesignation',
  facilityName: 'recipientFacility',
  nin: 'recipientNIN',
  block: 'recipientBlock',
  district: 'recipientDistrict',
}

/** Lookup by the element id a template identifies the field with. */
export const CERT_FIELD_BY_KEY: { [key: string]: ICertField } = CERT_FIELDS.reduce(
  (map, field) => {
    map[field.key] = field
    return map
  },
  {} as { [key: string]: ICertField },
)

/**
 * The pattern the issued date arrives in: the certificate job formats it the way
 * the legacy flow did (`dd MMMM yyyy`, "30 September 2026"), so the preview uses
 * the same. A template may still carry a dateFormat helper with its own pattern;
 * certSampleFor honours that when previewing it.
 */
export const CERT_DATE_FORMAT = 'DD MMMM YYYY'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/**
 * Formats a date in the same pattern the issued certificate shows, so the
 * preview matches what the learner will see: `30 September 2026`, not
 * `30-09-2026`.
 */
export function formatCertDate(date: Date, format: string = CERT_DATE_FORMAT): string {
  const pad = (n: number) => (n < 10 ? `0${n}` : String(n))
  return format.replace(/YYYY|MMMM|MMM|MM|DD|D/g, part => {
    switch (part) {
      case 'YYYY':
        return String(date.getFullYear())
      case 'MMMM':
        return MONTHS[date.getMonth()]
      case 'MMM':
        return MONTHS[date.getMonth()].slice(0, 3)
      case 'MM':
        return pad(date.getMonth() + 1)
      case 'DD':
        return pad(date.getDate())
      default:
        return String(date.getDate())
    }
  })
}

/** `favouriteColour` -> `Favourite Colour`, for a field no one has a sample for. */
export function humaniseCertField(field: string): string {
  if (!field) {
    return CERT_SAMPLE_FALLBACK
  }
  const spaced = field.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export interface ICertSampleOptions {
  /** The course being edited; shown in place of a sample course name. */
  courseName?: string
  /** A realistically long value instead of a typical one. */
  long?: boolean
  /** Defaults to now. */
  today?: Date
}

/**
 * A realistic value for one placeholder, as the learner would see it.
 *
 * Accepts a whole token (`{{credentialSubject.recipientName}}`), its inside
 * (`credentialSubject.recipientName`, `dateFormat issuanceDate "DD MMMM YYYY"`),
 * a legacy name (`courseName`) or an element id. The placer and the preview
 * both use this, so what an author sees while placing is what they then see
 * rendered. A field nobody has a sample for shows its own name, readably.
 */
/**
 * What a token refers to: the field name inside it, and the pattern of a
 * dateFormat helper if it is one. Accepts `{{...}}`, `${...}`, the inside of
 * either, or a bare name.
 */
function parseCertToken(token: string): { name: string; key: string; dateFormat: string | null } {
  const inner = token
    .trim()
    .replace(/^\{\{\s*|\s*\}\}$/g, '')
    .replace(/^\$\{\s*|\s*\}$/g, '')
  const helper = /^dateFormat\s+\S+\s+"([^"]*)"/.exec(inner)
  if (helper) {
    return { name: 'issuanceDate', key: 'issuedDate', dateFormat: helper[1] }
  }
  const parts = inner.split(/\s+/)
  const expression = parts.length > 1 && parts[0].indexOf('.') < 0 ? parts[1] : parts[0]
  const name = expression.replace(/['"]/g, '').split('.').pop() || ''
  return { name, key: CERT_LEGACY_KEYS[name] || name, dateFormat: null }
}

/**
 * The field a token fills, or null when the platform fills nothing for it --
 * in which case it prints empty on the issued certificate.
 */
export function certFieldKeyFor(token: string): string | null {
  const { key } = parseCertToken(token)
  return key === 'issuedDate' || CERT_FIELD_BY_KEY[key] ? key : null
}

export function certSampleFor(token: string, options: ICertSampleOptions = {}): string {
  const today = options.today || new Date()
  const { name, key, dateFormat } = parseCertToken(token)

  // A dateFormat helper carries its own pattern; honour it.
  if (dateFormat !== null) {
    return formatCertDate(today, dateFormat)
  }
  if (key === 'issuedDate') {
    return formatCertDate(today)
  }
  const field = CERT_FIELD_BY_KEY[key]
  if (!field) {
    return humaniseCertField(name)
  }
  if (field.key === 'courseName' && options.courseName) {
    return options.courseName
  }
  return options.long ? field.longSample : field.sample
}
