import {Observable} from 'rx';
import {div} from '@cycle/dom';
import _ from 'lodash';

const board = _.range(0, 15).map(function(){
  return _.range(0, 15).map(() => "")
})

board[5][4] = "A"

function renderTile(tile) {
  return (
    div('.tile', tile)
  )
}

function renderRow(row) {
  return (
    div('.row', row.map(renderTile))
  )
}


function renderBoard (board) {
  return (
    div('.board', board.map(renderRow))
  )
}

export default function App ({DOM}) {
  const state$ = Observable.just(board)

  return {
    DOM: state$.map(renderBoard)
  };
}
