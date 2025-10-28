"use client";

import { useEffect, useMemo, useRef, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useClipFiltersStore } from "@/features/clips/stores/useClipFiltersStore";

function parseCsv(value: string | null): string[] | undefined {
    if (!value) return undefined;
    const parts = value
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
    if (parts.length === 0) return undefined;
    // De-dupe
    return Array.from(new Set(parts));
}

function buildQuery(params: Record<string, string | undefined>) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== "") usp.set(k, v);
    }
    return usp.toString();
}

export function useClipsUrlSync() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const {
        selectedGuildId,
        selectedChannelIds,
        selectedAuthorIds,
        searchQuery,
        sortOrder,
        setGuildId,
        setChannelIds,
        setAuthorIds,
        setSearchQuery,
        setSortOrder,
    } = useClipFiltersStore();

    // Track hydration from URL to avoid feedback loop
    const hydratedRef = useRef(false);
    const suppressWriteRef = useRef(true);

    // Debounce writes (especially search typing)
    const debounceRef = useRef<number | null>(null);
    const scheduleReplace = useCallback(
        (qs: string) => {
            if (debounceRef.current) window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(() => {
                router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
            }, 300);
        },
        [pathname, router]
    );

    // Read page param as number (>=1)
    const pageFromUrl = useMemo(() => {
        const pageStr = searchParams.get("page");
        const n = pageStr ? parseInt(pageStr, 10) : 1;
        return Number.isFinite(n) && n > 0 ? n : 1;
    }, [searchParams]);

    // Hydrate store from URL once
    useEffect(() => {
        if (hydratedRef.current) return;
        // Read params
        const guildId = searchParams.get("guildId");
        const channelIds = parseCsv(searchParams.get("channelIds"));
        const authorIds = parseCsv(searchParams.get("authorIds"));
        const q = searchParams.get("q") || "";
        const sort =
            (searchParams.get("sort") as "asc" | "desc" | null) || null;

        // Apply to store (URL overrides persisted once)
        if (guildId != null) setGuildId(guildId || null);
        if (channelIds) setChannelIds(channelIds);
        if (authorIds) setAuthorIds(authorIds);
        if (q !== "") setSearchQuery(q);
        if (sort === "asc" || sort === "desc") setSortOrder(sort);

        hydratedRef.current = true;
        // Allow writes after a tick to avoid replacing immediately
        const t = window.setTimeout(() => {
            suppressWriteRef.current = false;
        }, 0);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Write store → URL (skip until hydration completes)
    useEffect(() => {
        if (!hydratedRef.current || suppressWriteRef.current) return;

        // Build minimal query string
        const params: Record<string, string | undefined> = {
            guildId: selectedGuildId || undefined,
            // Only include channelIds/authorIds if non-empty
            channelIds:
                selectedChannelIds && selectedChannelIds.length > 0
                    ? selectedChannelIds.join(",")
                    : undefined,
            authorIds:
                selectedAuthorIds && selectedAuthorIds.length > 0
                    ? selectedAuthorIds.join(",")
                    : undefined,
            q: searchQuery?.trim() ? searchQuery.trim() : undefined,
            sort: sortOrder === "desc" ? undefined : sortOrder, // omit default
        };

        // Preserve page param if present
        if (pageFromUrl && pageFromUrl > 1) params.page = String(pageFromUrl);

        const qs = buildQuery(params);
        // Skip if unchanged
        if (qs === searchParams.toString()) return;
        scheduleReplace(qs);
    }, [
        selectedGuildId,
        selectedChannelIds,
        selectedAuthorIds,
        searchQuery,
        sortOrder,
        pageFromUrl,
        scheduleReplace,
    ]);

    // setPage API: lets page update URL intentionally
    const setPage = useCallback(
        (page: number) => {
            if (!hydratedRef.current) return; // ignore until hydrated
            const p = Math.max(1, Math.floor(page));
            const params: Record<string, string | undefined> = {
                guildId: selectedGuildId || undefined,
                channelIds:
                    selectedChannelIds && selectedChannelIds.length > 0
                        ? selectedChannelIds.join(",")
                        : undefined,
                authorIds:
                    selectedAuthorIds && selectedAuthorIds.length > 0
                        ? selectedAuthorIds.join(",")
                        : undefined,
                q: searchQuery?.trim() ? searchQuery.trim() : undefined,
                sort: sortOrder === "desc" ? undefined : sortOrder,
                page: String(p),
            };
            const qs = buildQuery(params);
            router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
        },
        [
            pathname,
            router,
            selectedGuildId,
            selectedChannelIds,
            selectedAuthorIds,
            searchQuery,
            sortOrder,
        ]
    );

    // Reset page when any filter changes (guild, channels, authors, q, sort)
    useEffect(() => {
        if (!hydratedRef.current || suppressWriteRef.current) return;
        const params: Record<string, string | undefined> = {
            guildId: selectedGuildId || undefined,
            channelIds:
                selectedChannelIds && selectedChannelIds.length > 0
                    ? selectedChannelIds.join(",")
                    : undefined,
            authorIds:
                selectedAuthorIds && selectedAuthorIds.length > 0
                    ? selectedAuthorIds.join(",")
                    : undefined,
            q: searchQuery?.trim() ? searchQuery.trim() : undefined,
            sort: sortOrder === "desc" ? undefined : sortOrder,
            // page intentionally omitted to reset to 1 (implicit)
        };
        const qs = buildQuery(params);
        if (qs === searchParams.toString()) return;
        scheduleReplace(qs);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        selectedGuildId,
        JSON.stringify(selectedChannelIds),
        JSON.stringify(selectedAuthorIds),
        searchQuery,
        sortOrder,
    ]);

    return {
        hydrated: hydratedRef.current,
        page: pageFromUrl,
        setPage,
    } as const;
}
