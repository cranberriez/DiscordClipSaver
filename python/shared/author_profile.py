"""Helpers for mapping Discord users and members to persisted profile data."""

from typing import Any, Optional


def _asset_url(asset: Any) -> Optional[str]:
    """Return a Discord asset URL without using display-avatar fallbacks."""
    return str(asset.url) if asset else None


def build_global_profile(user: Any) -> dict:
    """Build the global profile fields shared by User and Author records."""
    return {
        "username": user.name,
        "discriminator": user.discriminator or "0",
        "avatar_url": _asset_url(getattr(user, "avatar", None)),
    }


def build_member_profile(member: Any) -> dict:
    """Build an Author profile without confusing a fallback for a guild avatar."""
    profile = build_global_profile(member)
    nickname = getattr(member, "nick", None)
    profile.update(
        {
            "nickname": nickname,
            "display_name": (
                getattr(member, "display_name", None)
                or getattr(member, "global_name", None)
                or member.name
            ),
            # display_avatar falls back to the global or default avatar. Persisting
            # it here pins an obsolete global CDN URL when that avatar changes.
            "guild_avatar_url": _asset_url(getattr(member, "guild_avatar", None)),
        }
    )
    return profile
