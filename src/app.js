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
  score: 0,
  draggingTile: null,
  mousePosition: {x: 0, y: 0},
  attacks: []
};

function Tile ({active = false, letter = '', health = 100, maxHealth = 100} = {}) {
  return {active, letter, health, maxHealth};
}

function Attack ({start, end, displayTime = 500, maxDisplayTime = 500} = {}) {
  return {start, end, displayTime, maxDisplayTime}
}

function renderTile (tile, coordinate) {
  const tileIsBase = tile.letter === '*';
  const position = coordinateToPosition(coordinate);

  let style = {
    top: position.y + 'px',
    left: position.x + 'px'
  };

  if (tile.letter !== '') {
    style.opacity = tile.health / tile.maxHealth
  }

  if (tileIsBase) {
    Object.assign(style, {background: `rgb(0, 0, 240)`});
  }

  return (
    div(
      `.tile ${tile.letter === '' ? '' : '.active'} ${tile.active ? '.valid' : ''} ${tileIsBase ? '.base' : ''}`,
      {style},
      tile.letter
    )
  );
}

function renderDraggingTile (tile, mousePosition) {
  if (tile === null) { return }

  let style = {
    top: mousePosition.y + 'px',
    left: mousePosition.x + 'px',
    position: 'absolute'
  };

  if (tile.letter !== '') {
    style.opacity = tile.health / tile.maxHealth
  }

  return (
    div(
      `.tile ${tile.letter === '' ? '' : '.active'}`,
      {style, key: 8796}, //TODO: setup keys properly
      tile.letter
    )
  );
}

function renderRow (row, rowIndex) {
  return (
    div('.row', row.map((tile, column) => renderTile(tile, {row: rowIndex, column})))
  );
}

function renderBoard (board) {
  return (
    div('.board', board.map((row, rowIndex) => renderRow(row, rowIndex)))
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

function renderAttacks (attacks) {
  return (
    div('.attacks', attacks.map(attack => line(attack.start, attack.end, attack)))
  )
}

// http://stackoverflow.com/a/5912283
function createAttackLine(x, y, length, angle, attack) {
  const style = {
    'border': '1px solid red',
    'width': length + 'px',
    'height': '0px',
    '-moz-transform': 'rotate(' + angle + 'rad)',
    '-webkit-transform': 'rotate(' + angle + 'rad)',
    '-o-transform': 'rotate(' + angle + 'rad)',
    '-ms-transform': 'rotate(' + angle + 'rad)',
    'position': 'absolute',
    'top': y + 'px',
    'left': x + 'px',
    'opacity': attack.displayTime / attack.maxDisplayTime
  }

  return div('.attack-line', {style})
}

// http://stackoverflow.com/a/5912283
function line({x: x1, y: y1}, {x: x2, y: y2}, attack) {
  var a = x1 - x2,
      b = y1 - y2,
      c = Math.sqrt(a * a + b * b);

  var sx = (x1 + x2) / 2,
      sy = (y1 + y2) / 2;

  var x = sx - c / 2,
      y = sy;

  var angle = Math.PI - Math.atan2(-b, a);

  return createAttackLine(x, y, c, angle, attack);
}

function makeSelectHandTileReducer (event) {
  return function selectHandTile (state) {
    const selectedTileIndex = $(event.target).index();
    const tile = state.hand[selectedTileIndex];

    state.hand.splice(selectedTileIndex, 1);

    return Object.assign(
      {},
      state,
      {
        selectedTile: {location: 'hand', position: selectedTileIndex},
        draggingTile: tile
      }
    );
  };
}

function randomLetter () {
  return bag.draw();
}

function makeDragBoardTileReducer (e) {
  const column = $(e.target).index();
  const row = $(e.target).parent().index();

  return function dragBoardTile (state) {
    if (state.board[row][column].letter === '') { return state }
    if (state.board[row][column].letter === '*') { return state }

    state.draggingTile = state.board[row][column];
    state.board[row][column] = Tile();

    return state
  }
}

function makePlaceTileReducer (event) {
  return function placeTile (state) {
    const {column, row} = positionToCoordinate(state.mousePosition);

    if (state.draggingTile === null) {
      return state;
    }

    if (state.draggingTile !== null && state.board[row][column].letter !== '') {
      state.hand.push(state.draggingTile)
      state.draggingTile = null
      return state;
    }

    state.board[row][column] = state.draggingTile;

    if (state.hand.length < 10) { // TODO: constantize hand length
      state.hand.push(Tile({letter: randomLetter()}));
    }

    return Object.assign(
      {},
      state,
      {
        enemies: updateEnemyPaths(state),
        board: validateBoard(state.board),
        selectedTile: null,
        draggingTile: null
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

  const position = coordinateToPosition(coordinate);

  const potentialTargets = state.enemies.filter(enemy => {
    return distance(enemy, position) < TILE_RANGE;
  });

  if (potentialTargets.length > 0) {
    const enemy = potentialTargets[0];

    state.attacks.push(Attack({start: position, end: {x: enemy.x, y: enemy.y}}));

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

function fadeOutAttacks (state, deltaTime) {
  return Object.assign(
    {},
    state,
    {
      attacks: state.attacks
        .map(attack => Object.assign({}, attack, {displayTime: attack.displayTime - deltaTime}))
        .filter(attack => attack.displayTime > 0)
    }
  )
}

function makeUpdateReducer (deltaTime, basePosition) {
  return function update (startingState) {
    return [
      moveEnemies,
      shootAtEnemies,
      removeDeadEnemies,
      removeDeadTiles,
      addScore,
      fadeOutAttacks
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

function makeUpdateMousePositionReducer (mousePosition) {
  return function updateMousePosition (state) {
    return Object.assign({}, state, {mousePosition})
  }
}

function mousePosition (e, gamePosition) {
  return {
    x: e.clientX - gamePosition.left,
    y: e.clientY - gamePosition.top
  }
}

export default function App ({DOM, animation}) {
  const selectHandTile$ = DOM
    .select('.hand .tile')
    .events('mousedown');

  const selectBoardTile$ = DOM
    .select('.board .tile')
    .events('mousedown');

  const dropTileOnBoard$ = DOM
    .select('.app *')
    .events('mouseup')

  const basePosition$ = DOM
    .select('.base')
    .observable
    .map(el => $(el).position())
    .take(1);

  const gamePosition$ = DOM
    .select('.game')
    .observable
    .map(el => $(el).position())
    .take(1);

  const mousePosition$ = DOM
    .select('.app *')
    .events('mousemove', true)
    .withLatestFrom(gamePosition$, mousePosition)

  const updateMousePosition$ = mousePosition$
    .map(position => makeUpdateMousePositionReducer(position))

  const placeTileReducer$ = dropTileOnBoard$
    .map(e => makePlaceTileReducer(e))

  const dragBoardTile$ = selectBoardTile$
    .map(e => makeDragBoardTileReducer(e));

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
    spawnEnemyReducer$,
    updateMousePosition$,
    dragBoardTile$
  );

  const state$ = reducer$
    .startWith(initialState)
    .scan((state, reducer) => reducer(state))
    .distinctUntilChanged(JSON.stringify)

  return {
    DOM: state$.map(({board, hand, selectedTile, enemies, score, draggingTile, mousePosition, attacks}) => (
      div('.game', [
        renderHand(hand),
        div('.score', `Score: ${Math.round(score)}`),
        renderBoard(board),
        renderEnemies(enemies),
        renderAttacks(attacks),
        div('.selected-tile-info',  JSON.stringify(selectedTile)),
        div('.game-over', base(board).health <= 0 ? 'Game over!' : ''),
        renderDraggingTile(draggingTile, mousePosition)
      ])
    ))
  };
}
