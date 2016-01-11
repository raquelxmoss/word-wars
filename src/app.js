import {Observable} from 'rx';
import {div} from '@cycle/dom';
import _ from 'lodash';
import $ from 'jquery';

const board = _.range(0, 15).map(function(){
  return _.range(0, 15).map(() => "")
})

board[5][4] = "A"

const initialState = {
  board,
  hand: ["A", "E", "I", "O", "U"],
  selectedTile: null
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

function makeSelectHandTileReducer (event) {
  return function selectHandTile (state) {
    const selectedTile = $(event.target).index()

    return Object.assign({}, state, {selectedTile})
  }
}

function makePlaceTileReducer (event) {
  return function placeTile (state) {
    const row = $(event.target).parent().index()
    const column = $(event.target).index()

    state.board[row][column] = state.hand[state.selectedTile]
    state.hand.splice(state.selectedTile, 1)
    state.selectedTile = null

    return state
  }
}

export default function App ({DOM}) {

  const selectHandTile$ = DOM
    .select('.hand .tile')
    .events('click')

  const boardClick$ = DOM
    .select('.board .tile')
    .events('click')

  const placeTileReducer$ = boardClick$
    .map(e => makePlaceTileReducer(e))

  const selectHandTileReducer$ = selectHandTile$
    .map(e => makeSelectHandTileReducer(e))

  const reducer$ = Observable.merge(
    selectHandTileReducer$,
    placeTileReducer$
  )

  const state$ = reducer$
    .startWith(initialState)
    .scan((state, reducer) => reducer(state))
    .do(console.log.bind(console, 'state'))

  return {
    DOM: state$.map(({board, hand}) => (
      div('.game', [
        renderBoard(board),
        renderHand(hand)
      ])
    ))
  };
}
