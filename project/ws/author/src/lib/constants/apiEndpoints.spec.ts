import * as endpoints from './apiEndpoints'

describe('apiEndpoints constants', () => {
  it('exposes the authoring base URLs', () => {
    expect(endpoints.AUTHORING_BASE).toBe('/apis/authApi/')
    expect(endpoints.PROTECTED_SLAG_V8).toBe('/apis/protected/v8/')
    expect(endpoints.AUTHORING_SEARCH_BASE).toBe('/apis/authSearchApi/')
    expect(endpoints.AUTHORING_CONTENT_BASE).toBe('/apis/authContent/')
    expect(endpoints.AUTHORING_IAP_BASE).toBe('/apis/authIapApi/')
    expect(endpoints.AUTHORING_NOTIFICATION_BASE).toBe('/apis/authNotificationApi/')
    expect(endpoints.PROXY_SLAG_V8).toBe('apis/proxies/v8/')
  })

  it('composes notification/search endpoints from their bases', () => {
    expect(endpoints.NOTIFICATION).toBe('/apis/authNotificationApi/v1/notification/event')
    expect(endpoints.SEARCH).toBe('apis/proxies/v8/sunbirdigot/read')
  })

  it('builds action-based content endpoints', () => {
    const actionBase = '/apis/authApi/action/'
    expect(endpoints.STATUS_CHANGE).toBe(`${actionBase}content/status/change/`)
    expect(endpoints.EXPIRY_DATE_ACTION).toBe(`${actionBase}content/extend`)
    expect(endpoints.UNPUBLISH).toBe(`${actionBase}content/unpublish`)
    expect(endpoints.CONTENT_CREATE).toBe(`${actionBase}content/create`)
    expect(endpoints.CONTENT_READ).toBe(`${actionBase}content/hierarchy/`)
    expect(endpoints.CONTENT_SAVE).toBe(`${actionBase}content/hierarchy/update`)
    expect(endpoints.CONTENT_SAVE_V2).toBe(`${actionBase}content/v2/hierarchy/update`)
    expect(endpoints.CONTENT_DELETE).toBe(`${actionBase}content/delete`)
    expect(endpoints.CONTENT_RESTORE).toBe(`${actionBase}content/restore`)
    expect(endpoints.ORDINALS).toBe(`${actionBase}meta/v2/ordinals/list`)
  })

  it('builds read/hierarchy endpoints', () => {
    expect(endpoints.CONTENT_READ_HIERARCHY_AND_DATA).toBe('/apis/authApi/content/v3/read/')
    expect(endpoints.CONTENT_READ_HIERARCHY_AND_DATA_N).toBe('/apis/authApi/content/v3/read/')
    expect(endpoints.CONTENT_READ_MULTIPLE_HIERARCHY).toBe('/apis/authApi/hierarchy/multiple/')
    expect(endpoints.CONTENT_READ_MULTIPLE_HIERARCHY_AND_DATA).toBe('/apis/authApi/hierarchy/multiple/content/')
  })

  it('builds search endpoints', () => {
    expect(endpoints.SEARCH_V6).toBe('/apis/protected/v8//content/searchV6')
    expect(endpoints.SEARCH_V6_AUTH).toBe('/apis/authSearchApi/v6/search/auth')
    expect(endpoints.SEARCH_V6_ADMIN).toBe('/apis/authSearchApi/v6/search/admin')
    expect(endpoints.INIT).toBe('/apis/authSearchApi//v1/')
    expect(endpoints.EMPLOYEE_LIST).toBe('/apis/authSearchApi/v1/autoComplete/')
  })

  it('exposes file/asset base paths', () => {
    expect(endpoints.UPLOAD_APPICON).toBe('content/TestAuth/')
    expect(endpoints.STREAM_FILES).toBe('/assets/')
    expect(endpoints.NON_STREAM_FILES).toBe('/artifacts/')
    expect(endpoints.GET_JSON).toBe('/apis/protected/v8/scroing/getTemplate/')
    expect(endpoints.GET_MY_DEPARTMENT).toBe('/apis/protected/v8/portal/cbp/mydepartment')
  })

  it('exposes content upload/storage bases', () => {
    expect(endpoints.CONTENT_BASE).toBe('/apis/authContent/upload/')
    expect(endpoints.CONTENT_BASE_ENCODE).toBe('/apis/authApi/encode')
    expect(endpoints.CONTENT_BASE_ZIP).toBe('/apis/authContent/upload-zip/')
    expect(endpoints.CONTENT_BASE_COPY).toBe('/apis/authApi/copy')
    expect(endpoints.CONTENT_BASE_STREAM).toBe('/assets')
    expect(endpoints.CONTENT_BASE_STATIC).toBe('/artifacts')
    expect(endpoints.CONTENT_BASE_WEBHOST).toBe('/web-hosted')
    expect(endpoints.CONTENT_BASE_WEBHOST_ASSETS).toBe('/web-hosted/assets')
    expect(endpoints.CONTENT_BASE_WEBHOST_ARTIFACT).toBe('/web-hosted/artifact')
    expect(endpoints.CONTENT_BASE_LIVE).toBe('/content-store')
    expect(endpoints.CONTENT_BASE_AUTHOR).toBe('/contentv3/download')
    expect(endpoints.CONTENT_VIDEO_ENCODE).toBe('/apis/authContent/contentv3/video-transcoding/start/')
  })

  it('exposes the new proxy/protected v8 endpoints', () => {
    expect(endpoints.API_PROXY_V8).toBe('apis/proxies/v8/')
    expect(endpoints.ACTION_CONTENT_V3).toBe('apis/proxies/v8/action/content/v3/')
    expect(endpoints.SEND_TO_REVIEW).toBe('apis/proxies/v8/action/content/v3/review/')
    expect(endpoints.PUBLISH_CONTENT).toBe('apis/proxies/v8/action/content/v3/publish/')
    expect(endpoints.REJECT_CONTENT).toBe('apis/proxies/v8/action/content/v3/reject/')
    expect(endpoints.API_PROTECTED_V8).toBe('apis/protected/v8/')
    expect(endpoints.GET_DEPARTMENT_LIST).toBe('apis/protected/v8/portal/listDeptNames')
    expect(endpoints.GET_CATALOG_DATA).toBe('apis/protected/v8/catalog')
    expect(endpoints.UNPUBLISH_CONTENT).toBe('apis/proxies/v8/v1/content/retire')
    expect(endpoints.EMAIL_NOTIFICATION).toBe('apis/proxies/v8/notifyContentState')
  })

  it('every exported endpoint is a non-empty string', () => {
    const values = Object.values(endpoints)
    expect(values.length).toBeGreaterThan(0)
    values.forEach(v => {
      expect(typeof v).toBe('string')
      expect((v as string).length).toBeGreaterThan(0)
    })
  })
})
