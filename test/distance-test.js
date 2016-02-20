import assert from 'assert';

import distance from '../src/distance';

describe('Distance', () => {
  it('calculates distance', () => {
    assert.equal(distance({x: 0, y: 0}, {x: 30, y: 0}), 30)
  })

  it('calculates distance vertically', () => {
    assert.equal(distance({x: 0, y: 0}, {x: 0, y: -30}), 30)
  })
})