import {Observable} from 'rx';
import {div} from '@cycle/dom';
import _ from 'lodash';
import $ from 'jquery';

import validateBoard from './validate-board';
import LetterBag from './letter-bag';

const board = _.range(0, 15).map(function(){
  return _.range(0, 15).map(() => ({active: false, letter: ''}))
})

board[7][7] = {letter: "*", active: true}

const bag = LetterBag()

const maxBaseHealth = 100;


const initialState = {
  board,
  hand: _.range(0, 10).map(() => ({letter: randomLetter(), active: false})),
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
  const tileIsBase = tile.letter === "*";

  let style = {};


  if (tileIsBase) {
    style = {background: `rgba(0, 0, 240, ${baseHealth / maxBaseHealth})`};
  }

  return (
    div(
      `.tile ${tile.letter === "" ? "" : '.active'} ${tile.active ? '.valid' : ''} ${tileIsBase ? ".base" : ""}`,
      {style},
      tile.letter
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
  return bag.draw()
}

function makePlaceTileReducer (event) {
  const column = $(event.target).index()
  const row = $(event.target).parent().index()

  return function placeTile (state) {
    if (state.selectedTile === null && state.board[row][column].letter !== '') {
      state.selectedTile = {location: 'board', position: {row, column}}

      return state
    }

    if (state.selectedTile === null) {
      return state
    }

    if (state.selectedTile !== null && state.board[row][column].letter !== '') {
      return state
    }

    if (state.selectedTile.location === 'hand') {
      state.board[row][column] = state.hand[state.selectedTile.position]
      state.hand.splice(state.selectedTile.position, 1)
      state.hand.push({letter: randomLetter(), active: false})
    } else {
      const position = state.selectedTile.position

      state.board[row][column] = state.board[position.row][position.column]
      state.board[position.row][position.column] = {active: false, letter: ''}
    }

    state.selectedTile = null

    state.board = validateBoard(state.board)

    return state
  }
}

function moveEnemies (state, deltaTime, basePosition) {
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

function makeUpdateReducer (deltaTime, basePosition) {
  return function update (state) {
    return moveEnemies(state, deltaTime, basePosition)
  }
}

function makeSpawnEnemiesReducer () {
  return function spawnEnemies (state) {
    state.enemies.push({
      x: 400,
      y: 400,
      health: 30,
      speed: 0.03
    })

    return state
  }
}

export default function App ({DOM, animation}) {

  const selectHandTile$ = DOM
    .select('.hand .tile')
    .events('click')

  const boardClick$ = DOM
    .select('.board .tile')
    .events('click')

  const basePosition$ = DOM
    .select('.base')
    .observable
    .map(el => $(el).position())
    .take(1)

  const placeTileReducer$ = boardClick$
    .map(e => makePlaceTileReducer(e))

  const selectHandTileReducer$ = selectHandTile$
    .map(e => makeSelectHandTileReducer(e))

  const update$ = animation.pluck('delta')
    .withLatestFrom(basePosition$, (deltaTime, basePosition) => makeUpdateReducer(deltaTime, basePosition))

  const spawnEnemyReducer$ = Observable.interval(10000)
    .map(e => makeSpawnEnemiesReducer())

  const reducer$ = Observable.merge(
    selectHandTileReducer$,
    placeTileReducer$,
    update$,
    spawnEnemyReducer$
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
        div(baseHealth <= 0 ? 'You lose!' : '')
      ])
    ))
  };
}
