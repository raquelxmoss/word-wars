import {Observable} from 'rx';
import {div} from '@cycle/dom';
import _ from 'lodash';
import $ from 'jquery';

const board = _.range(0, 15).map(function(){
  return _.range(0, 15).map(() => "")
})

board[7][7] = "*"

const maxBaseHealth = 100;


const initialState = {
  board,
  hand: _.range(0, 10).map(randomLetter),
  selectedTile: null,
  baseHealth: 100,
  enemies: [
    {
      health: 50,
      x: 30,
      y: 50,
      speed: 0.015
    }
  ]
}

function renderTile(tile, baseHealth) {
  const tileIsBase = tile === "*";

  let style = {};


  if (tileIsBase) {
    style = {background: `rgba(0, 0, 173, ${baseHealth / maxBaseHealth})`};
  }

  return (
    div(
      `.tile ${tile === "" ? "" : '.active'} ${tileIsBase ? ".base" : ""}`,
      {style},
      tile
    )
  )
}

function renderRow(row, baseHealth) {
  return (
    div('.row', row.map(tile => renderTile(tile, baseHealth)))
  )
}


function renderBoard (board, baseHealth) {
  return (
    div('.board', board.map(row => renderRow(row, baseHealth)))
  )
}

function renderHand (hand) {
  return (
    div('.hand', hand.map(renderTile))
  )
}

function renderEnemy (enemy) {
  const style = {
    position: 'absolute',
    left: enemy.x + 'px',
    top: enemy.y + 'px'
  }

  return (
    div('.enemy', {style})
  )
}

function renderEnemies (enemies) {
  return (
    div('.enemies', enemies.map(renderEnemy))
  )
}

function makeSelectHandTileReducer (event) {
  return function selectHandTile (state) {
    const selectedTileIndex = $(event.target).index()

    return Object.assign({}, state, {selectedTile: {location: 'hand', position: selectedTileIndex}})
  }
}

function randomLetter () {
  return String.fromCharCode(Math.round(Math.random() * 25) + 65)
}

function makePlaceTileReducer (event) {
  const column = $(event.target).index()
  const row = $(event.target).parent().index()

  return function placeTile (state) {
    if (state.selectedTile === null && state.board[row][column] !== '') {
      state.selectedTile = {location: 'board', position: {row, column}}

      return state
    }

    if (state.selectedTile === null) {
      return state
    }

    if (state.selectedTile !== null && state.board[row][column] !== '') {
      return state
    }

    if (state.selectedTile.location === 'hand') {
      state.board[row][column] = state.hand[state.selectedTile.position]
      state.hand.splice(state.selectedTile, 1)
      state.hand.push(randomLetter())
    } else {
      const position = state.selectedTile.position

      state.board[row][column] = state.board[position.row][position.column]
      state.board[position.row][position.column] = ''
    }

    state.selectedTile = null

    return state
  }
}

function makeMoveEnemiesReducer (deltaTime, basePosition) {
  return function moveEnemies (state) {
    state.enemies.forEach(enemy => {
      const distanceToBase = {
        x: Math.abs(basePosition.left - enemy.x),
        y: Math.abs(basePosition.top - enemy.y)
      }

      const distance = Math.sqrt(Math.pow(distanceToBase.x, 2), Math.pow(distanceToBase.y, 2));

      if (distance < 15) {
        state.baseHealth -= 0.5;
        return state;
      }

      const speed = enemy.speed * deltaTime;

      const angle = Math.atan2(
        basePosition.top - enemy.y,
        basePosition.left - enemy.x
      );

      enemy.x = enemy.x + Math.cos(angle) * speed,
      enemy.y = enemy.y + Math.sin(angle) * speed
    })
    return state;
  }
}

export default function App ({DOM, animation}) {

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

  const moveEnemiesReducer$ = animation.pluck('delta')
    .map(deltaTime => makeMoveEnemiesReducer(deltaTime, $('.base').position()))

  const reducer$ = Observable.merge(
    selectHandTileReducer$,
    placeTileReducer$,
    moveEnemiesReducer$
  )

  const state$ = reducer$
    .startWith(initialState)
    .scan((state, reducer) => reducer(state))
    .distinctUntilChanged(JSON.stringify)
    .do(console.log.bind(console, 'state'))

  return {
    DOM: state$.map(({board, hand, selectedTile, baseHealth, enemies}) => (
      div('.game', [
        renderBoard(board, baseHealth),
        renderHand(hand),
        renderEnemies(enemies),
        JSON.stringify(selectedTile),
        baseHealth <= 0 ? 'You lose!' : ''
      ])
    ))
  };
}
