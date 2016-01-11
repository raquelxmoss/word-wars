import {Observable} from 'rx';
import {div} from '@cycle/dom';
import _ from 'lodash';

const board = _.range(0, 15).map(function(){
  return _.range(0, 15).map(() => "")
})

board[5][4] = "A"

const initialState = {
  board,
  hand: ["A", "E", "I", "O", "U"]
}

function renderTile(tile) {
  return (
    div(`.tile ${tile === "" ? "" : '.active'}`, tile)
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

function renderHand (hand) {
  return (
    div('.hand', hand.map(renderTile))
  )
}

export default function App ({DOM}) {
  const state$ = Observable.just(initialState)

  return {
    DOM: state$.map(({board, hand}) => (
      div('.game', [
        renderBoard(board),
        renderHand(hand)
      ])
    ))
  };
}
