import {Observable} from 'rx';
import {div} from '@cycle/dom';
import _ from 'lodash';
import $ from 'jquery';

import validateBoard from './validate-board';
import LetterBag from './letter-bag';

const board = _.range(0, 15).map(function(){
  return _.range(0, 15).map(() => ({active: false, letter: ''}))
})

board[7][7] = {letter: "*", active: false}

const bag = LetterBag()

const maxBaseHealth = 100;


const initialState = {
  board,
  hand: _.range(0, 10).map(() => ({letter: randomLetter(), active: false})),
  selectedTile: null,
  baseHealth: 100,
  enemies: []
}

function renderTile(tile, baseHealth, {row, column}) {
  const tileIsBase = tile.letter === "*";
  const position = tilePosition(row, column);

  let style = {
    top: position.y + 'px',
    left: position.x + 'px',
  };


  if (tileIsBase) {
    Object.assign(style, {background: `rgba(0, 0, 240, ${baseHealth / maxBaseHealth})`});
  }

  return (
    div(
      `.tile ${tile.letter === "" ? "" : '.active'} ${tile.active ? '.valid' : ''} ${tileIsBase ? ".base" : ""}`,
      {style},
      tile.letter
    )
  )
}

function renderRow(row, rowIndex, baseHealth) {
  return (
    div('.row', row.map((tile, column) => renderTile(tile, baseHealth, {row: rowIndex, column})))
  )
}


function renderBoard (board, baseHealth) {
  return (
    div('.board', board.map((row, rowIndex) => renderRow(row, rowIndex, baseHealth)))
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

function range (pointA, pointB) {
  const distance = {
    x: Math.abs(pointA.left - pointB.x),
    y: Math.abs(pointA.top - pointB.y)
  }

  return Math.sqrt(
    Math.pow(distance.x, 2),
    Math.pow(distance.y, 2)
  );
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

//TODO - this probably belongs on the tile object
const TILE_RANGE = 100;
const TILE_DAMAGE = 0.5;
const TILE_WIDTH = 40;
const TILE_HEIGHT = 40;
const PADDING = 6;
const MARGIN = 30;

function tilePosition (row, column) {
  return {x: column * (TILE_WIDTH + PADDING) + MARGIN, y: row * (TILE_HEIGHT + PADDING) + MARGIN};
}

function targetAndShootEnemy (state, tile, {row, column}) {
  if (!tile.active) {
    return;
  }

  const potentialTarget = state.enemies.filter(enemy => {
    const position = tilePosition(row, column);

    const distanceVector = {
      x: Math.abs(position.x - enemy.x),
      y: Math.abs(position.y - enemy.y)
    }

    const distance = Math.sqrt(
      Math.pow(distanceVector.x, 2),
      Math.pow(distanceVector.y, 2)
    );

    if (distance < TILE_RANGE) {
      enemy.health -= TILE_DAMAGE;
    }
  })
}

function shootAtEnemies (state, deltaTime, basePosition) {
  state.board.forEach((row, rowIndex) =>
    row.forEach((tile, column) =>
      targetAndShootEnemy(state, tile, {row: rowIndex, column})
    )
  )

  return state;
}

function removeDeadEnemies(state) {
  return Object.assign({}, state, {enemies: state.enemies.filter(enemy => enemy.health > 0)})
}

function makeUpdateReducer (deltaTime, basePosition) {
  return function update (startingState) {
    return [
      moveEnemies,
      shootAtEnemies,
      removeDeadEnemies
    ].reduce((state, updater) => updater(state, deltaTime, basePosition), startingState)
  }
}

const POSITION_MIN = 10;
const POSITION_MAX = 700;

function enemySpawnPosition () {
  const randomPosition = _.random(POSITION_MIN, POSITION_MAX)

  const possibleSpawnPoints = [
    {x: randomPosition, y: POSITION_MIN},
    {x: randomPosition, y: POSITION_MAX},
    {x: POSITION_MIN, y: randomPosition},
    {x: POSITION_MAX, y: randomPosition}
  ]

  return _.sample(possibleSpawnPoints)
}

function makeSpawnEnemiesReducer () {
  return function spawnEnemies (state) {
    const spawnPosition = enemySpawnPosition()

    state.enemies.push({
      x: spawnPosition.x,
      y: spawnPosition.y,
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

  const spawnEnemyReducer$ = Observable.interval(3000)
    .startWith('go!')
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
