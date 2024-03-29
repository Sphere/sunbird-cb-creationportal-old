import { NSContent } from './content'

export namespace NSApiResponse {

  export interface IFileApiResponse {
    code: number
    artifactURL: string
    authArtifactUrl: string
    authArtifactURL?: string
    downloadURL: string
    message: string
  }

  export interface IFileApiResponseV2 {
    id: string
    ver: string
    ts: string
    artifactUrl: any
    identifier: any
    params: {
      resmsgid: string
      msgid: string
      err: string
      status: string
      errmsg: string
    }
    responseCode: string
    result: {
      identifier: string
      artifactUrl: string
      content_url: string
      node_id: string
      versionKey: string
    }
  }

  export interface IContentCreateResponse {
    identifier: string
  }

  export interface IContentUpdateResponse {
    node_id: string
    versionKey: string
  }

  export interface IContentReadResponse {
    content: NSContent.IContentMeta
  }

  export interface IEmployeeDetails {
    id: string,
    name: string
  }

  export interface IApiResponse<T> {
    id: string
    ver: string
    ts: string
    params: {
      resmsgid: null
      msgid: null
      err: null
      status: null
      errmsg: null
    }
    responseCode: string
    result: T
  }

  export interface IContentCreateResponseV2 {
    id?: string
    ver?: string
    ts?: string
    params?: {
      resmsgid?: string
      msgid?: string,
      err?: string,
      status?: string
      errmsg?: string
    },
    responseCode?: string
    result: {
      identifier: string
      node_id: string
      versionKey: string
    }
  }

  export interface ISearchApiResponse {
    id: string,
    ver: string,
    ts: string,
    params: {
      resmsgid: string,
      msgid: string,
      status: string,
      err: string,
      errmsg: string
    },
    responseCode: string,
    result: {
      response: {
        count: number,
        content: NSContent.IContentMeta[]
      }
    }
  }
}
