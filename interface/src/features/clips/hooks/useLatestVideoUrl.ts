"use client";

import { useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useClip } from "@/lib/hooks";
import type { FullClip } from "@/lib/api/clip";
import { patchClipAcrossLists, patchClipDetail } from "@/lib/queries/clip";

/**
 * useLatestVideoUrl
 * - Returns the best video URL for a clip, auto-refreshing via useClip if expired or near expiry.
 * - Assumes backend refreshes CDN URL and updates clip.expires_at when queried.
 */
export function useLatestVideoUrl(
    clip: FullClip | null | undefined,
    opts?: { skewSeconds?: number }
) {
    const skewMs = (opts?.skewSeconds ?? 30) * 1000;

    const { needsRefresh, guildId, clipId } = useMemo(() => {
        if (!clip)
            return {
                needsRefresh: false,
                guildId: undefined as string | undefined,
                clipId: undefined as string | undefined,
            };
        const expiresAt = new Date(clip.clip.expires_at).getTime();
        const now = Date.now();
        const needs = isFinite(expiresAt) ? expiresAt - now <= skewMs : true;
        return {
            needsRefresh: needs,
            guildId: clip.clip.guild_id,
            clipId: clip.clip.id,
        };
    }, [clip, skewMs]);

    // Query server for refreshed clip if needed; server will refresh CDN URL if expired.
    const { data: refreshed, isLoading } = useClip(guildId ?? "", clipId ?? "");

    const qc = useQueryClient();
    useEffect(() => {
        if (!refreshed?.clip) return;
        const c = refreshed.clip;
        patchClipDetail(qc, c.id, {
            cdn_url: c.cdn_url,
            expires_at: c.expires_at,
        });
        patchClipAcrossLists(qc, c.id, {
            cdn_url: c.cdn_url,
            expires_at: c.expires_at,
        });
    }, [qc, refreshed]);

    const effectiveUrl = useMemo(() => {
        if (!clip) return undefined as string | undefined;
        // If we decided it needs refresh and have refreshed data, use it; else use initial
        if (needsRefresh && refreshed?.clip?.cdn_url)
            return refreshed.clip.cdn_url;
        return clip.clip.cdn_url;
    }, [clip, needsRefresh, refreshed]);

    // Also expose the most up-to-date clip object when available
    const effectiveClip = refreshed ?? clip;

    return {
        url: effectiveUrl,
        clip: effectiveClip,
        isLoading: needsRefresh && isLoading,
        didRefresh: needsRefresh && !!refreshed,
    } as const;
}
