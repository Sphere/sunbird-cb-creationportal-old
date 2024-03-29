export const AUTHORING_BASE = `/apis/authApi/`
export const PROTECTED_SLAG_V8 = `/apis/protected/v8/`
export const AUTHORING_SEARCH_BASE = `/apis/authSearchApi/`
export const AUTHORING_CONTENT_BASE = '/apis/authContent/'
export const AUTHORING_IAP_BASE = '/apis/authIapApi/'
export const AUTHORING_NOTIFICATION_BASE = '/apis/authNotificationApi/'
export const PROXY_SLAG_V8 = `apis/proxies/v8/`
const ACTION_BASE = `${AUTHORING_BASE}action/`
const CONTENT_FILE_BASE = 'content/'
export const NOTIFICATION = `${AUTHORING_NOTIFICATION_BASE}v1/notification/event`
// export const SEARCH = `${AUTHORING_SEARCH_BASE}authsearch5`

export const SEARCH = `${PROXY_SLAG_V8}sunbirdigot/read`

export const STATUS_CHANGE = `${ACTION_BASE}content/status/change/`
export const EXPIRY_DATE_ACTION = `${ACTION_BASE}content/extend`
export const UNPUBLISH = `${ACTION_BASE}content/unpublish`
// export const CONTENT_READ_HIERARCHY_AND_DATA = `${AUTHORING_BASE}hierarchy/content/translation/`
export const CONTENT_READ_HIERARCHY_AND_DATA = `${AUTHORING_BASE}content/v3/read/`
export const CONTENT_READ_HIERARCHY_AND_DATA_N = `${AUTHORING_BASE}content/v3/read/`
export const CONTENT_READ_MULTIPLE_HIERARCHY = `${AUTHORING_BASE}hierarchy/multiple/`
export const CONTENT_READ_MULTIPLE_HIERARCHY_AND_DATA = `${AUTHORING_BASE}hierarchy/multiple/content/`
export const CONTENT_CREATE = `${ACTION_BASE}content/create`
export const CONTENT_READ = `${ACTION_BASE}content/hierarchy/` // d
export const CONTENT_SAVE = `${ACTION_BASE}content/hierarchy/update`
export const CONTENT_SAVE_V2 = `${ACTION_BASE}content/v2/hierarchy/update`
export const CONTENT_DELETE = `${ACTION_BASE}content/delete`
export const CONTENT_RESTORE = `${ACTION_BASE}content/restore`
export const SEARCH_V6 = `${PROTECTED_SLAG_V8}/content/searchV6`
export const SEARCH_V6_AUTH = `${AUTHORING_SEARCH_BASE}v6/search/auth`
export const SEARCH_V6_ADMIN = `${AUTHORING_SEARCH_BASE}v6/search/admin`
export const ORDINALS = `${ACTION_BASE}meta/v2/ordinals/list`
export const INIT = `${AUTHORING_SEARCH_BASE}/v1/`

export const UPLOAD_APPICON = `${CONTENT_FILE_BASE}TestAuth/`
export const STREAM_FILES = `/assets/`
export const NON_STREAM_FILES = `/artifacts/`
export const GET_JSON = `/apis/protected/v8/scroing/getTemplate/`

export const EMPLOYEE_LIST = `${AUTHORING_SEARCH_BASE}v1/autoComplete/`

// get loggedin department
export const GET_MY_DEPARTMENT = `${PROTECTED_SLAG_V8}portal/cbp/mydepartment`

// File Base
export const CONTENT_BASE = `${AUTHORING_CONTENT_BASE}upload/`
export const CONTENT_BASE_ENCODE = `${AUTHORING_BASE}encode`
export const CONTENT_BASE_ZIP = `${AUTHORING_CONTENT_BASE}upload-zip/`
export const CONTENT_BASE_COPY = `${AUTHORING_BASE}copy`
export const CONTENT_BASE_STREAM = '/assets'
export const CONTENT_BASE_STATIC = '/artifacts'
export const CONTENT_BASE_WEBHOST = '/web-hosted'
export const CONTENT_BASE_WEBHOST_ASSETS = '/web-hosted/assets'
export const CONTENT_BASE_WEBHOST_ARTIFACT = '/web-hosted/artifact'
export const CONTENT_BASE_LIVE = '/content-store'
export const CONTENT_BASE_AUTHOR = '/contentv3/download'
export const CONTENT_VIDEO_ENCODE = `${AUTHORING_CONTENT_BASE}contentv3/video-transcoding/start/`

// new
export const API_PROXY_V8 = 'apis/proxies/v8/'
export const ACTION_CONTENT_V3 = `${API_PROXY_V8}action/content/v3/`
export const SEND_TO_REVIEW = `${ACTION_CONTENT_V3}review/`
export const PUBLISH_CONTENT = `${ACTION_CONTENT_V3}publish/`
export const REJECT_CONTENT = `${ACTION_CONTENT_V3}reject/`
export const API_PROTECTED_V8 = 'apis/protected/v8/'
export const GET_DEPARTMENT_LIST = `${API_PROTECTED_V8}portal/listDeptNames`
export const GET_CATALOG_DATA = `${API_PROTECTED_V8}catalog`
export const UNPUBLISH_CONTENT = `${API_PROXY_V8}v1/content/retire`
export const EMAIL_NOTIFICATION = `${API_PROXY_V8}notifyContentState`
