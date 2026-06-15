import { PipeContentRoutePipe } from './pipe-content-route.pipe'

describe('PipeContentRoutePipe', () => {
  const pipe = new PipeContentRoutePipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('routes a Knowledge Board to the learner knowledge-board page', () => {
    const result = pipe.transform({ contentType: 'Knowledge Board', identifier: 'kb1' } as any)
    expect(result.url).toBe('/app/knowledge-board/kb1')
  })

  it('routes a Knowledge Board to the author toc when previewing', () => {
    const result = pipe.transform({ contentType: 'Knowledge Board', identifier: 'kb1' } as any, true)
    expect(result.url).toBe('/author/toc/kb1/overview')
  })

  it('routes a Channel to the page route', () => {
    expect(pipe.transform({ contentType: 'Channel', identifier: 'c1' } as any).url).toBe('/page/c1')
  })

  it('routes a Channel to the author viewer when previewing', () => {
    expect(pipe.transform({ contentType: 'Channel', identifier: 'c1' } as any, true).url).toBe('/author/viewer/channel/c1')
  })

  it('routes a Dynamic Learning Path journey to the dlp route', () => {
    const result = pipe.transform({
      contentType: 'Learning Journeys',
      resourceType: 'Dynamic Learning Paths',
      identifier: 'lj1',
    } as any)
    expect(result.url).toBe('/app/learning-journey/dlp/lj1/0')
  })

  it('routes a non-dynamic learning journey to the cdp route', () => {
    const result = pipe.transform({ contentType: 'Learning Journeys', identifier: 'lj2' } as any)
    expect(result.url).toBe('/app/learning-journey/cdp/lj2')
  })

  it('routes continue-learning playlist content to the playlist route', () => {
    const result = pipe.transform({
      contentType: 'Resource',
      identifier: 'r1',
      continueLearningData: { contextType: 'playlist', contextPathId: 'p1' },
    } as any)
    expect(result.url).toBe('/app/playlist/me/p1')
  })

  it('falls back to the toc overview route for ordinary content', () => {
    expect(pipe.transform({ contentType: 'Resource', identifier: 'r2' } as any).url).toBe('/app/toc/r2/overview')
    expect(pipe.transform({ contentType: 'Resource', identifier: 'r2' } as any).queryParams).toEqual({})
  })
})
