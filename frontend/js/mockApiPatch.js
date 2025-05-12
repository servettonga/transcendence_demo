import mockApi from './mockApi.js';

const originalFetch = window.fetch;

const apiRouteMappings = {
    '/api/token/': async (url, options) => {
        const data = JSON.parse(options.body);
        try {
            return await mockApi.login(data.username, data.password);
        } catch (error) {
            return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
        }
    },
    '/api/token/refresh/': async () => {
        return {
            ok: true,
            json: async () => ({
                access: localStorage.getItem('accessToken'),
                refresh: localStorage.getItem('refreshToken')
            })
        };
    },
    '/api/logout/': async () => {
        await mockApi.logout();
        return { ok: true, json: async () => ({ success: true }) };
    },
    '/api/auth/register/': async (url, options) => {
        const data = JSON.parse(options.body);
        try {
            const result = await mockApi.register(data);
            return { ok: true, json: async () => result };
        } catch (error) {
            return { ok: false, status: 400, json: async () => ({ detail: error.message }) };
        }
    },

    '/api/users/me/': async (url, options) => {
        try {
            if (options.method === 'GET') {
                const user = await mockApi.getCurrentUser();
                return {
                    ok: true,
                    json: async () => ({
                        ...user,
                        settings: user.settings || { color_theme: 0 },
                        two_factor_enabled: false,
                        preferred_language: localStorage.getItem('preferredLanguage') || 'en'
                    })
                };
            }
            else if (options.method === 'PATCH') {
                let userData;

                if (options.body instanceof FormData) {
                    userData = {};
                    for (const [key, value] of options.body.entries()) {
                        if (key === 'settings' && typeof value === 'string') {
                            try {
                                userData[key] = JSON.parse(value);
                            } catch (e) {
                                userData[key] = value;
                            }
                        } else if (key === 'avatar_upload') {
                            userData.avatar = 'assets/img/avatars/user-uploaded.png';
                        } else {
                            userData[key] = value;
                        }
                    }
                } else {
                    try {
                        userData = JSON.parse(options.body);
                    } catch (e) {
                        userData = {};
                    }
                }

                const updatedUser = await mockApi.updateUserInfo(userData);
                if (userData.settings)
                    localStorage.setItem('preferredTheme', userData.settings.color_theme);

                return {
                    ok: true,
                    json: async () => ({
                        ...updatedUser,
                        message: "Profile updated successfully"
                    })
                };
            }
        } catch (error) {
            return {
                ok: false,
                status: 400,
                json: async () => ({
                    detail: error.message,
                    message: error.message
                })
            };
        }
    },
    '/api/users/me/stats/': async () => {
        try {
            const currentUser = await mockApi.getCurrentUser();
            if (!currentUser) throw new Error('Not authenticated');

            return {
                ok: true,
                json: async () => ({
                    games_played: currentUser.games_won + currentUser.games_lost,
                    games_won: currentUser.games_won,
                    games_lost: currentUser.games_lost,
                    win_ratio: currentUser.games_won / (currentUser.games_won + currentUser.games_lost) * 100 || 0
                })
            };
        } catch (error) {
            return {
                ok: false,
                status: 401,
                json: async () => ({ detail: error.message })
            };
        }
    },
    '/api/users/': async (url, options) => {
        if (options.method === 'PUT') {
            const data = JSON.parse(options.body);
            try {
                const updatedUser = await mockApi.updateUserInfo(data);
                return { ok: true, json: async () => updatedUser };
            } catch (error) {
                return { ok: false, status: 400, json: async () => ({ detail: error.message }) };
            }
        } else {
            return { ok: true, json: async () => mockApi.users };
        }
    },

    '/api/friends/': async () => {
        try {
            const friends = await mockApi.getFriends();
            return { ok: true, json: async () => friends };
        } catch (error) {
            return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
        }
    },
    '/api/friends/requests/': async () => {
        try {
            const requests = await mockApi.getFriendRequests();
            return { ok: true, json: async () => requests };
        } catch (error) {
            return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
        }
    },
    '/api/friends/requests/send/': async (url, options) => {
        const data = JSON.parse(options.body);
        try {
            const result = await mockApi.sendFriendRequest(data.username);
            return { ok: true, json: async () => result };
        } catch (error) {
            return { ok: false, status: 400, json: async () => ({ detail: error.message }) };
        }
    },

    '/api/pong/games/': async (url, options) => {
        if (options.method === 'GET') {
            try {
                const games = await mockApi.getAvailableGames();
                return { ok: true, json: async () => games };
            } catch (error) {
                return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
            }
        } else if (options.method === 'POST') {
            const data = JSON.parse(options.body);
            try {
                const newGame = await mockApi.createGame(data);
                return { ok: true, json: async () => newGame };
            } catch (error) {
                return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
            }
        }
    },
    '/api/pong/game/([0-9]+)/': async (url, options) => {
        try {
            const match = url.match(/\/api\/pong\/game\/([0-9]+)\//);
            if (!match) throw new Error('Invalid URL format');

            const gameId = parseInt(match[1], 10);
            return {
                ok: true,
                json: async () => ({ /* mock game data */ })
            };
        } catch (error) {
            return {
                ok: false,
                status: 404,
                json: async () => ({ detail: error.message })
            };
        }
    },
    '/api/pong/history/': async () => {
        try {
            const history = await mockApi.getGameHistory();
            return { ok: true, json: async () => history };
        } catch (error) {
            return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
        }
    },

    '/api/chat/messages/public/': async () => {
        try {
            const messages = await mockApi.getPublicMessages();
            return { ok: true, json: async () => messages };
        } catch (error) {
            return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
        }
    },
    '/api/chat/messages/direct/': async () => {
        try {
            const messages = await mockApi.getDirectMessages();
            return { ok: true, json: async () => messages };
        } catch (error) {
            return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
        }
    },
    '/api/chat/messages/direct/@([^/]+)/': async (url, options) => {
        try {
            // Extract username from URL
            const match = url.match(/\/api\/chat\/messages\/direct\/@([^/]+)\//);
            if (!match) throw new Error('Invalid URL format');

            const username = match[1];
            const messages = await mockApi.getDirectMessagesWithUser(username);

            return { ok: true, json: async () => messages };
        } catch (error) {
            return {
                ok: false,
                status: 401,
                json: async () => ({ detail: error.message })
            };
        }
    },

    '/api/tournaments/': async () => {
        try {
            const tournaments = await mockApi.getTournaments();
            const enhancedTournaments = tournaments.map(t => ({
                ...t,
                player_count: t.participants ? t.participants.length : 0,
                max_players: 8,
                description: t.description || "A competitive Pong tournament",
                is_joined: t.id === 1,
                creator: {
                    id: 1,
                    username: "player1",
                    display_name: "Player One"
                }
            }));

            return { ok: true, json: async () => enhancedTournaments };
        } catch (error) {
            return {
                ok: false,
                status: 401,
                json: async () => ({ detail: error.message })
            };
        }
    },

    '/api/tournaments/([0-9]+)/': async (url) => {
        try {
            const match = url.match(/\/api\/tournaments\/([0-9]+)\//);
            if (!match) throw new Error('Invalid URL format');

            const tournamentId = parseInt(match[1], 10);
            const tournament = await mockApi.getTournamentById(tournamentId);

            return {
                ok: true,
                json: async () => ({
                    ...tournament,
                    player_count: tournament.participants ? tournament.participants.length : 0,
                    max_players: 8,
                    description: tournament.description || "A competitive Pong tournament",
                    is_joined: true,
                    is_creator: tournamentId === 1 ? true : false,
                    creator: {
                        id: 1,
                        username: "player1",
                        display_name: "Player One"
                    },
                    players: tournament.participants?.map(playerId => ({
                        user: mockApi.users.find(u => u.id === playerId) || {
                            id: playerId,
                            username: `player${playerId}`,
                            display_name: `Player ${playerId}`
                        }
                    })) || []
                })
            };
        } catch (error) {
            return {
                ok: false,
                status: 404,
                json: async () => ({ detail: error.message })
            };
        }
    },

    '/api/tournaments/([0-9]+)/matches/': async (url) => {
        try {
            const match = url.match(/\/api\/tournaments\/([0-9]+)\/matches\//);
            if (!match) throw new Error('Invalid URL format');

            const tournamentId = parseInt(match[1], 10);
            const tournament = await mockApi.getTournamentById(tournamentId);

            if (!tournament.matches || !Array.isArray(tournament.matches)) {
                console.error("Tournament matches is not an array:", tournament.matches);
                return { ok: true, json: async () => [] };
            }

            const matches = tournament.matches.map(m => ({
                id: m.id,
                player1: mockApi.users.find(u => u.id === m.player1_id) || null,
                player2: m.player2_id ? (mockApi.users.find(u => u.id === m.player2_id) || null) : null,
                winner: m.winner_id ? (mockApi.users.find(u => u.id === m.winner_id) || null) : null,
                stage: m.stage,
                round: m.stage === 'semifinal' ? 1 : (m.stage === 'final' ? 2 : 1),
                game_id: null,
                has_bye: false
            }));

            return { ok: true, json: async () => matches };
        } catch (error) {
            console.error("Error in tournament matches endpoint:", error);
            return {
                ok: true,
                json: async () => []
            };
        }
    },

    '/api/users/me/friends/': async () => {
        try {
            const user = await mockApi.getCurrentUser();
            if (!user) {
                console.log('No current user found, using default user ID 1');
                mockApi.currentUser = mockApi.users.find(u => u.id === 1);
            }

            const friends = await mockApi.getFriends();

            const enhancedFriends = friends.map(friend => ({
                ...friend,
                avatar_url: friend.avatar
            }));

            console.log(`Found ${enhancedFriends.length} friends for user`);
            return { ok: true, json: async () => enhancedFriends };
        } catch (error) {
            console.error('Error in friends endpoint:', error);
            return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
        }
    },

    '/api/chat/blocks/': async (url, options) => {
        const blockedUsersInStorage = localStorage.getItem('mock_blocked_users');
        const blockedUsers = blockedUsersInStorage ? JSON.parse(blockedUsersInStorage) : [];

        if (options.method === 'GET')
            return { ok: true, json: async () => blockedUsers };
        else if (options.method === 'POST') {
            try {
                const data = JSON.parse(options.body);
                const targetUsername = data.username;
                if (blockedUsers.some(u => u.username === targetUsername))
                    return { ok: false, status: 400, json: async () => ({ detail: 'User already blocked' }) };
                const userToBlock = mockApi.users.find(u => u.username === targetUsername);
                if (!userToBlock)
                    return { ok: false, status: 404, json: async () => ({ detail: 'User not found' }) };
                const blockedUser = {
                    id: Date.now(),
                    username: userToBlock.username,
                    display_name: userToBlock.display_name,
                    avatar_url: userToBlock.avatar
                };
                blockedUsers.push(blockedUser);
                localStorage.setItem('mock_blocked_users', JSON.stringify(blockedUsers));
                return { ok: true, json: async () => blockedUser };
            } catch (error) {
                return { ok: false, status: 400, json: async () => ({ detail: error.message }) };
            }
        }

        return { ok: false, status: 405, json: async () => ({ detail: 'Method not allowed' }) };
    },

    '/api/users/@([^/]+)/stats/': async (url) => {
        try {
            const match = url.match(/\/api\/users\/@([^/]+)\/stats\//);
            if (!match) throw new Error('Invalid URL format');
            const username = match[1];
            const user = mockApi.users.find(u => u.username === username);
            if (!user) throw new Error('User not found');
            return {
                ok: true,
                json: async () => ({
                    games_played: user.games_won + user.games_lost,
                    games_won: user.games_won,
                    games_lost: user.games_lost,
                    win_ratio: user.games_won / (user.games_won + user.games_lost) * 100 || 0
                })
            };
        } catch (error) {
            return {
                ok: false,
                status: error.message === 'User not found' ? 404 : 400,
                json: async () => ({ detail: error.message })
            };
        }
    },

    '/api/stats/top-players/': async () => {
        return {
            ok: true,
            json: async () => ({
                labels: mockApi.users.map(u => u.display_name || u.username),
                datasets: [
                    {
                        label: 'Wins',
                        data: mockApi.users.map(u => u.games_won),
                        backgroundColor: 'rgba(75, 192, 192, 0.6)'
                    },
                    {
                        label: 'Losses',
                        data: mockApi.users.map(u => u.games_lost),
                        backgroundColor: 'rgba(255, 99, 132, 0.6)'
                    }
                ]
            })
        };
    },

    '/api/stats/score-distribution/': async () => {
        return {
            ok: true,
            json: async () => ({
                labels: ['0-2', '3-5', '6-8', '9-10'],
                datasets: [
                    {
                        label: 'Number of Games',
                        data: [1, 3, 8, 12],
                        backgroundColor: 'rgba(54, 162, 235, 0.6)'
                    }
                ]
            })
        };
    },

    '/api/stats/duration-distribution/': async () => {
        return {
            ok: true,
            json: async () => ({
                labels: ['< 1 min', '1-2 mins', '2-3 mins', '3-5 mins', '> 5 mins'],
                datasets: [
                    {
                        label: 'Number of Games',
                        data: [2, 8, 10, 5, 1],
                        backgroundColor: 'rgba(153, 102, 255, 0.6)'
                    }
                ]
            })
        };
    },

    '/api/pong/game/my/': async () => {
        try {
            const currentUser = await mockApi.getCurrentUser();
            if (!currentUser) throw new Error('Not authenticated');

            const myGames = mockApi.games.filter(game =>
                game.player1_username === currentUser.username ||
                game.player2_username === currentUser.username
            );

            const formattedGames = myGames.map(game => ({
                id: game.id,
                status: game.status.toUpperCase(),
                player1_name: game.player1_username,
                player2_name: game.player2_username,
                player1_username: game.player1_username,
                player2_username: game.player2_username,
                created_at: game.created_at
            }));

            formattedGames.unshift({
                id: 9999,
                status: 'WAITING',
                player1_name: 'player2',
                player1_username: 'player2',
                player2_name: null,
                player2_username: null,
                created_at: new Date().toISOString()
            });

            return { ok: true, json: async () => formattedGames };
        } catch (error) {
            return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
        }
    },

    '/api/pong/game/([0-9]+)/join/': async (url, options) => {
        try {
            console.log(`[MockAPI] Processing join game request: ${url}`);

            const match = url.match(/\/api\/pong\/game\/([0-9]+)\/join\//);
            if (!match) {
                console.error(`[MockAPI] Failed to extract game ID from URL: ${url}`);
                throw new Error('Invalid URL format');
            }

            const gameId = parseInt(match[1], 10);
            console.log(`[MockAPI] Extracted game ID: ${gameId}`);

            return {
                ok: true,
                json: async () => ({
                    message: 'Successfully joined game',
                    game_id: gameId,
                    status: 'joined'
                })
            };
        } catch (error) {
            console.error(`[MockAPI] Error in join game handler:`, error);
            return {
                ok: false,
                status: 400,
                json: async () => ({ detail: error.message })
            };
        }
    },

    '/api/users/me/friend-requests': async () => {
        try {
            const friendRequests = await mockApi.getFriendRequests();
            const enhancedRequests = {
                sent: friendRequests.sent.map(req => ({
                    ...req,
                    from_user: {
                        ...req.from_user,
                        avatar_url: req.from_user.avatar
                    },
                    to_user: {
                        ...req.to_user,
                        avatar_url: req.to_user.avatar
                    }
                })),
                received: friendRequests.received.map(req => ({
                    ...req,
                    from_user: {
                        ...req.from_user,
                        avatar_url: req.from_user.avatar
                    },
                    to_user: {
                        ...req.to_user,
                        avatar_url: req.to_user.avatar
                    }
                }))
            };

            return { ok: true, json: async () => enhancedRequests };
        } catch (error) {
            return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
        }
    },

    '/api/users/me/friend-requests/': async (url, options) => {
        if (options.method === 'POST') {
            try {
                const data = JSON.parse(options.body);
                const result = await mockApi.sendFriendRequest(data.username);
                return { ok: true, json: async () => result };
            } catch (error) {
                return { ok: false, status: 400, json: async () => ({ detail: error.message }) };
            }
        } else {
            try {
                const requests = await mockApi.getFriendRequests();
                return { ok: true, json: async () => requests };
            } catch (error) {
                return { ok: false, status: 401, json: async () => ({ detail: error.message }) };
            }
        }
    },

    '/api/users/me/friend-requests/([0-9]+)/': async (url, options) => {
        try {
            const match = url.match(/\/api\/users\/me\/friend-requests\/([0-9]+)\//);
            if (!match) throw new Error('Invalid URL format');
            const requestId = parseInt(match[1], 10);
            if (options.method === 'DELETE') {
                const currentUser = await mockApi.getCurrentUser();
                if (!currentUser) throw new Error('Not authenticated');
                const index = mockApi.friendRequests.sent.findIndex(req => req.id === requestId);
                if (index !== -1) {
                    mockApi.friendRequests.sent.splice(index, 1);
                    mockApi.saveData();
                }
                return { ok: true, json: async () => ({ success: true }) };
            }

            return { ok: false, status: 405, json: async () => ({ detail: 'Method not allowed' }) };
        } catch (error) {
            return { ok: false, status: 400, json: async () => ({ detail: error.message }) };
        }
    },

    '/api/users/me/friend-requests/([0-9]+)/accept/': async (url, options) => {
        try {
            const match = url.match(/\/api\/users\/me\/friend-requests\/([0-9]+)\/accept\//);
            if (!match) throw new Error('Invalid URL format');
            const requestId = parseInt(match[1], 10);
            const result = await mockApi.acceptFriendRequest(requestId);
            return { ok: true, json: async () => result };
        } catch (error) {
            return { ok: false, status: 400, json: async () => ({ detail: error.message }) };
        }
    },

    '/api/users/me/friend-requests/([0-9]+)/reject/': async (url, options) => {
        try {
            const match = url.match(/\/api\/users\/me\/friend-requests\/([0-9]+)\/reject\//);
            if (!match) throw new Error('Invalid URL format');
            const requestId = parseInt(match[1], 10);
            const result = await mockApi.rejectFriendRequest(requestId);
            return { ok: true, json: async () => result };
        } catch (error) {
            return { ok: false, status: 400, json: async () => ({ detail: error.message }) };
        }
    },
};

function patchFetchAPI() {
    window.fetch = async function (url, options = {}) {
        console.log(`[MockAPI] Intercepting fetch request to: ${url}`);
        options = options || {};
        options.method = options.method || 'GET';
        options.headers = options.headers || {};
        let urlString = url;
        if (url instanceof URL)
            urlString = url.toString();

        if (apiRouteMappings[urlString]) {
            console.log(`[MockAPI] Found exact match for ${urlString}`);
            return await apiRouteMappings[urlString](urlString, options);
        }

        for (const pattern in apiRouteMappings) {
            if (!pattern.includes('(') && !pattern.includes('[') && !pattern.includes('*'))
                continue;

            try {
                const regexPattern = new RegExp(pattern);

                if (regexPattern.test(urlString)) {
                    console.log(`[MockAPI] Found pattern match: ${pattern} for URL: ${urlString}`);
                    return await apiRouteMappings[pattern](urlString, options);
                }
            } catch (error) {
                console.error(`[MockAPI] Error matching pattern ${pattern}:`, error);
            }
        }

        console.warn(`[MockAPI] No mock found for ${urlString}, using original fetch`);
        return await originalFetch(url, options);
    };
}

class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.readyState = 1;
        this.onopen = null;
        this.onclose = null;
        this.onmessage = null;
        this.onerror = null;

        console.log(`[MockWebSocket] Creating connection to ${url}`);

        setTimeout(() => {
            if (this.onopen) {
                console.log(`[MockWebSocket] Connection to ${url} opened`);
                this.onopen({ target: this });
            }

            if (url.includes('/ws/chat/'))
                this.simulateChatMessages();

            if (url.includes('/ws/friends/'))
                this.simulateFriendsEvents();
        }, 300);
    }

    send(data) {
        console.log(`[MockWebSocket] Message sent:`, data);

        try {
            const parsedData = JSON.parse(data);

            if (parsedData.type === 'chat.message' || parsedData.type === 'PUBLIC') {
                setTimeout(() => {
                    mockApi.sendMessage(
                        parsedData.content || parsedData.message?.content,
                        'PUBLIC'
                    ).then(message => {
                        if (this.onmessage) {
                            this.onmessage({
                                data: JSON.stringify(message)
                            });
                        }
                    });
                }, 200);
            }
            else if (parsedData.type === 'TEXT' || parsedData.type === 'PRIVATE') {
                setTimeout(() => {
                    mockApi.sendMessage(
                        parsedData.message?.content,
                        'PRIVATE',
                        parsedData.message?.recipient_username
                    ).then(message => {
                        if (this.onmessage) {
                            this.onmessage({
                                data: JSON.stringify(message)
                            });
                        }
                    });
                }, 200);
            }
            else if (parsedData.type === 'ping') {
                setTimeout(() => {
                    if (this.onmessage) {
                        this.onmessage({
                            data: JSON.stringify({ type: 'pong' })
                        });
                    }
                }, 100);
            }
        } catch (e) {
            console.log(`[MockWebSocket] Failed to parse message:`, e);
        }
    }

    close() {
        console.log(`[MockWebSocket] Connection closed`);
        if (this.onclose)
            this.onclose({ target: this });
    }

    simulateChatMessages() {
        setInterval(() => {
            if (Math.random() > 0.9 && this.onmessage) {
                const randomUser = mockApi.users[Math.floor(Math.random() * mockApi.users.length)];
                const messages = [
                    'Hey everyone',
                    'Anyone up for a game?',
                    'I just won my tournament!',
                    'How do I improve my Pong skills?',
                    'The new update is great!',
                    'Who wants to play?'
                ];
                const message = {
                    id: Date.now(),
                    content: messages[Math.floor(Math.random() * messages.length)],
                    created_at: new Date().toISOString(),
                    type: 'PUBLIC',
                    sender: {
                        id: randomUser.id,
                        username: randomUser.username,
                        display_name: randomUser.display_name,
                        avatar: randomUser.avatar
                    }
                };

                mockApi.messages.public.push(message);
                mockApi.saveData();

                this.onmessage({
                    data: JSON.stringify(message)
                });
            }
        }, 10000);
    }

    simulateFriendsEvents() {
        setInterval(() => {
            if (Math.random() > 0.85 && this.onmessage) {
                const statuses = ['online', 'away', 'in_game', 'offline'];
                const randomUser = mockApi.users[Math.floor(Math.random() * mockApi.users.length)];
                const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
                const currentUser = mockApi.currentUser;
                if (currentUser && randomUser.id === currentUser.id) return;

                randomUser.status = newStatus;
                mockApi.saveData();

                const statusUpdate = {
                    type: 'status_change',
                    user_id: randomUser.id,
                    username: randomUser.username,
                    status: newStatus
                };

                this.onmessage({
                    data: JSON.stringify(statusUpdate)
                });
            }
        }, 15000);
    }
}

function patchWebSocket() {
    window.WebSocket = MockWebSocket;
}

export function initializeMockApi() {
    patchFetchAPI();
    patchWebSocket();
    console.log('[MockAPI] Initialized - API calls are now mocked');
}
