"use client";

import { useRef, useEffect } from "react";
import type { FullClip } from "@/lib/api/clip";
import { ClipCard } from "./ClipCard";
import { AuthorWithStats } from "@/lib/api/author";

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
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);

    // Intersection Observer for infinite loading (more reliable)
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel || !hasNextPage || isFetchingNextPage) return;

        let hasTriggered = false;

        const observer = new IntersectionObserver(
            entries => {
                const [entry] = entries;

                // Only trigger if:
                // 1. Element is intersecting
                // 2. Has more pages to load
                // 3. Not currently fetching
                // 4. Haven't triggered recently (debounce)
                // 5. Have at least some clips loaded (prevent initial trigger)
                if (
                    entry.isIntersecting &&
                    hasNextPage &&
                    !isFetchingNextPage &&
                    !hasTriggered &&
                    clips.length > 0
                ) {
                    hasTriggered = true;
                    fetchNextPage?.();

                    // Reset trigger flag after a delay
                    setTimeout(() => {
                        hasTriggered = false;
                    }, 2000); // Increased to 2 seconds
                }
            },
            {
                root: containerRef.current,
                rootMargin: "50px", // Reduced to be less aggressive
                threshold: 0,
            }
        );

        // Small delay to ensure DOM is ready
        const timeoutId = setTimeout(() => {
            observer.observe(sentinel);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage, clips.length]); // Added clips.length to dependencies

    return (
        <div
            ref={containerRef}
            className="h-full w-full overflow-auto px-6 py-4"
            style={{
                contain: "layout style paint",
            }}
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {clips.map((clip: FullClip, index: number) => (
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

            {/* Intersection Observer Sentinel */}
            {hasNextPage && (
                <div
                    ref={sentinelRef}
                    className="h-4 w-full"
                    style={{ minHeight: "1px" }}
                />
            )}

            {/* Loading indicator */}
            {isFetchingNextPage && (
                <div className="mt-8 text-center">
                    <div className="text-muted-foreground">
                        Loading more clips...
                    </div>
                </div>
            )}
        </div>
    );
}
