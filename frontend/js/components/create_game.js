import { startGame } from "../game/startGame.js";
import { checkLogin } from "../utils/session.js";
import { isLoggedIn } from "../utils/session.js";
import { showMessage } from "./show_message.js";

export async function createGame() {
    checkLogin();
    if (document.getElementById('userName').textContent == '') {showMessage('You need to login', 'error'); return;}
    let token = isLoggedIn();
    try {
        const response = await fetch('/api/pong/game/create/', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        const data = await response.json();
        if (response.ok) {
            startGame(data["id"]);
        } else {
            alert('Error: ' + JSON.stringify(data));
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Check the console for details.');
    }
}

window.createGame = createGame;
