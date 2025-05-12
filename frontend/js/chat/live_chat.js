import { showMessage } from '../components/show_message.js';
import { __ } from '../lang/i18n.js';

const DEBUG = false;

export class LiveChat {
    constructor() {
        this.initializing = true;
        this.chatBox = document.getElementById('chatBox');
        this.messageForm = document.getElementById('messageForm');
        this.messageInput = document.getElementById('messageInput');
        this.socket = null;
        this.friendsSocket = null;
        this.userCache = {};
        this.lastViewedTimestamps = JSON.parse(localStorage.getItem('chat_lastViewed') || '{}');

        this.setupEventListeners();
        this.loadPublicMessages();
        this.loadDirectMessages();
        this.connectWebSocket();
        this.connectFriendsWebSocket();
        this.setupChatSwitching();
        this.resetAllIndicators();

        setTimeout(() => {
            this.initializing = false;
        }, 1000);

        // Clean up on page unload
        window.addEventListener('beforeunload', () => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN)
                this.socket.close();
            if (this.friendsSocket && this.friendsSocket.readyState === WebSocket.OPEN)
                this.friendsSocket.close();
        });
    }

    connectWebSocket() {
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws/chat/?token=${token}`;

        try {
            this.socket = new WebSocket(wsUrl);

            this.socket.onopen = () => {
                console.log('WebSocket connection established');
                // Send periodic pings to keep connection alive
                this.pingInterval = setInterval(() => {
                    if (this.socket && this.socket.readyState === WebSocket.OPEN)
                        this.socket.send(JSON.stringify({ type: 'ping' }));
                }, 30000);
            };

            this.socket.onclose = () => {
                console.log('WebSocket connection closed');
                if (this.pingInterval)
                    clearInterval(this.pingInterval);
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);

                // Handle ping/pong
                if (data.type === 'ping') {
                    this.socket.send(JSON.stringify({type: 'pong'}));
                    return;
                }

                if (data.type === 'GAME_INVITE') {
                    const gameId = data.game_id;
                    const senderId = data.sender.username;

                    // Create a unique notification ID
                    const notificationId = `game-invite-${gameId}-${senderId}`;

                    // Check if this notification already exists in the DOM
                    if (document.getElementById(notificationId))
                        return;

                    // Process the invitation with the specific ID
                    this.displayGameInvitation(data, notificationId);
                    return;
                }

                // Get current active chat
                const activeChat = document.querySelector('#usersList .list-group-item.active');
                const activeChatId = activeChat ? activeChat.getAttribute('data-chat-id') : null;

                if (data.type === 'PUBLIC') {
                    // Only add to chat if main chat is active
                    if (activeChatId === 'mainChat') {
                        this.addMessage(data);
                    } else {
                        // Otherwise just highlight main chat
                        this.highlightChatItem('mainChat', true, true);
                    }
                } else if (data.type === 'TEXT' || data.type === 'PRIVATE') {
                    // For private messages, determine the conversation partner
                    const otherUser = data.sender.username === localStorage.getItem('username') ?
                        data.recipient_username : data.sender.username;

                    if (otherUser) {
                        // Add user to sidebar
                        this.fetchUserInfo(otherUser).then(user => {
                            this.addUserToSidebar(user, data.content);

                            // Only add message if this chat is active
                            if (activeChatId === otherUser) {
                                this.addMessage(data);
                            } else {
                                // Otherwise just highlight chat
                                this.highlightChatItem(otherUser, true, false);
                            }
                        });
                    }
                }
            };
        } catch (error) {
            console.error('Failed to connect to WebSocket:', error);
        }
    }

    connectFriendsWebSocket() {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.log('No access token found, skipping Friends WebSocket connection');
            return;
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsHost = window.location.host;
        const wsUrl = `${wsProtocol}//${wsHost}/ws/friends/?token=${token}`;


        try {
            this.friendsSocket = new WebSocket(wsUrl);

            this.friendsSocket.onopen = () => {
                console.log('Friends WebSocket connection established');
                // Send periodic pings to keep connection alive
                this.friendsPingInterval = setInterval(() => {
                    if (this.friendsSocket && this.friendsSocket.readyState === WebSocket.OPEN)
                        this.friendsSocket.send(JSON.stringify({ type: 'ping' }));
                }, 30000);
            };

            this.friendsSocket.onclose = (event) => {
                console.log('Friends WebSocket connection closed', event.code, event.reason);
                if (this.friendsPingInterval)
                    clearInterval(this.friendsPingInterval);
            };

            this.friendsSocket.onerror = (error) => {
                console.error('Friends WebSocket error:', error);
            };

            this.friendsSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'pong') return;

                    if (data.type === 'friend_request')
                        this.displayFriendRequestNotification(data.request_id, data.from_user);
                } catch (e) {
                    console.error('Error parsing WebSocket message:', e);
                }
            };

            // Check connection state after a short delay
            setTimeout(() => {
                console.log('Friends WebSocket state after 2 seconds:', this.getFriendSocketStateString());
            }, 2000);
        } catch (error) {
            console.error('Failed to connect to Friends WebSocket:', error);
        }
    }

    getFriendSocketStateString() {
        if (!this.friendsSocket) return 'Socket not created';

        switch (this.friendsSocket.readyState) {
            case WebSocket.CONNECTING: return 'CONNECTING';
            case WebSocket.OPEN: return 'OPEN';
            case WebSocket.CLOSING: return 'CLOSING';
            case WebSocket.CLOSED: return 'CLOSED';
            default: return 'UNKNOWN';
        }
    }

    setupEventListeners() {
        this.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
    }

    async loadPublicMessages() {
        try {
            const response = await fetch('/api/chat/messages/public/', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load messages');

            const messages = await response.json();

            // Sort messages by date (oldest first)
            messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            if (!this.initializing && messages.length > 0) {
                const lastMessageTimestamp = new Date(messages[0].created_at).getTime();
                const lastViewed = this.lastViewedTimestamps['mainChat'] || 0;
                if (lastMessageTimestamp > lastViewed)
                    this.highlightChatItem('mainChat', true, true);
            }
            this.displayMessages(messages);
        } catch (error) {
            console.error('Error loading public messages:', error);
        }
    }

    async loadDirectMessages() {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            // Get all direct messages (inbox)
            const response = await fetch('/api/chat/messages/direct/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load direct messages');

            const conversationsData = await response.json();
            const conversations = {};
            const currentUsername = localStorage.getItem('username');

            // Flatten all conversation messages into a single array
            const allMessages = [];
            Object.values(conversationsData).forEach(messagesArray => {
                if (Array.isArray(messagesArray))
                    allMessages.push(...messagesArray);
            });

            // Process the flattened messages array
            allMessages.forEach(message => {
                const partner = message.sender?.username === currentUsername ?
                    message.recipient?.username :
                    message.sender?.username;

                if (!partner) return;

                if (!conversations[partner]) {
                    conversations[partner] = {
                        user: message.sender?.username === currentUsername ?
                            message.recipient :
                            message.sender,
                        lastMessage: message
                    };
                } else if (new Date(message.created_at) > new Date(conversations[partner].lastMessage.created_at)) {
                    conversations[partner].lastMessage = message;
                }
            });

            // Add conversations to sidebar
            Object.values(conversations).forEach(conv => {
                if (conv.user) this.addUserToSidebar(conv.user, conv.lastMessage.content);
            });

        } catch (error) {
            console.error('Error loading direct messages:', error);
        }
    }

    async loadPrivateMessages(username) {
        try {
            const response = await fetch(`/api/chat/messages/direct/@${username}/`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                }
            });

            if (!response.ok) throw new Error('Failed to load messages');

            const messages = await response.json();

            // Sort messages by date ascending (oldest first)
            messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            this.displayMessages(messages);
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    }

    async getCurrentUserInfo() {
        if (this.userCache['currentUser']) return this.userCache['currentUser'];

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch('/api/users/me/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to get user info');

            const userData = await response.json();
            this.userCache['currentUser'] = userData;
            return userData;
        } catch (error) {
            console.error('Error fetching current user info:', error);
            return {
                username: localStorage.getItem('username'),
                display_name: localStorage.getItem('username'),
                avatar: '/assets/img/avatars/default.png'
            };
        }
    }

    async fetchUserInfo(username) {
        if (this.userCache[username]) return this.userCache[username];

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/users/@${username}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error(`Failed to get info for user ${username}`);

            const userData = await response.json();
            this.userCache[username] = userData;
            return userData;
        } catch (error) {
            console.error(`Error fetching info for user ${username}:`, error);
            return null;
        }
    }

    displayMessages(messages) {
        this.chatBox.innerHTML = '';
        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            this.chatBox.appendChild(messageElement);
        });
        this.scrollToBottom();
    }

    addUserToSidebar(user, lastMessage = 'No messages yet...') {
        if (!user || !user.username) {
            console.error("Invalid user object passed to addUserToSidebar");
            return null;
        }

        const username = user.username;

        // Get the users list element first and check if it exists
        const usersList = document.querySelector('#usersList');
        if (!usersList) {
            console.warn("Users list element not found in DOM - message may have arrived before UI was ready");
            return null;
        }

        let existingUser = usersList.querySelector(`.list-group-item[data-chat-id="${username}"]`);

        if (!existingUser) {
            // Create new list item for user
            existingUser = document.createElement('a');
            existingUser.className = 'list-group-item list-group-item-action';
            existingUser.setAttribute('data-chat-id', username);
            existingUser.href = '#';

            // Create inner content with improved layout
            existingUser.innerHTML = `
            <div class="user-list-item">
                <img src="${user.avatar || '/media/avatars/default.png'}" 
                     alt="${user.display_name || username}" 
                     class="user-list-avatar">
                <div class="user-list-info">
                    <div class="user-list-name">
                        ${user.display_name || username}
                        <span class="user-list-time"></span>
                    </div>
                    <p class="user-list-message">${lastMessage}</p>
                </div>
            </div>
        `;

            existingUser.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchChat(username);
            });

            // Add to users list after Main Chat
            const mainChat = usersList.querySelector('[data-chat-id="mainChat"]');
            usersList.insertBefore(existingUser, mainChat.nextSibling);
        } else {
            // Update existing user's last message
            const messagePreview = existingUser.querySelector('.user-list-message');
            if (messagePreview)
                messagePreview.textContent = lastMessage;

            // Update timestamp
            const timeElement = existingUser.querySelector('.user-list-time');
            if (timeElement)
                timeElement.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

            // Add unread indicator if not active
            if (!this.initializing && !existingUser.classList.contains('active')) {
                // Only add if not already present
                if (!existingUser.querySelector('.unread-indicator')) {
                    const nameElement = existingUser.querySelector('.user-list-name');
                    const indicator = document.createElement('span');
                    indicator.className = 'unread-indicator';
                    nameElement.appendChild(indicator);
                }
            }
        }

        return existingUser;
    }

    highlightChatItem(chatId, isNew = false, isPublic = false) {
        const chatItem = document.querySelector(`#usersList .list-group-item[data-chat-id="${chatId}"]`);
        if (!chatItem) return;

        // For public messages, always highlight regardless of active status
        // For private messages, only highlight if not active
        if (isPublic || !chatItem.classList.contains('active')) {
            // Find the name element where the indicator should go
            const nameElement = chatItem.querySelector('.user-list-name');
            if (!nameElement) return;

            // Remove any existing indicators
            const existingIndicator = nameElement.querySelector('.unread-indicator');
            if (existingIndicator) existingIndicator.remove();

            // Create a new indicator
            const indicator = document.createElement('span');

            // Style based on message type
            if (isPublic || chatId === 'mainChat') {
                // Public message indicator (red badge)
                indicator.className = 'unread-indicator badge rounded-pill bg-danger ms-2';
                indicator.textContent = '!';
            } else {
                // Private message indicator
                indicator.className = 'unread-indicator ms-2';
            }
            nameElement.appendChild(indicator);
        }
    }

    resetAllIndicators() {
        const indicators = document.querySelectorAll('.unread-indicator');
        indicators.forEach(indicator => indicator.remove());
    }

    createMessageElement(message) {
        const currentUsername = localStorage.getItem('username');
        let isOwnMessage = false;

        // Message ownership check (simplified with backend providing complete sender info)
        if (message.sender && message.sender.username)
            isOwnMessage = message.sender.username === currentUsername;

        const isSystemMessage = message.sender && message.sender.username === 'system';

        // Create message container with special class for system messages
        const div = document.createElement('div');
        div.className = `media ${isOwnMessage ? 'self-message' : ''} ${isSystemMessage ? 'system-message' : ''}`;
        div.dataset.messageId = message.id;

        // For system messages, add special styling and interactive elements
        if (isSystemMessage) {
            // Extract game ID from system message if present
            const gameIdMatch = message.content.match(/Game ID: (\d+)/);
            const gameId = gameIdMatch ? gameIdMatch[1] : null;

            // Message content with action button for game invites
            const contentDiv = document.createElement('div');
            contentDiv.className = 'media-body system-message-content';

            const messageBubble = document.createElement('div');
            messageBubble.className = 'message-bubble bg-light system-bubble';

            // Create message text element
            const messageText = document.createElement('p');
            messageText.textContent = message.content;
            messageBubble.appendChild(messageText);

            // Add action button if game ID was found
            if (gameId) {
                const actionButton = document.createElement('button');
                actionButton.className = 'btn btn-sm btn-primary mt-2';
                actionButton.textContent = 'Join Match';
                actionButton.onclick = () => window.location.hash = `#/game/${gameId}`;
                messageBubble.appendChild(actionButton);
            }

            contentDiv.appendChild(messageBubble);
            div.appendChild(contentDiv);
            return div;
        }

        // Only add avatar/username for non-self messages
        if (!isOwnMessage && message.sender) {
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'avatar-container';

            const avatar = document.createElement('img');
            avatar.src = message.sender.avatar || '/media/avatars/default.png';
            avatar.className = 'avatar';
            avatar.alt = message.sender.username;
            avatar.style.cursor = 'pointer';

            avatar.addEventListener('click', () => {
                this.openUserActionsModal(message.sender);
            });

            avatarDiv.appendChild(avatar);
            div.appendChild(avatarDiv);
        }

        // Message content
        const contentDiv = document.createElement('div');
        contentDiv.className = 'media-body';

        // Add username for non-self messages
        if (!isOwnMessage && message.sender) {
            const username = document.createElement('div');
            username.className = 'font-weight-bold mb-1';
            username.textContent = message.sender.display_name || message.sender.username;
            username.style.cursor = 'pointer';

            username.addEventListener('click', () => {
                this.openUserActionsModal(message.sender);
            });

            contentDiv.appendChild(username);
        }

        const messageBubble = document.createElement('div');
        messageBubble.className = `message-bubble ${isOwnMessage ? 'bg-info' : 'bg-light'}`;
        messageBubble.textContent = message.content;
        contentDiv.appendChild(messageBubble);

        // Timestamp
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        const date = message.created_at ? new Date(message.created_at) : new Date();
        const today = new Date();

        let timeString;
        if (date.toDateString() === today.toDateString())
            timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        else
            timeString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        timestamp.textContent = timeString;
        contentDiv.appendChild(timestamp);

        div.appendChild(contentDiv);
        return div;
    }

    addMessage(message) {
        let messageElement;

        if (message.type === 'PUBLIC')
            messageElement = this.createMessageElement(message);
        else
            messageElement = this.createMessageElement(message);    // For private messages

        this.chatBox.appendChild(messageElement);
        this.scrollToBottom();
        this.updateLastMessage(message);
    }

    updateLastMessage(message) {
        if (!message || !message.sender) return;

        // FOR PUBLIC MESSAGES
        if (message.message_type === 'PUBLIC' || message.type === 'PUBLIC') {
            // Get the main chat item only
            const mainChatItem = document.querySelector('#usersList .list-group-item[data-chat-id="mainChat"]');
            if (mainChatItem) {
                // Update preview text
                const messagePreview = mainChatItem.querySelector('.user-list-message');
                if (messagePreview) {
                    const previewText = message.content.length > 30 ?
                        message.content.substring(0, 27) + '...' :
                        message.content;
                    messagePreview.textContent = previewText;
                }

                // Update timestamp if needed
                const timeElement = mainChatItem.querySelector('.user-list-time');
                if (timeElement)
                    timeElement.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

                // Highlight main chat if not active
                if (!mainChatItem.classList.contains('active'))
                    this.highlightChatItem('mainChat', true, true);
            }
            return; // EXIT EARLY - don't process further for public messages
        }

        // FOR PRIVATE MESSAGES:
        const username = message.sender.username;
        const currentUsername = localStorage.getItem('username');

        let chatId;
        if (username === currentUsername)
            chatId = message.recipient ? message.recipient.username : message.recipient_username;
        else
            chatId = username;  // Message received from someone else

        // Find the chat item in the sidebar
        const chatItem = document.querySelector(`#usersList .list-group-item[data-chat-id="${chatId}"]`);
        if (!chatItem) return;

        // Update the preview message text
        const messagePreview = chatItem.querySelector('.user-list-message');
        if (messagePreview) {
            const previewText = message.content.length > 30 ?
                message.content.substring(0, 27) + '...' :
                message.content;
            messagePreview.textContent = previewText;
        }

        // Update timestamp
        const timeElement = chatItem.querySelector('.user-list-time');
        if (timeElement)
            timeElement.textContent = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        // Add unread indicator if not the active chat
        if (!chatItem.classList.contains('active'))
            this.highlightChatItem(chatId, true, false);
    }

    async sendMessage() {
        const content = this.messageInput.value.trim();
        if (!content) return;

        try {
            // Get the active chat
            const activeChat = document.querySelector('#usersList .list-group-item.active');
            if (!activeChat) {
                console.error('No active chat found');
                return;
            }

            const chatId = activeChat.getAttribute('data-chat-id');

            // Clear input
            this.messageInput.value = '';

            if (chatId === 'mainChat') {
                // Public message logic...
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    const publicMessage = {
                        type: 'PUBLIC',
                        message: {
                            content: content
                        }
                    };
                    this.socket.send(JSON.stringify(publicMessage));
                }
            } else {
                // Private message
                if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                    const privateMessage = {
                        type: 'TEXT',
                        message: {
                            recipient_username: chatId,
                            content: content
                        }
                    };
                    this.socket.send(JSON.stringify(privateMessage));
                    // Add sent message to UI immediately without waiting for server response
                    const currentUser = await this.getCurrentUserInfo();
                    if (currentUser) {
                        this.addMessage({
                            type: 'TEXT',
                            content: content,
                            sender: currentUser,
                            recipient_username: chatId
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    }

    scrollToBottom() {
        if (this.chatBox)
            this.chatBox.scrollTop = this.chatBox.scrollHeight;
    }


    setupChatSwitching() {
        document.addEventListener('click', (event) => {
            const target = event.target.closest('#usersList .list-group-item');
            if (target)
                this.switchChat(target);
        });
    }

    switchChat(target) {
        // Defensive check for invalid input
        if (!target) {
            console.error("Invalid target passed to switchChat");
            return;
        }

        let chatId;
        let chatElement = null;

        // Handle both DOM element and string cases
        if (typeof target === 'string') {
            // If target is a string (username), use it directly as chatId
            chatId = target;
            // Find the corresponding DOM element for highlighting
            chatElement = document.querySelector(`#usersList .list-group-item[data-chat-id="${chatId}"]`);
        } else {
            // If target is a DOM element, extract the chatId from it
            chatId = target.getAttribute('data-chat-id');
            chatElement = target;
        }

        if (!chatId) {
            console.error("No chat ID found");
            return;
        }

        // Update timestamp for this chat
        this.lastViewedTimestamps[chatId] = Date.now();
        localStorage.setItem('chat_lastViewed', JSON.stringify(this.lastViewedTimestamps));

        // Find all chat items in the sidebar
        const allChatItems = document.querySelectorAll('#usersList .list-group-item');

        // Remove active class from ALL chat items first
        allChatItems.forEach(item => {
            item.classList.remove('active', 'bg-primary', 'text-white');
        });

        // Add active class to the clicked item if it exists
        if (chatElement) {
            chatElement.classList.add('active', 'bg-primary', 'text-white');

            // Remove any unread indicators
            const unreadIndicator = chatElement.querySelector('.unread-indicator');
            if (unreadIndicator)
                unreadIndicator.remove();
        }

        // If chat element doesn't exist but we have a valid chatId (new conversation)
        if (!chatElement && chatId && chatId !== 'mainChat') {
            // Fetch user info and create sidebar entry
            this.fetchUserInfo(chatId).then(user => {
                if (user) {
                    // Create chat item in sidebar
                    chatElement = this.addUserToSidebar(user, "New conversation");

                    // Make it active
                    if (chatElement) {
                        chatElement.classList.add('active', 'bg-primary', 'text-white');

                        // Update current chat target
                        this.currentChatTarget = chatId;

                        // Load messages (likely empty for new conversation)
                        this.loadPrivateMessages(chatId);
                    }
                }
            });
            return; // Return as we're handling this asynchronously
        }

        // Continue with loading appropriate chat content
        this.continueSwitchChat(chatId, chatElement);
    }

    continueSwitchChat(chatId, chatElement) {
        // Store current chat target for other functions to use
        this.currentChatTarget = chatId;

        // Deactivate all chat items
        document.querySelectorAll('#usersList .list-group-item').forEach(item => {
            item.classList.remove('active', 'bg-primary', 'text-white', 'bg-light');
        });

        // Activate the target chat if element exists
        if (chatElement) {
            chatElement.classList.add('active', 'bg-primary', 'text-white');

            // Remove notification indicator
            const badge = chatElement.querySelector('.small.font-weight-bold');
            if (badge)
                badge.textContent = '';

            // Remove new message indicator if present
            chatElement.classList.remove('new-message');
            const unreadIndicator = chatElement.querySelector('.unread-indicator');
            if (unreadIndicator)
                unreadIndicator.remove();
        }

        // Load appropriate messages
        if (chatId === 'mainChat')
            this.loadPublicMessages();
        else
            this.loadPrivateMessages(chatId);
    }

    async isUserFriend(username) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return false;

            const response = await fetch('/api/users/me/friends/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) return false;

            const friends = await response.json();
            return friends.some(friend => friend.username === username);
        } catch (error) {
            console.error('Error checking if user is friend:', error);
            return false;
        }
    }

    async fetchUserStats(username) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return null;

            const response = await fetch(`/api/users/@${username}/stats/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok)
                throw new Error('Failed to fetch user stats');

            return await response.json();
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return null;
        }
    }

    async openUserActionsModal(user) {
        if (!user || user.username === localStorage.getItem('username')) return;

        // Check if the user is already a friend
        const isFriend = await this.isUserFriend(user.username);

        // Set user information in modal
        document.getElementById('modalUserName').textContent = user.display_name || user.username;
        document.getElementById('modalUserUsername').textContent = '@' + user.username;
        document.getElementById('modalUserAvatar').src = user.avatar || '/media/avatars/default.png';

        // Set status badge
        const statusBadge = document.getElementById('modalUserStatus');
        statusBadge.textContent = __('online') ? user.status : 'online' || __('offline');
        statusBadge.setAttribute('data-i18n', __('online') ? user.status : 'online' || __('offline'));
        statusBadge.className = 'badge ' + this.getStatusBadgeClass(user.status);

        // Check if the friend indicator exists, create it if not
        let friendIndicator = document.getElementById('modalFriendIndicator');
        if (!friendIndicator) {
            friendIndicator = document.createElement('span');
            friendIndicator.id = 'modalFriendIndicator';
            friendIndicator.className = 'badge bg-primary ms-2';
            friendIndicator.textContent = __('friend');
            friendIndicator.setAttribute('data-i18n', 'friend');
            statusBadge.parentNode.appendChild(friendIndicator);
        }
        friendIndicator.style.display = isFriend ? 'inline-block' : 'none';

        // Set up action buttons
        const addFriendBtn = document.getElementById('modalAddFriendBtn');

        // Toggle between Add Friend and Remove Friend based on status
        if (isFriend) {
            addFriendBtn.textContent = __('remove_friend_button');
            addFriendBtn.className = 'btn btn-sm btn-outline-danger me-2';
            addFriendBtn.onclick = () => {
                this.handleRemoveFriend(user.username);
                bootstrap.Modal.getInstance(document.getElementById('chatUserModal')).hide();
            };
        } else {
            addFriendBtn.textContent = __('add_friend_button');
            addFriendBtn.className = 'btn btn-sm btn-outline-success me-2';
            addFriendBtn.onclick = () => {
                this.handleAddFriend(user.username);
                bootstrap.Modal.getInstance(document.getElementById('chatUserModal')).hide();
            };
        }

        // Set up other button actions
        document.getElementById('modalMessageBtn').onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleMessageUser(user);
            bootstrap.Modal.getInstance(document.getElementById('chatUserModal')).hide();
        };

        document.getElementById('modalInviteGameBtn').onclick = () => {
            this.handleInviteToGame(user.username);
            bootstrap.Modal.getInstance(document.getElementById('chatUserModal')).hide();
        };

        document.getElementById('modalBlockBtn').onclick = () => {
            this.handleBlockUser(user.username);
            bootstrap.Modal.getInstance(document.getElementById('chatUserModal')).hide();
        };

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('chatUserModal'));
        modal.show();

        // Fetch and update stats after modal is shown
        const stats = await this.fetchUserStats(user.username);
        if (stats) {
            const wins = parseInt(stats.games_won) || 0;
            const losses = parseInt(stats.games_lost) || 0;
            this.updateUserStatsChart(wins, losses);
        } else {
            this.updateUserStatsChart(0, 0);
        }
    }

    getStatusBadgeClass(status) {
        switch (status) {
            case 'online': return 'bg-success';
            case 'away': return 'bg-warning';
            case 'in_game': return 'bg-info';
            case 'offline': return 'bg-secondary';
            default: return 'bg-success';
        }
    }

    // Handle messaging a user
    handleMessageUser(user) {
        if (!user) {
            console.error("User is undefined in handleMessageUser");
            return;
        }

        // Extract username if user is an object
        const username = (typeof user === 'object' && user.username) ? user.username : user;

        // Check if username looks valid
        if (typeof username !== 'string' || username.includes('http://') || username.includes('https://')) {
            console.error("Invalid username format:", username);
            return;
        }

        this.switchChat(username);

        // Close modal if open
        const modal = bootstrap.Modal.getInstance(document.getElementById('chatUserModal'));
        if (modal)
            modal.hide();
    }

    // Handle adding a friend
    async handleAddFriend(username) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                console.error('No access token found');
                this.showNotification('Please log in to add friends', 'error');
                return;
            }

            const response = await fetch('/api/users/me/friend-requests/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username }) // Use 'username' instead of 'to_username'
            });

            if (response.ok) {
                this.showNotification(`Friend request sent to ${username}`, 'success');
            } else {
                const data = await response.json();
                this.showNotification(data.error || `Failed to send friend request to ${username}`, 'error');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            this.showNotification('Error sending friend request. Please try again later.', 'error');
        }
    }

    showNotification(message, type) {
        // Check if the global showMessage function exists
        if (typeof showMessage === 'function')
            showMessage(message, type);
        else
            alert(`${type.toUpperCase()}: ${message}`); // Fallback to alert if showMessage isn't available
    }

    displayFriendRequestNotification(requestId, fromUser) {
        // Check if this notification already exists to prevent duplicates
        if (document.getElementById(`friend-request-${requestId}`))
            return;

        // Get or create notification container
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '1050';
            document.body.appendChild(container);
        }

        // Create notification element
        const notificationId = 'friend-request-' + requestId;
        const notification = document.createElement('div');
        notification.id = notificationId;
        notification.className = 'toast';
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'assertive');
        notification.setAttribute('aria-atomic', 'true');

        notification.innerHTML = `
        <div class="toast-header bg-primary text-white">
            <strong class="me-auto">Friend Request</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            <div class="d-flex align-items-center mb-2">
                <img src="${fromUser.avatar_url || '/media/avatars/default.png'}" alt="${fromUser.display_name}" 
                     class="rounded-circle me-2" style="width: 32px; height: 32px;">
                <strong>${fromUser.display_name || fromUser.username}</strong> sent you a friend request!
            </div>
            <div class="mt-2 pt-2 border-top d-flex justify-content-between">
                <button type="button" class="btn btn-sm btn-success accept-request me-2" data-request-id="${requestId}">
                    Accept
                </button>
                <button type="button" class="btn btn-sm btn-danger reject-request" data-request-id="${requestId}">
                    Reject
                </button>
                <button type="button" class="btn btn-sm btn-link text-decoration-none view-friends">
                    View Friends
                </button>
            </div>
        </div>
    `;

        container.appendChild(notification);

        // Add event listeners for accept/reject buttons
        notification.querySelector('.accept-request').addEventListener('click', () => {
            this.acceptFriendRequest(requestId);
            this.hideNotification(notificationId);
        });

        notification.querySelector('.reject-request').addEventListener('click', () => {
            this.rejectFriendRequest(requestId);
            this.hideNotification(notificationId);
        });

        notification.querySelector('.view-friends').addEventListener('click', () => {
            window.location.hash = '#/friends';
            this.hideNotification(notificationId);
        });

        // Check if Bootstrap is available
        if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
            const toast = new bootstrap.Toast(notification, {
                autohide: false
            });
            toast.show();
        } else {
            // Fallback to manual display with basic styling
            notification.style.display = 'block';
            notification.style.opacity = '1';
            notification.style.backgroundColor = 'white';
            notification.style.boxShadow = '0 0.25rem 0.75rem rgba(0, 0, 0, 0.1)';
            notification.style.maxWidth = '350px';
            notification.style.margin = '0.5rem';
            notification.style.border = '1px solid rgba(0, 0, 0, 0.1)';
            notification.style.borderRadius = '0.25rem';
        }
    }

    hideNotification(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            const toast = bootstrap.Toast.getInstance(notification);
            if (toast) {
                toast.hide();
                // Remove after animation completes
                notification.addEventListener('hidden.bs.toast', function() {
                    notification.remove();
                });
            }
        }
    }

    async acceptFriendRequest(requestId) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(`/api/users/me/friend-requests/${requestId}/accept/`, {
                method: 'PATCH',  // Changed from POST to PATCH
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                this.showNotification('Friend request accepted!', 'success');
                this.hideNotification(`friend-request-${requestId}`);
            } else {
                console.error(`Failed to accept request: ${response.status} ${response.statusText}`);
                const data = await response.json().catch(() => ({}));
                this.showNotification(data.error || 'Failed to accept friend request', 'error');
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
            this.showNotification('Error accepting friend request', 'error');
        }
    }

    async rejectFriendRequest(requestId) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(`/api/users/me/friend-requests/${requestId}/reject/`, {
                method: 'PATCH',  // Changed from POST to PATCH
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'  // Added Content-Type header
                }
            });

            if (response.ok) {
                this.showNotification('Friend request rejected', 'info');
                this.hideNotification(`friend-request-${requestId}`);
            } else {
                console.error(`Failed to reject request: ${response.status} ${response.statusText}`);
                const data = await response.json().catch(() => ({}));
                this.showNotification(data.error || 'Failed to reject friend request', 'error');
            }
        } catch (error) {
            console.error('Error rejecting friend request:', error);
            this.showNotification('Error rejecting friend request', 'error');
        }
    }

    async handleRemoveFriend(username) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showNotification('Please log in to remove friends', 'error');
                return;
            }

            // First, get the user ID
            const userResponse = await fetch(`/api/users/@${username}/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!userResponse.ok) {
                this.showNotification('User not found', 'error');
                return;
            }

            const userData = await userResponse.json();

            // Remove friend using ID
            const response = await fetch(`/api/users/me/friends/${userData.id}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showNotification(`${username} has been removed from your friends`, 'success');
            } else {
                const data = await response.json().catch(() => ({}));
                this.showNotification(data.error || 'Failed to remove friend', 'error');
            }
        } catch (error) {
            console.error('Error removing friend:', error);
            this.showNotification('Error removing friend', 'error');
        }
    }

    // Handle inviting to game
    async handleInviteToGame(username) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showNotification('You must be logged in to create a game', 'error');
                return;
            }

            // First create a new game
            const response = await fetch('/api/pong/game/create/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to create game: ${response.statusText}`);
            }

            const gameData = await response.json();
            const gameId = gameData.id;


            // Send invitation to the other user via WebSocket
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                const gameInvitation = {
                    type: 'GAME_INVITE',
                    message: {
                        recipient_username: username,
                        content: `[Game]: You've been invited to play Pong`,
                        game_id: gameId
                    }
                };

                this.socket.send(JSON.stringify(gameInvitation));
                this.showNotification(`Game invitation sent to ${username}`, 'info');

                // Redirect creator to the game page immediately
                window.location.hash = `#/game/${gameId}`;
            } else {
                throw new Error('WebSocket connection not available');
            }
        } catch (error) {
            console.error('Error inviting to game:', error);
            this.showNotification('Failed to create game invitation', 'error');
        }
    }

    async handleBlockUser(username) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showNotification('You must be logged in to block a user', 'error');
                return;
            }

            // First, get the user's ID from their username
            const user = await this.fetchUserInfo(username);
            if (!user) {
                this.showNotification(`Could not find user ${username}`, 'error');
                return;
            }

            // Call the API to block the user - use blocked_user field instead of blocked_user_id
            const response = await fetch('/api/chat/blocks/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    username: username  // Just send username instead of user ID
                })
            });

            if (response.ok) {
                this.showNotification(`Blocked ${username} successfully`, 'success');

                // Close the modal if it's open
                const modal = bootstrap.Modal.getInstance(document.getElementById('chatUserModal'));
                if (modal) {
                    modal.hide();
                }

                // Switch to main chat if we're currently viewing that user's chat
                const activeChat = document.querySelector('#usersList .list-group-item.active');
                if (activeChat && activeChat.getAttribute('data-chat-id') === username) {
                    this.switchChat('mainChat');
                }

                // Remove the user's chat item from sidebar if it exists
                const userChatItem = document.querySelector(`#usersList .list-group-item[data-chat-id="${username}"]`);
                if (userChatItem) {
                    userChatItem.remove();
                }
            } else {
                // Improved error handling
                try {
                    const textResponse = await response.text();
                    try {
                        const data = JSON.parse(textResponse);
                        this.showNotification(`Error blocking user: ${data.detail || JSON.stringify(data)}`, 'error');
                    } catch (parseError) {
                        this.showNotification(`Error blocking user: ${textResponse || 'Unknown error'}`, 'error');
                    }
                } catch (textError) {
                    this.showNotification('Failed to block user - server error', 'error');
                }
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            this.showNotification(`Failed to block user: ${error.message}`, 'error');
        }
    }

    async unblockUser(username) {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showNotification('You must be logged in to unblock a user', 'error');
                return;
            }

            const response = await fetch(`/api/chat/blocks/@${username}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showNotification(`Unblocked ${username} successfully`, 'success');
            } else {
                const data = await response.json();
                this.showNotification(`Error unblocking user: ${data.detail || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
            this.showNotification('Failed to unblock user', 'error');
        }
    }

    displayGameInvitation(data, notificationId) {
        const sender = data.sender;
        const gameId = data.game_id;

        // Use provided ID or generate one
        const toastId = notificationId || `game-invite-${Date.now()}`;

        // Create notification element with accept/reject buttons
        const notificationElement = document.createElement('div');
        notificationElement.className = 'toast notification game-invitation show';
        notificationElement.id = toastId;
        notificationElement.setAttribute('role', 'alert');
        notificationElement.setAttribute('aria-live', 'assertive');
        notificationElement.setAttribute('aria-atomic', 'true');

        notificationElement.innerHTML = `
        <div class="toast-header bg-primary text-white">
            <strong class="me-auto">Game Invitation</strong>
            <small>${sender.display_name}</small>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            <p>${sender.display_name} has invited you to play Pong!</p>
            <div class="mt-2 pt-2 border-top d-flex justify-content-end">
                <button type="button" class="btn btn-sm btn-danger me-2 reject-game">Decline</button>
                <button type="button" class="btn btn-sm btn-success accept-game">Accept</button>
            </div>
        </div>
        `;

        // Add to notification container
        const container = document.getElementById('notification-container');
        if (!container) {
            console.error('Notification container not found');
            return;
        }
        container.appendChild(notificationElement);

        // Set up event listeners for the accept/reject buttons
        const acceptButton = notificationElement.querySelector('.accept-game');
        acceptButton.addEventListener('click', () => {
            this.acceptGameInvitation(gameId, sender.username);
            notificationElement.remove();
        });

        const rejectButton = notificationElement.querySelector('.reject-game');
        rejectButton.addEventListener('click', () => {
            this.rejectGameInvitation(gameId, sender.username);
            notificationElement.remove();
        });

        // Auto-dismiss after 30 seconds
        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.remove();
            }
        }, 30000);
    }

    async acceptGameInvitation(gameId, senderUsername) {
        try {
            // First, actually join the game via API
            const token = localStorage.getItem('accessToken');
            if (!token) {
                this.showNotification('You must be logged in to join games', 'error');
                return;
            }

            // Make the API call to join the game
            const response = await fetch(`/api/pong/game/${gameId}/join/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok)
                throw new Error(`Failed to join game: ${response.statusText}`);

            // Send an acceptance message to the sender
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                const acceptMessage = {
                    type: 'TEXT',
                    message: {
                        recipient_username: senderUsername,
                        content: `[Game]: Your game invitation has been accepted.`
                    }
                };
                this.socket.send(JSON.stringify(acceptMessage));
            }

            // Now navigate to the game page
            window.location.hash = `#/game/${gameId}`;

        } catch (error) {
            console.error('Error accepting game invitation:', error);
            this.showNotification('Failed to join game', 'error');
        }
    }

    async rejectGameInvitation(gameId, senderUsername) {
        try {
            // Send rejection message to the sender
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                const rejectMessage = {
                    type: 'TEXT',
                    message: {
                        recipient_username: senderUsername,
                        content: `[Game]: Your game invitation has been declined.`
                    }
                };
                this.socket.send(JSON.stringify(rejectMessage));
            }

            this.showNotification('Game invitation declined', 'info');
        } catch (error) {
            console.error('Error rejecting game invitation:', error);
        }
    }

    updateUserStatsChart(wins, losses) {
        const container = document.getElementById('chatUserStatsContainer');
        if (!container) return;

        const total = wins + losses;
        const percentage = total > 0 ? Math.round((wins / total) * 100) : 0;

        container.innerHTML = `
        <div class="text-center mb-1">${__('win_rate')}: <strong>${percentage}%</strong></div>
        <div class="progress" style="height: 24px;">
            <div class="progress-bar bg-success" role="progressbar" 
                 style="width: ${percentage}%" aria-valuenow="${percentage}" 
                 aria-valuemin="0" aria-valuemax="100">
                ${wins} / ${total}
            </div>
        </div>
        <div class="d-flex justify-content-between mt-1">
            <small class="text-success">${__('games_won')}: ${wins}</small>
            <small class="text-danger">${__('games_lost')}: ${losses}</small>
        </div>
        `;
    }
}
