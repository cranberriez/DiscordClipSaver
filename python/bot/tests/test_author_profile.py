import unittest
from types import SimpleNamespace

from shared.author_profile import build_global_profile, build_member_profile


class Asset:
    def __init__(self, url: str):
        self.url = url


def member(**overrides):
    values = {
        "name": "clipper",
        "discriminator": "0",
        "avatar": Asset("https://cdn.discordapp.com/avatars/1/global.png"),
        "guild_avatar": None,
        "display_avatar": Asset("https://cdn.discordapp.com/avatars/1/global.png"),
        "nick": None,
        "display_name": "Clipper",
        "global_name": "Clipper",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


class AuthorProfileTests(unittest.TestCase):
    def test_global_profile_uses_only_the_global_avatar(self):
        profile = build_global_profile(member())

        self.assertEqual(
            profile["avatar_url"],
            "https://cdn.discordapp.com/avatars/1/global.png",
        )

    def test_display_avatar_fallback_is_not_stored_as_a_guild_avatar(self):
        profile = build_member_profile(member())

        self.assertIsNone(profile["guild_avatar_url"])

    def test_real_guild_avatar_is_stored(self):
        profile = build_member_profile(
            member(
                guild_avatar=Asset(
                    "https://cdn.discordapp.com/guilds/2/users/1/avatars/guild.png"
                )
            )
        )

        self.assertEqual(
            profile["guild_avatar_url"],
            "https://cdn.discordapp.com/guilds/2/users/1/avatars/guild.png",
        )


if __name__ == "__main__":
    unittest.main()
