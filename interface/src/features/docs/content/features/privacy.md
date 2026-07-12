# Privacy and access

Discord Clip Saver is designed so a clip remains connected to the Discord community and channel it came from. Access is based on your signed-in Discord identity, your current access to that server and channel, the clip’s visibility, and any owner responsibilities assigned in Discord Clip Saver.

This page describes the privacy guarantees users can expect without exposing the internal security design.

## Baseline access

- You must sign in with Discord to browse server clips.
- You only see participating servers you currently belong to.
- Within a server, clips are limited to channels you are allowed to view on Discord.
- Losing server membership or channel access also removes normal access to that server or channel’s clips.
- A copied clip link does not bypass these checks. The recipient must independently have permission to view the clip.

Clip details and thumbnails follow the same access expectations as the clip itself. Restricted content is not intended to become public merely because its URL was copied.

## Visibility choices

The clip author and claimed server owner can change visibility from the clip’s edit menu on the [Clips page](/clips).

| Visibility   | Who can view it                                                     |
| ------------ | ------------------------------------------------------------------- |
| **Public**   | Signed-in members who can access the originating server and channel |
| **Unlisted** | The clip author and claimed server owner                            |
| **Private**  | The clip author and claimed server owner                            |

Unlisted does not make a clip public or grant access through possession of a link. In the current application it has the same viewer restrictions as Private, while remaining a separate label for organization and future sharing workflows.

Archived clips are administrative records and are available only to the claimed server owner until restored. A system administrator role does not automatically replace Discord membership, channel access, or claimed server ownership.

## What is stored

Discord Clip Saver stores information needed to organize and find clips, along with generated thumbnails. Original video playback comes from Discord rather than a permanent duplicate of the original video in application storage.

If the source Discord message is deleted or becomes inaccessible, the original video may no longer play. Removing a Discord message is not a substitute for using Discord Clip Saver’s delete or purge controls when stored metadata and thumbnails also need to be removed.

## Administrative controls

The claimed server owner can archive, restore, or permanently delete individual clip records. The server Dashboard also provides channel and server-wide purge controls under **Settings**.

[Open the Dashboard](/dashboard), choose the relevant server, and review **Settings** before starting a purge. Purges are destructive and may be processed in the background.

On a self-hosted instance, the operator controls the database, thumbnail storage, backups, logs, and retention practices. Members should contact that operator or the claimed server owner for instance-specific privacy or deletion questions.

## Good sharing practices

- Use Private or Unlisted for your own clips when they should not appear to other eligible channel members.
- Check the selected server and channel before copying a link.
- Remember that people who can view a video can potentially record or redistribute what they see.
- Ask the claimed server owner to archive or delete a clip when author visibility controls are not sufficient.

For precise action permissions, read [Viewing and managing clips](/docs/features/clips). For server-wide deletion controls, read [Using the Dashboard](/docs/features/dashboard).
