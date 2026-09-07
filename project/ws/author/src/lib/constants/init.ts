import { IInitialSetup } from '../interface/initialSetup'

/**
 * Every form field is configured per content type, and the great majority of those
 * configurations are the same shape repeated verbatim. The helpers below build that
 * shape so the table below states only what actually differs between fields.
 *
 * Each helper takes a *factory* rather than a value: the hand-written literals this
 * replaces gave every content type its own instance, so a mutation to one could not
 * leak into another. Building fresh values per content type preserves that.
 */
const CONTENT_TYPES = ['Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel']

function perContentType(make: (contentType: string) => any): any {
  const out: any = {}
  CONTENT_TYPES.forEach(contentType => {
    out[contentType] = make(contentType)
  })
  return out
}

/** A `defaultValue` map where every content type resolves to its own copy of the same value. */
function sameForAll(make: () => any): any {
  return perContentType(contentType => [{ condition: { contentType: [contentType] } as any, value: make() }])
}

/** An empty rule list for the named content types, in the order given. */
function emptyFor(...contentTypes: string[]): any {
  const out: any = {}
  contentTypes.forEach(contentType => {
    out[contentType] = [] as any
  })
  return out
}

/** A `defaultValue` map whose value differs per content type. */
function valueFor(make: Record<string, () => any>): any {
  const out: any = {}
  Object.keys(make).forEach(contentType => {
    out[contentType] = [{ condition: { contentType: [contentType] } as any, value: make[contentType]() }]
  })
  return out
}

/** The six rule maps in their canonical order, all unset. Spread first, then override. */
function noRules(): any {
  return {
    mandatoryFor: {} as any,
    notMandatoryFor: {} as any,
    showFor: {} as any,
    notDisabledFor: {} as any,
    disabledFor: {} as any,
    notShowFor: {} as any,
  }
}

/** The original default expiry: six months from load. Kept as code so it stays relative. */
function sixMonthsOut(): Date {
  return new Date(new Date().setMonth(new Date().getMonth() + 6))
}

const FLOW_1 = {
  internalFlow: {
    common: ['Draft', 'InReview', 'Reviewed', 'Live'],
    conditional: [
      {
        condition: {
          mimeType: ['application/pdf', 'application/x-mpegURL', 'audio/mpeg'],
        },
        flow: ['Draft', 'Reviewed', 'Live'],
      },
      {
        condition: {
          mimeType: ['application/html'],
        },
        flow: ['Draft', 'Reviewed', 'Live'],
      },
    ],
  },
  externalFlow: {
    common: ['Draft', 'InReview', 'Reviewed', 'Live'],
    conditional: [
      {
        condition: {
          mimeType: ['application/pdf', 'application/x-mpegURL', 'audio/mpeg'],
        },
        flow: ['Draft', 'Reviewed', 'Live'],
      },
      {
        condition: {
          mimeType: ['application/html'],
        },
        flow: ['Draft', 'Live'],
      },
    ],
  },
} as any

const FLOW_2 = {
  internalFlow: {
    common: ['Draft', 'Reviewed', 'Live'],
  },
  externalFlow: {
    common: ['Draft', 'Reviewed', 'Live'],
  },
} as any

const FLOW_3 = {
  internalFlow: {
    common: ['Draft', 'Reviewed', 'Live'],
  },
  externalFlow: {
    common: ['Draft', 'Live'],
  },
} as any

const FLOW_4 = {
  internalFlow: {
    common: ['Draft', 'InReview', 'Reviewed', 'Live'],
  },
  externalFlow: {
    common: ['Draft', 'InReview', 'Reviewed', 'Live'],
  },
} as any

const FLOW_5 = {
  internalFlow: {
    common: ['Draft', 'InReview', 'Reviewed', 'Live'],
    conditional: [
      {
        condition: {
          isExternal: [true],
        },
        flow: ['Draft', 'Reviewed', 'Live'],
      },
    ],
  },
  externalFlow: {
    common: ['Draft', 'InReview', 'Reviewed', 'Live'],
    conditional: [
      {
        condition: {
          isExternal: [true],
        },
        flow: ['Draft', 'Live'],
      },
    ],
  },
} as any

const FLOW_6 = {
  internalFlow: {
    common: ['Draft', 'Reviewed', 'Live'],
  },
  externalFlow: {
    common: ['Draft', 'InReview', 'Reviewed', 'Live'],
  },
} as any

export const AUTH_INIT: IInitialSetup = {
  contentTypes: [
    {
      name: 'resource',
      displayName: 'Resource',
      icon: 'insert_drive_file',
      additionalMessage: 'Create smallest learning entity',
      contentType: '',
      mimeType: '',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'creator', 'content-creator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_1,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
      children: ['url', 'pdf', 'video', 'audio', 'assessment', 'quiz'],
    },
    {
      name: 'pdf',
      displayName: 'Upload a PDF',
      icon: 'insert_drive_file',
      additionalMessage: 'Create a Resource by uploading PDF file',
      contentType: 'Resource',
      mimeType: 'application/pdf',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'creator', 'content-creator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_2,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
      children: [] as any,
    },
    {
      name: 'video',
      displayName: 'Upload a Video',
      icon: 'insert_drive_file',
      additionalMessage: 'Create a Resource by uploading video (.mp4) file',
      contentType: 'Resource',
      mimeType: 'application/x-mpegURL',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'creator', 'content-creator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_2,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
      children: [] as any,
    },
    {
      name: 'audio',
      displayName: 'Upload a Audio',
      icon: 'insert_drive_file',
      additionalMessage: 'Create a Resource by uploading audio (.mp3) file',
      contentType: 'Resource',
      mimeType: 'audio/mpeg',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'creator', 'content-creator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_2,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
      children: [] as any,
    },
    {
      name: 'url',
      displayName: 'Attach a link',
      icon: 'insert_drive_file',
      additionalMessage: 'Create a Resource by providing an external link (URL)',
      contentType: 'Resource',
      mimeType: 'application/html',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'creator', 'content-creator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_3,
      additionalMeta: {
        isExternal: true,
        isIframeSupported: 'No',
      } as any,
      children: [] as any,
    },
    {
      name: 'assessment',
      displayName: 'Assessment',
      icon: 'check_circle',
      additionalMessage: 'Create an Assessment by providing minimum 10 question',
      contentType: 'Resource',
      mimeType: 'application/quiz',
      resourceType: 'Assessment',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'creator', 'content-creator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_3,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
      children: [] as any,
    },
    {
      name: 'quiz',
      displayName: 'Quiz',
      icon: 'check_circle',
      additionalMessage: 'Create a quiz',
      contentType: 'Resource',
      mimeType: 'application/quiz',
      resourceType: 'Quiz',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'creator', 'content-creator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_3,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
      children: [] as any,
    },
    {
      name: 'kboard',
      children: [] as any,
      displayName: 'Knowledge Board',
      icon: 'folder',
      additionalMessage: 'Create a Knowledge Board',
      contentType: 'Knowledge Board',
      mimeType: 'application/vnd.ekstep.content-collection',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'kb-curator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_2,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
    },
    {
      name: 'module',
      children: [] as any,
      displayName: 'Module',
      icon: 'folder',
      additionalMessage: 'Create a collection of Resources',
      contentType: 'Collection',
      mimeType: 'application/vnd.ekstep.content-collection',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'kb-curator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_4,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
    },
    {
      name: 'course',
      children: ['internalCourse', 'externalCourse'],
      displayName: 'Course',
      icon: 'folder',
      additionalMessage: 'Create a collection of Modules',
      contentType: 'Course',
      mimeType: 'application/vnd.ekstep.content-collection',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'kb-curator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_5,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
    },
    {
      name: 'interanlCourse',
      children: [] as any,
      displayName: 'Internal Course',
      icon: 'folder',
      additionalMessage: 'Create a collection of Modules',
      contentType: 'Course',
      mimeType: 'application/vnd.ekstep.content-collection',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'kb-curator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_4,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
    },
    {
      name: 'externalCourse',
      children: [] as any,
      displayName: 'External Course',
      icon: 'folder',
      additionalMessage: 'Create an external course by providing link',
      contentType: 'Course',
      mimeType: 'application/vnd.ekstep.content-collection',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'kb-curator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_6,
      additionalMeta: {
        isExternal: true,
        isIframeSupported: 'No',
      } as any,
    },
  ],
  roles: {
    author: {
      admin: {},
      editor: {
        condition: {
          status: ['Draft'],
        },
      },
      'content-admin': {},
      'super-admin': {},
      'content-creator': {
        condition: {
          status: ['Draft'],
        },
        fields: ['creatorContacts'],
      },
    },
    review: {
      admin: {},
      'content-admin': {},
      'super-admin': {},
      reviewer: {
        condition: {
          status: ['InReview'],
        },
        fields: ['trackContacts'],
      },
    },
    publish: {
      admin: {},
      'content-admin': {},
      'super-admin': {},
      publisher: {
        condition: {
          status: ['Reviewed'],
        },
        fields: ['publisherDetails'],
      },
    },
    qualityReview: {
      admin: {},
      'content-admin': {},
      'super-admin': {},
      'quality-reviewer': {
        condition: {
          status: ['QualityReview'],
        },
        fields: ['publisherDetails'],
      },
    },
    view: {
      admin: {},
      'content-admin': {},
      'super-admin': {},
      'quality-reviewer': {
        condition: {
          status: ['QualityReview'],
        },
        fields: ['publisherDetails'],
      },
      reviewer: {
        condition: {
          status: ['InReview'],
        },
        fields: ['trackContacts'],
      },
      publisher: {
        condition: {
          status: ['Reviewed'],
        },
        fields: ['publisherDetails'],
      },
    },
  },
  form: {
    accessibility: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    accessPaths: {
      ...noRules(),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    appIcon: {
      ...noRules(),
      mandatoryFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    artifactUrl: {
      ...noRules(),
      mandatoryFor: emptyFor('Resource', 'Course'),
      notMandatoryFor: {
        Resource: [
          {
            mimeType: ['application/html'],
            body: [true],
          },
        ],
        Course: [
          {
            body: [true],
          },
        ],
      } as any,
      showFor: {
        Resource: [
          {
            mimeType: ['application/html'],
          },
        ],
      } as any,
      defaultValue: {
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: '',
          },
        ],
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: '',
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: '',
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: '',
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: '',
          },
        ],
      } as any,
      type: 'string',
    },
    audience: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    rolesMapped: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    body: {
      ...noRules(),
      mandatoryFor: emptyFor('Course', 'Resource'),
      notMandatoryFor: {
        Resource: [
          {
            mimeType: ['application/html'],
            artifactUrl: [true],
          },
        ],
        Course: [
          {
            artifactUrl: [true],
          },
        ],
      } as any,
      showFor: emptyFor('Course', 'Resource'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    catalogPaths: {
      ...noRules(),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    category: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    categoryType: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    certificationList: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    certificationUrl: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    clients: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    complexityLevel: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Knowledge Artifact'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    comments: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    contentLanguage: {
      ...noRules(),
      defaultValue: valueFor({
        Course: () => null as any,
        Resource: () => null as any,
        'Knowledge Board': () => null as any,
        'Knowledge Artifact': () => null as any,
        Channel: () => [] as any,
      }),
      type: 'array',
    },
    transcoding: { ...noRules(), defaultValue: sameForAll(() => null as any), type: 'object' },
    concepts: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    contentIdAtSource: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    identifier: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    scoreType: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    contentType: {
      ...noRules(),
      mandatoryFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: {
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
        Resource: [
          {
            mimeType: ['application/pdf', 'audio/mpeg', 'application/x-mpegURL'],
          },
        ],
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    creatorContacts: {
      ...noRules(),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    creatorDetails: {
      ...noRules(),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    customClassifiers: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    description: {
      ...noRules(),
      mandatoryFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    dimension: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    duration: {
      ...noRules(),
      mandatoryFor: emptyFor('Course', 'Resource'),
      showFor: emptyFor('Course', 'Resource'),
      defaultValue: sameForAll(() => 0),
      type: 'number',
    },
    editors: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    equivalentCertifications: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    expiryDate: {
      ...noRules(),
      mandatoryFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: perContentType(contentType => [
        {
          condition: { contentType: [contentType] } as any,
          // Channel alone had a plain empty default in the original table.
          value: contentType === 'Channel' ? '' : sixMonthsOut(),
        },
      ]),
      type: 'string',
    },
    fileType: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Knowledge Artifact'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    additionalDownloadLink: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Knowledge Artifact'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    idealScreenSize: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Knowledge Artifact'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    introductoryVideo: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: '',
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: '',
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: '',
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: '',
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: '',
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: '',
          },
        ],
      } as any,
      type: 'string',
    },
    introductoryVideoIcon: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: '',
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: '',
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: '',
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: '',
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: '',
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: '',
          },
        ],
      } as any,
      type: 'string',
    },
    isExternal: {
      ...noRules(),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: true,
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: false,
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: true,
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: false,
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: false,
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: false,
          },
        ],
      } as any,
      type: 'boolean',
    },
    isRejected: {
      ...noRules(),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: true,
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: false,
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: true,
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: false,
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: false,
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: false,
          },
        ],
      } as any,
      type: 'boolean',
    },
    isIframeSupported: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course'),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: 'Yes',
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: 'Yes',
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: 'No',
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: 'Yes',
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: 'Yes',
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: 'Yes',
          },
        ],
      } as any,
      type: 'string',
    },
    isInIntranet: {
      ...noRules(),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: false,
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: false,
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: false,
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: false,
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: false,
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: false,
          },
        ],
      } as any,
      type: 'boolean',
    },
    kArtifacts: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    keywords: {
      ...noRules(),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Knowledge Artifact'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    learningMode: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course'),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: '',
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: '',
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: '',
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: '',
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: '',
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: '',
          },
        ],
      } as any,
      type: 'string',
    },
    learningObjective: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course'),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: '',
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: '',
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: '',
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: '',
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: '',
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: '',
          },
        ],
      } as any,
      type: 'string',
    },
    learningTrack: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course'),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: '',
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: '',
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: '',
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: '',
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: '',
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: '',
          },
        ],
      } as any,
      type: 'string',
    },
    locale: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course'),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: '',
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: '',
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: '',
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: '',
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: '',
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: '',
          },
        ],
      } as any,
      type: 'string',
    },
    mimeType: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    name: {
      ...noRules(),
      mandatoryFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    nodeType: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course'),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: '',
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: '',
          },
          {
            condition: {
              mimeType: ['application/html'],
            },
            value: '',
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: '',
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: '',
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: '',
          },
        ],
      } as any,
      type: 'string',
    },
    org: {
      ...noRules(),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    passPercentage: {
      ...noRules(),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: 0,
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: 0,
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: 0,
          },
        ],
        'Knowledge Artifact': [
          {
            con: {
              contentType: ['Knowledge Artifact'],
            },
            value: 0,
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: 0,
          },
        ],
      } as any,
      type: 'number',
    },
    plagScan: { ...noRules(), showFor: emptyFor('Resource', 'Course'), defaultValue: sameForAll(() => ''), type: 'string' },
    playgroundInstructions: { ...noRules(), showFor: emptyFor('Resource', 'Course'), defaultValue: sameForAll(() => ''), type: 'string' },
    playgroundResources: {
      ...noRules(),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    posterImage: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    preContents: {
      ...noRules(),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    preRequisites: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    projectCode: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    publicationId: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    postContents: {
      ...noRules(),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    publisherDetails: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Knowledge Board', 'Channel'),
      notShowFor: {
        Resource: [
          {
            mimeType: ['application/html'],
          },
        ],
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    references: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    region: {
      ...noRules(),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Knowledge Artifact'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    registrationInstructions: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    resourceCategory: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    resourceType: {
      ...noRules(),
      mandatoryFor: emptyFor('Resource', 'Course', 'Knowledge Artifact'),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Knowledge Board', 'Channel'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    sampleCertificates: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    size: {
      ...noRules(),
      mandatoryFor: {
        Resource: [
          {
            mimeType: ['application/pdf', 'application/x-mpegURL', 'audio/mpeg'],
          },
        ],
      } as any,
      defaultValue: sameForAll(() => 0),
      type: 'number',
    },
    skills: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    sourceName: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Channel', 'Knowledge Board', 'Knowledge Artifact'),
      disabledFor: emptyFor('Knowledge Board', 'Knowledge Artifact'),
      defaultValue: valueFor({
        Course: () => 'Learning World',
        Resource: () => 'Learning World',
        'Knowledge Board': () => 'Learning World',
        'Knowledge Artifact': () => '',
        Channel: () => '',
      }),
      type: 'string',
    },
    exclusiveContent: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Channel', 'Knowledge Board', 'Knowledge Artifact'),
      disabledFor: emptyFor('Knowledge Board', 'Knowledge Artifact'),
      defaultValue: sameForAll(() => false),
      type: 'boolean',
    },
    status: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    studyDuration: { ...noRules(), defaultValue: sameForAll(() => 0), type: 'number' },
    studyMaterials: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    subTitle: {
      ...noRules(),
      mandatoryFor: emptyFor('Course', 'Resource'),
      showFor: emptyFor('Course', 'Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    subTitles: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    systemRequirements: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    softwareRequirements: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    thumbnail: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    trackContacts: {
      ...noRules(),
      showFor: emptyFor('Channel', 'Resource'),
      notShowFor: {
        Resource: [
          {
            mimeType: ['application/html'],
          },
        ],
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    verifiers: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      notShowFor: {
        Resource: [
          {
            mimeType: ['application/html'],
          },
        ],
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    unit: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      disabledFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    visibility: {
      ...noRules(),
      showFor: emptyFor('Resource', 'Course', 'Knowledge Board', 'Knowledge Artifact', 'Channel'),
      defaultValue: sameForAll(() => 'Private'),
      type: 'string',
    },
  },
}
