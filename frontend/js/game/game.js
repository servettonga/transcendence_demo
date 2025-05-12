import { isLoggedIn } from "../utils/session.js";
import { getUserData } from '../utils/get_user_data.js';
import { __ } from '../lang/i18n.js';
import { initializeTheme } from '../lang/theme.js';

const DEBUG = false;
let isOnGamePage = true;
window.gameOverModalShowing = false;

// Register cleanup function in global registry
window.gameCleanupRegistry = {
    cleanupFunction: null,
    registerCleanup: function(fn) {
        this.cleanupFunction = fn;
        return fn;
    },
    executeCleanup: function() {
        if (typeof this.cleanupFunction === 'function') {
            this.cleanupFunction();
            this.cleanupFunction = null;
        }
    }
};

export function updateMap() {
    let isOnGamePage = true;
    let isPaused = false;

    // First check login
    const token = isLoggedIn();
    if (!token) {
        window.location.href = '#/';
        return;
    }

    let winScore = 10;
    let currentPlayer = "None";

    // Game dimensions
    const GAME_WIDTH = 800;
    const GAME_HEIGHT = 480;

    // Precalculated values (will be set once game config is received)
    let scaleX, scaleY, adjustedScaleY;
    let paddleHeight, maxPaddleY;
    let gameConfig;

    // Performance monitoring
    const perfStats = {
        frameCount: 0,
        lastFrameTime: performance.now(),
        fps: 0,
        averageFrameTime: 0,
        totalFrameTime: 0
    };

    initializeTheme();
    document.getElementById("keysInfo").textContent = __('keys');

    // Get user data for validation
    getUserData(token).then(userData => {
        if (userData === "login_expired") {
            window.location.href = '#/';
            return;
        }

        // Get DOM elements
        const gameBoard = document.getElementById("gameBoard");
        const ball = document.getElementById("ball");
        const paddleLeft = document.getElementById("paddleLeft");
        const paddleRight = document.getElementById("paddleRight");
        const gameId = document.getElementById("gameIdField").textContent;
        const score_l = document.getElementById("score_left");
        const score_r = document.getElementById("score_right");

        // WebSocket connection management
        let socket = null;
        let reconnectAttempts = 0;
        const MAX_RECONNECT_ATTEMPTS = 5;
        const RECONNECT_DELAY = 3000;

        // Create a cleanup function and register it globally
        const cleanupFunction = function cleanup() {
            if (DEBUG)
                console.log("Executing cleanup function from updateMap");
            document.removeEventListener('keydown', handleKeyPress);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('beforeunload', handleHashChange);

            // Cleanup modal
            const gameOverModal = bootstrap.Modal.getInstance(document.getElementById('gameOverModal'));
            if (gameOverModal) {
                gameOverModal.hide();
                // Cleanup modal backdrop
                document.body.classList.remove('modal-open');
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop)
                    backdrop.remove();
            }

            // Cancel any pending animations
            if (window.lastFrameRequest) {
                cancelAnimationFrame(window.lastFrameRequest);
                window.lastFrameRequest = null;
            }

            // Close socket connection
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.onmessage = null;
                socket.onclose = null;
                socket.onerror = null;
                socket.close();
                socket = null;
            }

            // Clear any intervals
            if (window.gameLoopInterval) {
                clearInterval(window.gameLoopInterval);
                window.gameLoopInterval = null;
            }

            if (DEBUG)
                console.log(`FPS: ${perfStats.fps.toFixed(2)}, Avg frame time: ${perfStats.averageFrameTime.toFixed(2)}ms`);
        };

        function connect() {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const wsHost = window.location.host;
            socket = new WebSocket(`${wsProtocol}//${wsHost}/ws/pong/${gameId}/?token=${token}`);

            socket.onopen = () => {
                if (DEBUG)
                    console.log("Connected to WebSocket server");
                reconnectAttempts = 0;
            };

            socket.onerror = (error) => {
                console.error("WebSocket error:", error);
            };

            socket.onclose = (event) => {
                if (DEBUG)
                    console.log("WebSocket connection closed:", event.code, event.reason);

                // Check if game ended with a winner before redirecting
                if (gameConfig && (
                    (score_l && parseInt(score_l.textContent) >= winScore) ||
                    (score_r && parseInt(score_r.textContent) >= winScore))) {

                    // Show the game over modal instead of redirecting
                    const finalState = {
                        status: 'FINISHED',
                        score_left: score_l ? parseInt(score_l.textContent) : 0,
                        score_right: score_r ? parseInt(score_r.textContent) : 0
                    };

                    console.log("Game ended with scores:", finalState);
                    showGameOverModal(finalState);

                    // Prevent the default redirect
                    return; // Don't proceed to the redirect code
                }

                // Only reach here if game didn't end with a winner
                if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS &&
                    event.reason !== "Game finished") {
                    if (DEBUG)
                        console.log(`Attempting reconnection ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`);
                    reconnectAttempts++;
                    setTimeout(connect, RECONNECT_DELAY);
                } else {
                    console.log("Max reconnection attempts reached or game finished");
                    window.location.hash = '#/pong'; // Only redirect here if not a completed game
                }

                // Safety check: if the game was in progress and suddenly closed
                if (gameConfig && !document.getElementById('gameOverModal').classList.contains('show')) {
                    const finalState = {
                        status: 'FINISHED',
                        score_left: document.getElementById('score_left') ?
                            parseInt(document.getElementById('score_left').textContent) : 0,
                        score_right: document.getElementById('score_right') ?
                            parseInt(document.getElementById('score_right').textContent) : 0
                    };
                    showGameOverModal(finalState);
                }
            };

            socket.onmessage = (event) => {
                if (!isOnGamePage)
                    return;
                const data = JSON.parse(event.data);
                if (DEBUG)
                    console.log("Received game state:", data);

                const startButton = document.getElementById('pongStartButton');
                const pauseButton = document.getElementById('pongPauseButton');

                if (data.type === 'player_ready' || data.type === 'player_disconnected') {
                    const player1Status = document.getElementById('ready1');
                    const player2Status = document.getElementById('ready2');

                    if (player1Status && data.data.player1_status) {
                        player1Status.innerHTML = getStatusBadge(data.data.player1_status);
                        if (DEBUG)
                            console.log("Updated player1 status:", data.data.player1_status);
                    }

                    if (player2Status && data.data.player2_status) {
                        player2Status.innerHTML = getStatusBadge(data.data.player2_status);
                        if (DEBUG)
                            console.log("Updated player2 status:", data.data.player2_status);
                    }
                }
                else if (data.type === 'game_config') {
                    currentPlayer = data.data.player_type;
                    winScore = data.data.win_score;

                    gameConfig = data.data.config;
                    scaleX = GAME_WIDTH / gameConfig.WIDTH;
                    scaleY = GAME_HEIGHT / gameConfig.HEIGHT;
                    paddleHeight = gameConfig.PADDLE_HEIGHT * scaleY;

                    const playAreaHeight = gameConfig.HEIGHT - 3;
                    adjustedScaleY = GAME_HEIGHT / playAreaHeight;

                    maxPaddleY = GAME_HEIGHT - paddleHeight;
                    if (DEBUG)
                        console.log(`Game configured: player=${currentPlayer}, win_score=${winScore}`);
                    initializeGame();
                }
                else if (data.type === 'player_update') {
                    // Update player names and avatars
                    const player1Name = document.getElementById('username1');
                    const player2Name = document.getElementById('username2');
                    const avatar1 = document.getElementById('avatar1');
                    const avatar2 = document.getElementById('avatar2');

                    if (player1Name && data.data.player1_name)
                        player1Name.textContent = data.data.player1_name;
                    if (player2Name && data.data.player2_name)
                        player2Name.textContent = data.data.player2_name;
                    if (avatar1 && data.data.player1_avatar)
                        avatar1.src = data.data.player1_avatar;
                    if (avatar2 && data.data.player2_avatar)
                        avatar2.src = data.data.player2_avatar;
                }
                else if (data.type === 'game_state') {
                    if (!gameConfig) {
                        console.warn("Received game state before config");
                        return;
                    }
                    if (!window.lastFrameRequest) {
                        window.lastFrameRequest = requestAnimationFrame(() => {
                            updateGameState(data.data);
                            window.lastFrameRequest = null;
                        });
                    }
                    // Check for explicit game over flag
                    if (data.data && data.data.game_over === true) {
                        console.log("Received explicit game over signal");
                        updateGameState(data.data);
                        setTimeout(() => {
                            if (socket && socket.readyState === WebSocket.OPEN)
                                socket.close(1000, "Game finished");
                            showGameOverModal(data.data);
                        }, 500);
                        return;
                    }
                    if (data.data.status === 'PLAYING') {
                        if (startButton) startButton.style.display = 'none';
                        if (pauseButton) {
                            pauseButton.style.display = 'inline-block';
                            pauseButton.textContent = __('pause_game');
                            pauseButton.className = 'btn btn-lg btn-warning';
                            pauseButton.disabled = false;
                        }
                        isPaused = false;
                        updateGameState(data.data);
                        showPauseOverlay(false);
                    }
                    // Check for game over conditions
                    if (data.data.status === 'FINISHED' ||
                        data.data.score_left >= winScore ||
                        data.data.score_right >= winScore) {

                        // Update the final score before showing modal
                        updateGameState(data.data);

                        // Small delay to ensure score is visible
                        setTimeout(() => {
                            reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
                            if (socket && socket.readyState === WebSocket.OPEN)
                                socket.close(1000, "Game finished");
                            showGameOverModal(data.data);
                        }, 100);
                    }
                }
                else if (data.type === 'game_status') {
                    const status = data.data.status;
                    const pausedBy = data.data.paused_by;

                    // Update game status display
                    if (status === 'PLAYING') {
                        isPaused = false;
                        // Hide start button, show pause button
                        if (startButton) startButton.style.display = 'none';
                        if (pauseButton) {
                            pauseButton.style.display = 'inline-block';
                            pauseButton.textContent = __('pause_game');
                            pauseButton.className = 'btn btn-lg btn-warning';
                            pauseButton.disabled = false;
                        }
                    } else if (status === 'PAUSED') {
                        isPaused = true;
                        // Hide start button, show pause/resume button
                        if (startButton) startButton.style.display = 'none';
                        if (pauseButton) {
                            pauseButton.style.display = 'inline-block';
                            pauseButton.textContent = pausedBy === currentPlayer ? __('resume_game') : __('game_paused');
                            pauseButton.className = pausedBy === currentPlayer ?
                                'btn btn-lg btn-success' : 'btn btn-lg btn-secondary';
                            pauseButton.disabled = pausedBy !== currentPlayer;

                            pauseButton.onclick = function() {
                                if (socket && socket.readyState === WebSocket.OPEN) {
                                    socket.send(JSON.stringify({
                                        type: 'pause_game',
                                        data: { pause: false }
                                    }));
                                }
                            };
                        }

                    }
                    else if (data.type === 'tournament_update' && data.message && data.message.type === 'MATCH_COMPLETED') {
                        console.log('Received tournament match completion:', data);

                        const gameState = {
                            status: 'FINISHED',
                            score_left: score_l ? parseInt(score_l.textContent) : 0,
                            score_right: score_r ? parseInt(score_r.textContent) : 0
                        };

                        // Small delay to ensure everything is visible
                        setTimeout(() => {
                            reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
                            if (socket && socket.readyState === WebSocket.OPEN)
                                socket.close(1000, "Game finished");
                            showGameOverModal(gameState);
                        }, 100);
                    }
                    else if (status === 'WAITING') {
                        // If waiting, show start button, hide pause button
                        if (startButton) {
                            startButton.style.display = 'inline-block';
                            startButton.disabled = false;
                        }
                        if (pauseButton) pauseButton.style.display = 'none';
                    }

                    showPauseOverlay(isPaused, pausedBy);
                }
            };
        };

        function initializeGame() {
            const startButton = document.getElementById('pongStartButton');
            if (!startButton) return;

            const buttonContainer = startButton.parentElement;

            // Start with proper initial state
            startButton.textContent = 'Start';
            startButton.disabled = false;
            startButton.className = 'btn btn-lg btn-success';

            // Create pause button but keep it hidden initially
            let pauseButton = document.getElementById('pongPauseButton');
            if (!pauseButton) {
                pauseButton = document.createElement('button');
                pauseButton.id = 'pongPauseButton';
                pauseButton.className = 'btn btn-lg btn-warning';
                pauseButton.style.display = 'none';
                pauseButton.textContent = __('pause_game');
                buttonContainer.appendChild(pauseButton);
            }

            // Start button click handler
            startButton.addEventListener('click', function() {
                startButton.disabled = true;
                startButton.textContent = __('waiting');

                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'player_ready',
                        data: {}
                    }));
                }
            });

            pauseButton.onclick = function() {
                const isPaused = pauseButton.textContent === 'Resume Game';

                if (socket && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                        type: 'pause_game',
                        data: { pause: !isPaused }
                    }));
                }
            };

            if (window.innerWidth <= 768) {
                console.log("Small screen detected, initializing touch controls");
                initializeTouchControls();
            }
        }

        function updatePerformanceStats() {
            const now = performance.now();
            const frameTime = now - perfStats.lastFrameTime;

            perfStats.frameCount++;
            perfStats.totalFrameTime += frameTime;
            perfStats.averageFrameTime = perfStats.totalFrameTime / perfStats.frameCount;
            perfStats.fps = 1000 / frameTime;
            perfStats.lastFrameTime = now;

            // Log every 100 frames or when FPS drops below the threshold
            if (perfStats.frameCount % 100 === 0 || perfStats.fps < 30) {
                if (DEBUG)
                    console.log(`FPS: ${perfStats.fps.toFixed(2)}, Avg frame time: ${perfStats.averageFrameTime.toFixed(2)}ms`);

                // Reset stats periodically to track recent performance
                if (perfStats.frameCount > 1000) {
                    perfStats.frameCount = 0;
                    perfStats.totalFrameTime = 0;
                }
            }
        }

        function updateGameState(data) {
            // Safety check for gameConfig
            if (!gameConfig) {
                console.error("Missing gameConfig in updateGameState");
                return;
            }

            // Handle partial updates (delta compression)
            try {
                // Update paddle positions if data contains them
                if (typeof data.left_paddle === 'number') {
                    const leftPaddleY = (data.left_paddle - 1) * adjustedScaleY;
                    const clampedLeftY = Math.max(0, Math.min(maxPaddleY, leftPaddleY));
                    paddleLeft.setAttribute("y", clampedLeftY);
                }

                if (typeof data.right_paddle === 'number') {
                    const rightPaddleY = (data.right_paddle - 1) * adjustedScaleY;
                    const clampedRightY = Math.max(0, Math.min(maxPaddleY, rightPaddleY));
                    paddleRight.setAttribute("y", clampedRightY);
                }

                // Update ball position if data contains it
                if (typeof data.ball_x === 'number' && typeof data.ball_y === 'number') {
                    const adjustedX = data.ball_x * scaleX;
                    const adjustedY = (data.ball_y - 1) * adjustedScaleY;
                    ball.setAttribute("cx", adjustedX);
                    ball.setAttribute("cy", adjustedY);
                }

                // Update scores if data contains them
                if (typeof data.score_left === 'number')
                    score_l.innerText = data.score_left;
                if (typeof data.score_right === 'number')
                    score_r.innerText = data.score_right;

                updatePerformanceStats();
            } catch (error) {
                console.error("Error updating game state:", error);
            }
        }

        function handleKeyPress(event) {
            // Space bar handling for pause/resume
            if (event.key === ' ') {
                const pauseButton = document.getElementById('pongPauseButton');
                if (pauseButton)
                    pauseButton.click();
                event.preventDefault();
                return;
            }

            // If the game is paused, block all other key inputs
            if (isPaused) {
                event.preventDefault();
                return;
            }

            // Handle paddle movement keys (only when game is not paused)
            if (event.key === 'w' || event.key === 's' ||
                event.key === 'ArrowUp' || event.key === 'ArrowDown') {

                let move = 0;
                if (event.key === 'w' || event.key === 'ArrowUp')
                    move = -1;
                else if (event.key === 's' || event.key === 'ArrowDown')
                    move = 1;

                socket.send(JSON.stringify({
                    'type': 'paddle_move',
                    'data': {
                        'player': currentPlayer,
                        'move': move
                    }
                }));
                event.preventDefault();
            }
        }

        function initializeTouchControls() {
            const upButton = document.getElementById('upButton');
            const downButton = document.getElementById('downButton');

            if (!upButton || !downButton) return;

            // Remove any existing listeners first
            const newUp = upButton.cloneNode(true);
            const newDown = downButton.cloneNode(true);
            upButton.parentNode.replaceChild(newUp, upButton);
            downButton.parentNode.replaceChild(newDown, downButton);

            // Multiple event types for maximum compatibility
            ["touchstart", "mousedown"].forEach(eventType => {
                newUp.addEventListener(eventType, function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'paddle_move',
                            data: {
                                player: currentPlayer,
                                move: -1
                            }
                        }));
                    }
                });

                newDown.addEventListener(eventType, function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'paddle_move',
                            data: {
                                player: currentPlayer,
                                move: 1
                            }
                        }));
                    }
                });
            });

            // Stop movement when touch/click ends
            ["touchend", "mouseup"].forEach(eventType => {
                document.addEventListener(eventType, function(e) {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.send(JSON.stringify({
                            type: 'paddle_move',
                            data: {
                                player: currentPlayer,
                                move: 0
                            }
                        }));
                    }
                });
            });
        }

        function getStatusBadge(status) {
            switch(status) {
                case 'READY': return '🟢';
                case 'CONNECTED': return '🟠';
                case 'DISCONNECTED': return '🔴';
                default: return '';
            }
        }

        function handleVisibilityChange() {
            // This handles temporary visibility changes (tab switch, minimize)
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                    type: 'visibility_change',
                    data: {
                        hidden: document.hidden
                    }
                }));
                if (DEBUG)
                    console.log(`Visibility changed: ${document.hidden ? 'hidden' : 'visible'}`);
            }
        }

        function handleHashChange() {
            if (DEBUG)
                console.log("Hash change detected, cleaning up game resources");
            isOnGamePage = false;

            if (window.showingGameOverModal) {
                console.log("Modal is showing, preventing navigation");
                return;
            }

            // If leaving game page
            if (window.location.hash !== '#/game/' + gameId) {
                // Check if game just ended with a winner - show modal first
                if (gameConfig && score_l && score_r) {
                    const leftScore = parseInt(score_l.textContent);
                    const rightScore = parseInt(score_r.textContent);

                    if (leftScore >= winScore || rightScore >= winScore) {
                        console.log("Game has just completed - showing modal before navigation");

                        // CRITICAL: Force hash back to game page to prevent navigation
                        if (event) event.preventDefault();
                        window.history.pushState(null, "", `#/game/${gameId}`);
                        console.log("Forced navigation back to game page");

                        // Show game over modal
                        showGameOverModal({
                            status: 'FINISHED',
                            score_left: leftScore,
                            score_right: rightScore
                        });

                        return false; // Block navigation
                    }
                }

                // Normal cleanup if not a game over situation
                cleanupFunction();
            }

            // Handle permanent navigation away from game
            if (socket && socket.readyState === WebSocket.OPEN) {
                try {
                    // Send visibility_change message to mark player as disconnected
                    socket.send(JSON.stringify({
                        type: 'visibility_change',
                        data: {
                            hidden: true  // This will set player status to DISCONNECTED
                        }
                    }));
                    if (DEBUG)
                        console.log("Sent disconnect message (visibility_change hidden=true)");
                } catch (e) {
                    console.error("Error sending disconnect:", e);
                }
            }

            console.log("Hash changed to:", window.location.hash);

            // Clear the game board
            const gameBoard = document.getElementById("gameBoard");
            if (gameBoard) {
                const bg = gameBoard.querySelector("#bg");
                if (bg)
                    bg.setAttribute("fill", "transparent");
            }
        }

        function showGameOverModal(gameState) {
            // Check if elements exist before accessing
            if (window.gameOverModalShowing)
                return;
            console.log("Game Over Modal triggered");
            window.gameOverModalShowing = true;

            const username1 = document.getElementById('username1');
            const username2 = document.getElementById('username2');
            const winnerMessage = document.getElementById('winnerMessage');
            const player1Name = document.getElementById('player1Name');
            const player2Name = document.getElementById('player2Name');
            const finalScore1 = document.getElementById('finalScore1');
            const finalScore2 = document.getElementById('finalScore2');

            if (!username1 || !username2 || !winnerMessage ||
                !player1Name || !player2Name ||
                !finalScore1 || !finalScore2) {
                return;
            }

            // Determine winner
            const isPlayer1Winner = gameState.score_left >= winScore;
            const winner = isPlayer1Winner ? username1.textContent : username2.textContent;

            // Update modal content
            winnerMessage.textContent = `${winner} wins!`;
            player1Name.textContent = username1.textContent;
            player2Name.textContent = username2.textContent;
            finalScore1.textContent = gameState.score_left;
            finalScore2.textContent = gameState.score_right;

            let tournamentId = null;

            // 1. First check URL parameters - correct handling of hash parameters
            const hashParts = window.location.hash.split('?');
            if (hashParts.length > 1) {
                const urlParams = new URLSearchParams(hashParts[1]);
                tournamentId = urlParams.get('tournamentId');
            }

            // 2. Check if received it in a WebSocket message
            if (!tournamentId && window.lastTournamentMessage) {
                if (window.lastTournamentMessage.type === 'NEW_ROUND' &&
                    window.lastTournamentMessage.data &&
                    window.lastTournamentMessage.data.tournament_id) {
                    tournamentId = window.lastTournamentMessage.data.tournament_id;
                }
            }

            console.log("Extracted tournament ID:", tournamentId);

            // Add button click handler
            const returnButton = document.getElementById('returnButton');
            if (tournamentId)
                returnButton.textContent = 'Return to Tournament';
            else
                returnButton.textContent = 'Return to Main Page';
            returnButton.addEventListener('click', function() {
                // Close modal
                const gameOverModal = bootstrap.Modal.getInstance(document.getElementById('gameOverModal'));
                if (gameOverModal)
                    gameOverModal.hide();
                window.gameOverModalShowing = false;

                if (tournamentId) {
                    window.refreshInProgress = false;
                    setTimeout(() => {
                        window.location.hash = `#/tournament/${tournamentId}`;
                    }, 100);
                } else {
                    setTimeout(() => {
                        window.location.hash = '#/';
                    }, 50);
                }
            });

            try {
                // Initialize and show modal
                const gameOverModal = new bootstrap.Modal(document.getElementById('gameOverModal'));
                gameOverModal.show();
            } catch (error) {
                console.error("Error showing game over modal:", error);
            }
        }

        function showPauseOverlay(show, pausedBy = null) {
            const overlay = document.getElementById('pauseOverlay');
            const pauseTitle = document.getElementById('gamePaused');
            const pauseMessage = document.getElementById('pauseMessage');

            if (show) {
                pauseTitle.textContent = __('game_paused');
                // Update message based on who paused
                if (pauseMessage) {
                    pauseMessage.textContent = pausedBy === currentPlayer ?
                        __('press_resume') :
                        __('waiting_for_other_player');
                }
                if (overlay)
                    overlay.style.display = 'flex';
            } else {
                if (overlay)
                    overlay.style.display = 'none';
            }
        }

        // Register cleanup function in global registry
        window.gameCleanupRegistry.registerCleanup(cleanupFunction);

        // Event listeners
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('beforeunload', handleHashChange);
        document.addEventListener('keydown', handleKeyPress);

        // Initialize connection
        connect();

    }).catch(error => {
        console.error("Error getting user data:", error);
        window.location.href = '#/';
    });
}
