import fs from 'fs';
import _ from 'lodash';

const WORDS = fs.readFileSync('./words.txt', 'utf8').split('\n');

export default function validateWord (letters) {
  return _.include(WORDS, letters.join(''))
}