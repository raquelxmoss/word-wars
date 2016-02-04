import assert from 'assert';
import validateBoard from '../src/validate-board';

function makeRow (rowString) {
  return rowString.split('')
    .map(letter => ({letter: letter === ' ' ? '' : letter, active: false}))
}

describe('validateBoard', () => {
  it('sets the validity of each letter of the board', () => {
    const board = [
      makeRow('  cake  ')
    ]

    const validatedBoard = validateBoard(board)

    assert.equal(validatedBoard[0][0].active, false)
    assert(validatedBoard[0][2].active)
  })

  it('sets invalid letters to be inactive', () => {
    const board = [
      makeRow('  czke  ')
    ]

    const validatedBoard = validateBoard(board)

    assert.equal(validatedBoard[0][0].active, false)
    assert.equal(validatedBoard[0][2].active, false)
  })
})