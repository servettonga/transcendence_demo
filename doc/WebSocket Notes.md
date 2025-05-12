# WebSocket Documentation for Frontend Development

## Connection

Connect to the WebSocket server using:

```javascript
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/ws/chat/`;

// Add authentication token
const wsUrlWithAuth = new URL(wsUrl);
wsUrlWithAuth.searchParams.append('token', localStorage.getItem('accessToken'));

const socket = new WebSocket(wsUrlWithAuth);
```

## Message Types

### 1. Public Messages

Send:

```json
{
  "type": "PUBLIC",
  "message": {
    "content": "Hello, everyone!"
  }
}
```

Receive:

```json
{
  "type": "PUBLIC",
  "content": "Hello, everyone!",
  "sender": {
    "username": "john_doe",
    "display_name": "John Doe",
    "avatar": "/media/avatars/avatar1_umCnRLV.png",
    "status": "online"
  }
}
```

### 2. Private Messages

Send:

```json
{
  "type": "TEXT",
  "message": {
    "content": "Hi there!",
    "recipient_username": "bob"
  }
}
```

Receive:

```json
{
  "type": "TEXT",
  "content": "Hi there!",
  "sender": {
    "username": "john_doe",
    "display_name": "John Doe",
    "avatar": "/media/avatars/avatar1_umCnRLV.png",
    "status": "online"
  }
}
```

### 3. Game Invitations

Send:

```json
{
  "type": "GAME_INVITE",
  "message": {
    "content": "Want to play?",
    "recipient_username": "bob",
    "game_id": 456
  }
}
```

Receive:

```json
{
  "type": "GAME_INVITE",
  "content": "Want to play?",
  "game_id": 456,
  "sender": {
    "username": "john_doe",
    "display_name": "John Doe",
    "avatar": "/media/avatars/john.png",
    "status": "online"
  }
}
```

### 4. Tournament Notifications

Receive:

```json
{
  "type": "TOURNAMENT",
  "content": "Tournament starting in 5 minutes!",
  "tournament_id": 789,
  "sender": {
    "username": "system",
    "display_name": "System",
    "avatar": null,
    "status": "online"
  }
}
```

### 5. Heartbeat Messages

Server sends:

```json
{
  "type": "ping"
}
```

Client responds:

```json
{
  "type": "pong"
}
```

## Message Structure

All messages follow this general structure:

```json
{
  "type": "string",
  "content": "string",
  "sender": {
    "username": "string",
    "display_name": "string",
    "avatar": "string",
    "status": "string"
  },
  "recipient_id": 123,
  "game_id": 456,
  "tournament_id": 789
}
```

## Event Handling

```javascript
// Connection opened
socket.addEventListener('open', () => {
    console.log('Connected to chat server');
});

// Listen for messages
socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);

    // Ignore heartbeat messages
    if (data.type === 'ping') {
        socket.send(JSON.stringify({ type: 'pong' }));
        return;
    }
    if (data.type === 'pong') {
        return;
    }

    // Handle chat messages
    if (data.type === 'PUBLIC') {
        // Handle public message
        console.log(`${data.sender.username}: ${data.content}`);
    }
});

// Connection closed
socket.addEventListener('close', (event) => {
    console.log('WebSocket connection closed:', event.code, event.reason);
});

// Connection error
socket.addEventListener('error', (error) => {
    console.error('WebSocket error:', error);
});
```

## Error Codes

- `1000`: Normal closure
- `1001`: Going Away (server shutting down)
- `1006`: Abnormal Closure (connection lost)
- `1011`: Server Error

## Best Practices

1. **Authentication**

   - Always include a valid JWT token when connecting
   - Handle token expiration and reconnection

2. **Heartbeat**

   - Always respond to ping messages with pong
   - Monitor connection health

3. **Error Handling**

   - Implement reconnection logic for connection drops
   - Handle message parsing errors gracefully

4. **Cleanup**

   - Close WebSocket connection when component unmounts
   - Clear any intervals or timeouts

## Example Implementation

```javascript
class ChatClient {
    constructor() {
        this.socket = null;
        this.connect();
    }

    connect() {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.error('No authentication token found');
            return;
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.hostname}:8000/ws/chat/`;
        const wsUrlWithAuth = new URL(wsUrl);
        wsUrlWithAuth.searchParams.append('token', token);

        this.socket = new WebSocket(wsUrlWithAuth);
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.socket.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);

                if (data.type === 'ping') {
                    this.socket.send(JSON.stringify({ type: 'pong' }));
                    return;
                }

                if (data.type === 'PUBLIC') {
                    this.handlePublicMessage(data);
                }
            } catch (error) {
                console.error('Error processing message:', error);
            }
        });

        this.socket.addEventListener('close', () => {
            console.log('Connection closed, attempting to reconnect...');
            setTimeout(() => this.connect(), 5000);
        });
    }

    handlePublicMessage(data) {
        // Handle public message
        console.log(`${data.sender.username}: ${data.content}`);
    }

    sendMessage(content) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({
                type: 'PUBLIC',
                message: { content }
            }));
        }
    }

    cleanup() {
        if (this.socket) {
            this.socket.close();
        }
    }
}
```
