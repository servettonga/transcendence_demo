export function startAiGame() {
    let isPaused = true;
    
    // Game elements
    const ball = document.getElementById('ball');
    const paddleLeft = document.getElementById('paddleLeft');
    const paddleRight = document.getElementById('paddleRight');
    const board = document.getElementById('gameBoard');
    let scoreLeft = 0;
    let scoreRight = 0;
    const scoreLeftElement = document.getElementById('score_left');
    const scoreRightElement = document.getElementById('score_right');

    let gameStarted = false;
    const countdownText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    countdownText.setAttribute("x", "301.42");
    countdownText.setAttribute("y", "121.42");
    countdownText.setAttribute("text-anchor", "middle");
    countdownText.setAttribute("fill", "white");
    countdownText.setAttribute("font-size", "48");
    board.appendChild(countdownText);

    // Ball movement
    let ballX = 301.42;
    let ballY = 181.42;
    const INITIAL_BALL_SPEED_X = 2.5;
    const INITIAL_BALL_SPEED_Y = 2.5;
    let dx = INITIAL_BALL_SPEED_X;
    let dy = INITIAL_BALL_SPEED_Y;

    // Paddle movement
    let leftPaddleY = 142.08;
    let rightPaddleY = 142.08;

    // Movement state tracking
    const paddleState = {
        leftUp: false,
        leftDown: false,
        rightUp: false,
        rightDown: false
    };

    // Paddle physics
    const PADDLE_ACCELERATION = 1;
    const MAX_PADDLE_SPEED = 6;
    let leftPaddleVelocity = 0;
    let rightPaddleVelocity = 0;

    // Slider difficulty defaluts
    const display = document.getElementById('ai-value');
    const icons = document.querySelectorAll('.slider-icon');

    // AI opponent parameters
    let aiHoldTime = 150; // 0 - 1000 : how long ai holds key
    let aiAccuracy = 0.5; // 0 - 1 : how often makes no mistake
    let aiIsGenius = false;
    let aiMoveTime = 300; // 0 - 600 : when starts to move paddle (ball x possition)
    let aiCalm = true;
    let aiPressing = false;
    let predBallPos = 180;
    let aiName = document.getElementById('aiName');
    const slider = document.getElementById('ai-slider');
    const sliderLabel = document.getElementById('ai-value');

    slider.addEventListener('input', () => {
        aiAccuracy = parseFloat(slider.value) / 100.0;
        sliderLabel.textContent = parseInt(aiAccuracy * 100);
        console.log(`ai accuracy ${aiAccuracy}`)
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!isPaused) {
            switch(e.key) {
                case 'w': paddleState.leftUp = true; break;
                case 's': paddleState.leftDown = true; break;
                case 'ArrowUp': paddleState.rightUp = true; break;
                case 'ArrowDown': paddleState.rightDown = true; break;
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        switch(e.key) {
            case 'w': paddleState.leftUp = false; break;
            case 's': paddleState.leftDown = false; break;
            case 'ArrowUp': paddleState.rightUp = false; break;
            case 'ArrowDown': paddleState.rightDown = false; break;
        }
    });

    // Space bar handler
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            isPaused = !isPaused;
        }
    });

    document.getElementById('startBtn').addEventListener('click', () => {
        initialCountdown();
        document.getElementById('startBtn').style.display = 'none';
        document.getElementById('resetBtn').style.display = 'block';
    });
    
    document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('startBtn').style.display = 'block';
        document.getElementById('resetBtn').style.display = 'none';
        scoreLeft = 0;
        scoreRight = 0;
        scoreLeftElement.textContent = '0';
        scoreRightElement.textContent = '0';
        isPaused = true;
        resetBall();
    });

    // Paddle movement update
    function updatePaddles() {
        if (!isPaused) {
            // Left paddle physics
            if (paddleState.leftUp) {
                leftPaddleVelocity = Math.max(-MAX_PADDLE_SPEED, leftPaddleVelocity - PADDLE_ACCELERATION);
            } else if (paddleState.leftDown) {
                leftPaddleVelocity = Math.min(MAX_PADDLE_SPEED, leftPaddleVelocity + PADDLE_ACCELERATION);
            } else {
                leftPaddleVelocity *= 0.8; // Deceleration
            }

            // Right paddle physics
            if (paddleState.rightUp) {
                rightPaddleVelocity = Math.max(-MAX_PADDLE_SPEED, rightPaddleVelocity - PADDLE_ACCELERATION);
            } else if (paddleState.rightDown) {
                rightPaddleVelocity = Math.min(MAX_PADDLE_SPEED, rightPaddleVelocity + PADDLE_ACCELERATION);
            } else {
                rightPaddleVelocity *= 0.8; // Deceleration
            }

            // Update paddle positions with boundaries
            leftPaddleY = Math.max(0, Math.min(284.16, leftPaddleY + leftPaddleVelocity));
            rightPaddleY = Math.max(0, Math.min(284.16, rightPaddleY + rightPaddleVelocity));

            // Update paddle positions in SVG
            paddleLeft.setAttribute('y', leftPaddleY);
            paddleRight.setAttribute('y', rightPaddleY);
        }
    }

    function initialCountdown() {
        isPaused = true;
        let count = 3;

        function updateCount() {
            if (count > 0) {
                countdownText.textContent = count;
                count--;
                setTimeout(updateCount, 1000);
            } else {
                countdownText.textContent = '';
                isPaused = false;
                gameStarted = true;
                dx = INITIAL_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1);
                dy = INITIAL_BALL_SPEED_Y * (Math.random() > 0.5 ? 1 : -1);
            }
        }

        updateCount();
    }

    // Ball animation
    function moveBall() {
        if (!isPaused) {
            updatePaddles();
            // Update ball position
            ballX += dx;
            ballY += dy;
            if (!aiPressing) {
                if (dx < 0) {
                    predBallPos = 180;
                    if (!aiCalm)
                        aiMove();
                } else {
                    if (aiIsGenius)
                        aiGeniusMode();
                    else
                        aiMove();
                }
        // uncomment to debug genius and normal mode
                // if (aiIsGenius)
                //     document.getElementById('score_right').style.background = "red";
                // else
                //     document.getElementById('score_right').style.background = "yellow";
            }

            // Bounce off top and bottom
            if (ballY <= 8.13 || ballY >= 354.7) {
                dy = -dy;
                if (ballX > 0) {
                    if (ballY < 180) {
                        predBallPos = Math.abs(600 - ballX);
                    } else {
                        predBallPos = Math.abs(360 - (600 - ballX));
                    }
                } else {
                    predBallPos = 180;
                }
            }

            // Bounce off paddles
            if (ballX <= 13 && ballY >= leftPaddleY && ballY <= leftPaddleY + 78.67) {
                if (dx < 0) {
                    dx -= 1
                } else {
                    dx += 1
                }
                if (dy < 0) {
                    dy -= 1
                } else { 
                    dy += 1
                }
                dx = -dx;
                if (Math.random() < aiAccuracy)
                    aiIsGenius = true;
                else
                    aiIsGenius = false;
            }
            if (ballX >= 583 && ballY >= rightPaddleY && ballY <= rightPaddleY + 78.67) {
                dx = -dx;
                paddleState.rightDown = false;
                paddleState.rightUp = false;
            }

            // Score points and reset ball with random direction
            if (ballX < 0) {
                scoreRight++;
                scoreRightElement.textContent = scoreRight;
                // checkForGameOver();
                resetBall();
            } else if (ballX > 602.83) {
                scoreLeft++;
                scoreLeftElement.textContent = scoreLeft;
                // checkForGameOver();
                resetBall();
            }

            // Update ball position
            ball.setAttribute('cx', ballX);
            ball.setAttribute('cy', ballY);
        }
        requestAnimationFrame(moveBall);
    }

    // Helper function to reset ball with random direction
    function resetBall() {
        ballX = 301.42;
        ballY = 181.42;
        dx = INITIAL_BALL_SPEED_X * (Math.random() > 0.5 ? 1 : -1);
        dy = INITIAL_BALL_SPEED_Y * (Math.random() > 0.5 ? 1 : -1);
        paddleState.rightDown = false;
        paddleState.rightUp = false;
    }

    // Start animation
    moveBall();

    function aiGeniusMode()
    {
        if (rightPaddleY < predBallPos - 40) {
            paddleState.rightUp = false;
            paddleState.rightDown = true;
        } else  if (rightPaddleY > predBallPos - 40) {
            paddleState.rightDown = false;
            paddleState.rightUp = true;
        } else {
            paddleState.rightDown = false;
            paddleState.rightUp = false;            
        }
    }

    function aiMove() {
        if (aiHoldTime) {
            aiPressing = true;
            setTimeout(() => {
                aiPressing = false;
              }, aiHoldTime);              
        }
        let move = 'up';
        if (dx > 0 && ballX > aiMoveTime) {
            if (ballY < rightPaddleY + 40) {
                move = 'up'
            } else {
                move = 'down'
            }
        } else {
            if (rightPaddleY < 142.08) {
                move = 'down'
            } else {
                move = 'up'
            }
        }
        if (move == 'up') {
            paddleState.rightUp = true;
            paddleState.rightDown = false;
        } else {
            paddleState.rightUp = false;
            paddleState.rightDown = true;
        }
    };
    
    // click difficulty icons
    icons.forEach(icon => {
        icon.style.cursor = 'pointer';
        icon.addEventListener('click', () => {
            const val = parseInt(icon.dataset.value);
            aiHoldTime = parseInt(icon.dataset.ptime);
            aiMoveTime = parseInt(icon.dataset.moveTime);
            aiName.textContent = icon.dataset.name;
            slider.value = val;
            aiAccuracy = val / 100;
            display.textContent = aiAccuracy * 100;
        });
    });

    function checkForGameOver() {
        if (scoreRight === 4) {
            setInterval(() => {
                if (scoreRight === 4)
                    showGameOver('right');
            }, 100);
        } else if (scoreLeft === 4) {
            showGameOver('left');
        }
    }

    function showGameOver(winner) {
        console.log(scoreLeft, scoreRight);
        isPaused = true;
        const gameOverModal = new bootstrap.Modal(document.getElementById('gameOverModalAi'));
        gameOverModal.show();
    }
}
