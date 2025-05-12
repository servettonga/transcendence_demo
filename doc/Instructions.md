# Pong Game Instructions

## Prerequisites

- Python 3.13
- Docker and Docker Compose
- Git

## Local Development Setup

1. **Clone the repository**

    ```bash
    git clone git@github.com:servettonga/transcendence.git
    cd transcendence
    ```

2. **Create and activate virtual environment**

   ```bash
   # MacOS/Linux
   python3 -m venv .venv
   source .venv/bin/activate

   # Windows
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r backend/requirements.txt
   pip install -r cli_client/requirements.txt
   ```

4. **Set up environment variables**

    ```bash
    cp sample.env .env
    # Edit .env with your configuration

    cp .env backend/.env
    ```

5. **Start Docker services**

    ```bash
    docker-compose up --build
    ```

6. **Django Setup**

    ```bash
    # Create and apply migrations
    docker-compose exec backend python manage.py makemigrations
    docker-compose exec backend python manage.py migrate

    # Create superuser
    docker-compose exec backend python manage.py createsuperuser

    # Collect static files
    docker-compose exec backend python manage.py collectstatic --noinput
    ```

7. **Access the services**

- Django Admin: [http://localhost:8000/admin](http://localhost:8000/admin)
- API Documentation:
  - Swagger UI: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
  - ReDoc: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)
  - Raw Schema: [http://localhost:8000/api/schema](http://localhost:8000/api/schema)
- Frontend: [http://localhost:8080](http://localhost:8080)

## CLI Commands

1. **Create authentication token**

   ```bash
   # Login to get token
   curl -X POST http://localhost:8000/api/token/ \
        -H "Content-Type: application/json" \
        -d '{"username":"your_username","password":"your_password"}'

   # Response will contain:
   # {
   #   "access": "your_access_token",
   #   "refresh": "your_refresh_token"
   # }
   ```

2. **Create a new game**

   ```bash
   # Using the access token from previous step
   curl -X POST http://localhost:8000/api/pong/game/create/ \
        -H "Authorization: Bearer your_access_token"
   ```

## Using the CLI Client

1. **Install CLI client dependencies**

   ```bash
   # From project root with virtual env activated
   pip install -r cli_client/requirements.txt

2. **Running the client**

   ```bash
   # Create or join a game
   python cli_client/main.py
   ```

   The client will prompt for:
   - Username
   - Password
   - Whether to create or join a game

3. **Controls**

   - Left Player:
     - W: Move paddle up
     - S: Move paddle down

   - Right Player:
     - ↑: Move paddle up
     - ↓: Move paddle down

   - General:
     - Q: Quit game

   - Game States:
     - WAITING: Waiting for second player
     - PLAYING: Game in progress
     - FINISHED: Game over

## Docker Services

- `postgres`: PostgreSQL database
- `backend`: Django + Daphne server
- `nginx`: Web server
- `redis`: Channel layers for WebSocket

## Troubleshooting

1. If database connection fails:

   ```bash
   docker-compose down -v
   docker-compose up --build
   ```

2. If static files are missing:

    ```bash
    docker-compose exec backend python manage.py collectstatic --noinput
    ```

## Development Tips

### **Django Management**

```bash
# Create new app
docker-compose exec backend python manage.py startapp <app_name>

# Make model changes
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Shell access
docker-compose exec backend python manage.py shell
```

## Admin Setup

For admin users, 2FA is mandatory. Follow these steps to set up a new admin account:

1. Create admin user:

   ```bash
   docker-compose exec backend python manage.py createsuperuser
   ```

2. Enable 2FA for the admin account:

   ```bash
   # Login to get access token
   curl -X POST http://localhost:8000/api/token/ \
      -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"your_password"}'

   # Enable 2FA using the access token
   curl -X POST http://localhost:8000/api/users/2fa/enable/ \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
      -H "Content-Type: application/json"

   # Scan QR code with authenticator app and verify setup
   curl -X POST http://localhost:8000/api/users/2fa/verify/ \
      -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"code":"123456"}'
   ```

3. Access admin interface:

   - Go to <http://localhost:8000/admin>
   - Enter username and password
   - Enter 2FA code from authenticator app

### **Database Management**

```bash
# Backup database
docker-compose exec postgres pg_dump -U ${POSTGRES_USER} ${POSTGRES_DB} > backup.sql

# Restore database
docker-compose exec -T postgres psql -U ${POSTGRES_USER} ${POSTGRES_DB} < backup.sql
```

### **API Documentation**

The API schema is automatically generated using drf-spectacular. After making changes to the API:

```bash
# Regenerate API schema
docker-compose exec backend python manage.py spectacular --file schema.yml --format yaml
```

The updated documentation will be available at:

- Swagger UI: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)
- ReDoc: [http://localhost:8000/api/redoc](http://localhost:8000/api/redoc)
- Raw Schema: [http://localhost:8000/api/schema](http://localhost:8000/api/schema)
