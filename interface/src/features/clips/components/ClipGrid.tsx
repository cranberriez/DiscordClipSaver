"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import type { FullClip } from "@/lib/api/clip";
import { ClipCard } from "./ClipCard";
import { AuthorWithStats } from "@/lib/api/author";
import { PageContainer } from "@/components/layout/PageContainer";

interface ClipGridProps {
    clips: FullClip[];
    authorMap?: Map<string, AuthorWithStats>;
    setClipIndex: (index: number) => void;
    setSelectedClip: (clip: FullClip) => void;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
    fetchNextPage?: () => void;
}

export function ClipGrid({
    clips,
    authorMap,
    setClipIndex,
    setSelectedClip,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
}: ClipGridProps) {
    const parentRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (
                    entry.isIntersecting &&
                    hasNextPage &&
                    !isFetchingNextPage
                ) {
                    fetchNextPage?.();
                }
            },
            { root: parentRef.current, rootMargin: "200px" }
        );

        observer.observe(sentinel);

        return () => {
            observer.disconnect();
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    return (
        <PageContainer
            ref={parentRef}
            className="h-full overflow-auto"
            maxWidth="full"
            noLines
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {clips.map((clip, index) => (
                    <ClipCard
                        key={clip.clip.id}
                        clip={clip}
                        onClick={clickedClip => {
                            setClipIndex(index);
                            setSelectedClip(clickedClip);
                        }}
                        authorMap={authorMap}
                    />
                ))}
            </div>

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} style={{ height: "1px" }} />

            {isFetchingNextPage && (
                <div className="flex justify-center py-8 text-muted-foreground">
                    Loading more clips...
                </div>
            )}
        </PageContainer>
    );
}
