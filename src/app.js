import {Observable} from 'rx';
import {div} from '@cycle/dom';
import _ from 'lodash';
import $ from 'jquery';
import { Graph, astar } from 'javascript-astar';

import validateBoard from './validate-board';
import LetterBag from './letter-bag';
import distance from './distance';

const board = _.range(0, 15).map(() =>
  _.range(0, 15).map(() => Tile())
);

board[7][7] = Tile({letter: '*'});

const bag = LetterBag();

const maxBaseHealth = 100;

const initialState = {
  board,
  hand: _.range(0, 10).map(() => Tile({letter: randomLetter()})),
  selectedTile: null,
  enemies: [],
  score: 0
};

function Tile ({active = false, letter = '', health = 100} = {}) {
  return {active, letter, health};
}

function renderTile (tile, baseHealth, coordinate) {
  const tileIsBase = tile.letter === '*';
  const position = coordinateToPosition(coordinate);

  let style = {
    top: position.y + 'px',
    left: position.x + 'px'
  };

  if (tileIsBase) {
    Object.assign(style, {background: `rgba(0, 0, 240, ${baseHealth / maxBaseHealth})`});
  }

  return (
    div(
      `.tile ${tile.letter === '' ? '' : '.active'} ${tile.active ? '.valid' : ''} ${tileIsBase ? '.base' : ''}`,
      {style},
      tile.letter
    )
  );
}

function renderRow (row, rowIndex, baseHealth) {
  return (
    div('.row', row.map((tile, column) => renderTile(tile, baseHealth, {row: rowIndex, column})))
  );
}

function renderBoard (board, baseHealth) {
  return (
    div('.board', board.map((row, rowIndex) => renderRow(row, rowIndex, baseHealth)))
  );
}

function renderHand (hand) {
  return (
    div('.hand', hand.map(renderTile))
  );
}

function renderEnemy (enemy) {
  const style = {
    position: 'absolute',
    left: enemy.x + 'px',
    top: enemy.y + 'px'
  };

  return (
    div('.enemy', {style})
  );
}

function renderEnemies (enemies) {
  return (
    div('.enemies', enemies.map(renderEnemy))
  );
}

function makeSelectHandTileReducer (event) {
  return function selectHandTile (state) {
    const selectedTileIndex = $(event.target).index();

    return Object.assign({}, state, {selectedTile: {location: 'hand', position: selectedTileIndex}});
  };
}

function randomLetter () {
  return bag.draw();
}

function makePlaceTileReducer (event) {
  const column = $(event.target).index();
  const row = $(event.target).parent().index();

  return function placeTile (state) {
    if (state.selectedTile === null && state.board[row][column].letter !== '') {
      state.selectedTile = {location: 'board', position: {row, column}};

      return state;
    }

    if (state.selectedTile === null) {
      return state;
    }

    if (state.selectedTile !== null && state.board[row][column].letter !== '') {
      return state;
    }

    if (state.selectedTile.location === 'hand') {
      state.board[row][column] = state.hand[state.selectedTile.position];
      state.hand.splice(state.selectedTile.position, 1);
      state.hand.push(Tile({letter: randomLetter()}));
    } else {
      const position = state.selectedTile.position;

      state.board[row][column] = state.board[position.row][position.column];
      state.board[position.row][position.column] = Tile();
    }

    return Object.assign(
      {},
      state,
      {
        enemies: updateEnemyPaths(state),
        board: validateBoard(state.board),
        selectedTile: null
      }
    );
  };
}

function moveTowards (enemy, targetPosition, deltaTime) {
  const speed = enemy.speed * deltaTime;

  const angle = Math.atan2(
    targetPosition.y - enemy.y,
    targetPosition.x - enemy.x
  );

  enemy.x = enemy.x + Math.cos(angle) * speed;
  enemy.y = enemy.y + Math.sin(angle) * speed;

  return enemy;
}

function base (board) {
  return board[7][7];
}

function moveEnemies (state, deltaTime, basePosition) {
  state.enemies.forEach(enemy => {
    if (enemy.path.length === 0) {
      base(state.board).health -= 0.5;

      return state;
    }

    const coordinate = enemy.path[0];
    const nodePosition = coordinateToPosition(coordinate);
    const tileAtNode = state.board[coordinate.row][coordinate.column];

    if (tileAtNode.active) {
      tileAtNode.health -= enemy.damage * deltaTime;
      return;
    }

    if (distance(enemy, nodePosition) < 1) {
      enemy.path.shift();
    } else {
      moveTowards(enemy, nodePosition, deltaTime);
    }
  });

  return state;
}

// TODO - this probably belongs on the tile object
const TILE_RANGE = 100;
const TILE_DAMAGE = 0.5;
const TILE_WIDTH = 40;
const TILE_HEIGHT = 40;
const PADDING = 6;
const MARGIN = 30;

function coordinateToPosition ({row, column}) {
  return {
    x: column * (TILE_WIDTH + PADDING) + MARGIN,
    y: row * (TILE_HEIGHT + PADDING) + MARGIN
  };
}

function positionToCoordinate ({x, y}) {
  return {
    column: Math.floor((x - MARGIN) / (TILE_WIDTH + PADDING)),
    row: Math.floor((y - MARGIN) / (TILE_HEIGHT + PADDING))
  };
}

function targetAndShootEnemy (state, tile, coordinate) {
  if (!tile.active) {
    return;
  }

  const potentialTargets = state.enemies.filter(enemy => {
    const position = coordinateToPosition(coordinate);

    return distance(enemy, position) < TILE_RANGE;
  });

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
  );

  return state;
}

function removeDeadEnemies (state) {
  return Object.assign({}, state, {enemies: state.enemies.filter(enemy => enemy.health > 0)});
}

function removeDeadTiles (state) {
  let removedTileCount = 0;

  const board = state.board.map(row =>
    row.map(tile => {
      if (tile.active && tile.health < 0) {
        removedTileCount++;

        return Tile({health: 0});
      }

      return tile;
    })
  );

  if (removedTileCount > 0) {
    return Object.assign({}, state, {board: validateBoard(board), enemies: updateEnemyPaths(state)});
  }

  return Object.assign({}, state, {board});
}

function addScore (state, deltaTime) {
  if (base(state.board).health > 0) {
    state.score += deltaTime / 1000;
  }

  return state;
}

function makeUpdateReducer (deltaTime, basePosition) {
  return function update (startingState) {
    return [
      moveEnemies,
      shootAtEnemies,
      removeDeadEnemies,
      removeDeadTiles,
      addScore
    ].reduce((state, updater) => updater(state, deltaTime, basePosition), startingState);
  };
}

const POSITION_MIN = 0;
const POSITION_MAX = 14;

function enemySpawnCoordinate () {
  const randomPosition = _.random(POSITION_MIN, POSITION_MAX);

  const possibleSpawnPoints = [
    {column: randomPosition, row: POSITION_MIN},
    {column: randomPosition, row: POSITION_MAX},
    {column: POSITION_MIN, row: randomPosition},
    {column: POSITION_MAX, row: randomPosition}
  ];

  return _.sample(possibleSpawnPoints);
}

function calculateEnemyPath (position, state) {
  const graph = new Graph(state.board.map(row =>
      row.map(tile => tile.active ? 3 : 1)
    )
  );

  const start = graph.grid[position.row][position.column];
  // TODO constantize basePosition
  const end = graph.grid[7][7];

  let result;

  try {
    result = astar
      .search(graph, start, end)
      .map(node => ({row: node.x, column: node.y}));
  } catch (e) {
    console.error(e);
    debugger;
  }

  return result;
}

function updateEnemyPaths (state) {
  return state.enemies.map(enemy => {
    return Object.assign({}, enemy, {path: calculateEnemyPath(positionToCoordinate(enemy), state).slice(1)});
  });
}

function makeSpawnEnemiesReducer () {
  return function spawnEnemies (state) {
    const spawnCoordinate = enemySpawnCoordinate();
    const position = coordinateToPosition(spawnCoordinate);

    state.enemies.push({
      x: position.x,
      y: position.y,
      health: 30,
      damage: 0.1,
      speed: 0.03,
      path: calculateEnemyPath(spawnCoordinate, state)
    });

    return state;
  };
}

export default function App ({DOM, animation}) {
  const selectHandTile$ = DOM
    .select('.hand .tile')
    .events('click');

  const boardClick$ = DOM
    .select('.board .tile')
    .events('click');

  const basePosition$ = DOM
    .select('.base')
    .observable
    .map(el => $(el).position())
    .take(1);

  const placeTileReducer$ = boardClick$
    .map(e => makePlaceTileReducer(e));

  const selectHandTileReducer$ = selectHandTile$
    .map(e => makeSelectHandTileReducer(e));

  const update$ = animation.pluck('delta')
    .withLatestFrom(basePosition$, (deltaTime, basePosition) => makeUpdateReducer(deltaTime, basePosition));

  const spawnEnemyReducer$ = Observable.generateWithRelativeTime(
      1,
      () => true,
      (i) => i + 1,
      (i) => i,
      (i) => {
        console.log(i);
        const pauseFromWave = i % 2 !== 0;

        if (pauseFromWave) {
          console.log('pause duration', 10000 * (1 + i / 5));
          return 10000 * (1 + i / 7);
        }

        return 10000;
      }
    )
    .flatMapLatest(i => {
      const pauseFromWave = i % 2 === 0;

      console.log('starting wave', i, pauseFromWave ? 'pause' : 'attack!');

      if (pauseFromWave) {
        return Observable.empty();
      }

      console.log('attack freq', 10000 / Math.pow((Math.sin(i * 0.28) * 8 + i * 2), 1.3));
      return Observable.interval(10000 / Math.pow((Math.sin(i * 0.28) * 8 + i * 2), 1.3));
    })
    .startWith('go!')
    .map(e => makeSpawnEnemiesReducer());

  const reducer$ = Observable.merge(
    selectHandTileReducer$,
    placeTileReducer$,
    update$,
    spawnEnemyReducer$
  );

  const state$ = reducer$
    .startWith(initialState)
    .scan((state, reducer) => reducer(state))
    .distinctUntilChanged(JSON.stringify);

  return {
    DOM: state$.map(({board, hand, selectedTile, enemies, score}) => (
      div('.game', [
        renderHand(hand),
        div('.score', `Score: ${Math.round(score)}`),
        renderBoard(board, base(board).health),
        renderEnemies(enemies),
        div('.selected-tile-info', JSON.stringify(selectedTile)),
        div('.game-over', base(board).health <= 0 ? 'Game over!' : ''),
      ])
    ))
  };
}
