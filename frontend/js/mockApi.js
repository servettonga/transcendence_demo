class MockApi {
    constructor() {
        this.initializeData();
        this.delay = 300;
    }

    initializeData() {
        this.users = JSON.parse(localStorage.getItem('mock_users')) || this.getDefaultUsers();
        this.games = JSON.parse(localStorage.getItem('mock_games')) || this.getDefaultGames();
        this.messages = JSON.parse(localStorage.getItem('mock_messages')) || this.getDefaultMessages();
        this.friends = JSON.parse(localStorage.getItem('mock_friends')) || this.getDefaultFriends();
        this.friendRequests = JSON.parse(localStorage.getItem('mock_friendRequests')) || this.getDefaultFriendRequests();
        this.tournaments = JSON.parse(localStorage.getItem('mock_tournaments')) || this.getDefaultTournaments();
        this.currentUser = JSON.parse(localStorage.getItem('mock_currentUser')) || null;
    }

    saveData() {
        localStorage.setItem('mock_users', JSON.stringify(this.users));
        localStorage.setItem('mock_games', JSON.stringify(this.games));
        localStorage.setItem('mock_messages', JSON.stringify(this.messages));
        localStorage.setItem('mock_friends', JSON.stringify(this.friends));
        localStorage.setItem('mock_friendRequests', JSON.stringify(this.friendRequests));
        localStorage.setItem('mock_tournaments', JSON.stringify(this.tournaments));
        if (this.currentUser)
            localStorage.setItem('mock_currentUser', JSON.stringify(this.currentUser));
    }

    async request(data, errorChance = 0) {
        await new Promise(resolve => setTimeout(resolve, this.delay));
        if (errorChance > 0 && Math.random() < errorChance)
            throw new Error('Network error');
        return data;
    }

    getDefaultUsers() {
        return [
            {
                id: 1,
                username: 'player1',
                display_name: 'Player One',
                email: 'player1@example.com',
                avatar: 'assets/img/avatars/avatar1.png',
                status: 'online',
                games_won: 8,
                games_lost: 2,
                is_active: true,
                settings: { color_theme: 0 },
                preferred_language: 'en',
                two_factor_enabled: false
            },
            {
                id: 2,
                username: 'player2',
                display_name: 'Player Two',
                email: 'player2@example.com',
                avatar: 'assets/img/avatars/avatar2.png',
                status: 'online',
                games_won: 7,
                games_lost: 4,
                is_active: true,
                settings: { color_theme: 0 },
                preferred_language: 'en',
                two_factor_enabled: false
            },
            {
                id: 3,
                username: 'player3',
                display_name: 'Player Three',
                email: 'player3@example.com',
                avatar: 'assets/img/avatars/avatar3.png',
                status: 'offline',
                games_won: 7,
                games_lost: 6,
                is_active: true,
                settings: { color_theme: 0 },
                preferred_language: 'en',
                two_factor_enabled: false
            },
            {
                id: 4,
                username: 'admin',
                display_name: 'Admin User',
                email: 'admin@example.com',
                avatar: 'assets/img/avatars/avatar4.png',
                status: 'busy',
                games_won: 15,
                games_lost: 3,
                is_active: true,
                settings: { color_theme: 0 },
                preferred_language: 'en',
                two_factor_enabled: false
            }
        ];
    }

    getDefaultGames() {
        return [
            {
                id: 1,
                status: 'completed',
                player1_username: 'player1',
                player2_username: 'player2',
                player1_score: 10,
                player2_score: 3,
                created_at: '2025-05-09T10:30:00Z',
                duration_seconds: 165,
                winner: 'player1'
            },
            {
                id: 2,
                status: 'completed',
                player1_username: 'player2',
                player2_username: 'player3',
                player1_score: 10,
                player2_score: 7,
                created_at: '2025-05-09T11:15:00Z',
                duration_seconds: 210,
                winner: 'player2'
            },
            {
                id: 3,
                status: 'completed',
                player1_username: 'player1',
                player2_username: 'player3',
                player1_score: 8,
                player2_score: 10,
                created_at: '2025-05-10T09:45:00Z',
                duration_seconds: 195,
                winner: 'player3'
            },
            {
                id: 4,
                status: 'WAITING',
                player1_username: 'player1',
                player2_username: null,
                created_at: '2025-05-11T08:30:00Z',
                duration_seconds: 0
            }
        ];
    }

    getDefaultMessages() {
        return {
            public: [
                {
                    id: 1,
                    content: 'Hello everyone!',
                    sender: { id: 1, username: 'player1', display_name: 'Player One', avatar: 'assets/img/avatars/avatar1.png' },
                    type: 'PUBLIC',
                    created_at: '2025-05-10T10:00:00Z'
                },
                {
                    id: 2,
                    content: 'Hi there!',
                    sender: { id: 2, username: 'player2', display_name: 'Player Two', avatar: 'assets/img/avatars/avatar2.png' },
                    type: 'PUBLIC',
                    created_at: '2025-05-10T10:01:00Z'
                },
                {
                    id: 3,
                    content: 'Anyone up for a game?',
                    sender: { id: 1, username: 'player1', display_name: 'Player One', avatar: 'assets/img/avatars/avatar1.png' },
                    type: 'PUBLIC',
                    created_at: '2025-05-10T10:02:00Z'
                }
            ],
            private: {
                'player1_player2': [
                    {
                        id: 4,
                        content: 'Hi Player Two, want to play a match?',
                        sender: { id: 1, username: 'player1', display_name: 'Player One', avatar: 'assets/img/avatars/avatar1.png' },
                        recipient: { id: 2, username: 'player2', display_name: 'Player Two', avatar: 'assets/img/avatars/avatar2.png' },
                        type: 'PRIVATE',
                        created_at: '2025-05-10T11:00:00Z'
                    },
                    {
                        id: 5,
                        content: 'Sure, I\'m available now',
                        sender: { id: 2, username: 'player2', display_name: 'Player Two', avatar: 'assets/img/avatars/avatar2.png' },
                        recipient: { id: 1, username: 'player1', display_name: 'Player One', avatar: 'assets/img/avatars/avatar1.png' },
                        type: 'PRIVATE',
                        created_at: '2025-05-10T11:01:00Z'
                    }
                ],
                'player1_player3': [
                    {
                        id: 6,
                        content: 'Good game yesterday!',
                        sender: { id: 3, username: 'player3', display_name: 'Player Three', avatar: 'assets/img/avatars/avatar3.png' },
                        recipient: { id: 1, username: 'player1', display_name: 'Player One', avatar: 'assets/img/avatars/avatar1.png' },
                        type: 'PRIVATE',
                        created_at: '2025-05-11T09:00:00Z'
                    }
                ]
            }
        };
    }

    getDefaultFriends() {
        return [
            {
                id: 1,
                user: 1,
                friend: 2,
                created_at: '2025-05-01T10:00:00Z'
            },
            {
                id: 2,
                user: 2,
                friend: 1,
                created_at: '2025-05-01T10:00:00Z'
            },
            {
                id: 3,
                user: 1,
                friend: 3,
                created_at: '2025-05-05T14:30:00Z'
            },
            {
                id: 4,
                user: 3,
                friend: 1,
                created_at: '2025-05-05T14:30:00Z'
            }
        ];
    }

    getDefaultFriendRequests() {
        return {
            sent: [
                {
                    id: 1,
                    from_user: { id: 1, username: 'player1', display_name: 'Player One', avatar: 'assets/img/avatars/avatar1.png' },
                    to_user: { id: 4, username: 'admin', display_name: 'Admin User', avatar: 'assets/img/avatars/avatar4.png' },
                    created_at: '2025-05-10T15:00:00Z',
                    status: 'pending'
                }
            ],
            received: [
                {
                    id: 2,
                    from_user: { id: 3, username: 'player3', display_name: 'Player Three', avatar: 'assets/img/avatars/avatar3.png' },
                    to_user: { id: 2, username: 'player2', display_name: 'Player Two', avatar: 'assets/img/avatars/avatar2.png' },
                    created_at: '2025-05-11T09:15:00Z',
                    status: 'pending'
                }
            ]
        };
    }

    getDefaultTournaments() {
        return [
            {
                id: 1,
                name: 'Weekly Tournament',
                status: 'ongoing',
                start_date: '2025-05-08T10:00:00Z',
                end_date: '2025-05-15T18:00:00Z',
                participants: [1, 2, 3, 4],
                matches: [
                    { id: 1, player1_id: 1, player2_id: 4, winner_id: 1, stage: 'semifinal' },
                    { id: 2, player1_id: 2, player2_id: 3, winner_id: 2, stage: 'semifinal' },
                    { id: 3, player1_id: 1, player2_id: 2, winner_id: null, stage: 'final' }
                ]
            },
            {
                id: 2,
                name: 'Championship',
                status: 'upcoming',
                start_date: '2025-05-20T12:00:00Z',
                end_date: '2025-05-27T18:00:00Z',
                participants: [],
                matches: []
            }
        ];
    }

    async login(username, password) {
        const user = this.users.find(u => u.username === username);

        if (!user || password !== 'password')
            throw new Error('Invalid credentials');

        this.currentUser = user;
        const accessToken = `mock_access_token_${user.id}_${Date.now()}`;
        const refreshToken = `mock_refresh_token_${user.id}_${Date.now()}`;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('username', user.username);

        return this.request({
            access: accessToken,
            refresh: refreshToken,
            user: user
        });
    }

    async logout() {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('username');
        this.currentUser = null;
        return this.request({ success: true });
    }

    async register(userData) {
        if (this.users.some(u => u.username === userData.username))
            throw new Error('Username already exists');

        const newUser = {
            id: this.users.length + 1,
            username: userData.username,
            display_name: userData.username,
            email: userData.email || `${userData.username}@example.com`,
            avatar: 'assets/img/avatars/default.png',
            status: 'online',
            games_won: 0,
            games_lost: 0,
            is_active: true
        };

        this.users.push(newUser);
        this.saveData();

        return this.request({
            success: true,
            user: newUser
        });
    }

    async getCurrentUser() {
        if (!this.currentUser)
            throw new Error('Not authenticated');

        return this.request(this.currentUser);
    }

    async getUserInfo(username) {
        const user = this.users.find(u => u.username === username);

        if (!user)
            throw new Error('User not found');

        return this.request(user);
    }

    async updateUserInfo(userData) {
        if (!this.currentUser)
            throw new Error('Not authenticated');

        if (userData.settings) {
            this.currentUser.settings = {
                ...this.currentUser.settings || {},
                ...userData.settings
            };
            delete userData.settings;
        }

        Object.assign(this.currentUser, userData);

        const index = this.users.findIndex(u => u.id === this.currentUser.id);
        if (index !== -1)
            this.users[index] = this.currentUser;

        this.saveData();

        return this.request(this.currentUser);
    }

    async getFriends() {
        if (!this.currentUser) {
            throw new Error('Not authenticated');
        }

        const currentUserId = this.currentUser.id;
        const friendships = this.friends.filter(f => f.user === currentUserId);
        const friendsList = friendships.map(f => {
            const friend = this.users.find(u => u.id === f.friend);
            return {
                id: f.id,
                username: friend.username,
                display_name: friend.display_name,
                avatar: friend.avatar,
                status: friend.status
            };
        });

        return this.request(friendsList);
    }

    async getFriendRequests() {
        if (!this.currentUser)
            throw new Error('Not authenticated');

        return this.request(this.friendRequests);
    }

    async sendFriendRequest(username) {
        if (!this.currentUser)
            throw new Error('Not authenticated');
        const targetUser = this.users.find(u => u.username === username);
        if (!targetUser)
            throw new Error('User not found');
        const alreadyFriends = this.friends.some(
            f => f.user === this.currentUser.id && f.friend === targetUser.id
        );
        if (alreadyFriends)
            throw new Error('Already friends');

        const requestExists = this.friendRequests.sent.some(
            req => req.from_user.id === this.currentUser.id && req.to_user.id === targetUser.id
        );
        if (requestExists)
            throw new Error('Friend request already sent');
        const newRequest = {
            id: Date.now(),
            from_user: {
                id: this.currentUser.id,
                username: this.currentUser.username,
                display_name: this.currentUser.display_name,
                avatar: this.currentUser.avatar
            },
            to_user: {
                id: targetUser.id,
                username: targetUser.username,
                display_name: targetUser.display_name,
                avatar: targetUser.avatar
            },
            created_at: new Date().toISOString(),
            status: 'pending'
        };

        this.friendRequests.sent.push(newRequest);
        this.saveData();

        return this.request(newRequest);
    }

    async acceptFriendRequest(requestId) {
        if (!this.currentUser)
            throw new Error('Not authenticated');

        const requestIndex = this.friendRequests.received.findIndex(r => r.id === requestId);
        if (requestIndex === -1)
            throw new Error('Request not found');
        const request = this.friendRequests.received[requestIndex];
        const friendship1 = {
            id: Date.now(),
            user: request.to_user.id,
            friend: request.from_user.id,
            created_at: new Date().toISOString()
        };
        const friendship2 = {
            id: Date.now() + 1,
            user: request.from_user.id,
            friend: request.to_user.id,
            created_at: new Date().toISOString()
        };
        this.friends.push(friendship1, friendship2);
        this.friendRequests.received.splice(requestIndex, 1);
        this.saveData();
        return this.request({ success: true });
    }

    async rejectFriendRequest(requestId) {
        if (!this.currentUser)
            throw new Error('Not authenticated');

        const requestIndex = this.friendRequests.received.findIndex(r => r.id === requestId);
        if (requestIndex === -1)
            throw new Error('Request not found');

        this.friendRequests.received.splice(requestIndex, 1);
        this.saveData();
        return this.request({ success: true });
    }

    async getAvailableGames() {
        const openGames = this.games.filter(g => g.status === 'open');
        return this.request(openGames);
    }

    async getGameHistory() {
        if (!this.currentUser)
            throw new Error('Not authenticated');

        const username = this.currentUser.username;
        const userGames = this.games.filter(g =>
            (g.player1_username === username || g.player2_username === username) &&
            g.status === 'completed'
        );

        return this.request(userGames);
    }

    async createGame(gameData) {
        if (!this.currentUser)
            throw new Error('Not authenticated');

        const newGame = {
            id: this.games.length + 1,
            status: 'open',
            player1_username: this.currentUser.username,
            player2_username: null,
            created_at: new Date().toISOString(),
            duration_seconds: 0,
            ...gameData
        };

        this.games.push(newGame);
        this.saveData();

        return this.request(newGame);
    }

    async joinGame(gameId) {
        if (!this.currentUser)
            throw new Error('Not authenticated');
        const game = this.games.find(g => g.id === gameId);
        if (!game)
            throw new Error('Game not found');
        if (game.status !== 'open')
            throw new Error('Game is not open');
        if (game.player1_username === this.currentUser.username)
            throw new Error('Cannot join your own game');
        game.player2_username = this.currentUser.username;
        game.status = 'active';

        this.saveData();
        return this.request(game);
    }

    async getPublicMessages() {
        return this.request(this.messages.public);
    }

    async getDirectMessages() {
        if (!this.currentUser)
            throw new Error('Not authenticated');

        const username = this.currentUser.username;
        let conversations = {};

        Object.keys(this.messages.private).forEach(key => {
            if (key.includes(username)) {
                const messages = this.messages.private[key];
                conversations[key] = messages;
            }
        });

        return this.request(conversations);
    }

    async getDirectMessagesWithUser(username) {
        if (!this.currentUser)
            throw new Error('Not authenticated');
        const currentUsername = this.currentUser.username;
        const conversationKey = [currentUsername, username].sort().join('_');
        const messages = this.messages.private[conversationKey] || [];

        return this.request(messages);
    }

    async sendMessage(content, type, recipient = null) {
        if (!this.currentUser)
            throw new Error('Not authenticated');
        const newMessage = {
            id: Date.now(),
            content,
            created_at: new Date().toISOString(),
            type,
            sender: {
                id: this.currentUser.id,
                username: this.currentUser.username,
                display_name: this.currentUser.display_name,
                avatar: this.currentUser.avatar
            }
        };

        if (type === 'PUBLIC') {
            this.messages.public.push(newMessage);
        } else {
            const recipientUser = this.users.find(u => u.username === recipient);
            if (!recipientUser)
                throw new Error('Recipient not found');
            newMessage.recipient = {
                id: recipientUser.id,
                username: recipientUser.username,
                display_name: recipientUser.display_name,
                avatar: recipientUser.avatar
            };

            const conversationKey = [this.currentUser.username, recipientUser.username].sort().join('_');
            if (!this.messages.private[conversationKey])
                this.messages.private[conversationKey] = [];
            this.messages.private[conversationKey].push(newMessage);
        }
        this.saveData();
        return this.request(newMessage);
    }

    // Tournament APIs
    async getTournaments() {
        return this.request(this.tournaments);
    }

    async getTournamentById(tournamentId) {
        const tournament = this.tournaments.find(t => t.id === tournamentId);
        if (!tournament)
            throw new Error('Tournament not found');
        return this.request(tournament);
    }
}

const mockApi = new MockApi();
export default mockApi;
