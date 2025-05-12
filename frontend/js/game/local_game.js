import { __ } from '../lang/i18n.js';
import { initializeTheme } from '../lang/theme.js';

export function localGame() {
    // Game configuration
    const GAME_WIDTH = 800;
    const GAME_HEIGHT = 480;
    const PADDLE_HEIGHT = 100;
    const PADDLE_WIDTH = 10;
    const BALL_RADIUS = 8;
    const PADDLE_SPEED = 10;
    const INITIAL_BALL_SPEED = 4;
    const WIN_SCORE = 10;

    // Game elements
    const gameBoard = document.getElementById("gameBoard");
    const ball = document.getElementById("ball");
    const paddleLeft = document.getElementById("paddleLeft");
    const paddleRight = document.getElementById("paddleRight");
    const scoreLeft = document.getElementById("score_left");
    const scoreRight = document.getElementById("score_right");
    const pauseOverlay = document.getElementById("pauseOverlay");
    const pauseMessage = document.getElementById("pauseMessage");
    const startButton = document.getElementById("localGameStartButton");
    const pauseButton = document.getElementById("localGamePauseButton");

    // Game state
    let isGameStarted = false;
    let isGameOver = false;
    let isPaused = false;
    let animationFrameId = null;
    let ballX = GAME_WIDTH / 2;
    let ballY = GAME_HEIGHT / 2;
    let ballSpeedX = INITIAL_BALL_SPEED;
    let ballSpeedY = INITIAL_BALL_SPEED / 2;
    let paddleLeftY = (GAME_HEIGHT - PADDLE_HEIGHT) / 2;
    let paddleRightY = (GAME_HEIGHT - PADDLE_HEIGHT) / 2;
    let scoreP1 = 0;
    let scoreP2 = 0;

    // Player controls state
    const keys = {
        w: false,
        s: false,
        ArrowUp: false,
        ArrowDown: false,
        " ": false // Space for pause
    };

    // Initialize game
    function init() {
        // Reset game state
        resetGame();

        // Set up event listeners
        document.addEventListener("keydown", handleKeyDown);
        document.addEventListener("keyup", handleKeyUp);

        // Set up start button
        if (startButton) {
            startButton.addEventListener("click", startGame);
            startButton.textContent = __("start_game");
        }

        // Set up pause button
        if (pauseButton)
            pauseButton.addEventListener("click", togglePause);

        // Set up play again button
        const playAgainButton = document.getElementById("playAgainButton");
        if (playAgainButton) {
            playAgainButton.addEventListener("click", function() {
                resetGame();
                startGame();
            });
        }

        // Localize game elements
        document.getElementById("gameStatusLabel").textContent = __("local_1v1_game");
        document.getElementById("gameOverModalLabel").textContent = __("game_over");
        document.getElementById("playAgainButton").textContent = __("play_again");
        document.getElementById("gamePaused").textContent = __("game_paused");
        document.getElementById("pauseMessage").textContent = __("press_resume");
        document.getElementById("returnButton").textContent = __("return");
        document.getElementById("playAgainButton").textContent = __("play_again");
        document.getElementById("keysLocal").textContent = __("keys_local");

        // Set position of initial elements
        updateElementPositions();
        initializeTheme();
    }

    // Reset game to initial state
    function resetGame() {
        isGameStarted = false;
        isGameOver = false;
        isPaused = false;
        ballX = GAME_WIDTH / 2;
        ballY = GAME_HEIGHT / 2;
        ballSpeedX = Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED;
        ballSpeedY = (Math.random() * 2 - 1) * (INITIAL_BALL_SPEED / 2);
        paddleLeftY = (GAME_HEIGHT - PADDLE_HEIGHT) / 2;
        paddleRightY = (GAME_HEIGHT - PADDLE_HEIGHT) / 2;
        scoreP1 = 0;
        scoreP2 = 0;

        // Update UI
        scoreLeft.textContent = "0";
        scoreRight.textContent = "0";
        pauseOverlay.style.display = "none";

        // Show start button, hide pause button
        if (startButton && pauseButton) {
            startButton.classList.remove("d-none");
            pauseButton.classList.add("d-none");
        }

        // Cancel any existing animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Update element positions
        updateElementPositions();
    }

    // Start the game
    function startGame() {
        if (isGameOver) return;

        isGameStarted = true;
        isPaused = false;

        // Hide start button, show pause button
        if (startButton && pauseButton) {
            startButton.classList.add("d-none");
            pauseButton.classList.remove("d-none");
            pauseButton.textContent = __("pause_game");
        }

        // Hide pause overlay
        pauseOverlay.style.display = "none";

        // Start game loop
        gameLoop();
    }

    // Handle key down event
    function handleKeyDown(e) {
        if (keys.hasOwnProperty(e.key)) {
            keys[e.key] = true;

            // Handle pause with space bar
            if (e.key === " " && isGameStarted)
                togglePause();

            // Prevent default action for game keys to avoid page scrolling
            if (["w", "s", "ArrowUp", "ArrowDown", " "].includes(e.key))
                e.preventDefault();
        }
    }

    // Handle key up event
    function handleKeyUp(e) {
        if (keys.hasOwnProperty(e.key))
            keys[e.key] = false;
    }

    // Toggle pause state
    function togglePause() {
        if (!isGameStarted || isGameOver) return;

        isPaused = !isPaused;

        if (isPaused) {
            pauseOverlay.style.display = "block";
            pauseMessage.textContent = __("press_resume");

            // Update pause button text
            if (pauseButton)
                pauseButton.textContent = __("resume_game");

            // Cancel animation frame
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        } else {
            pauseOverlay.style.display = "none";

            // Update pause button text
            if (pauseButton)
                pauseButton.textContent = __("pause_game");

            // Resume game loop
            gameLoop();
        }
    }

    // Game loop
    function gameLoop() {
        if (!isGameStarted || isPaused || isGameOver) return;

        update();

        // Continue the game loop
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // Update game state
    function update() {
        // Update paddle positions based on key presses
        if (keys.w && paddleLeftY > 0)
            paddleLeftY -= PADDLE_SPEED;
        if (keys.s && paddleLeftY < GAME_HEIGHT - PADDLE_HEIGHT)
            paddleLeftY += PADDLE_SPEED;
        if (keys.ArrowUp && paddleRightY > 0)
            paddleRightY -= PADDLE_SPEED;
        if (keys.ArrowDown && paddleRightY < GAME_HEIGHT - PADDLE_HEIGHT)
            paddleRightY += PADDLE_SPEED;

        // Update ball position
        ballX += ballSpeedX;
        ballY += ballSpeedY;

        // Check for collisions with top and bottom walls
        if (ballY <= BALL_RADIUS || ballY >= GAME_HEIGHT - BALL_RADIUS) {
            ballSpeedY = -ballSpeedY;
            // Adjust ball position to prevent sticking to the wall
            if (ballY <= BALL_RADIUS) ballY = BALL_RADIUS;
            if (ballY >= GAME_HEIGHT - BALL_RADIUS) ballY = GAME_HEIGHT - BALL_RADIUS;
        }

        // Check for collisions with paddles
        // Left paddle
        if (
            ballX - BALL_RADIUS <= PADDLE_WIDTH + 5 && // Ball is at the x-position of the paddle
            ballX - BALL_RADIUS > 0 && // Ball hasn't completely passed the paddle
            ballY >= paddleLeftY && // Ball is below the top of the paddle
            ballY <= paddleLeftY + PADDLE_HEIGHT // Ball is above the bottom of the paddle
        ) {
            // Calculate impact point on paddle (0 = middle, -1 = top edge, 1 = bottom edge)
            const impactY = (ballY - (paddleLeftY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);

            // Reflect ball with angle based on impact point
            ballSpeedX = Math.abs(ballSpeedX) * 1.05; // Speed up slightly on each hit
            ballSpeedY = INITIAL_BALL_SPEED * 1.5 * impactY;

            // Adjust ball position to prevent sticking to paddle
            ballX = PADDLE_WIDTH + 5 + BALL_RADIUS;
        }

        // Right paddle
        if (
            ballX + BALL_RADIUS >= GAME_WIDTH - PADDLE_WIDTH - 5 && // Ball is at the x-position of the paddle
            ballX + BALL_RADIUS < GAME_WIDTH && // Ball hasn't completely passed the paddle
            ballY >= paddleRightY && // Ball is below the top of the paddle
            ballY <= paddleRightY + PADDLE_HEIGHT // Ball is above the bottom of the paddle
        ) {
            // Calculate impact point on paddle (0 = middle, -1 = top edge, 1 = bottom edge)
            const impactY = (ballY - (paddleRightY + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);

            // Reflect ball with angle based on impact point
            ballSpeedX = -Math.abs(ballSpeedX) * 1.05; // Speed up slightly on each hit
            ballSpeedY = INITIAL_BALL_SPEED * 1.5 * impactY;

            // Adjust ball position to prevent sticking to paddle
            ballX = GAME_WIDTH - PADDLE_WIDTH - 5 - BALL_RADIUS;
        }

        // Check if ball goes out of bounds
        if (ballX - BALL_RADIUS <= 0) {
            // Player 2 scores
            scoreP2++;
            scoreRight.textContent = scoreP2;
            resetBall();

            // Check for game over
            if (scoreP2 >= WIN_SCORE)
                gameOver(__("player_2"));
        }
        if (ballX + BALL_RADIUS >= GAME_WIDTH) {
            // Player 1 scores
            scoreP1++;
            scoreLeft.textContent = scoreP1;
            resetBall();

            // Check for game over
            if (scoreP1 >= WIN_SCORE)
                gameOver(__("player_1"));
        }

        // Update element positions
        updateElementPositions();
    }

    // Update positions of game elements
    function updateElementPositions() {
        // Update ball position
        ball.setAttribute("cx", ballX);
        ball.setAttribute("cy", ballY);

        // Update paddle positions
        paddleLeft.setAttribute("y", paddleLeftY);
        paddleRight.setAttribute("y", paddleRightY);
    }

    // Reset ball position after scoring
    function resetBall() {
        // Position ball in center
        ballX = GAME_WIDTH / 2;
        ballY = GAME_HEIGHT / 2;

        // Randomize direction but keep speed consistent
        ballSpeedX = Math.random() > 0.5 ? INITIAL_BALL_SPEED : -INITIAL_BALL_SPEED;
        ballSpeedY = (Math.random() * 2 - 1) * (INITIAL_BALL_SPEED / 2);
    }

    // Game over
    function gameOver(winner) {
        isGameOver = true;

        // Cancel animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Show the modal
        const gameOverModal = new bootstrap.Modal(document.getElementById("gameOverModal"));
        if ( gameOverModal ) {
            document.getElementById("gameOverModalLabel").textContent = __("game_over");
            document.getElementById("finalScore").textContent = __("final_score");
            document.getElementById("winnerMessage").textContent = `${winner} ${__("wins")}!`;
            document.getElementById("player1Name").textContent = __("player_1");
            document.getElementById("player2Name").textContent = __("player_2");
            document.getElementById("finalScore1").textContent = scoreP1;
            document.getElementById("finalScore2").textContent = scoreP2;
        }
        gameOverModal.show();

        // Show start button, hide pause button
        if (startButton && pauseButton) {
            startButton.classList.remove("d-none");
            pauseButton.classList.add("d-none");
        }
    }

    // Create a cleanup function
    function cleanup() {
        // Remove event listeners
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("keyup", handleKeyUp);

        // Cancel animation frame
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }

        // Remove button event listeners
        if (startButton)
            startButton.removeEventListener("click", startGame);
        if (pauseButton)
            pauseButton.removeEventListener("click", togglePause);

        // Reset game state
        resetGame();
    }

    // Register cleanup function with global registry
    if (window.gameCleanupRegistry)
        window.gameCleanupRegistry.registerCleanup(cleanup);

    // Initialize the game
    init();
}

window.localGame = localGame;
