# Python 3.11 Slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Prevent Python from writing pyc files and buffering stdout
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies (needed for some python packages like psycopg2)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
# Install psycopg2-binary for Postgres connection if not in requirements yet
RUN pip install --no-cache-dir psycopg2-binary sqlalchemy

# Copy the rest of the application
COPY . .

# Expose port (FastAPI default)
EXPOSE 8000

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
