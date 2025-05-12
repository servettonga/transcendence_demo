import { isLoggedIn } from '../utils/session.js';
import { showMessage } from '../components/show_message.js';

let friendsSocket = null;
let friendsInitialized = false;
const friendCache = {};

export function initFriendsPage() {
    if (friendsInitialized) return;
    friendsInitialized = true;

    console.log("Initializing friends page");
    loadFriends();
    loadFriendRequests();
    loadBlockedUsers();
    setupEventListeners();
    connectWebSocket();
}

async function loadFriends() {
    const token = isLoggedIn();
    if (!token) return;

    try {
        const response = await fetch('/api/users/me/friends/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok)
            throw new Error('Failed to load friends');

        const friends = await response.json();
        setTimeout(async () => {
            await displayFriends(friends);
        }, 300);
        return friends;
    } catch (error) {
        console.error('Error loading friends:', error);
        return [];
    }
}

function displayFriends(friends) {
    const cardBody = document.querySelector('.card-body');
    if (!cardBody) {
        console.error("Friends card container not found in DOM");
        return;
    }

    // Get or create the friends list element
    let friendsList = document.getElementById('friendsList');
    if (!friendsList) {
        friendsList = document.createElement('div');
        friendsList.id = 'friendsList';
        friendsList.className = 'friends-list';
        cardBody.appendChild(friendsList);
    }

    // Get or create the "no friends" message
    let noFriends = document.getElementById('noFriends');
    if (!noFriends) {
        noFriends = document.createElement('div');
        noFriends.id = 'noFriends';
        noFriends.className = 'text-center py-3 text-muted';
        noFriends.textContent = "You don't have any friends yet";
        friendsList.appendChild(noFriends);
    }

    // Proceed with updating the UI
    if (friends.length === 0) {
        noFriends.style.display = 'block';
        friendsList.innerHTML = '';
        friendsList.appendChild(noFriends);
        return;
    }

    noFriends.style.display = 'none';
    friendsList.innerHTML = '';

    friends.forEach(friend => {
        // Store complete friend data in cache
        friendCache[friend.id] = { ...friend };
        const friendElement = createFriendElement(friend);
        friendsList.appendChild(friendElement);
    });
}

function createFriendElement(friend) {
    const friendDiv = document.createElement('div');
    friendDiv.className = 'friend-item';
    friendDiv.dataset.userId = friend.id;

    // Status color class
    const statusClass = `status-${friend.status}`;

    friendDiv.innerHTML = `
        <img src="${friend.avatar_url}" alt="${friend.display_name}" class="friend-avatar">
        <div class="friend-info">
            <p class="friend-name">${friend.display_name}</p>
            <small class="friend-status ${statusClass}">${friend.status}</small>
        </div>
    `;

    friendDiv.addEventListener('click', () => {
        const cachedFriend = friendCache[friend.id] || friend;
        openUserProfileModal(cachedFriend);
    });

    return friendDiv;
}

async function loadBlockedUsers() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
        const response = await fetch('/api/chat/blocks/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const blockedUsers = await response.json();
            displayBlockedUsers(blockedUsers);
        } else {
            console.error('Failed to load blocked users');
        }
    } catch (error) {
        console.error('Error loading blocked users:', error);
    }
}

function displayBlockedUsers(blockedUsers) {
    // Get the blocked tab pane
    const blockedPane = document.getElementById('blocked');
    if (!blockedPane) return;

    // Get or create containers
    let blockedUsersContainer = document.getElementById('blockedUsers');
    let noBlockedUsers = document.getElementById('noBlockedUsers');

    if (!blockedUsers || blockedUsers.length === 0) {
        if (blockedUsersContainer) blockedUsersContainer.innerHTML = '';
        if (noBlockedUsers) noBlockedUsers.style.display = 'block';
        return;
    }

    noBlockedUsers.style.display = 'none';
    blockedUsersContainer.innerHTML = '';

    blockedUsers.forEach(blocked => {
        // Extract username safely
        const username = blocked.blocked_username ||
            (blocked.blocked_user && blocked.blocked_user.username) ||
            'Unknown';

        // Extract avatar URL from API response
        const avatarUrl = (blocked.blocked_user && blocked.blocked_user.avatar_url) ||
            (blocked.blocked_user_avatar) ||
            '/media/avatars/default.png';

        // Create user object with extracted avatar
        const blockedUser = {
            username: username,
            display_name: username,
            avatar_url: avatarUrl
        };

        const userElement = createBlockedUserElement(blockedUser);
        blockedUsersContainer.appendChild(userElement);
    });
}

function createBlockedUserElement(user) {
    const userDiv = document.createElement('div');
    userDiv.className = 'friend-item';
    userDiv.dataset.username = user.username;

    userDiv.innerHTML = `
        <img src="${user.avatar_url || '/media/avatars/default.png'}" alt="${user.display_name || user.username}" class="request-avatar">
        <div class="request-info">
            <p class="request-name">${user.display_name || user.username}</p>
        </div>
        <button class="btn btn-sm btn-outline-primary unblock-btn">Unblock</button>
        `;

    userDiv.addEventListener('click', (e) => {
        // Only trigger if not clicking the unblock button
        if (!e.target.classList.contains('unblock-btn'))
            openUserProfileModal(user);
    });

    // Add click event for unblock button
    const unblockBtn = userDiv.querySelector('.unblock-btn');
    unblockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        unblockUser(user.username);
    });

    return userDiv;
}

async function unblockUser(username) {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
        const response = await fetch(`/api/chat/blocks/@${username}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            // Remove the user from the blocked list in the UI
            const userElement = document.querySelector(`.friend-item[data-username="${username}"]`);
            if (userElement)
                userElement.remove();
            // Show feedback to the user
            showMessage(`Unblocked ${username} successfully`, 'success');
            // Reload the list to show the "no blocked users" message if needed
            loadBlockedUsers();
        } else {
            showMessage(`Failed to unblock ${username}`, 'error');
        }
    } catch (error) {
        console.error('Error unblocking user:', error);
        showMessage('An error occurred while unblocking the user', 'error');
    }
}

function displaySentRequests(requests) {
    // Get the sent tab pane first
    const sentTabPane = document.getElementById('sent');
    if (!sentTabPane) {
        console.error("Sent tab pane not found");
        return;
    }

    // Get or create the requests container
    let sentRequests = document.getElementById('sentRequests');
    if (!sentRequests) {
        sentRequests = document.createElement('div');
        sentRequests.id = 'sentRequests';
        sentRequests.className = 'friend-requests-list';
        sentTabPane.appendChild(sentRequests);
    }

    // Get or create the "no requests" message
    let noSentRequests = document.getElementById('noSentRequests');
    if (!noSentRequests) {
        noSentRequests = document.createElement('div');
        noSentRequests.id = 'noSentRequests';
        noSentRequests.className = 'text-center py-3 text-muted';
        noSentRequests.textContent = 'You haven\'t sent any friend requests';
        sentRequests.appendChild(noSentRequests);
    }

    if (!sentRequests || !noSentRequests) return;

    if (!requests || requests.length === 0) {
        noSentRequests.style.display = 'block';
        sentRequests.innerHTML = '';
        return;
    }

    noSentRequests.style.display = 'none';
    sentRequests.innerHTML = '';

    requests.forEach(request => {
        const requestElement = createSentRequestElement(request);
        sentRequests.appendChild(requestElement);
    });
}

function displayReceivedRequests(requests) {
    // Get the received tab pane first
    const receivedTabPane = document.getElementById('received');
    if (!receivedTabPane) {
        console.error("Received tab pane not found!");
        return;
    }

    // Get or create the requests container
    let receivedRequests = document.getElementById('receivedRequests');
    if (!receivedRequests) {
        receivedRequests = document.createElement('div');
        receivedRequests.id = 'receivedRequests';
        receivedRequests.className = 'friend-requests-list';
        receivedTabPane.appendChild(receivedRequests);
    }

    // Get or create the "no requests" message
    let noReceivedRequests = document.getElementById('noReceivedRequests');
    if (!noReceivedRequests) {
        noReceivedRequests = document.createElement('div');
        noReceivedRequests.id = 'noReceivedRequests';
        noReceivedRequests.className = 'text-center py-3 text-muted';
        noReceivedRequests.textContent = 'You have no pending friend requests';
        receivedRequests.appendChild(noReceivedRequests);
    }

    // Proceed with updating the UI
    if (!requests || requests.length === 0) {
        noReceivedRequests.style.display = 'block';
        receivedRequests.innerHTML = '';
        receivedRequests.appendChild(noReceivedRequests);
        return;
    }

    noReceivedRequests.style.display = 'none';
    receivedRequests.innerHTML = '';

    requests.forEach(request => {
        const requestElement = createReceivedRequestElement(request);
        receivedRequests.appendChild(requestElement);
    });
}

async function loadFriendRequests() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
        const response = await fetch('/api/users/me/friend-requests', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok)
            throw new Error('Failed to load friend requests');

        const data = await response.json();

        // Use structured response with sent and received properties
        displaySentRequests(data.sent || []);
        displayReceivedRequests(data.received || []);

        // Remove any previous error messages
        const errorElement = document.getElementById('friendRequestsError');
        if (errorElement)
            errorElement.remove();
    } catch (error) {
        console.error('Error loading friend requests:', error);
        showMessage('Failed to load friend requests', 'error');
    }
}

function displayFriendRequests(requests) {
    const receivedRequests = document.getElementById('receivedRequests');
    const sentRequests = document.getElementById('sentRequests');
    const noReceivedRequests = document.getElementById('noReceivedRequests');
    const noSentRequests = document.getElementById('noSentRequests');

    // Handle received requests
    if (requests.received.length === 0) {
        noReceivedRequests.style.display = 'block';
        receivedRequests.innerHTML = '';
    } else {
        noReceivedRequests.style.display = 'none';
        receivedRequests.innerHTML = '';

        requests.received.forEach(request => {
            const requestElement = createReceivedRequestElement(request);
            receivedRequests.appendChild(requestElement);
        });
    }

    // Handle sent requests
    if (requests.sent.length === 0) {
        noSentRequests.style.display = 'block';
        sentRequests.innerHTML = '';
    } else {
        noSentRequests.style.display = 'none';
        sentRequests.innerHTML = '';

        requests.sent.forEach(request => {
            const requestElement = createSentRequestElement(request);
            sentRequests.appendChild(requestElement);
        });
    }
}

function createReceivedRequestElement(request) {
    const requestDiv = document.createElement('div');
    requestDiv.className = 'request-item';
    requestDiv.dataset.requestId = request.id;

    requestDiv.innerHTML = `
        <img src="${request.from_user.avatar_url}" alt="${request.from_user.display_name}" class="request-avatar">
        <div class="request-info">
            <p class="request-name">${request.from_user.display_name}</p>
            <small>wants to be your friend</small>
        </div>
        <div class="request-actions">
            <button class="btn btn-sm btn-success accept-request me-2" data-request-id="${request.id}">Accept</button>
            <button class="btn btn-sm btn-danger reject-request" data-request-id="${request.id}">Reject</button>
        </div>
    `;

    return requestDiv;
}

function createSentRequestElement(request) {
    const requestDiv = document.createElement('div');
    requestDiv.className = 'request-item';
    requestDiv.dataset.requestId = request.id;

    requestDiv.innerHTML = `
        <img src="${request.to_user.avatar_url}" alt="${request.to_user.display_name}" class="request-avatar">
        <div class="request-info">
            <p class="request-name">${request.to_user.display_name}</p>
            <small>request pending</small>
        </div>
        <div class="request-actions">
            <button class="btn btn-sm btn-danger cancel-request" data-request-id="${request.id}">Cancel</button>
        </div>
    `;

    return requestDiv;
}

function setupEventListeners() {
    // Add friend button
    const addFriendBtn = document.getElementById('addFriendBtn');
    if (addFriendBtn)
        addFriendBtn.addEventListener('click', sendFriendRequest);

    // Handle friend request actions (event delegation)
    document.addEventListener('click', function(event) {
        if (event.target.classList.contains('accept-request')) {
            const requestId = event.target.dataset.requestId;
            acceptFriendRequest(requestId);
        } else if (event.target.classList.contains('reject-request')) {
            const requestId = event.target.dataset.requestId;
            rejectFriendRequest(requestId);
        } else if (event.target.classList.contains('cancel-request')) {
            const requestId = event.target.dataset.requestId;
            cancelFriendRequest(requestId);
        }
    });

    // Modal actions
    const removeFriendBtn = document.getElementById('modalRemoveFriend');
    if (removeFriendBtn)
        removeFriendBtn.addEventListener('click', removeFriend);
}

function connectWebSocket() {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Don't reconnect if already connected
    if (friendsSocket && friendsSocket.readyState !== WebSocket.CLOSED &&
        friendsSocket.readyState !== WebSocket.CLOSING) {
        console.log("WebSocket already connected, not reconnecting");
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/friends/?token=${token}`;

    friendsSocket = new WebSocket(wsUrl);

    friendsSocket.onopen = function(e) {
        console.log('Friends WebSocket connection established');
    };

    friendsSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        handleWebSocketMessage(data);
    };

    friendsSocket.onclose = function(e) {
        console.log('Friends WebSocket connection closed');
        // Only reconnect if the page is still initialized
        if (friendsInitialized && !e.wasClean) {
            console.log("Connection closed unexpectedly, reconnecting...");
            setTimeout(connectWebSocket, 3000);
        }
    };

    friendsSocket.onerror = function(e) {
        console.error('WebSocket error:', e);
    };
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'friends_list':
            displayFriends(data.friends);
            break;
        case 'status_update':
        case 'friend_status_update':
            if (friendCache[data.user_id]) {
                const updatedFriend = { ...friendCache[data.user_id] };

                // Only update fields that have valid values
                if (data.status !== undefined && data.status !== null)
                    updatedFriend.status = data.status;

                if (data.username !== undefined && data.username !== null)
                    updatedFriend.username = data.username;

                if (data.display_name !== undefined && data.display_name !== null)
                    updatedFriend.display_name = data.display_name;

                if (data.avatar_url !== undefined && data.avatar_url !== null)
                    updatedFriend.avatar_url = data.avatar_url;

                friendCache[data.user_id] = updatedFriend;
            }
            updateFriendStatus(data.user_id, data.status);
            break;
        case 'friend_request':
            // Reload friend requests when receiving a new request
            loadFriendRequests().then(() => {
                // Force Bootstrap to refresh the "Received" tab by activating it
                const receivedTab = document.getElementById('received-tab');
                if (receivedTab) {
                    // Create a Bootstrap Tab instance and show it
                    const tab = new bootstrap.Tab(receivedTab);
                    tab.show();

                    // Add highlighting animation to new requests
                    setTimeout(() => {
                        const receivedContainer = document.getElementById('receivedRequests');
                        if (receivedContainer && receivedContainer.firstChild)
                            receivedContainer.firstChild.classList.add('new-request-highlight');
                    }, 200);

                    // Show notification with sender's name
                    if (data.from_user) {
                        const name = data.from_user.display_name || data.from_user.username;
                        showMessage(`New friend request from ${name}!`, 'info');
                    }
                }
            });
            break;
        case 'friend_request_accepted':
            // Reload both friends and requests when a request is accepted
            loadFriends();
            loadFriendRequests();
            const username = data.user && (data.user.display_name || data.user.username);
            showMessage(username ?
                `Friend request from ${username} accepted!` :
                `Friend request accepted!`, 'success');
            break;
        case 'friend_request_rejected':
            loadFriendRequests();
            break;
        case 'friend_request_cancelled':
            loadFriendRequests();
            break;
        case 'friend_removed':
            loadFriends();
            break;
        default:
            console.log(`Unknown WebSocket message type: ${data.type}`);
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'online': return 'bg-success';
        case 'in_game': return 'bg-primary';
        case 'away': return 'bg-warning';
        case 'offline':
        default: return 'bg-secondary';
    }
}

function updateFriendStatus(userId, status) {
    // Update cache
    if (friendCache[userId])
        friendCache[userId].status = status;

    // Update UI (existing code)
    const friendItem = document.querySelector(`.friend-item[data-user-id="${userId}"]`);
    if (!friendItem) return;

    const statusElement = friendItem.querySelector('.friend-status');
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = `friend-status status-${status}`;
    }
}

async function sendFriendRequest() {
    const token = isLoggedIn();
    if (!token) return;

    const usernameInput = document.getElementById('friendUsername');
    const username = usernameInput.value.trim();
    const resultDiv = document.getElementById('friendRequestResult');

    if (!username) {
        resultDiv.innerHTML = '<div class="alert alert-danger">Please enter a username</div>';
        return;
    }

    try {
        const response = await fetch('/api/users/me/friend-requests/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(`Friend request sent to ${username}`, 'success');
            document.getElementById('friendUsername').value = '';

            await loadFriendRequests();

            const sentTab = document.querySelector('button[data-bs-target="#sent"]');
            if (sentTab) {
                const bsTab = new bootstrap.Tab(sentTab);
                bsTab.show();
            }
        } else {
            resultDiv.innerHTML = `<div class="alert alert-danger">${data.error || 'Failed to send friend request'}</div>`;
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        resultDiv.innerHTML = '<div class="alert alert-danger">Error sending friend request</div>';
    }
}

async function acceptFriendRequest(requestId) {
    const token = isLoggedIn();
    if (!token) return;

    try {
        const response = await fetch(`/api/users/me/friend-requests/${requestId}/accept/`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok)
            throw new Error('Failed to accept friend request');

        // Manually remove the request from UI immediately
        const requestElement = document.querySelector(`.request-item[data-request-id="${requestId}"]`);
        if (requestElement)
            requestElement.remove();

        // Refresh both lists
        await loadFriends();
        await loadFriendRequests();

        showMessage('Friend request accepted!', 'success');
    } catch (error) {
        console.error('Error accepting friend request:', error);
        showMessage('Failed to accept friend request', 'error');
    }
}

async function rejectFriendRequest(requestId) {
    const token = isLoggedIn();
    if (!token) return;

    try {
        const response = await fetch(`/api/users/me/friend-requests/${requestId}/reject/`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showMessage('Friend request rejected', 'info');
            loadFriendRequests();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Failed to reject friend request', 'error');
        }
    } catch (error) {
        console.error('Error rejecting friend request:', error);
        showMessage('Error rejecting friend request', 'error');
    }
}

async function cancelFriendRequest(requestId) {
    const token = isLoggedIn();
    if (!token) return;

    try {
        const response = await fetch(`/api/users/me/friend-requests/${requestId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showMessage('Friend request cancelled', 'info');
            loadFriendRequests();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Failed to cancel friend request', 'error');
        }
    } catch (error) {
        console.error('Error cancelling friend request:', error);
        showMessage('Error cancelling friend request', 'error');
    }
}

async function fetchUserStats(username) {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
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

async function openUserProfileModal(user) {
    // Set basic user info first
    const modal = document.getElementById('userProfileModal');
    const modalUserAvatar = document.getElementById('modalUserAvatar');
    const modalUserName = document.getElementById('modalUserName');
    const modalUserUsername = document.getElementById('modalUserUsername');
    const modalUserStatus = document.getElementById('modalUserStatus');
    const modalRemoveFriend = document.getElementById('modalRemoveFriend');

    // Set user data in modal
    modalUserAvatar.src = user.avatar_url;
    modalUserName.textContent = user.display_name;
    modalUserUsername.textContent = '@' + user.username;

    // Set status badge
    modalUserStatus.className = `badge bg-${getStatusBadgeClass(user.status)}`;
    modalUserStatus.textContent = user.status;


    // Set data attributes for buttons
    modalRemoveFriend.dataset.userId = user.id;
    modalRemoveFriend.dataset.userName = user.display_name;

    // Show modal
    const modalInstance = new bootstrap.Modal(modal);
    modalInstance.show();

    // Fetch and update stats after modal is shown
    const stats = await fetchUserStats(user.username);
    const wins = stats ? parseInt(stats.games_won) : 0;
    const losses = stats ? parseInt(stats.games_lost) : 0;
    const ratio = stats ? stats.win_ratio : 0;

    // Update the stats chart
    updateUserStatsChart(wins, losses);
}

function getStatusBadgeClass(status) {
    switch (status) {
        case 'online': return 'success';
        case 'offline': return 'secondary';
        case 'in_game': return 'warning';
        case 'away': return 'danger';
        default: return 'secondary';
    }
}

async function removeFriend() {
    const userId = document.getElementById('modalRemoveFriend').dataset.userId;
    const userName = document.getElementById('modalRemoveFriend').dataset.userName;

    if (!userId) return;

    if (!confirm(`Are you sure you want to remove ${userName} from your friends?`))
        return;

    const token = isLoggedIn();
    if (!token) return;

    try {
        const response = await fetch(`/api/users/me/friends/${userId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            showMessage('Friend removed', 'info');

            const modal = bootstrap.Modal.getInstance(document.getElementById('userProfileModal'));
            modal.hide();

            setTimeout(() => {
                if (window.location.hash === '#/friends') {
                    const friendsList = document.getElementById('friendsList');
                    const noFriends = document.getElementById('noFriends');

                    if (friendsList) {
                        const friendElement = document.querySelector(`.friend-item[data-user-id="${userId}"]`);
                        if (friendElement) {
                            friendElement.remove();
                            if (friendsList.children.length === 0 && noFriends)
                                noFriends.style.display = 'block';
                        }
                        loadFriends();
                    }
                }
            }, 300);
        } else {
            const data = await response.json();
            showMessage(data.error || 'Failed to remove friend', 'error');
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        showMessage('Error removing friend', 'error');
    }
}

export function cleanupFriendsPage() {
    // Close WebSocket connection
    if (friendsSocket && friendsSocket.readyState !== WebSocket.CLOSED) {
        // Remove event listeners before closing
        friendsSocket.onclose = null;
        friendsSocket.close();
    }

    friendsSocket = null;
    friendsInitialized = false;
}

async function updateUserStatsChart(wins, losses) {
    const container = document.getElementById('modalUserStatsChart').parentNode;
    container.innerHTML = '';

    const total = wins + losses;
    const percentage = total > 0 ? Math.round((wins / total) * 100) : 0;

    container.innerHTML = `
        <div class="text-center mb-1">Win Rate: <strong>${percentage}%</strong></div>
        <div class="progress" style="height: 24px;">
            <div class="progress-bar bg-success" role="progressbar" 
                 style="width: ${percentage}%" aria-valuenow="${percentage}" 
                 aria-valuemin="0" aria-valuemax="100">
                ${wins} / ${total}
            </div>
        </div>
        <div class="d-flex justify-content-between mt-1">
            <small class="text-success">Won: ${wins}</small>
            <small class="text-danger">Lost: ${losses}</small>
        </div>
    `;
}


