import assert from 'assert';
import validateWord from '../src/word-validation';

describe('validateWord', () => {
  it('works', () => {
    assert(validateWord(['h','e','l','l','o']))
  })

  it('detects invalid words', () => {
    assert(!validateWord(['h','e','l','z','o']))
  })

  it('dgaf about case', () => {
    assert(validateWord(['H','O','T']))
  })
})
