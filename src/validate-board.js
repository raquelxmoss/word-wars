import validateWord from './word-validation';
import _ from 'lodash-transpose';

function findWordsInColumn (board, columnIndex) {
  return extractWords(_.transpose(board)[columnIndex]);
}

function validateRow (board, row, rowIndex) {
  const wordsInRow = extractWords(row);

  return row.map((square, columnIndex) => {
    if (square.letter !== '') {
      const wordToValidate = findWordToValidate(wordsInRow, columnIndex);

      const wordsInColumn = findWordsInColumn(board, columnIndex);

      const wordToValidateInColumn = findWordToValidate(wordsInColumn, rowIndex);

      const validInRowWord = validateWord(wordToValidate);
      const validInColumnWord = validateWord(wordToValidateInColumn);

      const active = (validInRowWord || validInColumnWord);

      return Object.assign({}, square, {active});
    }

    return square;
  });
}

function findWordToValidate (wordsInRow, index) {
  return wordsInRow.filter(word => word.startIndex <= index && word.endIndex >= index)[0] || [];
}

function extractWords (row) {
  const wordsInRow = row.reduce((extractedWords, square, index) => {
    if ((square.letter === '' || square.letter === '*') && !extractedWords.currentlyInWord) { return extractedWords; }

    if ((square.letter === '' || square.letter === '*') && extractedWords.currentlyInWord) {
      extractedWords.currentlyInWord = false;
      extractedWords[extractedWords.length - 1].endIndex = index - 1;

      return extractedWords;
    }

    if (extractedWords.currentlyInWord) {
      extractedWords[extractedWords.length - 1].push(square.letter);
    } else {
      const newWord = [square.letter];
      newWord.startIndex = index;

      extractedWords.push(newWord);
      extractedWords.currentlyInWord = true;
    }

    return extractedWords;
  }, []);

  if (wordsInRow.currentlyInWord) {
    wordsInRow.currentlyInWord = false;
    wordsInRow[wordsInRow.length - 1].endIndex = row.length - 1;
  }

  return wordsInRow;
}

function findBasePosition (board) {
  const baseRow = _.findIndex(board, row => row.find(tile => tile.letter === '*'));
  const baseTile = _.findIndex(board[baseRow], tile => tile.letter === '*');

  return {row: baseRow, column: baseTile};
}

function findNeighbouringTiles (board, position) {
  const directions = [
    {row: +1, column: 0}, // right
    {row: -1, column: 0}, // left
    {row: 0, column: +1}, // down
    {row: 0, column: -1}  // up
  ];

  const boardHeight = board.length;

  return directions.map(direction => {
    const neighbourPosition = {row: position.row + direction.row, column: position.column + direction.column};

    if (neighbourPosition.row >= boardHeight || neighbourPosition.row < 0) {
      return;
    }

    const neighbour = board[neighbourPosition.row][neighbourPosition.column];

    if (neighbour && neighbour.active) {
      return neighbourPosition;
    }
  }).filter(position => !!position);
}

function markFloatingWordsInvalid (board) {
  const basePosition = findBasePosition(board);

  const frontier = [];
  const visited = [];

  frontier.push(basePosition);

  let currentPosition;

  while (frontier.length >= 1) {
    currentPosition = frontier.pop();
    visited.push(currentPosition);

    const neighbouringTiles = findNeighbouringTiles(board, currentPosition);

    const tilesToVisit = neighbouringTiles.filter(tile => !_.find(visited, tile));

    frontier.push(...tilesToVisit);
  }

  return board.map((row, rowIndex) => {
    return row.map((tile, columnIndex) => {

      const touchingBase = !!_.find(visited, {row: rowIndex, column: columnIndex});

      return Object.assign({}, tile, {active: tile.active && touchingBase});
    });
  });
}

export default function validateBoard (board) {
  const validatedBoard = board.map((row, rowIndex) => validateRow(board, row, rowIndex));

  return markFloatingWordsInvalid(validatedBoard);
}
