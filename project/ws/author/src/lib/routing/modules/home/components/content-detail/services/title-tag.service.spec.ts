import { TitleTagService } from './title-tag.service'

describe('TitleTagService', () => {
  let titleService: any
  let metaService: any
  let service: TitleTagService

  beforeEach(() => {
    titleService = { setTitle: jest.fn() }
    metaService = { updateTag: jest.fn() }
    service = new TitleTagService(titleService, metaService)
  })

  it('should create', () => {
    expect(service).toBeTruthy()
  })

  describe('setTitle', () => {
    it('delegates to the Angular Title service', () => {
      service.setTitle('My Page')
      expect(titleService.setTitle).toHaveBeenCalledWith('My Page')
    })
  })

  describe('setSocialMediaTags', () => {
    beforeEach(() => {
      service.setSocialMediaTags('http://url', 'A title', 'A description', 'http://img.png')
    })

    it('updates every og/twitter tag', () => {
      // 5 facebook (property) tags + 2 twitter (name) tags
      expect(metaService.updateTag).toHaveBeenCalledTimes(7)
    })

    it('uses property attribute for facebook/open-graph tags', () => {
      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:url', content: 'http://url' })
      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:title', content: 'A title' })
      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:description', content: 'A description' })
      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:image', content: 'http://img.png' })
      expect(metaService.updateTag).toHaveBeenCalledWith({ property: 'og:image:secure_url', content: 'http://img.png' })
    })

    it('uses name attribute for twitter tags', () => {
      expect(metaService.updateTag).toHaveBeenCalledWith({ name: 'twitter:text:title', content: 'A title' })
      expect(metaService.updateTag).toHaveBeenCalledWith({ name: 'twitter:image', content: 'http://img.png' })
    })
  })
})
