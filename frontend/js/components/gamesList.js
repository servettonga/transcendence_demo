import { checkLogin } from "../utils/session.js";
import { isLoggedIn } from "../utils/session.js";
import { showMessage } from "./show_message.js";
import { formatDuration } from "../game/loadScoreboard.js";
import { __, updatePageContent  } from '../lang/i18n.js';

export async function loadMyGames() {
    const main = document.getElementById('mainContent');

    document.getElementById("myGamesModalClose").click();

    fetch('mygames.html')
    .then(response => response.text())
    .then(html => {
        main.innerHTML = html;

        requestAnimationFrame(() => {
            checkLogin();
            updateMyMatchHistory();
        });
    })
    .catch(error => console.error("Error loading pong.html:", error));
}

export async function updateMyMatchHistory() {
    const token = isLoggedIn();
    if (token == false)
        return;
    try {
        const response = await fetch(`/api/pong/history/`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        const data = await response.json();
        const container = document.getElementById("scoreboard-container");
        if (!container) return;
        const userGames = data.filter(game =>
            game.player1_username === localStorage.getItem('username') ||
            game.player2_username === localStorage.getItem('username')
        );
        const gamesPlayed = userGames.length;
        const gamesWon = userGames.filter(game => game.winner_username === localStorage.getItem('username')).length;
        const gamesLost = gamesPlayed - gamesWon;
        const winRatio = gamesPlayed > 0 ? (gamesWon / gamesPlayed).toFixed(2) : 0;

        document.getElementById('gamesPlayed').textContent = gamesPlayed;
        document.getElementById('gamesWon').textContent = gamesWon;
        document.getElementById('gamesLost').textContent = gamesLost;
        document.getElementById('winRatio').textContent = winRatio;
        let tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th scope="col" data-i18n="game_id">${__('game_id')}</th>
                    <th scope="col">P1</th>
                    <th scope="col">P2</th>
                    <th scope="col" data-i18n="score">${__('score')}</th>
                    <th scope="col" data-i18n="duration">${__('duration')}</th>
                </tr>
            </thead>
            <tbody>
    `;
        userGames.sort((a, b) => (a.score_player1 + a.score_player2) - (b.score_player1 + b.score_player2));
        const currentUser = localStorage.getItem('username');
        userGames.forEach(game => {
            // Determine if current user is player1 or player2
            const isCurrentUserPlayer1 = game.player1_username === currentUser;
            const isCurrentUserPlayer2 = game.player2_username === currentUser;

            // Determine if current user won
            const isCurrentUserWinner = game.winner_username === currentUser;

            // Initialize styles as empty
            let player1Style = "";
            let player2Style = "";

            // Apply style only to the current user's name
            if (isCurrentUserPlayer1) {
                player1Style = isCurrentUserWinner
                    ? `text-success` // Green if current user won
                    : `text-danger`;  // Red if current user lost
            }

            if (isCurrentUserPlayer2) {
                player2Style = isCurrentUserWinner
                    ? `text-success` // Green if current user won
                    : `text-danger`;  // Red if current user lost
            }

            tableHTML += `
        <tr>
            <td class="text-muted">${game.game}</td>
            <td class="${player1Style}">${game.player1_username}</td>
            <td class="${player2Style}">${game.player2_username}</td>
            <td>${game.score_player1} : ${game.score_player2}</td>
            <td class="text-muted">${formatDuration(game.duration)}</td>
        </tr>
        `;
        });

        tableHTML += `</tbody></table>`;
        container.innerHTML = tableHTML;

        updatePageContent();
        import('../my_games/my_chart.js').then(module => {
            module.createCharts(userGames);
            updatePageContent();
        }).catch(error => {
            console.error('Error loading charts module:', error);
        });
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Check the console for details.');
    }
}

export async function getMyGames(token) {
    if (!token) {
        console.error("No token provided.");
        return;
    }

    try {
        const response = await fetch(`/api/pong/history/`, {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const userGames = data.filter(game =>
            game.player1_username === localStorage.getItem('username') ||
            game.player2_username === localStorage.getItem('username')
        );

        const gamesPlayed = userGames.length;
        const gamesWon = userGames.filter(game => game.winner_username === localStorage.getItem('username')).length;
        const gamesLost = gamesPlayed - gamesWon;
        const winRatio = gamesPlayed > 0 ? (gamesWon / gamesPlayed).toFixed(2) : 0;

        document.getElementById('gamesPlayed').textContent = gamesPlayed;
        document.getElementById('gamesWon').textContent = gamesWon;
        document.getElementById('gamesLost').textContent = gamesLost;
        document.getElementById('winRatio').textContent = winRatio;

        const matchHistoryTableBody = document.querySelector('#matchHistory tbody');
        matchHistoryTableBody.innerHTML = '';

        if (userGames.length > 0) {
            userGames.forEach(game => {
                const row = matchHistoryTableBody.insertRow();
                const gameIdCell = row.insertCell();
                const statusCell = row.insertCell();

                gameIdCell.textContent = game.game;
                statusCell.textContent = game.winner_username === localStorage.getItem('username') ? __('won_match') : __('lost_match');
            });
        } else {
            const row = matchHistoryTableBody.insertRow();
            const gameIdCell = row.insertCell();
            gameIdCell.textContent = __('no_match_history');
            gameIdCell.colSpan = 2;
        }

        updatePageContent();
    } catch (error) {
        console.error('Error fetching user games:', error);
        alert('An error occurred. Check the console for details.');
    }
}

export async function gamesList() {
    checkLogin();
    const token = isLoggedIn();
    if (document.getElementById('userName').textContent == '') {showMessage('you need to login', 'error'); return;}
    try {
        const response = await fetch(`/api/pong/`, {
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

export async function myGames(elId, inputId) {
    const data = await gamesList();
    const ths = ['id', 'player 1', 'player 2', 'status']
    const table = document.createElement("table");
    table.className = "table";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    for (const content of ths)
    {
        const th = document.createElement("th");
        th.textContent = content;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let i in data)
    {
        const tr = document.createElement("tr");
        tr.addEventListener("click", () => selectGame(data[i]['id'], inputId));
        const td1 = document.createElement("td");
        const td2 = document.createElement("td");
        const td3 = document.createElement("td");
        const td4 = document.createElement("td");
        td1.textContent = data[i]['id'];
        td2.textContent = data[i]['player1_name'];
        td3.textContent = data[i]['player2_name'];
        td4.textContent = data[i]['status'];
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.appendChild(td4);
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);

    const myGamesList = document.getElementById(elId);
    myGamesList.innerHTML = "";
    myGamesList.appendChild(table);

    updatePageContent();
}

function selectGame(gameNo, inputId) {
    document.getElementById(inputId).value = gameNo;
}

