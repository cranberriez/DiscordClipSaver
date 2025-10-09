import discord

from events.on_ready import handle_on_ready
from events.on_guild_join import handle_on_guild_join
from events.on_guild_remove import handle_on_guild_remove
from events.on_message import handle_on_message

# ----- Discord bot -----
intents = discord.Intents.default()
intents.message_content = True

bot = discord.Client(intents=intents)
bot.available_guilds = {}


@bot.event
async def on_ready():
    await handle_on_ready(bot)


@bot.event
async def on_guild_join(guild: discord.Guild):
    await handle_on_guild_join(bot, guild)


@bot.event
async def on_guild_remove(guild: discord.Guild):
    await handle_on_guild_remove(bot, guild)


@bot.event
async def on_message(message: discord.Message):
    await handle_on_message(bot, message)

# TODO: Additional sync logic (if needed) for more complex guild updates