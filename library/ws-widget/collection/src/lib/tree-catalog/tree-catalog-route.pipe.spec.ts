import { TreeCatalogRoutePipe } from './tree-catalog-route.pipe'

describe('TreeCatalogRoutePipe', () => {
  const pipe = new TreeCatalogRoutePipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('builds an explore route with the encoded tag', () => {
    expect(pipe.transform('data science')).toBe(`/page/explore/${encodeURIComponent('data science')}`)
  })
})
