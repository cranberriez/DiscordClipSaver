"use client";

import type { FullClip } from "@/lib/api/clip";
import { ClipCard } from "./ClipCard";
import { AuthorWithStats } from "@/lib/api/author";

interface ClipGridProps {
    clips: FullClip[];
    authorMap?: Map<string, AuthorWithStats>;
    setClipIndex: (index: number) => void;
    setSelectedClip: (clip: FullClip) => void;
}

export function ClipGrid({
    clips,
    authorMap,
    setClipIndex,
    setSelectedClip,
}: ClipGridProps) {
    return (
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
    );
}
