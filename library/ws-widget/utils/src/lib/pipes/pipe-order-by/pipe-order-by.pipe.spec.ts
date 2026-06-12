import { OrderByPipe } from './pipe-order-by.pipe'

describe('OrderByPipe', () => {
  const pipe = new OrderByPipe()

  it('creates an instance', () => {
    expect(pipe).toBeTruthy()
  })

  it('sorts a collection ascending by a key (delegates to lodash orderBy)', () => {
    const data = [{ n: 3 }, { n: 1 }, { n: 2 }]
    expect(pipe.transform(data, 'n')).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }])
  })

  it('sorts descending when an order is provided', () => {
    const data = [{ n: 1 }, { n: 3 }, { n: 2 }]
    expect(pipe.transform(data, ['n'], ['desc'])).toEqual([{ n: 3 }, { n: 2 }, { n: 1 }])
  })
})
