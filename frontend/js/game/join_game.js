import { checkLogin } from "../utils/session.js";
import { isLoggedIn } from "../utils/session.js";
import { getUserData } from "../utils/get_user_data.js";
import { startGame } from '../game/startGame.js';
import { showMessage } from '../components/show_message.js';
import { __ } from '../lang/i18n.js';

let refreshInterval;

export async function joinGame(gameId) {
    checkLogin();
    const token = isLoggedIn();
    if (!token)
        return;

    try {
        // First get user data
        const userData = await getUserData(token);
        if (userData === "login_expired") {
            window.location.href = '#/';
            return;
        }

        // Join game logic
        const response = await fetch(`/api/pong/game/${gameId}/join/`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
            }
        });

        const data = await response.json();
        if (response.ok) {
            const joinModal = bootstrap.Modal.getInstance(document.getElementById('join_game'));
            if (joinModal)
                joinModal.hide();
            const myGamesModal = bootstrap.Modal.getInstance(document.getElementById('my_games'));
            if (myGamesModal)
                myGamesModal.hide();
            startGame(gameId);
            window.location.href = '#/pong';
        } else {
            showMessage(data.error || 'Unable to join game', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showMessage('An error occurred while joining the game', 'error');
    }
}

function joinGameById() {
    const gameId = document.getElementById('joinGameInput').value;
    if (!gameId) {
        showMessage('Please enter a game ID', 'error');
        return;
    }
    joinGame(parseInt(gameId));
}

export async function refreshGameList() {
    const gamesList = document.getElementById('gamesToJoin');
    if (!gamesList) return;

    // Show loading
    gamesList.innerHTML = '<div class="text-center p-3"><div class="spinner-border" role="status"></div></div>';

    const token = isLoggedIn();
    if (!token) return;

    try {
        const response = await fetch('/api/pong/', {
            headers: {
                'Authorization': 'Bearer ' + token,
            }
        });

        if (response.ok) {
            const games = await response.json();
            const gamesList = document.getElementById('gamesToJoin');

            if (gamesList) {
                // Clear existing list
                gamesList.innerHTML = '';

                // Filter for active WAITING games only
                const availableGames = games.filter(game =>
                    game.status === 'WAITING' &&
                    (game.player1_status === 'CONNECTED' || game.player1_status === 'READY')
                );

                if (availableGames.length === 0) {
                    gamesList.innerHTML = `<div class="p-3" data-i18n="no_games_available">${__('no_games_available')}</div>`;
                    return;
                }

                // Sort games by creation date (newest first)
                availableGames.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                // Add each game to the list
                availableGames.forEach(game => {
                    const gameItem = document.createElement('div');
                    gameItem.className = 'p-3 mb-2 border-bottom';
                    gameItem.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="fw-bold">ID #${game.id}</span>
                                <br>
                                <small class="text-muted">${__('created_by')}: ${game.player1_name || 'Unknown'}</small>
                            </div>
                            <button class="btn btn-success btn-sm" onclick="window.joinGame(${game.id})" data-i18n="join_button">
                                ${__('join_button')}
                            </button>
                        </div>
                    `;
                    gamesList.appendChild(gameItem);
                });
            }
        }
    } catch (error) {
        console.error('Error refreshing game list:', error);
        showMessage('Error loading games list', 'error');
    }
}

export async function fetchMyGames(div_name) {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
        const response = await fetch('/api/pong/game/my/', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok)
            throw new Error('Failed to fetch games');

        const data = await response.json();

        if (data.results) {
            displayMyGames(data.results, div_name);
            // Pagination controls here
        } else {
            displayMyGames(data, div_name);
        }
    } catch (error) {
        console.error('Error fetching my games:', error);
    }
}

function displayMyGames(games, div_name) {
    const myGamesList = document.getElementById(div_name);
    if (!myGamesList) return;

    if (games.length === 0) {
        myGamesList.innerHTML = '<div class="p-3 text-center">No active games found</div>';
        return;
    }

    let html = '<div class="list-group list-group-flush">';
    games.forEach(game => {
        const statusBadge = `<span class="badge ${getStatusBadgeColor(game.status)}">${game.status}</span>`;
        const player2Name = game.player2_name || "Waiting for opponent";

        // Only show Join button for games that can be joined
        const canJoin = (game.status === 'WAITING' || game.status === 'PAUSED' || game.status === 'PLAYING');
        const joinButton = canJoin ?
            `<button class="btn btn-success btn-sm" onclick="window.joinGame(${game.id})" data-i18n="join_button">${__('join_button')}</button>` :
            '';

        html += `
            <div class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <span class="fw-bold">ID #${game.id}</span>
                    <br>
                    <small class="text-muted">${game.player1_name} vs ${player2Name}</small>
                    ${statusBadge}
                </div>
                <div>
                    ${joinButton}
                </div>
            </div>
        `;
    });
    html += '</div>';
    myGamesList.innerHTML = html;
}

function getStatusBadgeColor(status) {
    switch (status) {
        case 'WAITING': return 'text-primary';
        case 'PLAYING': return 'text-success';
        case 'PAUSED': return 'text-info';
        case 'SUSPENDED': return 'text-warning';
        case 'FINISHED': return 'text-success';
        case 'FORFEITED': return 'text-danger';
        default: return 'bg-secondary';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const myGamesModal = document.getElementById('my_games');
    if (myGamesModal) {
        let myGamesRefreshInterval;

        myGamesModal.addEventListener('show.bs.modal', function () {
            fetchMyGames('myGamesList'); // Immediate first refresh
            myGamesRefreshInterval = setInterval(() => fetchMyGames('myGamesList'), 5000); // Refresh every 5 seconds
        });

        myGamesModal.addEventListener('hide.bs.modal', function () {
            if (myGamesRefreshInterval)
                clearInterval(myGamesRefreshInterval);
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const joinGameModal = document.getElementById('join_game');
    if (joinGameModal) {
        joinGameModal.addEventListener('show.bs.modal', function () {
            refreshGameList(); // Immediate first refresh
            refreshInterval = setInterval(refreshGameList, 5000); // Refresh every 5 seconds
        });

        joinGameModal.addEventListener('hide.bs.modal', function () {
            if (refreshInterval)
                clearInterval(refreshInterval);
        });
    }
});

window.joinGame = joinGame;
window.joinGameById = joinGameById;
window.fetchMyGames = fetchMyGames;
