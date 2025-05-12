import { isLoggedIn } from "../utils/session.js";
import { checkLogin } from '../utils/session.js';
import { updateMap } from "./game.js";

const DEBUG = false;

export async function startGame(gameId) {
    checkLogin();
    if (document.getElementById('userName').textContent == '') {showMessage('you need to login', 'error'); return;}
    const token = isLoggedIn();
    const main = document.getElementById('mainContent');
    const gameData = await getGameDetails(gameId);
    if (DEBUG)
        console.log(gameData);

    document.getElementById("myGamesModalClose").click();

    try {
        const response = await fetch('pong.html');
        const html = await response.text();

        main.innerHTML = html;
        updateGameData(gameData);
        window.location.href = '#/pong';

        setTimeout(() => {
            updateMap();
        }, 0);
    } catch (error) {
        console.error("Error loading pong.html:", error);
    }
}

export function cleanupGame() {
    window.gameCleanupRegistry.executeCleanup();
}

function updateGameData(gameData) {
    document.getElementById('gameIdField').textContent = gameData["id"];
    document.getElementById('username1').textContent = `Player 1: ${gameData["player1_name"]}`;
    document.getElementById('username2').textContent = `Player 2: ${gameData["player2_name"]}`;
}

async function getGameDetails(game_pk) {
    const token = isLoggedIn();
    if (!token) return;
    try {
        const response = await fetch(`/api/pong/game/${game_pk}/`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Check the console for details.');
    }
}
