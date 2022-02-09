var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

var PORT = 3000;
var players = {};

var gameBoard = [
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0]
];
var turnCounter = 0;

app.get('/', function (request, response) {
    response.sendFile(__dirname + '/game.html');
});
app.use("/assets", express.static(__dirname + '/assets'));
app.use("/js", express.static(__dirname + '/js'));

io.sockets.on('connection', function (socket) {
    console.log('New user connected');
    
    players[socket.id] = {
        playerId: socket.id,
    };

    // matchmaking system
    if (Object.keys(players).length == 1) {
        socket.emit('assignRole', 1);
    } else if (Object.keys(players).length == 2) {
        socket.emit('assignRole', 2);
        socket.broadcast.emit('startGamePlayer');
    } if (Object.keys(players).length > 2) {
        socket.emit('fullRoom');
        delete players[socket.id];
        socket.disconnect();
        console.log('User disconnected');
        return;
    };

    socket.on('dropDisc', handleDropDisc);
    socket.on('replayGame', handleReplayGame);
    socket.on('disconnect', handleDisconnect);

    function handleDropDisc(data) {
        // if I exceed the space of a slotRow, the current player has to retry another move
        if (updateGameBoard(data.slotRow, data.playerID) < 0) {
            socket.emit('retryTurn');
        } else {
            io.emit('updateGameBoardVisually', gameBoard);
            turnCounter++;
            if (checkWinCondition(data.playerID)) {
                io.emit('gameOver', data.playerID);
            } else if (turnCounter >= 42) {
                io.emit('gameOver', 0);
            } else {
                socket.broadcast.emit('nextTurn');
            };
        };
    };

    function handleReplayGame() {
        resetGame();
        socket.broadcast.emit('startGamePlayer');
        socket.emit('waitingForTurn');
    };

    function handleDisconnect() {
        delete players[socket.id];
        socket.disconnect();
        console.log('User disconnected');
        if (Object.keys(players).length === 1) {
            socket.broadcast.emit('assignRole', 1);
        };
        resetGame();
        return;
    };
});

function updateGameBoard(slotRow, playerID) {
    slotCol = -1;
    for (var i = gameBoard.length - 1; i >= 0; i--) {
        if (gameBoard[i][slotRow] == 0) {
            // playerID: 1 | 2
            gameBoard[i][slotRow] = playerID;
            slotCol = i;
            break;
        };
    };
    return slotCol;
};

function checkWinCondition(playerID) {
    // horizontalCheck 
    for (var row = 0; row < gameBoard[0].length - 3; row++) {
        for (var col = 0; col < gameBoard.length; col++) {
            if (gameBoard[col][row] == playerID && gameBoard[col][row + 1] == playerID && gameBoard[col][row + 2] == playerID && gameBoard[col][row + 3] == playerID) {
                return true;
            };
        };
    };
    // verticalCheck
    for (var col = 0; col < gameBoard.length - 3; col++) {
        for (var row = 0; row < gameBoard[0].length; row++) {
            if (gameBoard[col][row] == playerID && gameBoard[col + 1][row] == playerID && gameBoard[col + 2][row] == playerID && gameBoard[col + 3][row] == playerID) {
                return true;
            };
        };
    };
    // ascendingDiagonalCheck 
    for (var col = 3; col < gameBoard.length; col++) {
        for (var row = 0; row < gameBoard[0].length; row++) {
            if (gameBoard[col][row] == playerID && gameBoard[col - 1][row + 1] == playerID && gameBoard[col - 2][row + 2] == playerID && gameBoard[col - 3][row + 3] == playerID) {
                return true;
            };
        };
    };
    // descendingDiagonalCheck
    for (var col = 3; col < gameBoard.length; col++) {
        for (var row = 3; row < gameBoard[0].length; row++) {
            if (gameBoard[col][row] == playerID && gameBoard[col - 1][row - 1] == playerID && gameBoard[col - 2][row - 2] == playerID && gameBoard[col - 3][row - 3] == playerID) {
                return true;
            };
        };
    };
    return false;
};

function resetGame() {
    gameBoard = [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0]
    ];
    turnCounter = 0;
    io.emit('clearBoard');
};

server.listen(PORT, function () {
    console.log(`Start listening on http://localhost:${PORT}`);
});

