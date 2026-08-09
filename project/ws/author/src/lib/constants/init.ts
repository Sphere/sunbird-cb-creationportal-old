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

/** An empty rule list for every content type. */
function emptyForAll(): any {
  return perContentType(() => [] as any)
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
      name: 'channel',
      children: [] as any,
      displayName: 'Channel',
      icon: 'chrome_reader_mode',
      additionalMessage: 'Create a Channel Page',
      contentType: 'Channel',
      mimeType: 'application/channel',
      resourceType: '',
      hasEnabled: true,
      canShow: true,
      allowedRoles: ['author', 'channel-creator', 'editor', 'admin', 'content-admin', 'super-admin'],
      flow: FLOW_4,
      additionalMeta: {
        isExternal: false,
        isIframeSupported: 'Yes',
      } as any,
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
      showFor: emptyForAll(),
      disabledFor: emptyForAll(),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    appIcon: { ...noRules(), mandatoryFor: emptyForAll(), showFor: emptyForAll(), defaultValue: sameForAll(() => ''), type: 'string' },
    artifactUrl: {
      ...noRules(),
      mandatoryFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
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
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: emptyForAll(),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    rolesMapped: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: emptyForAll(),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    body: {
      ...noRules(),
      mandatoryFor: {
        Course: [] as any,
        Resource: [] as any,
      } as any,
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
      showFor: {
        Course: [] as any,
        Resource: [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    catalogPaths: { ...noRules(), showFor: emptyForAll(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    category: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    categoryType: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    certificationList: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    certificationUrl: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    clients: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    complexityLevel: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        'Knowledge Artifact': [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    comments: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    contentLanguage: {
      ...noRules(),
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: null as any,
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: null as any,
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: null as any,
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
              contentType: ['Knowledge Artifact'],
            },
            value: null as any,
          },
        ],
        Channel: [
          {
            condition: {
              contentType: ['Channel'],
            },
            value: [] as any,
          },
        ],
      } as any,
      type: 'array',
    },
    transcoding: { ...noRules(), defaultValue: sameForAll(() => null as any), type: 'object' },
    concepts: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    contentIdAtSource: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    identifier: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    scoreType: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    contentType: {
      ...noRules(),
      mandatoryFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
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
    creatorContacts: { ...noRules(), showFor: emptyForAll(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    creatorDetails: {
      ...noRules(),
      showFor: {
        Course: [] as any,
        Resource: [] as any,
        'Knowledge Board': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    customClassifiers: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    description: { ...noRules(), mandatoryFor: emptyForAll(), showFor: emptyForAll(), defaultValue: sameForAll(() => ''), type: 'string' },
    dimension: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    duration: {
      ...noRules(),
      mandatoryFor: {
        Course: [] as any,
        Resource: [] as any,
      } as any,
      showFor: {
        Course: [] as any,
        Resource: [] as any,
      } as any,
      defaultValue: sameForAll(() => 0),
      type: 'number',
    },
    editors: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    equivalentCertifications: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    expiryDate: {
      ...noRules(),
      mandatoryFor: emptyForAll(),
      showFor: emptyForAll(),
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
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        'Knowledge Artifact': [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    additionalDownloadLink: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        'Knowledge Artifact': [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    idealScreenSize: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        'Knowledge Artifact': [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    introductoryVideo: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
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
      showFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
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
      showFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
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
              ontentType: ['Knowledge Board'],
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
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    keywords: {
      ...noRules(),
      showFor: emptyForAll(),
      disabledFor: {
        'Knowledge Artifact': [] as any,
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    learningMode: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
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
      showFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
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
      showFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
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
      showFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
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
    name: { ...noRules(), mandatoryFor: emptyForAll(), showFor: emptyForAll(), defaultValue: sameForAll(() => ''), type: 'string' },
    nodeType: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
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
      showFor: emptyForAll(),
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
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
    plagScan: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    playgroundInstructions: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    playgroundResources: {
      ...noRules(),
      showFor: emptyForAll(),
      disabledFor: emptyForAll(),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    posterImage: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    preContents: {
      ...noRules(),
      showFor: emptyForAll(),
      disabledFor: emptyForAll(),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    preRequisites: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    projectCode: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    publicationId: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    postContents: {
      ...noRules(),
      showFor: emptyForAll(),
      disabledFor: emptyForAll(),
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    publisherDetails: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        'Knowledge Board': [] as any,
        Channel: [] as any,
      } as any,
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
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    region: {
      ...noRules(),
      showFor: emptyForAll(),
      disabledFor: {
        'Knowledge Artifact': [] as any,
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    registrationInstructions: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    resourceCategory: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    resourceType: {
      ...noRules(),
      mandatoryFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Artifact': [] as any,
      } as any,
      showFor: emptyForAll(),
      disabledFor: {
        'Knowledge Board': [] as any,
        Channel: [] as any,
      } as any,
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
              contentType: ['dge Board'],
            },
            value: 0,
          },
        ],
        'Knowledge Artifact': [
          {
            condition: {
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
    skills: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    sourceName: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        Channel: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
      } as any,
      disabledFor: {
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
      } as any,
      defaultValue: {
        Course: [
          {
            condition: {
              contentType: ['Course'],
            },
            value: 'Learning World',
          },
        ],
        Resource: [
          {
            condition: {
              contentType: ['Resource'],
            },
            value: 'Learning World',
          },
        ],
        'Knowledge Board': [
          {
            condition: {
              contentType: ['Knowledge Board'],
            },
            value: 'Learning World',
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
    exclusiveContent: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        Channel: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
      } as any,
      disabledFor: {
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
      } as any,
      defaultValue: sameForAll(() => false),
      type: 'boolean',
    },
    status: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    studyDuration: { ...noRules(), defaultValue: sameForAll(() => 0), type: 'number' },
    studyMaterials: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    subTitle: {
      ...noRules(),
      mandatoryFor: {
        Course: [] as any,
        Resource: [] as any,
      } as any,
      showFor: emptyForAll(),
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    subTitles: { ...noRules(), defaultValue: sameForAll(() => [] as any), type: 'array' },
    systemRequirements: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    softwareRequirements: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => [] as any),
      type: 'array',
    },
    thumbnail: { ...noRules(), defaultValue: sameForAll(() => ''), type: 'string' },
    trackContacts: {
      ...noRules(),
      showFor: {
        Channel: [] as any,
        Resource: [] as any,
      } as any,
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
      showFor: {
        Resource: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
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
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      disabledFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => ''),
      type: 'string',
    },
    visibility: {
      ...noRules(),
      showFor: {
        Resource: [] as any,
        Course: [] as any,
        'Knowledge Board': [] as any,
        'Knowledge Artifact': [] as any,
        Channel: [] as any,
      } as any,
      defaultValue: sameForAll(() => 'Private'),
      type: 'string',
    },
  },
}
