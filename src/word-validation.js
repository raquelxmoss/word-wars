const fs = require('fs');
import _ from 'lodash';

const WORDS = fs.readFileSync('./words.txt', 'utf8').split('\r\n');

export default function validateWord (letters) {
  return _.include(WORDS, letters.join('').toLowerCase());
}
