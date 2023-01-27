const express = require('express');
const app = express();
const http = require('http');
const { env } = require('process');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {cors: {origin: "*"}});

const { 
  createGameState, 
  gameLoop, 
  getUpdatedVelocity 
} = require('./multiplayer-game');

const { makeId } = require("./utils");
const port = process.env.PORT || 5000;

const socketRooms = {};
const rooms = {};
const gameState = {};
let FRAME_RATE;
let playerOneFoodCount = 0;
let playerTwoFoodCount = 0;
let isTurning = false;
let goal = 10;
const snakeColors = [
  "rgb(136, 241, 210)",
  "rgb(255, 239, 92)"
]


app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

io.on('connection', (socket) => {  
  

  socket.on("newGame", handleNewGame);
  socket.on("joinGame", handleJoinGame);
  socket.on("startGame", handleStartGame);
  socket.on("keydown", handleKeydown);
  socket.on("sendMessage", handleSendMessage);
  socket.on("userTyping", handleUserTyping);
  socket.on("goalInputChange", handleGoalInputChange)
  socket.on("speedInputChange", handleSpeedInputChange)
  socket.on("updateSnakeColor", handleUpdateSnakeColor);
  socket.on("updateGameType", handleUpdateGameType);
  socket.on("leaveRoom", handleLeaveRoom);
  socket.on("switchPlayer", handleSwitchPlayer)



  socket.on("showHeight", handleShowHeight)
  function handleShowHeight(height) {
    console.log(height)
  }


  function handleNewGame(name) {
    let roomName = makeId(5);
    socketRooms[socket.id] = roomName;
    socket.emit("gameCode", roomName)


    rooms[roomName] = {
      playerCount: 1, 
      playerOneName: name, 
      playerTwoName: null
    }; 
 
    socket.join(roomName);
    socket.number = 1;
    // socket.emit("init", 1);
    // io.sockets.in(roomName).emit('displayPlayerOne' , name)
  }

  function handleJoinGame(data) {
    const gameCode = data.code
    const nickname = data.nickname

    if(!rooms[gameCode]) {
      socket.emit('unknownCode')
      return;
    } else if(rooms[gameCode].playerCount > 1)  {
      socket.emit('roomIsFull')
      return;
    }


    socketRooms[socket.id] = gameCode;
    rooms[gameCode].playerCount = 2;
    rooms[gameCode].playerTwoName = nickname;
    socket.join(gameCode);
    socket.number = 2;

    socket.emit("joinGame");
    
    io.sockets.in(gameCode)
    .emit('setPlayerNames', {
      playerOneName: rooms[gameCode].playerOneName, 
      playerTwoName: nickname
    });

    const message = `Waiting for ${rooms[gameCode].playerOneName} to start the game`
    io.sockets.in(gameCode).emit("updateGameMessage", message)

    socket.broadcast.emit('postMessage', {
      messageContent: `${nickname} has joined the game`,
      messageType: "text",
      author: "server",
      id: makeId(6)
    })
    socket.broadcast.emit("postAlert", `${nickname} has joined the game`)
  }

  function handleStartGame(data) {
    if(!rooms[data.gameCode]) return;
    if(rooms[data.gameCode].playerCount < 2){
      socket.emit('notEnoughPlayers')
      return;
    }
    console.log(rooms[data.gameCode].playerCount)


    goal = data.goal;
    if (data.gameType === "Pedal to the metal") {
      FRAME_RATE = 5
    } else {
      FRAME_RATE = Number(data.speed) + 3;
    }
    gameState[data.gameCode] = createGameState(data.gameType, snakeColors[0], snakeColors[1]);

  
    startCountdown(data.gameCode)
    setTimeout(() => {
      data.gameType === "Pedal to the metal" 
      ? startGameTimeout(data.gameCode)
      : startGameInterval(data.gameCode)
    }, 3000);
  }

  function handleKeydown(keyCode) {
    if(isTurning) return;
    isTurning = true;
    try {
      keyCode = parseInt(keyCode);
    } catch(e) {
      console.error(e);
      return;
    }
    const code = socketRooms[socket.id]
    const vel = getUpdatedVelocity(keyCode, gameState[code], socket.number - 1);
    if(vel) {
      gameState[code].players[socket.number -1].vel = vel;
    }
  }

  function handleSendMessage(data) {
    const newData = {
      ...data, 
      author: socket.number,
      id: makeId(6)
    }
    const roomName = socketRooms[socket.id];
    io.sockets.in(roomName)
    .emit('postMessage', newData)
  }

  function handleUserTyping(playerNumber) {
    const code = socketRooms[socket.id]
    const name = playerNumber == 1 ? rooms[code].playerOneName : rooms[code].playerTwoName
    socket.broadcast.emit("typing", name)
  }

  function handleGoalInputChange(value) {
    socket.broadcast.emit("updateGoal", value)
    goal = Number(value);
  }

  function handleSpeedInputChange(value) {
    socket.broadcast.emit("updateSpeed", value)
  }

  function handleUpdateSnakeColor(data) {
    snakeColors[data.playerNumber - 1] = data.color;
  }

  function handleUpdateGameType(gameType) {
    socket.broadcast.emit("updateGameType", gameType);
  }

  function startCountdown(code) {
    let count = 3;
    io.sockets.in(code).emit("updateCounter", count)
    const counterInterval = setInterval(() => {
      count--
      io.sockets.in(code).emit("updateCounter", count);
      if(count <= 0) {
        io.sockets.in(code).emit("clearGameMessage")
        clearInterval(counterInterval);
      } 
    }, 1000);
  }
  
  // function emitCounter(count, code) {
  //   // setTimeout(() => {
  //   //   count--;
  //   //   console.log(count)
  //   //   io.sockets.in(code).emit("updateCounter", count);
  //   //   if(count >= 2) emitCounter();
  //   // }, 1000)

  //   const counterInterval = setInterval((count, code) => {
  //     count--
  //     console.log(count);
  //     io.sockets.in(code).emit("updateCounter", count);
  //     if(count <= 0) clearInterval(counterInterval);
  //   }, 1000);

  // }

  socket.on("disconnecting", () => {
    leaveRoom();
  })


  function handleLeaveRoom() {
    leaveRoom()
  }

  function leaveRoom() {
    const code = socketRooms[socket.id];
    socket.leave(code);
    if(socket.number == 1) {
      const playerName = rooms[code].playerOneName;
      const data = {
        messageContent: `${playerName} has left the game`,
        messageType: "text",
        author: "server",
        id: makeId(6)
      }
      io.sockets.in(code).emit("playerOneLeft", code)
      io.sockets.in(code).emit("postMessage", data)
      io.sockets.in(code).emit("postAlert", `${playerName} has left the game`)
    }
    if(socket.number == 2) {
      const playerName = rooms[code].playerTwoName
      rooms[code].playerCount--
      const data = {
        messageContent: `${playerName} has left the game`,
        messageType: "text",
        author: "server",
        id: makeId(6)
      }
      io.sockets.in(code).emit("postMessage", data)
      io.sockets.in(code).emit("postAlert", `${playerName} has left the game`)

    }
  }

  function handleSwitchPlayer(name) {
    const code = socketRooms[socket.id];
    socket.number = 1;
    rooms[code].playerCount = 1, 
    rooms[code].playerOneName = name, 
    rooms[code].playerTwoName = null
  }


});




function startGameInterval(roomName) {
  // let timerIntervalId;
  // if(gameState[roomName].gameType === "All you can eat") {
    // timerIntervalId = setInterval(() => {
      // io.sockets.in(roomName)
      // .emit('updateAllYouCanEatTimer', allYouCanEatSeconds)
      // allYouCanEatSeconds--
      // if(allYouCanEatSeconds < 0 ){
        // let winner;
        // clearInterval(timerIntervalId)
        //   if(playerOneFoodCount > playerTwoFoodCount) winner = 1;
        //   if(playerTwoFoodCount > playerOneFoodCount) winner = 2;
        //   emitGameOver(roomName, winner, gameIntervalId);
        //   clearImmediate(timerIntervalId);
        //   allYouCanEatSeconds = 60;
        // } 
      // }, 1000);
    // }
    const gameIntervalId = setInterval(() => {
    const result = gameLoop(gameState[roomName]);
    if(result.winner === false) {
      emitGameState(roomName, result.foodEaten)
      if(gameState[roomName].gameType !== "All you can eat"){
        if(playerOneFoodCount === goal){
          const winner = 1
          emitGameOver(roomName, winner, gameIntervalId)
        }
        if(playerTwoFoodCount === goal){
          const winner = 2
          emitGameOver(roomName, winner, gameIntervalId)
        }
      }
    }
    else {
      // if(gameState[roomName].gameType === "All you can eat") {
      //   clearInterval(timerIntervalId);
      //   allYouCanEatSeconds = 60;
      // };
      emitGameOver(roomName, result.winner, gameIntervalId)
    }
    isTurning = false;
  }, 1000 / FRAME_RATE);
}

function startGameTimeout(roomName) {
  setTimeout(() => {
    const result = gameLoop(gameState[roomName]);
    if(!result.winner) {
      emitGameState(roomName, result.foodEaten);
      if(playerOneFoodCount === goal){
        const winner = 1
        emitGameOver(roomName, winner);
      } 
      else if(playerTwoFoodCount === goal){
        const winner = 2
        emitGameOver(roomName, winner);
      }
      else {
        startGameTimeout(roomName)
      }
    }
    else {
      emitGameOver(roomName, result.winner);
    }
    isTurning = false;
  }, 1000 / FRAME_RATE);
}




function emitGameState(gameCode, foodEaten) {
  const gameType = gameState[gameCode].gameType;
  io.sockets.in(gameCode)
  .emit("gameState", gameState[gameCode]);
  if(foodEaten !== false) {
    if(foodEaten == 1) playerOneFoodCount++;
    if(foodEaten == 2) playerTwoFoodCount++;
    const data = {playerOne: playerOneFoodCount, playerTwo: playerTwoFoodCount}
    io.sockets.in(gameCode).emit("updateFoodCount", data)
  }
  if(gameType === "Pedal to the metal" && foodEaten !== false) FRAME_RATE++
}

function emitGameOver(gameCode, winner, intervalId){
  const gameType = gameState[gameCode].gameType;
  io.sockets.in(gameCode)
  .emit("gameOver", winner);
  // gameState[gameCode] = createGameState(gameType);
  playerOneFoodCount = 0;
  playerTwoFoodCount = 0;
  if(gameType !== "Pedal to the metal") clearInterval(intervalId);
  io.sockets.in(gameCode)
  .emit('updateStats', winner)
}



server.listen(port, () => {
  console.log('listening on port: 5000');
});
