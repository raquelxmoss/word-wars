import {Observable} from 'rx';
import {div} from '@cycle/dom';
import _ from 'lodash';
import $ from 'jquery';
import { Graph, astar } from 'javascript-astar';

import validateBoard from './validate-board';
import LetterBag from './letter-bag';
import distance from './distance';

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
  enemies: [],
  score: 0
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

function moveTowards (enemy, targetPosition, deltaTime) {
  const speed = enemy.speed * deltaTime;

  const angle = Math.atan2(
    targetPosition.y - enemy.y,
    targetPosition.x - enemy.x
  );

  enemy.x = enemy.x + Math.cos(angle) * speed,
  enemy.y = enemy.y + Math.sin(angle) * speed

  return enemy
}

function moveEnemies (state, deltaTime, basePosition) {
  state.enemies.forEach(enemy => {
    if (enemy.path.length === 0) {
      console.log('attacking base`')
      state.baseHealth -= 0.5;
      return state;
    }

    const node = enemy.path[0]
    const nodePosition = tilePosition(node.row, node.column)

    const tileAtNode = state.board[node.row][node.column]

    if (tileAtNode.active) {
      // shoot
      return
    }

    if (distance(enemy, nodePosition) < 1) {
      enemy.path.shift()
    } else {
      moveTowards(enemy, nodePosition, deltaTime)
    }
  });

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

  const potentialTargets = state.enemies.filter(enemy => {
    const position = tilePosition(row, column);

    return distance(enemy, position) < TILE_RANGE
  })

  if (potentialTargets.length > 0) {
    const enemy = potentialTargets[0];

    enemy.health -= TILE_DAMAGE;
  }
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

function addScore(state, deltaTime) {
  if (state.baseHealth > 0) {
    state.score += deltaTime / 1000
  }

  return state
}

function makeUpdateReducer (deltaTime, basePosition) {
  return function update (startingState) {
    return [
      moveEnemies,
      // shootAtEnemies,
      removeDeadEnemies,
      addScore
    ].reduce((state, updater) => updater(state, deltaTime, basePosition), startingState)
  }
}

const POSITION_MIN = 0;
const POSITION_MAX = 14;

function enemySpawnPosition () {
  const randomPosition = _.random(POSITION_MIN, POSITION_MAX)

  const possibleSpawnPoints = [
    {column: randomPosition, row: POSITION_MIN},
    {column: randomPosition, row: POSITION_MAX},
    {column: POSITION_MIN, row: randomPosition},
    {column: POSITION_MAX, row: randomPosition}
  ]

  return _.sample(possibleSpawnPoints)
}

function calculateEnemyPath (position, state) {
  const graph = new Graph(state.board.map(row =>
      row.map(tile => tile.active ? 5 : 1)
    )
  )

  const start = graph.grid[position.row][position.column]
  // TODO constantize basePosition
  const end = graph.grid[7][7]

  return astar
    .search(graph, start, end)
    .map(node => ({row: node.x, column: node.y}))
}

function makeSpawnEnemiesReducer () {
  return function spawnEnemies (state) {
    const spawnPosition = enemySpawnPosition()
    const position = tilePosition(spawnPosition.row, spawnPosition.column)

    state.enemies.push({
      x: position.x,
      y: position.y,
      health: 30,
      speed: 0.03,
      path: calculateEnemyPath(spawnPosition, state)
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
    .flatMapLatest(i =>  i % 2 === 0 ? Observable.interval(10000 / (i + 1)) : Observable.empty())
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

  return {
    DOM: state$.map(({board, hand, selectedTile, baseHealth, enemies, score}) => (
      div('.game', [
        Math.round(score).toString(),
        renderBoard(board, baseHealth),
        renderHand(hand),
        renderEnemies(enemies),
        JSON.stringify(selectedTile),
        div(baseHealth <= 0 ? 'You lose!' : ''),
      ])
    ))
  };
}
