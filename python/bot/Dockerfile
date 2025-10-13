# Use an official Python runtime as a parent image
FROM python:3.13-slim

# Set the working directory in the container
WORKDIR /app

# Copy the bot-specific requirements into the container (build context is repo root)
COPY python/bot/requirements.txt /app/python/bot/requirements.txt

# Install any needed packages specified in requirements.txt (run from the requirements' directory)
WORKDIR /app/python/bot
RUN pip install --no-cache-dir -r requirements.txt
WORKDIR /app

# Copy the bot source code into the container
COPY python/bot/ /app/bot/

# Copy the project root default settings into the image so the container is self-contained
COPY settings.default.yml /app/settings.default.yml

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Default settings path inside the image (can be overridden at runtime via env)
ENV DEFAULT_SETTINGS_PATH=/app/settings.default.yml

# Run main.py when the container launches
CMD ["python", "bot/main.py"]
