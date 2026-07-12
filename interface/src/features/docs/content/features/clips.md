# Viewing and managing clips

The [Clips page](/clips) is the searchable library for video attachments collected from servers and channels you can access.

## The command palette

Press `Ctrl+K` or `Cmd+K`, or select the search control, to open the command palette. Plain text searches clip titles, filenames, author names, and stored message content. Use these prefixes to switch into a filter mode:

| Prefix  | Filters by        | Example       |
| ------- | ----------------- | ------------- |
| `#`     | Channel           | `#general`    |
| `@`     | Author            | `@alex`       |
| `!`     | Admin-created tag | `!highlight`  |
| `sort:` | Sort order        | `sort:newest` |

Choose results with the mouse or Arrow Up and Arrow Down, then press Enter. Channel, author, and tag filters can be toggled without closing the palette. Active filters appear as removable tokens. When the input is empty, Backspace removes the last token; Escape closes the palette.

You can combine normal search text with selectors. For example, search for `tournament`, then add a channel and tag filter. The command bar also provides quick controls for favorites, sorting, changing servers, and clearing filters.

## Other library controls

- **Server, channel, and author filters** narrow the library to selected sources.
- **Tags** include clips matching any selected tag and rank clips matching more selected tags first.
- **Favorites** shows clips you have favorited. A shareable favorites filter uses `/clips?fav=1`.
- **Sort** offers newest, oldest, longest, shortest, most liked, and randomized order.

Read [Using tags](/docs/features/tags) for tag filtering and administration.

## The clip player

Select a clip to open the full-screen player. Playback starts automatically when the browser allows it and uses your saved volume and mute preferences. The initial application preference is 50% volume and unmuted, though browser autoplay rules may force muted playback or require interaction.

Use the visible previous and next controls to move through the current filtered results. You can also press Left Arrow or `A` for the previous clip and Right Arrow or `D` for the next clip. The information bar shows the author, channel, message details, tags, and sharing actions.

Original videos are streamed from Discord rather than copied into application storage. When a Discord CDN URL expires, the interface attempts to refresh it from Discord. A deleted source message or inaccessible channel can therefore make an original video unavailable even when its metadata and thumbnail remain.

## Who can do what

The table below describes application permissions. A person must still be signed in and retain access to the Discord server and channel containing the clip.

| Action                                         | Server member | Clip author | Claimed server owner | System administrator               |
| ---------------------------------------------- | ------------- | ----------- | -------------------- | ---------------------------------- |
| View an accessible public clip                 | Yes           | Yes         | Yes                  | Only with applicable server access |
| Copy its link or open the Discord message      | Yes           | Yes         | Yes                  | Only with applicable server access |
| Add or remove a personal favorite              | Yes           | Yes         | Yes                  | Only with applicable server access |
| Rename the clip                                | No            | Own clips   | Yes                  | Yes                                |
| Change Public, Unlisted, or Private visibility | No            | Own clips   | Yes                  | No                                 |
| Add or remove an existing tag                  | No            | Own clips   | Yes                  | Yes                                |
| Archive or restore the clip                    | No            | No          | Yes                  | No                                 |
| Permanently delete the clip record             | No            | No          | Yes                  | No                                 |

Discord users with **Manage Server** or **Administrator** can manage the server’s tag catalog, but that permission alone does not grant clip-owner actions. The **claimed server owner** is the person recorded by Discord Clip Saver as responsible for that installation. A **system administrator** is an operator-level role for the Discord Clip Saver instance, not a Discord server role.

## Actions on your own clips

Open your clip and use its edit menu to:

- **Rename** it with a custom title.
- Set **Public**, **Unlisted**, or **Private** visibility.
- Add or remove tags that server managers have created.
- Favorite it, copy its link, or open the original Discord message.

You cannot archive or permanently delete a clip through the interface unless you are the claimed server owner. Ask that owner if a stored clip needs administrative removal.

## Owner and administrator actions

The claimed server owner can manage every stored clip for that server, including changing titles and visibility, applying tags, archiving and restoring clips, and permanently deleting clip records. Archive is reversible; permanent deletion is not. Neither action deletes the original Discord message.

System administrators can rename clips and manage their tags for operational support. They do not receive the claimed server owner’s visibility, archive, restore, or permanent-delete controls solely from the system role.

Use the [Dashboard](/dashboard) to choose a server and reach its **Channels & Scans**, **Tags**, and **Settings** pages.
