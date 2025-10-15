# Discord Clip Saver

Discord Clip Saver is a Discord bot that saves clips from Discord to a database.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

# Local Development

## Prerequisites

-   Python >= 3.12 (<3.14.0, asyncpg has issues with 3.14)
-   Node.js >= 20
-   Docker (optional, recommended for production)
-   FFmpeg (required for thumbnail generation - see worker README for installation)

Docker or a Postgres and Redis cloud server are required for the bot to function.

## Setup

1. Clone the repository
2. Copy the `.env.global.example` file to `.env.global` and fill in the values
3. Run `docker compose up -d` to start the containers, this will start the bot, interface, postgres server, and redis server
4. Open the interface in your browser at `http://localhost:3000`

## Setup Local Interface / Bot

1. Clone the repository
2. Fill in the values in the `.env.global.example` file.
3. Copy the `.env.global.example` file to `.env` in the /python/bot or /interface directories depending on which you want to work on
4. Start the Postgres Server and Redis server with `docker compose up -d dcs-postgres dcs-redis`

### Bot

The bot does not require the interface to be running to function. However some functionality is more easily access with the interface.
At the time of writing this, some functionality is tied to the interface calling the bot's API. This can be done instead with curl or any other HTTP client and will be described below.

1. (optional) create a virtual environment with `python -m venv venv` in the /python folder and activate it with `venv\Scripts\activate` or `source venv/bin/activate` on Linux
2. Navigate to the bot folder with `cd /python/bot`
3. Install the bot's dependencies with `pip install -r requirements.txt`
   TODO: MAKE THIS BETTER
4. Navigate back to python folder with `cd ..`
5. Run the bot in module mode with `python -m bot.main`

### Interface

The interface requires the bot to be running to function.

1. Navigate to the interface folder with `cd /interface`
2. Install the dependencies with `npm install`
3. Run the interface with `npm run dev`
