const GRID_COLOUR = '0x777777';
const GRID_HIGHLIGHT_COLOUR = '0x999999';
const GRID_CLICKED_COLOUR = '#00ff00';
const QUIT_BUTTON_COLOUR = '#E74C3C';
const REPLAY_BUTTON_COLOUR = '#58D68D';
const WHITE_COLOUR = '#FFFFFF';
const GAMEBOARDLENGTH = 6;
const PLAYER_ONE = 1;
const PLAYER_TWO = 2;

var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 200 }
        }
    },
    scene: {
        preload: preload,
        create: create
    }
};

var game = new Phaser.Game(config);
var myPlayerID;
var gridGroup;
var discGroup;

function preload() {
    this.load.image('black', 'assets/black.png');
    this.load.image('white', 'assets/white.png');
}

function create() {
    var self = this;
    this.socket = io();

    playerText = self.add.text(100, 50, "");
    text = self.add.text(100, 100, "");
    replayButton = self.add.text(280, 500, "Play again").setVisible(false);
    quitButton = self.add.text(530, 500, "Quit Game").setVisible(true).setInteractive();

    gridGroup = this.add.group();
    discGroup = this.add.group();
    for (var col = 0; col <= GAMEBOARDLENGTH; col++) {
        var grid = this.add.grid(300 + 50 * col, 340, 50, 300, 50, 50, 0x777777, 0.8);
        grid.number = col;
        gridGroup.add(grid);
    };

    // defining mouse interaction with the grid
    gridGroup.getChildren().forEach(function (slotRow) {
        slotRow.on('pointerover', function () {
            slotRow.setFillStyle(GRID_HIGHLIGHT_COLOUR, 0.9);
        });
        slotRow.on('pointerout', function () {
            slotRow.setFillStyle(GRID_COLOUR, 0.8);
        });
        slotRow.on('pointerdown', function () {
            text.setText("", { fill: GRID_CLICKED_COLOUR });
            self.socket.emit('dropDisc', { slotRow: slotRow.number, playerID: myPlayerID });
            disableGridWithOptionalMessage("Waiting for other player to drop disc");
        });
    });

    // defining mouse interaction with the quit button
    pointerEvent(quitButton, 'pointerover', REPLAY_BUTTON_COLOUR);
    pointerEvent(quitButton, 'pointerout', WHITE_COLOUR);
    quitButton.on('pointerdown', function () {
        gridGroup.clear(true);
        discGroup.clear(true);
        quitButton.setVisible(false);
        quitButton.disableInteractive();
        replayButton.setVisible(false);
        replayButton.disableInteractive();
        playerText.setText("");
        text.setText("You have left the game. Thank you for playing");
        self.socket.disconnect();
    });

    // defining mouse interaction with the replay button
    pointerEvent(replayButton, 'pointerover', QUIT_BUTTON_COLOUR);
    pointerEvent(replayButton, 'pointerout', WHITE_COLOUR);
    replayButton.on('pointerdown', function () {
        self.socket.emit('replayGame');
    });

    this.socket.on("assignRole", handleAssignRole);
    this.socket.on("updateGameBoardVisually", handleUpdateGameBoardVisually);
    this.socket.on("startGamePlayer", handleStartGamePlayer);
    this.socket.on("nextTurn", handleNextTurn);
    this.socket.on("retryTurn", handleRetryTurn);
    this.socket.on("gameOver", handleGameOver);
    this.socket.on("fullRoom", handleFullRoom);
    this.socket.on("clearBoard", handleClearBoard);
    this.socket.on("waitingForTurn", handleWaitingForTurn);
    this.socket.on("disconnect", handleDisconnect);

    function handleAssignRole(data) {
        myPlayerID = data;
        if (myPlayerID == PLAYER_ONE) {
            playerText.setText("You are Player " + data + " [Black]");
            text.setText("Waiting Player 2 to join");
        } else if (myPlayerID == PLAYER_TWO) {
            playerText.setText("You are Player " + data + " [White]");
            text.setText("Waiting for other player to drop disc");
        };
    };

    function handleUpdateGameBoardVisually(gameBoard) {
        discGroup.clear(true);
        for (var row = 0; row < gameBoard[0].length; row++) {
            for (var col = 0; col < gameBoard.length; col++) {
                if (gameBoard[col][row] == PLAYER_ONE) {
                    discGroup.add(self.add.image(300 + 50 * row, 215 + 50 * col, 'black').setDisplaySize(50, 50));
                } else if (gameBoard[col][row] == PLAYER_TWO) {
                    discGroup.add(self.add.image(300 + 50 * row, 215 + 50 * col, 'white').setDisplaySize(50, 50));
                };
            };
        };
    };

    function handleStartGamePlayer() {
        enableGridWithOptionalMessage("It's your turn to drop as disc");
    };

    function handleNextTurn() {
        enableGridWithOptionalMessage("It's your turn to drop as disc");
    };

    function handleRetryTurn() {
        enableGridWithOptionalMessage("No space on this row, please try again");
    };

    function handleGameOver(playerID) {
        if (playerID == 0) {
            text.setText("It is a draw");
        } else {
            text.setText("Player " + playerID + " has won the game");
        }
        gridGroup.getChildren().forEach(function (slotRowY) {
            slotRowY.disableInteractive();
        });
        replayButton.setVisible(true);
        replayButton.setInteractive();
    };

    function handleFullRoom() {
        gridGroup.clear(true);
        quitButton.setVisible(false);
        quitButton.disableInteractive();
        text.setText("Room is full: join again to see if the room is free");
    };

    function handleClearBoard() {
        replayButton.setVisible(false);
        replayButton.disableInteractive();
        discGroup.clear(true);
    };

    function handleWaitingForTurn() {
        text.setText("Waiting for other player to drop disc");
    };

    function handleDisconnect() {
        discGroup.clear(true);
    };
};
function pointerEvent(object, event, color) {
    object.on(event, function () {
        object.setStyle({ fill: color });
    });
};

function enableGridWithOptionalMessage(message) {
    gridGroup.getChildren().forEach(function (slotRow) {
        slotRow.setInteractive();
    });
    text.setText(message);
};

function disableGridWithOptionalMessage(message) {
    gridGroup.getChildren().forEach(function (slotRowY) {
        slotRowY.disableInteractive();
    });
    text.setText(message);
};