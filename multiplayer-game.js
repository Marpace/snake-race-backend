const GRID_SIZE = 30;

module.exports = {
  createGameState,
   gameLoop,
   getUpdatedVelocity
}
  
function createGameState(gameType, playerOneColor, playerTwoColor) {
  const players = [
    {
      pos: {
        x: 6,
        y: 15,
      },
      vel: {
        x: 1,
        y: 0,
      },
      snake: [
        {x: 4, y: 15},
        {x: 5, y: 15},
        {x: 6, y: 15},
      ],
      snakeColor: playerOneColor
    }, {
      pos: {
        x: 21,
        y: 15,
      },
      vel: {
        x: -1,
        y: 0,
      },
      snake: [
        {x: 23, y: 15},
        {x: 22, y: 15},
        {x: 21, y: 15},
      ],
      snakeColor: playerTwoColor
    }
  ];
  let food; 
  switch (gameType) {
      case "Classic": case "Pedal to the metal":
          food =   {
              pos: {
                  x: Math.floor(Math.random() * GRID_SIZE),
                  y: Math.floor(Math.random() * GRID_SIZE)
              }
          }
          break;
      case "Live bait": 
          food = {
              pos: {
                  x: Math.floor(Math.random() * GRID_SIZE),
                  y: Math.floor(Math.random() * GRID_SIZE)
              }, 
              vel: {
                  x: 0,
                  y: 0
              }
          }
          break;
          case "All you can eat":
              food = generateFoodPieces(100);
              break;
      default:
      break;
  }
  return {
      players: players,
      food: food,
      gridSize: GRID_SIZE,
      gameType: gameType
  }
};


function gameLoop(state) {
  if (!state) {
    return;
  }

  const result = {
    winner: false,
    foodEaten: false
  }

  const playerOne = state.players[0];
  const playerTwo = state.players[1];
  const food = state.food;

  playerOne.pos.x += playerOne.vel.x;
  playerOne.pos.y += playerOne.vel.y;

  playerTwo.pos.x += playerTwo.vel.x;
  playerTwo.pos.y += playerTwo.vel.y;

  // makes food move for live bait game type 
  if(state.gameType === "Live bait") {
    food.pos.x += food.vel.x
    food.pos.y += food.vel.y

    const randomVel = Math.floor(Math.random() * 3);
    if(randomVel === 1) {
        food.vel = {
            x: Math.floor(Math.random() * 3) - 1,
            y: 0
        }
    }
    if(randomVel === 2) {
        food.vel = {
            x: 0,
            y: Math.floor(Math.random() * 3) - 1
        }
    }

    if(food.pos.x < 0 ) food.pos.x++
    if(food.pos.x >= GRID_SIZE) food.pos.x--
    if(food.pos.y < 0 ) food.pos.y++
    if(food.pos.y >= GRID_SIZE) food.pos.y--
  }

  //if players go out of bounds 
  if (playerOne.pos.x < 0 || playerOne.pos.x >= GRID_SIZE || playerOne.pos.y < 0 || playerOne.pos.y >= GRID_SIZE) {
    result.winner = 2;
    result.foodEaten = false
  }

  if (playerTwo.pos.x < 0 || playerTwo.pos.x >= GRID_SIZE || playerTwo.pos.y < 0 || playerTwo.pos.y >= GRID_SIZE) {
    result.winner = 1;
    result.foodEaten = false
  }

  
  //move snakes and check if they crash into them selves
  if (playerOne.vel.x || playerOne.vel.y) {
    for (let cell of playerOne.snake) {
      if (cell.x === playerOne.pos.x && cell.y === playerOne.pos.y) {
        result.winner = 2;
        result.foodEaten = false
      }
    }
    playerOne.snake.push({ ...playerOne.pos });
    playerOne.snake.shift();
    
  }

  if (playerTwo.vel.x || playerTwo.vel.y) {
    for (let cell of playerTwo.snake) {
      if (cell.x === playerTwo.pos.x && cell.y === playerTwo.pos.y) {
        result.winner = 1;
        result.foodEaten = false
      }
    }
    playerTwo.snake.push({ ...playerTwo.pos });
    playerTwo.snake.shift();
  }
  
  //if players eat a piece of food
  if(state.gameType === "All you can eat") {
    food.forEach(piece => {
        if (piece.x === playerOne.pos.x && piece.y === playerOne.pos.y) {
            food.splice(food.indexOf(piece), 1)
            playerOne.snake.splice(0, 0, playerOne.snake[0]);
            result.winner = false;
            result.foodEaten = 1;
        }
        if (piece.x === playerTwo.pos.x && piece.y === playerTwo.pos.y) {
            food.splice(food.indexOf(piece), 1)
            playerTwo.snake.splice(0, 0, playerTwo.snake[0]);
            result.winner = false;
            result.foodEaten = 2;
        }
    });
  } else {
    if (food.pos.x === playerOne.pos.x && food.pos.y === playerOne.pos.y) {
      playerOne.snake.splice(0, 0, playerOne.snake[0]);
      randomFood(state);
      result.winner = false;
      result.foodEaten = 1;
    }
  
    if (food.pos.x === playerTwo.pos.x && food.pos.y === playerTwo.pos.y) {
      playerTwo.snake.splice(0, 0, playerTwo.snake[0]);
      randomFood(state);
      result.winner = false;
      result.foodEaten = 2;
    } 
  }

  return result;
}

function getUpdatedVelocity(keyCode, state, n) {
  if(state !== undefined) {
    switch (keyCode) {
        case 37: { // left
        if(state.players[n].vel.x === 1) {
          return { x: 1, y: 0 };
        } else {
          return { x: -1, y: 0 };
        }
      }
      case 38: { // down
        if(state.players[n].vel.y === 1) {
          return { x: 0, y: 1 };
        } else {
          return { x: 0, y: -1 };
        }
      }
      case 39: { // right
        if(state.players[n].vel.x === -1) {
          return { x: -1, y: 0 };
        } else {
          return { x: 1, y: 0 };
        }
      }
      case 40: { // up
        if(state.players[n].vel.y === -1) {
          return { x: 0, y: -1 };
        } else {
          return { x: 0, y: 1 };
        }
      }
    }
  }
}


function randomFood(state) {

  const playerOne = state.players[0];
  const playerTwo = state.players[1];
  let food; 

  if(state.gameType === "Classic" || 
      state.gameType === "Pedal to the metal"){
      food = {
          pos: {
              x: Math.floor(Math.random() * GRID_SIZE),
              y: Math.floor(Math.random() * GRID_SIZE),
          }
      }
  }
  if(state.gameType === "Live bait") {
      food = {
          pos: {
              x: Math.floor(Math.random() * GRID_SIZE),
              y: Math.floor(Math.random() * GRID_SIZE),
          }, 
          vel: {
              x: 0,
              y: 0
          }
      }
  }

  for (let cell of playerOne.snake) {
      if (cell.x === food.pos.x && cell.y === food.pos.y) {
      return randomFood(state);
      }
  }
  for (let cell of playerTwo.snake) {
      if (cell.x === food.pos.x && cell.y === food.pos.y) {
      return randomFood(state);
      }
  }
  state.food = food;
}

function generateFoodPieces(amount) {
  const pieces = [];
  for(let i=0; i < amount; i++) {
      pieces.push({
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE),
      })
  }
  return pieces;
}