import validateWord from './word-validation';

function validateRow (row) {
  const wordsInRow = extractWords(row)

  return row.map(square => {
    if(square.letter !== '') {
      // given a row of letters
      // determine if each letter is part of a valid word
      return Object.assign({}, square, {active: validateWord(wordsInRow[0])})
    }
    return square
  })
}

function extractWords (row) {
  return row.reduce((extractedWords, square) => {
    if(square.letter === '') { return extractedWords };

    if(extractedWords.length === 1) {
      extractedWords[0].push(square.letter)
    } else {
      extractedWords.push([square.letter])
    }

    return extractedWords
  }, [])
}

export default function validateBoard(board) {
  return board.map(validateRow)
}
