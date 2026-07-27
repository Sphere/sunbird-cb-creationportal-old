import { IapAssessmentService } from './iap-assessment.service'
import { of } from 'rxjs'

describe('IapAssessmentService', () => {
  let apiService: { post: jest.Mock; get: jest.Mock }
  let configService: any
  let svc: IapAssessmentService

  beforeEach(() => {
    apiService = { post: jest.fn(() => of({})), get: jest.fn(() => of({})) }
    configService = { rootOrg: '' }
    svc = new IapAssessmentService(apiService as any, configService)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  const postCases: [keyof IapAssessmentService, string][] = [
    ['getIapId', 'Contest/Authoring/CreateContest'],
    ['getObjQuestions', 'elastic/searchObjV2'],
    ['getGroupQuestions', 'Contest/Authoring/Groups/Fetch'],
    ['getSectionId', 'Authoring/CreateSection'],
    ['removeSection', 'Authoring/RemoveSection'],
    ['addObjQuestionstoSections', 'AddObjectiveQuestionsToSection'],
    ['adGroupQuestionsToSections', 'AddGroupToSection'],
    ['removeObjQuestionstoSections', 'RemoveObjectiveQuestionsFromSection'],
    ['getContestDetails', 'Contest/Authoring/GetContest'],
    ['getCreatedSection', 'Authoring/getCreatedSection'],
  ]

  postCases.forEach(([method, urlPart]) => {
    it(`${String(method)} posts to ${urlPart}`, done => {
      ;(svc[method] as any)({ x: 1 }).subscribe(() => {
        expect(apiService.post).toHaveBeenCalledWith(expect.stringContaining(urlPart), { x: 1 })
        done()
      })
    })
  })

  it('getIapId falls back to Infosys rootOrg when unset', done => {
    svc.getIapId({}).subscribe(() => {
      expect(apiService.post.mock.calls[0][0]).toContain('rootOrg=Infosys')
      done()
    })
  })

  it('getSectionData GETs the section by id', done => {
    svc.getSectionData('S1').subscribe(() => {
      expect(apiService.get).toHaveBeenCalledWith(expect.stringContaining('Authoring/getSections/S1'))
      done()
    })
  })
})
