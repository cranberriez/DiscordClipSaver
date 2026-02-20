"use client";

import { useRef, useEffect } from "react";
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
	scrollToClipId?: string | null;
	highlightClipId?: string | null;
	className?: string;
}

export function ClipGrid({
	clips,
	authorMap,
	setClipIndex,
	setSelectedClip,
	hasNextPage,
	isFetchingNextPage,
	fetchNextPage,
	scrollToClipId,
	highlightClipId,
	className,
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

	// Auto-scroll to a specific clip ID when requested or when clips change
	useEffect(() => {
		if (!scrollToClipId) return;
		const parent = parentRef.current;
		if (!parent) return;
		const el = parent.querySelector<HTMLDivElement>(
			`#clip-${scrollToClipId}`
		);
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
			return;
		}
		// Retry shortly in case it's just rendered after pagination
		const t = window.setTimeout(() => {
			const el2 = parent.querySelector<HTMLDivElement>(
				`#clip-${scrollToClipId}`
			);
			if (el2)
				el2.scrollIntoView({ behavior: "smooth", block: "center" });
		}, 150);
		return () => window.clearTimeout(t);
	}, [scrollToClipId, clips]);

	return (
		<PageContainer
			ref={parentRef}
			className={`h-full overflow-auto ${className || ""}`}
			maxWidth="full"
			noLines
		>
			<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{clips.map((clip, index) => (
					<ClipCard
						key={clip.clip.id}
						clip={clip}
						onClick={(clickedClip) => {
							setClipIndex(index);
							setSelectedClip(clickedClip);
						}}
						authorMap={authorMap}
						highlighted={highlightClipId === clip.clip.id}
					/>
				))}
			</div>

			{/* Sentinel for infinite scroll */}
			<div ref={sentinelRef} style={{ height: "1px" }} />

			{isFetchingNextPage && (
				<div className="text-muted-foreground flex justify-center py-8">
					Loading more clips...
				</div>
			)}
		</PageContainer>
	);
}
