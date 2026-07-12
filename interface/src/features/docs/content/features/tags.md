# Tags

**Tags are admin-created.** Members cannot invent new tags while editing a clip; they select from the active tags already defined for that server. In the current Dashboard, the claimed installation owner manages this catalog.

Tags provide a consistent server-wide vocabulary for categories such as `Highlight`, `Funny`, `Tournament`, or `Needs review`. Each tag has a name, a URL-safe identifier, and an optional color.

## Filter clips with tags

Open the [Clips page](/clips) and use one of these methods:

- Open the command palette with `Ctrl+K` or `Cmd+K`, type `!`, and select one or more tags.
- Open the tag filter from the command bar and toggle tags from the available list.
- Select a tag shown in an open clip’s information bar to apply it as a filter.

Selecting several tags shows clips containing at least one selection. Clips matching more of the selected tags are ranked first. Active tag filters appear as tokens in the command bar and can be removed individually or cleared with the other filters.

Only active tags are offered as filters and count toward tag matching.

## Apply tags to a clip

The clip author, claimed server owner, or a Discord Clip Saver system administrator can add or remove existing tags on a clip. Open the clip, find its tags in the information bar, and use **Add Tag** to search the server’s active catalog.

Other server members can view tags and use them as filters but cannot change which tags are attached to a clip.

## Create and manage tags

The Dashboard’s server-management pages currently require the claimed installation owner. The tag APIs also recognize the Discord server owner and members with **Manage Server** or **Administrator**, but those Discord managers do not currently have a separate tag-management screen unless they are also the claimed installation owner.

1. Open the [Dashboard](/dashboard).
2. Choose the server you manage.
3. Open the **Tags** tab.
4. Create a tag with a clear name and optional color.
5. Rename, recolor, or delete tags from the same page.

Use short, distinct names so they are easy to find in the command palette. Prefer a small shared vocabulary over several tags that mean nearly the same thing.

Deleting a tag removes it from the catalog and from clips that used it. Inactive tags may appear when retained by an older configuration or an administrative integration, but the current Dashboard does not expose an activate/deactivate toggle.
