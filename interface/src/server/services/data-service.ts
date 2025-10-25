import * as db from "../db";
import {
    GuildMapper,
    ChannelMapper,
    ClipMapper,
    ScanMapper,
    SettingsMapper,
    AuthorMapper,
} from "../mappers";

// Handles DTO mapping, and caching (later) for relevant database queries
export class DataService {
    // Guilds
    static async getSingleGuildById(guildId: string) {
        const guild = await db.getSingleGuildById(guildId);

        if (!guild) {
            console.error("Guild not found, guildId: " + guildId);
            return undefined;
        }

        return GuildMapper.toGuild(guild);
    }

    static async getGuildsByIds(ids: string[]) {
        const guilds = await db.getGuildsByIds(ids);

        if (!guilds) {
            console.error("Guilds not found, ids: " + ids.join(", "));
            return undefined;
        }

        return guilds.map(guild => GuildMapper.toGuild(guild));
    }

    static async getGuildsByIdsWithClipCount(ids: string[]) {
        const guilds = await db.getGuildsByIdsWithClipCount(ids);

        if (!guilds) {
            console.error("Guilds not found, ids: " + ids.join(", "));
            return undefined;
        }

        return guilds.map(guild => ({
            ...GuildMapper.toGuild(guild),
            clip_count: guild.clip_count,
        }));
    }

    static async getGuildsByIdsWithStats(
        ids: string[],
        options: { withClipCount?: boolean; withAuthorCount?: boolean } = {}
    ) {
        const guilds = await db.getGuildsByIdsWithStats(ids, options);

        if (!guilds) {
            console.error("Guilds not found, ids: " + ids.join(", "));
            return undefined;
        }

        return guilds.map(guild => GuildMapper.toGuildWithStats(guild));
    }

    // Channels
    static async getChannelsByGuildId(guildId: string) {
        const channels = await db.getChannelsByGuildId(guildId);

        if (!channels) {
            console.error("Channels not found, guildId: " + guildId);
            return undefined;
        }

        return channels.map(channel => ChannelMapper.toChannel(channel));
    }

    static async getChannelById(guildId: string, channelId: string) {
        const channel = await db.getChannelById(guildId, channelId);

        if (!channel) {
            console.error(
                "Channel not found, guildId: " +
                    guildId +
                    ", channelId: " +
                    channelId
            );
            return undefined;
        }

        return ChannelMapper.toChannel(channel);
    }

    static async getChannelsByGuildIdWithClipCount(guildId: string) {
        const channels = await db.getChannelsByGuildIdWithClipCount(guildId);

        if (!channels) {
            console.error("Channels not found, guildId: " + guildId);
            return undefined;
        }

        return channels.map(channel =>
            ChannelMapper.toChannelWithStats(channel)
        );
    }

    // Scans
    static async getScanStatusesByGuildId(guildId: string) {
        const scanStatuses = await db.getGuildScanStatuses(guildId);

        if (!scanStatuses) {
            console.error("Scan statuses not found, guildId: " + guildId);
            return undefined;
        }

        return scanStatuses.map(scanStatus =>
            ScanMapper.toScanStatus(scanStatus)
        );
    }

    static async getScanStatusByChannelId(guildId: string, channelId: string) {
        const scanStatus = await db.getChannelScanStatus(guildId, channelId);

        if (!scanStatus) {
            console.error(
                "Scan status not found, guildId: " +
                    guildId +
                    ", channelId: " +
                    channelId
            );
            return undefined;
        }

        return ScanMapper.toScanStatus(scanStatus);
    }

    // Clips
    static async getClipsByGuildId(
        guildId: string,
        offset: number = 0,
        limit: number = 50,
        sort: "asc" | "desc" = "desc",
        authorIds?: string[]
    ) {
        const clips = await db.getClipsByGuildId(
            guildId,
            limit,
            offset,
            sort,
            authorIds
        );

        if (!clips) {
            console.error("Clips not found, guildId: " + guildId);
            return undefined;
        }

        return clips.map(clip => ClipMapper.toClipWithMetadata(clip));
    }

    static async getClipsByChannelIds(
        channelIds: string[],
        offset: number = 0,
        limit: number = 50,
        sort: "asc" | "desc" = "desc",
        authorIds?: string[]
    ) {
        const clips = await db.getClipsByChannelIds(
            channelIds,
            limit,
            offset,
            sort,
            authorIds
        );

        if (!clips) {
            console.error(
                "Clips not found, channelIds: " + channelIds.join(", ")
            );
            return undefined;
        }

        return clips.map(clip => ClipMapper.toClipWithMetadata(clip));
    }

    static async getClipsByChannelId(
        channelId: string,
        offset: number = 0,
        limit: number = 50,
        sort: "asc" | "desc" = "desc"
    ) {
        const clips = await db.getClipsByChannelId(
            channelId,
            limit,
            offset,
            sort
        );

        if (!clips) {
            console.error("Clips not found, channelId: " + channelId);
            return undefined;
        }

        return clips.map(clip => ClipMapper.toClipWithMetadata(clip));
    }

    static async getClipById(clipId: string) {
        const clip = await db.getClipById(clipId);

        if (!clip) {
            console.error("Clip not found, clipId: " + clipId);
            return undefined;
        }

        return ClipMapper.toClipWithMetadata(clip);
    }

    static async getClipCountByChannelId(channelId: string) {
        const clipCount = await db.getClipCountByChannelId(channelId);

        if (!clipCount) {
            console.error("Clip count not found, channelId: " + channelId);
            return undefined;
        }

        return clipCount;
    }

    // Authors
    static async getAuthorStatsByGuildId(guildId: string) {
        const authors = await db.getAuthorStatsByGuildId(guildId);

        if (!authors) {
            console.error("Authors not found, guildId: " + guildId);
            return undefined;
        }

        return authors.map(author => AuthorMapper.toAuthorWithStats(author));
    }

    static async getAuthorStatsByUserId(guildId: string, userId: string) {
        const author = await db.getAuthorStatsById(guildId, userId);

        if (!author) {
            console.error("Author not found, guildId: " + guildId);
            return undefined;
        }

        return AuthorMapper.toAuthorWithStats(author);
    }

    // Settings
    static async getGuildSettings(guildId: string) {
        const settings = await db.getGuildSettings(guildId);

        if (!settings) {
            console.error("Settings not found, guildId: " + guildId);
            return undefined;
        }

        return SettingsMapper.toGuildSettings(settings);
    }
}
