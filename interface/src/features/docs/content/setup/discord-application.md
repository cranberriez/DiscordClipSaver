# Discord application setup

One Discord Developer Portal application provides both the bot that reads enabled channels and the OAuth client used to sign users into the interface.

## Create the application and bot

1. Open the [Discord Developer Portal](https://discord.com/developers/applications) and create an application.
2. On **Bot**, create the bot if needed and copy its token into `BOT_TOKEN`. Treat this value as a password; regenerate it immediately if exposed.
3. Under **Privileged Gateway Intents**, enable **Message Content Intent**. It is required to read message content and attachments from guild messages.
4. Enable **Server Members Intent**. The app uses member and role information to keep permission state current.
5. On **OAuth2 > General**, copy the **Client ID** and **Client Secret** to `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`.

## Register redirect URLs

In **OAuth2 > General > Redirects**, add both URLs for the public interface origin:

```text
https://clips.example.com/api/auth/callback/discord
https://clips.example.com/api/discord/bot/claim
```

For local development, register the equivalent localhost URLs, such as `http://localhost:3000/api/auth/callback/discord` and `http://localhost:3000/api/discord/bot/claim`. The scheme, hostname, port, and path must exactly match `NEXTAUTH_URL` and the browser address.

## Configure installation

In **Installation**, enable **Guild Install**. The app-generated invitation uses the configured scopes `guilds`, `bot`, `applications.commands`, and `identify`, plus the permissions value in `DISCORD_BOT_PERMISSIONS` (the default is `65536`, Read Message History).

The bot also needs channel-level access. In every channel you archive, allow it to view the channel, read message history, and access the attachments posted there. A server-level role can grant these; restricted channels need an explicit override.

Avoid exposing a general public install link if you want every installation claimed through the app’s setup flow. Discord users adding the bot need sufficient server-management permission.

## Verify before deploying

Confirm the bot token and client secret are in `.env`, the public callbacks are registered, and the same public origin is used for `PUBLIC_DOMAIN`/`NEXTAUTH_URL`. After signing in, invite the bot through the interface and test a video attachment in one enabled channel.
