import { isLoggedIn } from "../utils/session.js";
import { getUserData } from "../utils/get_user_data.js";
import { showMessage } from '../components/show_message.js';
import { __ } from '../lang/i18n.js';

export function checkAndCreateTournament() {
    const name = document.getElementById('tName').value;
    const description = document.getElementById('tDescription').value;
    const maxPlayers = document.getElementById('tMaxPlayers').value;
    if (!name)
        showMessage("name your tournament", "error");
    else
    {
        document.getElementById('createTournamentModalClose').click();
        createTournament(name, description, maxPlayers);
    }
}

function createTournament(name, description, maxPlayers) {
    console.log(`Creating tournament: ${name}, maxPlayers: ${maxPlayers}`);

    const token = isLoggedIn();
    if (!token) {
        console.error('❌ User is not logged in');
        return;
    }
    fetch('/api/tournaments/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: name,
            description: description,
            max_players: maxPlayers
        })
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Failed to create tournament');
            }
        })
        .then(data => {
            console.log('Tournament created:', data);
            // Redirect to the new tournament page
            if (data && data.id) {
                window.location.hash = `#/tournament/${data.id}`;
            } else {
                showMessage('Tournament created but unable to get ID', 'info');
                loadTournaments(); // Fallback - reload tournaments list
            }
        })
        .catch(error => {
            console.error('❌ Error creating tournament:', error.message);
            showMessage('Failed to create tournament: ' + error.message, 'error');
        });
}

function setupTournamentWebSocket(tournamentId) {
    console.log(`Setting up WebSocket for tournament ${tournamentId}`);

    // Create WebSocket connection for real-time tournament updates
    const token = isLoggedIn();
    if (!token) {
        console.error('❌ User is not logged in');
        return;
    }
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/tournament/${tournamentId}/?token=${token}`;

    const tournamentSocket = new WebSocket(wsUrl);

    tournamentSocket.onopen = () => {
        console.log(`✅ WebSocket connection established for tournament ${tournamentId}`);
    };

    tournamentSocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📨 WebSocket message received:', data);

        switch(data.type) {
            case 'PLAYER_JOINED':
                console.log(`👤 Player joined: ${data.player}`);
                loadTournamentDetails(tournamentId); // Refresh participant list
                break;

            case 'TOURNAMENT_STARTED':
                console.log(`🎮 Tournament started!`);
                loadTournamentDetails(tournamentId); // Refresh tournament details
                break;

            case 'NEW_ROUND':
                console.log(`🔄 Round ${data.data.round} has started!`);
                loadTournamentBracket(tournamentId); // Refresh bracket
                break;

            default:
                console.log(`📩 Unknown message type: ${data.type}`, data);
        }
    };

    tournamentSocket.onclose = (event) => {
        console.log(`❌ WebSocket connection closed for tournament ${tournamentId}`, event);
        // Attempt to reconnect after delay
        setTimeout(() => setupTournamentWebSocket(tournamentId), 3000);
    };

    tournamentSocket.onerror = (error) => {
        console.error(`❌ WebSocket error:`, error);
    };

    return tournamentSocket;
}

export function loadTournaments() {
    console.log('Loading tournaments list');
    const token = isLoggedIn();
    if (!token) {
        console.error('❌ User is not logged in');
        return;
    }

    const tournamentsDiv = document.getElementById('tournaments_container');
    tournamentsDiv.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

    fetch('/api/tournaments/', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(tournaments => {
            tournamentsDiv.innerHTML = '';

            if (tournaments.length === 0) {
                tournamentsDiv.innerHTML = '<div class="alert alert-info">No tournaments available. Create one!</div>';
                return;
            }

            tournaments.forEach(tournament => {
                const tournamentCard = document.createElement('div');
                tournamentCard.className = 'card mb-3';

                // Create status badge with appropriate color
                let statusBadge = '';
                if (tournament.status === 'REGISTRATION') {
                    statusBadge = `<span class="badge bg-primary">${__("status_registration_open")}</span>`;
                } else if (tournament.status === 'IN_PROGRESS') {
                    statusBadge = `<span class="badge bg-success">${__("status_in_progress")}</span>`;
                } else if (tournament.status === 'COMPLETED') {
                    statusBadge = `<span class="badge bg-secondary">${__("status_completed")}</span>`;
                }

                // Create action buttons based on tournament status and user role
                let actionButtons = '';

                // First button - View Details (for all tournaments)
                actionButtons += `<a href="#/tournament/${tournament.id}" class="btn btn-info btn-sm me-2">${__("view_details_button")}</a>`;

                // Second button - contextual based on status and user role
                if (tournament.status === 'REGISTRATION') {
                    if (tournament.is_joined) {
                        // Already joined
                        actionButtons += `<button class="btn btn-success btn-sm" disabled>${__("register_button")}</button>`;

                        // If creator AND tournament is full, show Start button
                        if (tournament.creator.username === document.getElementById('userName').textContent &&
                            tournament.player_count >= 2) {
                            actionButtons += `<button class="btn btn-primary btn-sm ms-2" onclick="startTournament(${tournament.id})">${__("start_tournament")}</button>`;
                        }
                    } else {
                        // Not joined yet
                        actionButtons += `<button class="btn btn-primary btn-sm" onclick="joinTournament(${tournament.id})">${__("register_button")}</button>`;
                    }
                }

                tournamentCard.innerHTML = `
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="card-title">${tournament.name}</h5>
                            ${statusBadge}
                        </div>
                        <p class="card-text">${tournament.description || `${__("no_description")}`}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${__("players")}: ${tournament.player_count}/${tournament.max_players}</small>
                            <div>
                                ${actionButtons}
                            </div>
                        </div>
                    </div>
                `;

                tournamentsDiv.appendChild(tournamentCard);
            });
        })
        .catch(error => {
            console.error('❌ Error loading tournaments:', error);
            tournamentsDiv.innerHTML = '<div class="alert alert-danger">Failed to load tournaments. Please try again.</div>';
        });
}

function loadTournamentDetails(tournamentId) {
    console.log(`Loading details for tournament ${tournamentId}`);

    const token = isLoggedIn();
    fetch(`/api/tournaments/${tournamentId}/`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(tournament => {
            console.log(`✅ Tournament details loaded:`, tournament);
            console.log(`Name: ${tournament.name}`);
            console.log(`Description: ${tournament.description || 'No description'}`);
            console.log(`Status: ${tournament.status}`);
            console.log(`Creator: ${tournament.creator.username}`);
            console.log(`Players: ${tournament.player_count}/${tournament.max_players}`);

            // Log participants
            console.log('Participants:');
            tournament.players.forEach(player => {
                console.log(`- ${player.user.username}`);
            });

            // Log available actions
            if (tournament.status === 'REGISTRATION' && !tournament.is_joined)
                console.log('Action available: Join Tournament');

            if (tournament.is_creator && tournament.status === 'REGISTRATION')
                console.log('Action available: Start Tournament');

            // Load tournament bracket
            loadTournamentBracket(tournamentId);
        })
        .catch(error => {
            console.error('❌ Error loading tournament details:', error);
        });
}

function loadTournamentBracket(tournamentId) {
    console.log(`Loading bracket for tournament ${tournamentId}`);

    const token = isLoggedIn();
    if (!token) {
        console.error('❌ User is not logged in');
        return;
    }
    fetch(`/api/tournaments/${tournamentId}/matches/`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(matches => {
            console.log(`✅ Loaded ${matches.length} matches`);

            // Group matches by round
            const matchesByRound = {};
            matches.forEach(match => {
                if (!matchesByRound[match.round]) {
                    matchesByRound[match.round] = [];
                }
                matchesByRound[match.round].push(match);
            });

            // Log the rounds and matches
            const rounds = Object.keys(matchesByRound).sort((a, b) => a - b);
            rounds.forEach(round => {
                console.log(`Round ${round}:`);

                matchesByRound[round].forEach(match => {
                    const player1Name = match.player1.username;
                    const player2Name = match.has_bye ? 'BYE' : (match.player2 ? match.player2.username : 'TBD');
                    const winnerInfo = match.winner ? ` (Winner: ${match.winner.username})` : '';
                    console.log(`  ${player1Name} vs ${player2Name}${winnerInfo}`);

                    // Log available actions
                    getUserData(token).then(currentUser => {
                        if (currentUser && !match.has_bye && match.player1 && match.player2 && !match.winner &&
                            [match.player1.id, match.player2.id].includes(currentUser.id)) {
                            if (match.game_id)
                                console.log(`  Action available: Join Game ${match.game_id}`);
                            else
                                console.log(`  Action available: Create Game for Match ${match.id}`);
                        }
                    });
                });
            });
        })
        .catch(error => {
            console.error('❌ Error loading tournament bracket:', error);
        });
}

export function joinTournament(tournamentId) {
    console.log(`Joining tournament ${tournamentId}`);

    const token = isLoggedIn();
    if (!token) {
        console.error('❌ User is not logged in');
        return;
    }
    fetch(`/api/tournaments/${tournamentId}/join/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (response.ok) {
                console.log('✅ Successfully joined tournament!');
                loadTournamentDetails(tournamentId);
                location.href = `#/tournament/${tournamentId}`;
            } else {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to join tournament');
                });
            }
        })
        .then(data => {
            console.log('Join response:', data);
        })
        .catch(error => {
            console.error('❌ Error joining tournament:', error.message);
            showMessage(error.message, 'error');
        });
}

function startTournament(tournamentId) {
    console.log(`Starting tournament ${tournamentId}`);

    const token = isLoggedIn();
    if (!token) {
        console.error('❌ User is not logged in');
        return;
    }
    fetch(`/api/tournaments/${tournamentId}/start/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (response.ok) {
                console.log('✅ Tournament started!');
                loadTournamentDetails(tournamentId);
                return response.json();
            } else {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to start tournament');
                });
            }
        })
        .then(data => {
            console.log('Start response:', data);
        })
        .catch(error => {
            console.error('❌ Error starting tournament:', error.message);
        });
}

function createTournamentGame(tournamentId, matchId) {
    console.log(`Creating game for tournament ${tournamentId}, match ${matchId}`);

    const token = isLoggedIn();
    if (!token) {
        console.error('❌ User is not logged in');
        return;
    }
    fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/create-game/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.json())
        .then(data => {
            if (data.game_id) {
                console.log(`✅ Game created! Game ID: ${data.game_id}`);
                console.log(`Redirecting to game ${data.game_id}...`);
                // Implement actual redirect
                window.location.hash = `/game/${data.game_id}`;
            } else {
                throw new Error(data.error || 'Failed to create game');
            }
        })
        .catch(error => {
            console.error('❌ Error creating tournament game:', error.message);
        });
}

function initTournamentsPage() {
    console.log('Initializing tournaments page');
    loadTournaments();
    console.log('✅ Event handlers would be set up');
    console.log('  - Back button would return to tournaments list');
    console.log('  - Create tournament button would open modal');
}

function showCreateTournamentModal() {
    console.log('Showing create tournament modal');
    console.log('Would show a modal with:');
    console.log('- Tournament Name field');
    console.log('- Description field');
    console.log('- Max Players dropdown (4, 8, 16)');
    console.log('- Cancel and Create buttons');
    console.log('When form is submitted, createTournament() would be called with the form values');
}

window.TournamentAPI = {
    createTournament,
    setupTournamentWebSocket,
    loadTournaments,
    loadTournamentDetails,
    loadTournamentBracket,
    joinTournament,
    startTournament,
    createTournamentGame,
    initTournamentsPage,
    showCreateTournamentModal
};
window.checkAndCreateTournament = checkAndCreateTournament;
window.joinTournament = joinTournament;
