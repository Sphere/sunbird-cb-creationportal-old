export namespace NSCompetencyV2 {
  export interface ICompetencyDictionary {
    additionalProperties: {
      competencyType: 'Behavioural' | 'Domain' | 'Functional'
      cod?: String | undefined
      competencyArea?: string | undefined
    }
    createdDate?: string
    competencyArea?: string
    competencyType: string
    description: string
    id: string | undefined
    name: string
    source: string | undefined
    bookmark?: boolean | undefined
    reviewComments?: string | undefined
    status?: 'VERIFIED' | 'UNVERIFIED' | 'REJECTED'
    type: string
    userInfo?: {
      email: string
      name: string
      sub: string
    } | undefined
    children?: any[]
  }
}
