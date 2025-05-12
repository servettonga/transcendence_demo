import { isLoggedIn } from "../utils/session.js";
import { getUserData } from "../utils/get_user_data.js";
import { showMessage } from '../components/show_message.js';
import { __ } from '../lang/i18n.js';

let refreshInProgress = false;
window.gameOverModalShowing = false;

export async function fetchTournamentData(tournamentId, forceRefresh = false) {
    console.log(`Loading tournament ${tournamentId}`);

    if (refreshInProgress && !forceRefresh) {
        console.log('Refresh already in progress, skipping');
        return;
    }

    refreshInProgress = true;

    const token = isLoggedIn();
    if (!token) {
        window.location.hash = '#/';
        refreshInProgress = false;
        return;
    }

    // Safety timeout to reset the flag after 10 seconds
    const safetyTimeout = setTimeout(() => {
        console.log('Safety timeout: resetting refreshInProgress flag');
        refreshInProgress = false;
    }, 10000);

    const bracketDiv = document.getElementById('bracket');
    const tournamentInfoDiv = document.getElementById('tournamentInfo');

    if (!bracketDiv || !tournamentInfoDiv) {
        console.error('Required DOM elements not found');
        return;
    }

    bracketDiv.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';
    tournamentInfoDiv.innerHTML = '';

    try {
        // Fetch tournament details
        const tournamentResponse = await fetch(`/api/tournaments/${tournamentId}/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!tournamentResponse.ok)
            throw new Error('Failed to load tournament');

        const tournament = await tournamentResponse.json();

        // Fetch tournament matches to find the champion
        const matchesResponse = await fetch(`/api/tournaments/${tournamentId}/matches/`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!matchesResponse.ok)
            throw new Error('Failed to load matches');

        const matches = await matchesResponse.json();

        // Find the champion if the tournament is completed
        let champion = null;
        if (tournament.status === 'COMPLETED') {
            // Find the final match (the highest round with a winner)
            const rounds = [...new Set(matches.map(match => match.round))].sort((a, b) => b - a);
            if (rounds.length > 0) {
                const finalRound = rounds[0];
                const finalMatches = matches.filter(match => match.round === finalRound && match.winner);
                if (finalMatches.length > 0)
                    champion = finalMatches[0].winner;
            }
        }

        // Render complete tournament info
        // 1. Title section with status badge
        const statusBadgeClass = tournament.status === 'REGISTRATION' ? 'primary' :
            tournament.status === 'IN_PROGRESS' ? 'success' : 'secondary';
        const statusText = tournament.status === 'REGISTRATION' ? __('status_registration_open') :
            tournament.status === 'IN_PROGRESS' ? __('status_in_progress') : __('status_completed');

        const titleSection = document.createElement('div');
        titleSection.className = 'tournament-title-row';
        titleSection.innerHTML = `
            <h1 class="tournament-title">${tournament.name}</h1>
            <div>
                <span class="badge bg-${statusBadgeClass}">
                    ${statusText}
                </span>
            </div>
        `;
        tournamentInfoDiv.appendChild(titleSection);

        // 2. Tournament description
        const descriptionSection = document.createElement('div');
        descriptionSection.className = 'tournament-description';
        descriptionSection.innerHTML = tournament.description || __('no_description');
        tournamentInfoDiv.appendChild(descriptionSection);

        // 3. Tournament meta information
        const metaSection = document.createElement('div');
        metaSection.className = 'tournament-meta';
        metaSection.innerHTML = `
            <div>${__("players")}: ${tournament.player_count}/${tournament.max_players}</div>
            <div>${__("created_by")}: ${tournament.creator.username}</div>
        `;
        tournamentInfoDiv.appendChild(metaSection);

        // 4. Add champion section if tournament is completed
        if (tournament.status === 'COMPLETED' && champion) {
            const championDiv = document.createElement('div');
            championDiv.className = 'champion-section mb-4 text-center';
            championDiv.innerHTML = `
                <div class="p-3 bg-light rounded">
                    <h3 class="text-center"><i class="fas fa-trophy text-warning me-2"></i>${__('tournament_champion')}</h3>
                    <div class="champion-name">${champion.display_name}</div>
                </div>
            `;
            tournamentInfoDiv.appendChild(championDiv);
        }

        // 5. Action buttons based on role and tournament status
        const actionDiv = document.createElement('div');
        actionDiv.className = 'tournament-actions';

        // Left side buttons (join/start)
        const leftButtons = document.createElement('div');

        if (tournament.status === 'REGISTRATION') {
            if (!tournament.is_joined) {
                // Join button for non-participants
                const joinBtn = document.createElement('button');
                joinBtn.className = 'btn btn-primary me-2';
                joinBtn.innerHTML = '<i class="fas fa-sign-in-alt me-1" data-i18n="join_tournament"></i> Join Tournament';
                joinBtn.addEventListener('click', () => joinTournament(tournamentId));
                leftButtons.appendChild(joinBtn);
            }

            // Start button for creator only
            if (tournament.is_creator) {
                const startBtn = document.createElement('button');
                startBtn.className = 'btn btn-success';
                startBtn.innerHTML = `<i class="fas fa-play me-1"></i> ${__('start_tournament')}`;
                startBtn.addEventListener('click', () => startTournament(tournamentId));
                leftButtons.appendChild(startBtn);
            }
        }

        // Right side buttons (delete for creator)
        const rightButtons = document.createElement('div');

        // Only show delete button for the creator and not for IN_PROGRESS tournaments
        if (tournament.is_creator && tournament.status !== 'IN_PROGRESS') {
            const deleteBtn = document.createElement('button');
            deleteBtn.id = 'deleteTournamentBtn';
            deleteBtn.className = 'btn btn-danger';
            deleteBtn.innerHTML = `<i class="fas fa-trash"></i>${__('delete_tournament')}`;
            deleteBtn.addEventListener('click', () => confirmDeleteTournament(tournamentId));
            rightButtons.appendChild(deleteBtn);
        }

        // Add buttons to action div
        actionDiv.appendChild(leftButtons);
        actionDiv.appendChild(rightButtons);
        tournamentInfoDiv.appendChild(actionDiv);

        // 6. Participants list if in registration
        if (tournament.status === 'REGISTRATION' && tournament.players.length > 0) {
            const participantsSection = document.createElement('div');
            participantsSection.className = 'participants-section';

            let participantsHTML = `
                <h4 class="participants-title" data-i18n="participants_header">Participants (${tournament.players.length}/${tournament.max_players})</h4>
                <ul class="participants-list">
            `;

            tournament.players.forEach(player => {
                const isCreator = player.user.id === tournament.creator.id;
                participantsHTML += `
                    <li class="participant-item">
                        ${player.user.username}
                        ${isCreator ? '<span class="creator-badge" data-i18n="creator">Creator</span>' : ''}
                    </li>
                `;
            });

            participantsHTML += `</ul>`;
            participantsSection.innerHTML = participantsHTML;
            tournamentInfoDiv.appendChild(participantsSection);
        }

        // Render bracket
        await renderBracket(matches, tournamentId);

        // Setup WebSocket for real-time updates
        setupTournamentWebSocket(tournamentId);
    } catch (error) {
        console.error('Error loading tournament:', error);
        console.error(error.stack);
        if (tournamentInfoDiv) tournamentInfoDiv.innerHTML = '<div class="alert alert-danger">Error loading tournament info</div>';
        if (bracketDiv) bracketDiv.innerHTML = '<div class="alert alert-danger">Error loading tournament bracket</div>';
    } finally {
        clearTimeout(safetyTimeout);
        refreshInProgress = false;
        console.log(`Tournament ${tournamentId} refresh completed`);
    }
}

function confirmDeleteTournament(tournamentId) {
    if (confirm(__('confirm_delete_tournament')))
        deleteTournament(tournamentId);
}

function deleteTournament(tournamentId) {
    const token = isLoggedIn();
    if (!token) {
        console.error('Not logged in');
        showMessage('You must be logged in to delete a tournament', 'error');
        return;
    }

    fetch(`/api/tournaments/${tournamentId}/delete/`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (response.ok) {
                showMessage('Tournament deleted successfully', 'success');
                // Redirect to the tournament list
                window.location.hash = '#/tournaments';
            } else {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to delete tournament');
                });
            }
        })
        .catch(error => {
            console.error('Error deleting tournament:', error);
            showMessage(`Failed to delete tournament: ${error.message}`, 'error');
        });
}

async function renderBracket(matches, tournamentId) {
    const bracketDiv = document.getElementById('bracket');
    bracketDiv.innerHTML = '';

    // Add defensive checks to handle non-array matches
    if (!matches || !Array.isArray(matches)) {
        console.error("Invalid matches data:", matches);
        bracketDiv.innerHTML = `<div class="alert alert-warning">${__("no_tournament_matches")}</div>`;
        return;
    }

    if (matches.length === 0) {
        bracketDiv.innerHTML = `<div class="alert alert-info">${__("no_tournaments_found")}</div>`;
        return;
    }

    // Group matches by round
    const matchesByRound = {};
    matches.forEach(match => {
        if (!matchesByRound[match.round])
            matchesByRound[match.round] = [];
        matchesByRound[match.round].push(match);
    });

    // Create container for the bracket
    const bracketContainer = document.createElement('div');
    bracketContainer.className = 'tournament-bracket';

    // Get all rounds and sort them
    const rounds = Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b));

    // For each round, create a column
    for (const round of rounds) {
        const roundColumn = document.createElement('div');
        roundColumn.className = 'round';
        roundColumn.innerHTML = `<h3>${__('round')} ${round}</h3>`;

        // Add each match in this round
        for (const match of matchesByRound[round]) {
            const matchCard = await createMatchCard(match, tournamentId);
            roundColumn.appendChild(matchCard);
        }

        bracketContainer.appendChild(roundColumn);
    }

    bracketDiv.appendChild(bracketContainer);
}

async function createMatchCard(match, tournamentId) {
    const matchCard = document.createElement('div');
    matchCard.className = 'match';

    // Determine match status and style
    let matchStatus = '';
    if (match.winner) {
        matchCard.classList.add('match-completed');
        matchStatus = `<div class="match-status">${__('status_completed')}</div>`;
    } else if (match.game_id) {
        matchCard.classList.add('match-in-progress');
        matchStatus = `<div class="match-status">${__('status_in_progress')}</div>`;
    }

    // Get player names
    const player1Name = match.player1 ? match.player1.username : 'TBD';
    const player2Name = match.has_bye ? 'BYE' : (match.player2 ? match.player2.username : 'TBD');

    // Highlight winner if exists
    const player1Class = match.winner && match.winner.id === match.player1.id ? 'winner' : '';
    const player2Class = match.winner && match.player2 && match.winner.id === match.player2.id ? 'winner' : '';

    // Create play button if user is in this match
    let playButton = '';

    try {
        const token = isLoggedIn();
        if (token) {
            const currentUser = await getUserData(token);

            if (currentUser && match.player1 && match.player2 && !match.winner && !match.has_bye &&
                (currentUser.id === match.player1.id || currentUser.id === match.player2.id)) {
                if (match.game_id) {
                    playButton = `<a href="#/game/${match.game_id}" class="btn btn-success btn-sm">${__('"join_game":')}</a>`;
                } else {
                    playButton = `<button onclick="createMatchGame(${tournamentId}, ${match.id})" class="btn btn-primary btn-sm">${__('play_match')}</button>`;
                }
            }
        }
    } catch (error) {
        console.error("Error getting user data:", error);
    }

    // Build match card HTML
    matchCard.innerHTML = `
        ${matchStatus}
        <div class="player ${player1Class}">${player1Name}</div>
        <div class="vs">vs</div>
        <div class="player ${player2Class}">${player2Name}</div>
        <div class="match-actions">${playButton}</div>
    `;

    return matchCard;
}

// Function to create a game for a match
function createMatchGame(tournamentId, matchId) {
    const token = isLoggedIn();
    if (!token) {
        console.error('Not logged in');
        showMessage('You must be logged in to play', 'error');
        return;
    }

    showMessage('Creating game...', 'info');

    fetch(`/api/tournaments/${tournamentId}/matches/${matchId}/create-game/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to create game');
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.game_id) {
                console.log(`Game created with ID: ${data.game_id}`);
                showMessage('Game created! Redirecting...', 'success');

                // Give time for the message to be seen
                setTimeout(() => {
                    window.location.hash = `#/game/${data.game_id}`;
                }, 500);
            } else {
                throw new Error('No game ID returned');
            }
        })
        .catch(error => {
            console.error('Error creating game:', error);
            showMessage(`Failed to create game: ${error.message}`, 'error');
        });
}

function setupTournamentWebSocket(tournamentId) {
    const token = isLoggedIn();
    if (!token) {
        console.error('Not logged in, cannot set up WebSocket');
        return;
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.host;
    const socket = new WebSocket(`${wsProtocol}//${wsHost}/ws/tournament/${tournamentId}/?token=${token}`);

    socket.onopen = () => {
        console.log(`✅ Tournament WebSocket connected for tournament ${tournamentId}`);
    };

    socket.onmessage = (event) => {
        console.log('Tournament WebSocket received message:', event.data);
        let data;
        try {
            data = JSON.parse(event.data);
            // Store the last tournament message for game over modal to use
            window.lastTournamentMessage = data;
        } catch (e) {
            console.error('Error parsing WebSocket message:', e);
            return;
        }

        // Debounce tournament updates to prevent multiple refreshes
        if (window.tournamentUpdateTimeout)
            clearTimeout(window.tournamentUpdateTimeout);

        // Handle different event types
        switch (data.type) {
            case 'PLAYER_JOINED':
                showMessage(`${data.player} joined the tournament!`, 'info');
                // Debounce the refresh call
                window.tournamentUpdateTimeout = setTimeout(() => {
                    fetchTournamentData(tournamentId);
                }, 300);
                break;

            case 'TOURNAMENT_STARTED':
                showMessage('Tournament has started!', 'success');
                // Debounce the refresh call
                window.tournamentUpdateTimeout = setTimeout(() => {
                    fetchTournamentData(tournamentId);
                }, 300);
                break;

            case 'MATCH_COMPLETED':
                console.log('Match completed!', data);
                showMessage(`Match completed! ${data.winner_username} won!`, 'success');
                // Debounce the refresh call
                window.tournamentUpdateTimeout = setTimeout(() => {
                    fetchTournamentData(tournamentId);
                }, 300);
                break;

            case 'NEW_ROUND':
                showMessage(`Round ${data.data.round} has started!`, 'info');
                // Debounce the refresh call
                window.tournamentUpdateTimeout = setTimeout(() => {
                    fetchTournamentData(tournamentId);
                }, 300);
                break;

            case 'TOURNAMENT_DELETED':
                showMessage('This tournament has been deleted by the creator', 'info');
                // Redirect to tournaments list
                window.location.hash = '#/tournaments';
                break;

            default:
                console.log('Unhandled tournament event:', data);
        }
    };

    socket.onerror = (error) => {
        console.error('Tournament WebSocket error:', error);
    };

    socket.onclose = () => {
        console.log('Tournament WebSocket disconnected');
        // Try to reconnect after a delay
        setTimeout(() => setupTournamentWebSocket(tournamentId), 3000);
    };

    return socket;
}

window.createMatchGame = createMatchGame;
window.startTournament = function (tournamentId) {
    const token = isLoggedIn();
    if (!token) return;

    fetch(`/api/tournaments/${tournamentId}/start/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok)
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to start tournament');
                });
            return response.json();
        })
        .then(() => {
            showMessage('Tournament started!', 'success');
            fetchTournamentData(tournamentId);
        })
        .catch(error => {
            console.error('Error starting tournament:', error);
            showMessage(error.message, 'error');
        });
};

window.joinTournament = function (tournamentId) {
    const token = isLoggedIn();
    if (!token) return;

    fetch(`/api/tournaments/${tournamentId}/join/`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok)
                return response.json().then(data => {
                    throw new Error(data.error || 'Failed to join tournament');
                });
            return response.json();
        })
        .then(() => {
            showMessage('Successfully joined tournament!', 'success');
            if (window.location.hash === `#/tournament/${tournamentId}`)
                fetchTournamentData(tournamentId);
            else
                loadTournaments();
        })
        .catch(error => {
            console.error('Error joining tournament:', error);
            showMessage(error.message, 'error');
        });
};
