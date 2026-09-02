import { TitleTagService } from './title-tag.service'

describe('TitleTagService', () => {
  let titleSvc: { setTitle: jest.Mock }
  let metaSvc: { updateTag: jest.Mock }
  let svc: TitleTagService

  beforeEach(() => {
    titleSvc = { setTitle: jest.fn() }
    metaSvc = { updateTag: jest.fn() }
    svc = new TitleTagService(titleSvc as any, metaSvc as any)
  })

  it('should be created', () => {
    expect(svc).toBeTruthy()
  })

  it('setTitle delegates to Title service', () => {
    svc.setTitle('My Course')
    expect(titleSvc.setTitle).toHaveBeenCalledWith('My Course')
  })

  it('setSocialMediaTags writes 7 meta tags with correct property/name split', () => {
    svc.setSocialMediaTags('http://x/y', 'Title', 'Desc', 'http://img/a.png')
    expect(metaSvc.updateTag).toHaveBeenCalledTimes(7)
    // facebook (property) tags
    expect(metaSvc.updateTag).toHaveBeenCalledWith({ property: 'og:url', content: 'http://x/y' })
    expect(metaSvc.updateTag).toHaveBeenCalledWith({ property: 'og:title', content: 'Title' })
    expect(metaSvc.updateTag).toHaveBeenCalledWith({ property: 'og:description', content: 'Desc' })
    expect(metaSvc.updateTag).toHaveBeenCalledWith({ property: 'og:image', content: 'http://img/a.png' })
    expect(metaSvc.updateTag).toHaveBeenCalledWith({ property: 'og:image:secure_url', content: 'http://img/a.png' })
    // twitter (name) tags
    expect(metaSvc.updateTag).toHaveBeenCalledWith({ name: 'twitter:text:title', content: 'Title' })
    expect(metaSvc.updateTag).toHaveBeenCalledWith({ name: 'twitter:image', content: 'http://img/a.png' })
  })
})
