FROM python:3.13-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=1.7.1 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    libpq-dev \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM builder AS development

# Install development dependencies
RUN pip install --no-cache-dir \
    django-debug-toolbar \
    django-extensions \
    pytest \
    pytest-django \
    ipython

# Copy project files
WORKDIR /app
COPY . .
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Run Django development server
ENTRYPOINT ["/docker-entrypoint.sh"]

# Production stage
FROM builder AS production

# Copy project files
WORKDIR /app
COPY . .
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Collect static files
RUN python manage.py collectstatic --noinput

# Run Daphne in production
ENTRYPOINT ["/docker-entrypoint.sh"]