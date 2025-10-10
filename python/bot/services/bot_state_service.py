from __future__ import annotations

from contextlib import asynccontextmanager
from typing import Iterable, Set

import discord

from .state import BotState
from db.types import GuildSnapshot


def get_state(bot: discord.Client) -> BotState:
    """Return the bot's state, creating it if missing (idempotent)."""
    if not hasattr(bot, "state") or bot.state is None:  # type: ignore[attr-defined]
        bot.state = BotState()  # type: ignore[attr-defined]
    return bot.state  # type: ignore[attr-defined]


# ----- Guilds helpers -----

def set_guilds(bot: discord.Client, snapshots: Iterable[GuildSnapshot]) -> None:
    state = get_state(bot)
    state.available_guilds = {s.id: s for s in snapshots}


def add_or_update_guild(bot: discord.Client, snapshot: GuildSnapshot) -> None:
    state = get_state(bot)
    state.available_guilds[snapshot.id] = snapshot


def remove_guild(bot: discord.Client, guild_id: str) -> None:
    state = get_state(bot)
    state.available_guilds.pop(guild_id, None)


# ----- Status tags helpers -----

def add_status(bot: discord.Client, tag: str) -> None:
    get_state(bot).status_tags.add(tag)


def remove_status(bot: discord.Client, tag: str) -> None:
    get_state(bot).status_tags.discard(tag)


def has_status(bot: discord.Client, tag: str) -> bool:
    return tag in get_state(bot).status_tags


def statuses(bot: discord.Client) -> Set[str]:
    return set(get_state(bot).status_tags)


@asynccontextmanager
async def status_scope(bot: discord.Client, tag: str):
    """Async context manager to add/remove a transient status tag.

    Usage:
        async with status_scope(bot, "sync:guilds"):
            ...
    """
    add_status(bot, tag)
    try:
        yield
    finally:
        remove_status(bot, tag)
