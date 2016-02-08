/* globals it, describe */

import assert from 'assert';
import validateBoard from '../src/validate-board';

function makeRow (rowString) {
  return rowString.split('')
    .map(letter => ({letter: letter === ' ' ? '' : letter, active: false}))
}

function makeBoard(board) {
  const rows = board.split('\n');

  const whitespaceAmount = 6;

  return rows.map(row => row.slice(whitespaceAmount)).map(makeRow).filter(row => row.length >= 1);
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

  it('handles multiple words in a row', () => {
    const board = [
      makeRow('  cake  bat')
    ]

    const validatedBoard = validateBoard(board)

    assert.equal(validatedBoard[0][0].active, false, 'first empty tile is invalid')
    assert(validatedBoard[0][2].active, 'first word is valid')
    assert.equal(validatedBoard[0][7].active, false)
    assert(validatedBoard[0][9].active)
  })

  it('handles multiple words in a row', () => {
    const board = [
      makeRow('  caze  bat')
    ];

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[0][0].active, false, 'first empty tile is invalid');
    assert.equal(validatedBoard[0][2].active, false, 'first word is invalid');
    assert.equal(validatedBoard[0][7].active, false);
    assert(validatedBoard[0][9].active, 'second word is valid');
  });

  it('handles columns', () => {
    const board = makeBoard(`
       
      r
      a
      t
    `);

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[0][0].active, false, 'first empty tile is invalid');
    assert.equal(validatedBoard[1][0].active, true, 'rat in column is valid');
    assert.equal(validatedBoard[3][0].active, true, 'rat in column is valid');
  });

  it('handles columns', () => {
    const board = makeBoard(`
       
      r
      a
      t
       
      s
      n
      o
      w
       
       
    `);

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[0][0].active, false, 'first empty tile is invalid');
    assert.equal(validatedBoard[1][0].active, true, 'rat in column is valid');
    assert.equal(validatedBoard[3][0].active, true, 'rat in column is valid');

    assert.equal(validatedBoard[4][0].active, false, 'second empty tile is invalid');
    assert.equal(validatedBoard[5][0].active, true, 'snow in column is valid');
    assert.equal(validatedBoard[8][0].active, true, 'snow in column is valid');
    assert.equal(validatedBoard[9][0].active, false, 'last empty tile is invalid');
  });

  it('handles invalid words in columns', () => {
    const board = makeBoard(`
       
      r
      a
      t
       
      s
      n
      i
      w
       
       
    `);

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[0][0].active, false, 'first empty tile is invalid');
    assert.equal(validatedBoard[1][0].active, true, 'rat in column is valid');
    assert.equal(validatedBoard[3][0].active, true, 'rat in column is valid');

    assert.equal(validatedBoard[4][0].active, false, 'second empty tile is invalid');
    assert.equal(validatedBoard[5][0].active, false, 'sniw in column is invalid');
    assert.equal(validatedBoard[8][0].active, false, 'sniw in column is invalid');
    assert.equal(validatedBoard[9][0].active, false, 'last empty tile is invalid');
  });
});

