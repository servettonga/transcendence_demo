import { checkLogin } from '../utils/session.js';
import { fillupUserData } from '../utils/fillup_user_data.js';
import { LiveChat } from '../chat/live_chat.js';
import { getMyGames, loadMyGames } from './gamesList.js';
import { cleanupGame, startGame } from '../game/startGame.js';
import { startAiGame } from '../game/ai_game.js';
import { fetchTournamentData } from '../tournament/tournament.js';
import { fetchMyGames } from '../game/join_game.js';
import { updateScoreboard, cleanupScoreboard } from '../game/loadScoreboard.js';
import { loadScoreboard } from '../game/loadScoreboard.js';
import { loadTournaments } from '../tournament/tournaments.js'
import { initFriendsPage, cleanupFriendsPage } from '../friends/friends.js';
import { updatePageContent } from '../lang/i18n.js';

let previousHash = window.location.hash || '#/';

document.addEventListener('DOMContentLoaded', function () {
    const main = document.getElementById('mainContent');

    function updateActiveNavLink(hash) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        let activeLink;
        if (hash === '#/' || hash === '')
            activeLink = document.querySelector('.nav-link[href="#/"]');
        else
            activeLink = document.querySelector(`.nav-link[href="${hash}"]`);
        if (activeLink)
            activeLink.classList.add('active');
    }

    function loadContent(hash) {
        let token = localStorage.getItem('accessToken');
        updateActiveNavLink(hash);

        if (document.getElementById('gameOverModal') &&
            document.getElementById('gameOverModal').classList.contains('show')) {
            console.log("Game over modal is showing, preventing navigation");
            return; // Don't navigate while game over modal is showing
        }

        // Clean up resources from previous pages
        if (previousHash === '#/pong' && hash !== '#/pong')
            cleanupGame();
        if (previousHash === '#/friends')
            cleanupFriendsPage();
        if (previousHash === '#/scoreboard' && hash !== '#/scoreboard')
            cleanupScoreboard();

        previousHash = hash;

        const protectedRoutes = ['#/profile', '#/live_chat', '#/pong'];
        if (protectedRoutes.includes(hash) && !token) {
            window.location.hash = '#/';
            return;
        }

        if (hash.match(/^#\/game\/(\d+)$/)) {
            if (document.getElementById('gameOverModal') &&
                document.getElementById('gameOverModal').classList.contains('show')) {
                console.log("Game over modal is showing, skipping navigation");
                previousHash = hash;
                return; // Skip navigation while modal is showing
            }

            const match = hash.match(/^#\/game\/(\d+)$/);
            const gameId = match[1];
            fetch('pong.html')
                .then(response => response.text())
                .then(html => {
                    main.innerHTML = html;
                    updatePageContent();
                    checkLogin();
                    startGame(gameId);
                })
                .catch(error => console.error("Error loading pong.html:", error));
            return;
        }

        if (hash.match(/^#\/tournament\/(\d+)$/)) {
            const match = hash.match(/^#\/tournament\/(\d+)$/);
            const tId = match[1];

            fetch('tournament.html')
                .then(response => response.text())
                .then(html => {
                    main.innerHTML = html;
                    updatePageContent();
                    checkLogin();
                    setTimeout(() => fetchTournamentData(tId, true), 100);
                })
                .catch(error => console.error("Error loading tournament.html:", error));
            return;
        }

        switch (hash) {
            case '#/':
                fetch('home.html')
                    .then(response => response.text())
                    .then(html => { main.innerHTML = html; updatePageContent(); checkLogin(); })
                    .catch(error => console.error("Error loading home.html:", error));
                break;
            case '#/pong':
                break;
            case '#/profile':
                fetch('profile.html')
                    .then(response => response.text())
                    .then(html => {
                        main.innerHTML = html;
                        token = localStorage.getItem('accessToken');
                        if (token) {
                            setTimeout(function () { fillupUserData(token, 'profile'); }, 0);
                        } else {
                            main.innerHTML = '';
                            window.location.hash = '#/';
                        };
                        updatePageContent();
                        checkLogin();
                    })
                    .catch(error => console.error("Error loading profile.html:", error));
                break;
            case '#/settings':
                fetch('settings.html')
                    .then(response => response.text())
                    .then(html => {
                        main.innerHTML = html;
                        token = localStorage.getItem('accessToken');
                        if (token) {
                            setTimeout(function () { fillupUserData(token, 'settings'); }, 0);
                        } else {
                            main.innerHTML = '';
                            window.location.hash = '#/';
                        };
                        updatePageContent();
                        checkLogin();
                    })
                    .catch(error => console.error("Error loading settings.html:", error));
                break;
            case '#/my_games':
                fetch('mygames.html')
                    .then(response => response.text())
                    .then(html => {
                        main.innerHTML = html;
                        token = localStorage.getItem('accessToken');
                        if (token) {
                            setTimeout(function () { loadMyGames(); }, 0);
                        } else {
                            main.innerHTML = '';
                            window.location.hash = '#/';
                        };
                        updatePageContent();
                        checkLogin();
                        fetchMyGames('myGamesTable');
                    })
                    .catch(error => console.error("Error loading mygames.html:", error));
                break;
            case '#/games':
                fetch('games.html')
                    .then(response => { return response.text(); })
                    .then(html => { main.innerHTML = html; updatePageContent(); checkLogin(); })
                    .catch(error => console.error("Error loading games.html:", error));
                break;
            case '#/scoreboard':
                fetch('scoreboard.html')
                    .then(response => response.text())
                    .then(html => { main.innerHTML = html; updatePageContent(); return checkLogin(); })
                    .then(() => updateScoreboard())
                    .catch(error => console.error("Error loading scoreboard.html:", error));
                break;
            case '#/live_chat':
                fetch('live_chat.html')
                    .then(response => { return response.text(); })
                    .then(html => {
                        if (!token) {
                            window.location.hash = '#/';
                            return;
                        }
                        main.innerHTML = html;
                        updatePageContent();
                        checkLogin();
                        new LiveChat();
                    })
                    .catch(error => console.error("Error loading live_chat.html:", error));
                break;
            case '#/tournaments':
                fetch('tournaments.html')
                    .then(response => { return response.text(); })
                    .then(html => { main.innerHTML = html; updatePageContent(); checkLogin(); loadTournaments(); })
                    .catch(error => console.error("Error loading games.html:", error));
                break;
            case '#/friends':
                fetch('friends.html')
                    .then(response => response.text())
                    .then(html => {
                        main.innerHTML = html;
                        updatePageContent();
                        checkLogin();
                        initFriendsPage();
                    })
                    .catch(error => console.error("Error loading friends.html:", error));
                break;
            case '#/play_with_ai':
                fetch('play_with_ai.html')
                    .then(response => response.text())
                    .then(html => {
                        main.innerHTML = html;
                        document.getElementById('myGamesModalClose').click();
                        startAiGame();
                    })
                    .catch(error => console.error("Error loading play_with_ai.html:", error));
                break;
            case '#/local_game':
                fetch('local_game.html')
                    .then(response => response.text())
                    .then(html => {
                        main.innerHTML = html;
                        document.getElementById('myGamesModalClose').click();
                        localGame();
                    })
                    .catch(error => console.error("Error loading local_game.html:", error));
                break;
            default:
                main.innerHTML = '<p>Page not found</p>';
                updatePageContent();
                checkLogin();
        }
    }

    function hashlistener() {
        loadContent(window.location.hash);
    }

    window.addEventListener('hashchange', hashlistener);
    window.addEventListener('load', function () {
        if (!window.location.hash)
            window.location.hash = '#/';
        hashlistener();
    });
    hashlistener();
});
