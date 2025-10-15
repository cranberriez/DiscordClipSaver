FROM python:3.13-slim

# Install system dependencies for video processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (leverage caching)
COPY python/worker/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy source code
COPY python/worker/ /app/worker/
COPY python/shared/ /app/shared/

# Optional: ensure import path
ENV PYTHONPATH=/app

# Create storage directory for local storage
RUN mkdir -p /app/storage

# Run as a module so package-relative imports work
CMD ["python", "-m", "worker.main"]
