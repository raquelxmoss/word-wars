import validateWord from './word-validation';

function validateRow (row) {
  const wordsInRow = extractWords(row);

  return row.map((square, index) => {
    if(square.letter !== '') {
      const wordToValidate = findWordToValidate(wordsInRow, index);

      return Object.assign({}, square, {active: validateWord(wordToValidate)});
    }

    return square
  });
}

function findWordToValidate (wordsInRow, index) {
  return wordsInRow.filter(word => word.startIndex <= index && word.endIndex >= index)[0]
}

function extractWords (row) {
  const wordsInRow = row.reduce((extractedWords, square, index) => {
    if(square.letter === '' && !extractedWords.currentlyInWord) { return extractedWords };

    if(square.letter === '' && extractedWords.currentlyInWord) {
      extractedWords.currentlyInWord = false
      extractedWords[extractedWords.length - 1].endIndex = index - 1

      return extractedWords
    };

    if(extractedWords.currentlyInWord) {
      extractedWords[extractedWords.length - 1].push(square.letter)
    } else {
      const newWord = [square.letter]
      newWord.startIndex = index

      extractedWords.push(newWord)
      extractedWords.currentlyInWord = true
    };

    return extractedWords
  }, [])

  if(wordsInRow.currentlyInWord) {
    wordsInRow.currentlyInWord = false
    wordsInRow[wordsInRow.length - 1].endIndex = row.length - 1
  };

  return wordsInRow
}

export default function validateBoard(board) {
  return board.map(validateRow)
}
