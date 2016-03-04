/* globals xit, describe */

import assert from 'assert';
import validateBoard from '../src/validate-board';
import chalk from 'chalk';
import _ from 'lodash';

function makeRow (rowString) {
  return rowString.split('')
    .map(letter => ({letter: letter === ' ' ? '' : letter, active: false}))
}

function prettySquare({active, letter}) {
  if (letter === '') {
    return ' '
  }

  if (letter === '*') {
    return chalk.blue(letter);
  }

  if (active) {
    return chalk.green(letter);
  }

  return chalk.red(letter);
}

function prettyBoard(board) {
  return board.map(row => row.map(prettySquare).join('')).join('\n')
}


function p (board) {
  console.log(prettyBoard(board));
  console.log('---');
}

function makeBoard(board) {
  const rows = board.split('\n');

  const whitespaceAmount = 6;

  const maxRowWidth = _.max(rows.map(row => row.length)) - whitespaceAmount;

  return rows
    .map(row => _.padRight(row, maxRowWidth + whitespaceAmount))
    .map(row => row.slice(whitespaceAmount))
    .map(makeRow)
    .filter(row => row.length >= 1)
    .slice(1);
}

describe('validateBoard', () => {
  it('sets the validity of each letter of the board', () => {
    const board = [
      makeRow(' *cake  ')
    ]

    const validatedBoard = validateBoard(board)

    assert.equal(validatedBoard[0][0].active, false)
    assert(validatedBoard[0][2].active)
  })

  it('sets invalid letters to be inactive', () => {
    const board = [
      makeRow(' *czke  ')
    ]

    const validatedBoard = validateBoard(board)

    assert.equal(validatedBoard[0][0].active, false)
    assert.equal(validatedBoard[0][2].active, false)
  })

  it('handles multiple words in a row', () => {
    const board = [
      makeRow('  cake*bat')
    ]

    const validatedBoard = validateBoard(board)

    assert.equal(validatedBoard[0][0].active, false, 'first empty tile is invalid')
    assert(validatedBoard[0][2].active, 'first word is valid')
    assert.equal(validatedBoard[0][7].active, true, 'second word is valid')
    assert(validatedBoard[0][9].active)
  })

  it('handles multiple words in a row', () => {
    const board = [
      makeRow('  caze*bat')
    ];

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[0][0].active, false, 'first empty tile is invalid');
    assert.equal(validatedBoard[0][2].active, false, 'first word is invalid');
    assert(validatedBoard[0][8].active, 'second word is valid');
  });

  it('handles columns', () => {
    const board = makeBoard(`
       
      *
      r
      a
      t
    `);

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[0][0].active, false, 'first empty tile is invalid');
    assert.equal(validatedBoard[1][0].active, false, "base isn't valid");
    assert.equal(validatedBoard[2][0].active, true, 'rat in column is valid');
    assert.equal(validatedBoard[4][0].active, true, 'rat in column is valid');
  });

  it('handles columns with multiple words', () => {
    const board = makeBoard(`
       
      r
      a
      t
      *
      s
      n
      o
      w
       
       
    `);

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[0][0].active, false, 'first empty tile is invalid');
    assert.equal(validatedBoard[1][0].active, true, 'rat in column is valid');
    assert.equal(validatedBoard[3][0].active, true, 'rat in column is valid');

    assert.equal(validatedBoard[5][0].active, true, 'snow in column is valid');
    assert.equal(validatedBoard[8][0].active, true, 'snow in column is valid');
    assert.equal(validatedBoard[9][0].active, false, 'last empty tile is invalid');
  });

  it('handles invalid words in columns', () => {
    const board = makeBoard(`
       
      r
      a
      t
      *
      s
      n
      i
      w
       
       
    `);

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[0][0].active, false, 'first empty tile is invalid');
    assert.equal(validatedBoard[1][0].active, true, 'rat in column is valid');
    assert.equal(validatedBoard[3][0].active, true, 'rat in column is valid');

    assert.equal(validatedBoard[5][0].active, false, 'sniw in column is invalid');
    assert.equal(validatedBoard[8][0].active, false, 'sniw in column is invalid');
    assert.equal(validatedBoard[9][0].active, false, 'last empty tile is invalid');
  });

  it('handles intersections', () => {
    const board = makeBoard(`
       
      r
      art
      t
      *
    `);

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[1][0].active, true, 'rat is valid');
    assert.equal(validatedBoard[2][1].active, true, 'art is valid');
  });

  it('handles intersections with invalid words', () => {
    const board = makeBoard(`
       
      r
      arz
      t
      *
    `);

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[1][0].active, true, 'rat is valid');
    assert.equal(validatedBoard[2][0].active, true, 'the a in rat is valid');
    assert.equal(validatedBoard[2][1].active, false, 'arz is invalid');
  });

  it("marks words that aren't contiguous with the base as invalid", () => {
    const board = makeBoard(`
       
      r
      a
      t
      *
      
      s
      n
      a
      c
      k
    `);

    const validatedBoard = validateBoard(board);

    assert.equal(validatedBoard[1][0].active, true, 'rat is valid');
    assert.equal(validatedBoard[6][0].active, false, 'snack is not touching so is invalid');
  });
});

