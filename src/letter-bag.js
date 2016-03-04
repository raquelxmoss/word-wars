import _ from 'lodash';

export default function LetterBag () {
  const distribution = [
    {letter: 'E', frequency: 12},
    {letter: 'A', frequency: 9},
    {letter: 'I', frequency: 9},
    {letter: 'O', frequency: 8},
    {letter: 'N', frequency: 6},
    {letter: 'R', frequency: 6},
    {letter: 'T', frequency: 6},
    {letter: 'L', frequency: 4},
    {letter: 'S', frequency: 4},
    {letter: 'U', frequency: 4},
    {letter: 'D', frequency: 4},
    {letter: 'G', frequency: 3},
    {letter: 'B', frequency: 2},
    {letter: 'C', frequency: 2},
    {letter: 'M', frequency: 2},
    {letter: 'P', frequency: 2},
    {letter: 'F', frequency: 2},
    {letter: 'H', frequency: 2},
    {letter: 'V', frequency: 2},
    {letter: 'W', frequency: 2},
    {letter: 'Y', frequency: 2},
    {letter: 'K', frequency: 1},
    {letter: 'J', frequency: 1},
    {letter: 'X', frequency: 1},
    {letter: 'Q', frequency: 1},
    {letter: 'Z', frequency: 1}
  ];

  const bag = _.chain(distribution).map(({letter, frequency}) => {
    return _.times(frequency, _.constant(letter));
  }).flatten().shuffle().value();

  return {draw: () => bag.pop()};
}
