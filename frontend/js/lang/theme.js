import { isLoggedIn } from '../utils/session.js';

// Color schemes for each theme
const themes = {
    default: {
        background: {
            fill: "#0a192f",
            stroke: "#64ffda"
        },
        midLine: {
            stroke: "#8892b0"
        },
        paddles: {
            fill: "#64ffda"
        },
        ball: {
            fill: "#ffffff"
        }
    },
    theme1: {
        background: {
            fill: "#231f20",
            stroke: "#f7941d"
        },
        midLine: {
            stroke: "#a7a9ac"
        },
        paddles: {
            fill: "#c49a6c"
        },
        ball: {
            fill: "#f9ed32"
        }
    },
    theme2: {
        background: {
            fill: "#2d1b36",
            stroke: "#ff6b6b"
        },
        midLine: {
            stroke: "#a16ae8"
        },
        paddles: {
            fill: "#ff6b6b"
        },
        ball: {
            fill: "#fdfd96"
        }
    }
};

export function applyGameBoardTheme(themeId) {
    // Convert themeId to theme name
    const themeName = themeId === 1 ? "theme1" : (themeId === 2 ? "theme2" : "default");
    const theme = themes[themeName];

    // Get SVG elements
    const bg = document.getElementById("bg");
    const midLineElements = document.querySelectorAll("#midLine line");
    const paddleLeft = document.getElementById("paddleLeft");
    const paddleRight = document.getElementById("paddleRight");
    const ball = document.getElementById("ball");

    // Apply theme colors
    if (bg) {
        bg.setAttribute("fill", theme.background.fill);
        bg.setAttribute("stroke", theme.background.stroke);
    }

    if (midLineElements && midLineElements.length > 0) {
        midLineElements.forEach(line => {
            line.setAttribute("stroke", theme.midLine.stroke);
        });
    }

    if (paddleLeft)
        paddleLeft.setAttribute("fill", theme.paddles.fill);
    if (paddleRight)
        paddleRight.setAttribute("fill", theme.paddles.fill);
    if (ball)
        ball.setAttribute("fill", theme.ball.fill);
}

export function setUserTheme(themeId) {
    localStorage.setItem('preferredTheme', themeId);

    // Apply theme if the user is on a game page
    const gameBoard = document.getElementById('gameBoard');
    if (gameBoard)
        applyGameBoardTheme(themeId);

    // If the user is logged in, save preference to profile
    if (isLoggedIn(false)) {
        fetch('/api/users/me/', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer ' + localStorage.getItem('accessToken')
            },
            body: new URLSearchParams({
                color_theme: themeId
            }).toString()
        })
            .then(response => {
                if (!response.ok)
                    console.error('Failed to update theme preference:', response.status);
            })
            .catch(error => {
                console.error('Could not update profile theme preference:', error);
            });
    }
}

export function getUserTheme() {
    return parseInt(localStorage.getItem('preferredTheme') || '0');
}

export function initializeTheme() {
    const themeId = getUserTheme();
    applyGameBoardTheme(themeId);
}
