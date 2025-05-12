# API Documentation

The API documentation is automatically generated and can be accessed at:

- Swagger UI: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- ReDoc: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)
- Raw Schema: [http://localhost:8000/api/schema](http://localhost:8000/api/schema)

The schema is auto-generated using drf-spectacular and includes:

## Authentication

- Login (`/api/token/`)
- Refresh Token (`/api/token/refresh/`)
- Logout (`/api/logout`)
- Register (`/api/users/register`)

## User Management

- Get/Update Profile (`/api/users/me/`)
- View User Profile (`/api/users/@{username}/`)
- Get User Stats (`/api/users/@{username}/stats/`)
- Friend System Endpoints (`/api/users/me/friends/`)

## Game System

- Create Game (`/api/pong/game/create/`)
- Join Game (`/api/pong/game/{id}/join/`)
- Game State (`/api/pong/game/{id}/state/`)
- Game History (`/api/pong/history/`)

For detailed request/response schemas and examples, please refer to the Swagger UI or ReDoc documentation.
