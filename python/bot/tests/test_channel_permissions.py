import unittest

from bot.services.channel_permissions import (
    ADMINISTRATOR,
    VIEW_CHANNEL,
    compute_base_permissions,
    compute_channel_permissions,
    compute_visible_channel_ids,
)


GUILD_ID = "100000000000000001"
USER_ID = "100000000000000002"
ROLE_ID = "100000000000000003"
OTHER_ROLE_ID = "100000000000000004"
CHANNEL_ID = "100000000000000005"


def role(role_id: str, permissions: int) -> dict:
    return {"id": role_id, "permissions": str(permissions)}


def overwrite(target_id: str, target_type: int, allow: int = 0, deny: int = 0) -> dict:
    return {
        "id": target_id,
        "type": target_type,
        "allow": str(allow),
        "deny": str(deny),
    }


class ChannelPermissionTests(unittest.TestCase):
    def test_role_allow_restores_view_channel_denied_to_everyone(self):
        base = compute_base_permissions(
            GUILD_ID,
            "owner",
            USER_ID,
            {ROLE_ID},
            [role(GUILD_ID, VIEW_CHANNEL), role(ROLE_ID, 0)],
        )
        effective = compute_channel_permissions(
            base,
            GUILD_ID,
            USER_ID,
            {ROLE_ID},
            [
                overwrite(GUILD_ID, 0, deny=VIEW_CHANNEL),
                overwrite(ROLE_ID, 0, allow=VIEW_CHANNEL),
            ],
        )
        self.assertTrue(effective & VIEW_CHANNEL)

    def test_combined_role_allow_wins_over_role_deny(self):
        effective = compute_channel_permissions(
            VIEW_CHANNEL,
            GUILD_ID,
            USER_ID,
            {ROLE_ID, OTHER_ROLE_ID},
            [
                overwrite(ROLE_ID, 0, deny=VIEW_CHANNEL),
                overwrite(OTHER_ROLE_ID, 0, allow=VIEW_CHANNEL),
            ],
        )
        self.assertTrue(effective & VIEW_CHANNEL)

    def test_member_deny_is_applied_after_role_allow(self):
        effective = compute_channel_permissions(
            VIEW_CHANNEL,
            GUILD_ID,
            USER_ID,
            {ROLE_ID},
            [
                overwrite(ROLE_ID, 0, allow=VIEW_CHANNEL),
                overwrite(USER_ID, 1, deny=VIEW_CHANNEL),
            ],
        )
        self.assertFalse(effective & VIEW_CHANNEL)

    def test_administrator_bypasses_channel_overwrites(self):
        base = compute_base_permissions(
            GUILD_ID,
            "owner",
            USER_ID,
            {ROLE_ID},
            [role(GUILD_ID, 0), role(ROLE_ID, ADMINISTRATOR)],
        )
        effective = compute_channel_permissions(
            base,
            GUILD_ID,
            USER_ID,
            {ROLE_ID},
            [overwrite(USER_ID, 1, deny=VIEW_CHANNEL)],
        )
        self.assertTrue(effective & VIEW_CHANNEL)

    def test_visible_channel_ids_use_member_roles(self):
        visible, is_administrator = compute_visible_channel_ids(
            guild={"id": GUILD_ID, "owner_id": "owner"},
            member={"roles": [ROLE_ID]},
            roles=[role(GUILD_ID, VIEW_CHANNEL), role(ROLE_ID, 0)],
            channels=[
                {
                    "id": CHANNEL_ID,
                    "permission_overwrites": [
                        overwrite(GUILD_ID, 0, deny=VIEW_CHANNEL),
                        overwrite(ROLE_ID, 0, allow=VIEW_CHANNEL),
                    ],
                }
            ],
            user_id=USER_ID,
        )
        self.assertEqual(visible, [CHANNEL_ID])
        self.assertFalse(is_administrator)


if __name__ == "__main__":
    unittest.main()
