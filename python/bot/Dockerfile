FROM python:3.13-slim

# Optional: install system dependencies if needed for your DB/driver
# RUN apt-get update && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (leverage caching)
ARG BOT_REQUIREMENTS_FILE=requirements.txt
COPY python/bot/requirements*.txt /app/bot-requirements/
RUN pip install --no-cache-dir -r /app/bot-requirements/${BOT_REQUIREMENTS_FILE}

# Copy source code
COPY python/bot/ /app/bot/
COPY python/shared/ /app/shared/
COPY settings.default.jsonc /app/settings.default.jsonc

# Optional: ensure import path
ENV PYTHONPATH=/app

# App config
ENV DEFAULT_SETTINGS_PATH=/app/settings.default.jsonc
EXPOSE 8000

# Run as a module so package-relative imports work
CMD ["python", "-m", "bot.main"]
