"use client";

import { useEffect, useRef, useState } from "react";
import { useClipsUrlSync } from "@/features/clips/hooks/useClipsUrlSync";
import { useClipsData } from "@/features/clips/hooks/useClipsData";
import { useClip } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/features/clips/components/FilterBar";
import { ClipGrid } from "@/features/clips";
import {
	GuildSelectModal,
	ChannelSelectModal,
	AuthorSelectModal,
	ClipModal,
} from "@/features/clips/components/modals";
import { useClipFiltersStore } from "@/features/clips/stores/useClipFiltersStore";
import type { FullClip } from "@/lib/api/types";
import { toast } from "sonner";

/**
 * Main content component for the clips page that handles URL sync and data fetching.
 * This component is wrapped in Suspense to handle useSearchParams() properly.
 */
export function ClipsPageContent() {
	const { selectedGuildId, openGuildModal } = useClipFiltersStore();

	// URL <-> Store synchronization and page param
	const { hydrated, page, setPage, clipId, setClipId } = useClipsUrlSync();

	// Centralized data fetching that waits for hydration and targets page
	const {
		guilds,
		guildsLoading,
		channels,
		channelsLoading,
		authors,
		authorMap,
		channelMap,
		selectedGuild,
		filteredClips,
		allClipCount,
		clipsQuery,
	} = useClipsData({ hydrated, targetPage: page });

	const [selectedClip, setSelectedClip] = useState<FullClip | null>(null);
	const [clipIndex, setClipIndex] = useState<number>(-1);
	const [lastHighlightedId, setLastHighlightedId] = useState<string | null>(
		null
	);
	const [scrollToClipId, setScrollToClipId] = useState<string | null>(null);
	// Track initial clipId from URL (state so hooks update) and whether we've auto-opened already
	const [initialClipId, setInitialClipId] = useState<string | null>(null);
	const autoOpenedRef = useRef(false);

	useEffect(() => {
		if (!hydrated) return;
		// Capture initial clipId exactly once after hydration
		if (initialClipId === null) {
			setInitialClipId(clipId ?? null);
		}
	}, [hydrated, clipId, initialClipId]);

	// Fetch single clip by ID for initial modal open if it's not yet in the list
	const { data: fetchedClipById, error: fetchedClipError } = useClip(
		selectedGuildId || "",
		initialClipId || ""
	);

	// Auto-open guild modal if no guild selected
	useEffect(() => {
		if (!selectedGuildId && !guildsLoading) {
			openGuildModal();
		}
	}, [selectedGuildId, guildsLoading, openGuildModal]);

	// Keep URL page param in sync with number of loaded pages
	useEffect(() => {
		if (!hydrated) return;
		const pagesLoaded = clipsQuery.data?.pages.length ?? 0;
		if (pagesLoaded > 0 && pagesLoaded !== page) {
			setPage(pagesLoaded);
		}
	}, [hydrated, clipsQuery.data?.pages.length, page, setPage]);

	// If an initial clipId is present in URL, ensure we load until it's available and open modal (only once)
	useEffect(() => {
		if (!hydrated) return;
		const targetClipId = initialClipId;
		if (!targetClipId || autoOpenedRef.current) return;
		// Attempt to find the clip in currently loaded clips
		const idx = filteredClips.findIndex((c) => c.clip.id === targetClipId);
		if (idx >= 0) {
			// If modal not already on this clip, open and set index
			if (!selectedClip || selectedClip.clip.id !== targetClipId) {
				setClipIndex(idx);
				setSelectedClip(filteredClips[idx]);
				setClipId(targetClipId);
			}
			// Mark as auto-opened to avoid re-opening again
			autoOpenedRef.current = true;
			return;
		}
		// If not in list yet but we already fetched it directly, open modal without index
		if (fetchedClipById) {
			if (!selectedClip || selectedClip.clip.id !== targetClipId) {
				setClipIndex(-1);
				setSelectedClip(fetchedClipById);
				setClipId(targetClipId);
			}
			autoOpenedRef.current = true;
			return;
		}
		// If fetch by ID errored and we've exhausted pages, surface a toast
		if (!clipsQuery.hasNextPage && fetchedClipError) {
			const msg =
				(fetchedClipError as any)?.message ||
				"Clip not found or inaccessible.";
			toast.error(
				msg.includes("403")
					? "You don't have access to this clip."
					: "Clip not found."
			);
			autoOpenedRef.current = true;
			return;
		}
		// Not found yet, keep fetching next pages until found or exhausted
		if (clipsQuery.hasNextPage && !clipsQuery.isFetchingNextPage) {
			clipsQuery.fetchNextPage();
		} else if (
			!clipsQuery.hasNextPage &&
			// Only consider exhausted if we've loaded some pages
			((clipsQuery.data?.pages.length ?? 0) > 0 ||
				// Or query is not loading or fetching anymore (settled)
				(!clipsQuery.isLoading && !clipsQuery.isFetchingNextPage))
		) {
			// Exhausted pages; don't try again
			autoOpenedRef.current = true;
		}
	}, [
		hydrated,
		filteredClips,
		clipsQuery.hasNextPage,
		clipsQuery.isFetchingNextPage,
		clipsQuery.isLoading,
		clipsQuery.data?.pages.length,
		clipsQuery.fetchNextPage,
		selectedClip,
		fetchedClipById,
		fetchedClipError,
		initialClipId,
	]);

	// If modal was opened with fetchedClipById (no index), attach index once it appears in list
	useEffect(() => {
		if (!selectedClip) return;
		if (clipIndex !== -1) return;
		const idx = filteredClips.findIndex(
			(c) => c.clip.id === selectedClip.clip.id
		);
		if (idx >= 0) setClipIndex(idx);
	}, [filteredClips, selectedClip, clipIndex]);

	// Reset autoOpenedRef when initialClipId changes (new page load) to allow new auto-opens
	useEffect(() => {
		if (!hydrated) return;
		// Only reset when we have a new initial clipId (page refresh/navigation)
		if (initialClipId && initialClipId !== clipId) {
			autoOpenedRef.current = false;
		}
	}, [hydrated, initialClipId, clipId]);

	// When user selects a clip by clicking a card, update URL clipId
	const handleSelectClip = (clip: FullClip, index: number) => {
		setClipIndex(index);
		setSelectedClip(clip);
		setClipId(clip.clip.id);
	};

	return (
		<>
			{/* Full-screen clips grid background */}
			<div className="bg-background inset-0 flex h-screen flex-col">
				<div className="relative flex h-full flex-col">
					<FilterBar
						guildName={selectedGuild?.name}
						guildIcon={selectedGuild?.icon_url}
						channelCount={channels.length}
						authorCount={authors.length}
					/>
					<ClipGrid
						clips={filteredClips}
						authorMap={authorMap}
						setClipIndex={setClipIndex}
						setSelectedClip={(clip) =>
							handleSelectClip(
								clip,
								filteredClips.findIndex(
									(c) => c.clip.id === clip.clip.id
								)
							)
						}
						hasNextPage={clipsQuery.hasNextPage}
						isFetchingNextPage={clipsQuery.isFetchingNextPage}
						fetchNextPage={clipsQuery.fetchNextPage}
						scrollToClipId={scrollToClipId}
						highlightClipId={lastHighlightedId}
						className="pt-18!"
					/>
				</div>
			</div>

			{/* Content overlays for states (when no clips or loading) */}
			<ErrorOverlay
				selectedGuildId={selectedGuildId}
				clipsLoading={clipsQuery.isLoading}
				clipsError={clipsQuery.error}
				filteredClips={filteredClips}
				openGuildModal={openGuildModal}
				allClipCount={allClipCount}
			/>

			{/* Modals */}
			<GuildSelectModal guilds={guilds} isLoading={guildsLoading} />
			<ChannelSelectModal
				channels={channels}
				isLoading={channelsLoading}
			/>
			<AuthorSelectModal authors={authors} isLoading={false} />

			{/* Clip Modal */}
			{selectedClip && (
				<ClipModal
					clip={selectedClip}
					onClose={() => {
						// Highlight the clip that was just watched for a moment
						const justWatchedId = selectedClip.clip.id;
						setLastHighlightedId(justWatchedId);

						// Scroll to the clip once after closing modal
						if (
							filteredClips.some(
								(c) => c.clip.id === justWatchedId
							)
						) {
							setScrollToClipId(justWatchedId);
							// Clear scroll target after a short delay
							window.setTimeout(
								() => setScrollToClipId(null),
								1000
							);
						}

						// Clear highlight after 2 seconds
						window.setTimeout(
							() =>
								setLastHighlightedId((current) =>
									current === justWatchedId ? null : current
								),
							2000
						);

						// Clear modal and URL param
						setSelectedClip(null);
						setClipIndex(-1);
						setClipId(null);
					}}
					onPrevious={
						clipIndex > 0
							? () => {
									const newIndex = clipIndex - 1;
									setClipIndex(newIndex);
									const newClip = filteredClips[newIndex];
									setSelectedClip(newClip);
									setClipId(newClip.clip.id);
								}
							: undefined
					}
					onNext={
						clipIndex >= 0 && clipIndex < filteredClips.length - 1
							? () => {
									const newIndex = clipIndex + 1;
									setClipIndex(newIndex);
									const newClip = filteredClips[newIndex];
									setSelectedClip(newClip);
									setClipId(newClip.clip.id);

									// Load more clips if we're near the end and more are available
									if (
										newIndex >= filteredClips.length - 2 &&
										clipsQuery.hasNextPage &&
										!clipsQuery.isFetchingNextPage
									) {
										clipsQuery.fetchNextPage();
									}
								}
							: undefined
					}
					prevUrl={
						clipIndex > 0
							? filteredClips[clipIndex - 1]?.clip.cdn_url
							: undefined
					}
					nextUrl={
						clipIndex >= 0 && clipIndex < filteredClips.length - 1
							? filteredClips[clipIndex + 1]?.clip.cdn_url
							: undefined
					}
					channelMap={channelMap}
					authorMap={authorMap}
				/>
			)}
		</>
	);
}

function ErrorOverlay({
	selectedGuildId,
	clipsLoading,
	clipsError,
	filteredClips,
	openGuildModal,
	allClipCount,
}: {
	selectedGuildId: string | null;
	clipsLoading: boolean;
	clipsError: Error | null;
	filteredClips: FullClip[];
	openGuildModal: () => void;
	allClipCount: number;
}) {
	if (!selectedGuildId) {
		return (
			<div className="bg-background/80 pointer-events-auto absolute inset-0 flex items-center justify-center backdrop-blur-sm">
				<div className="py-24 text-center">
					<h2 className="mb-4 text-2xl font-bold">
						No Server Selected
					</h2>
					<p className="text-muted-foreground mb-6">
						Please select a server to view clips
					</p>
					<Button onClick={openGuildModal}>Select Server</Button>
				</div>
			</div>
		);
	}

	if (clipsLoading) {
		return (
			<div className="bg-background/80 pointer-events-auto absolute inset-0 z-[5] flex flex-col items-center justify-center backdrop-blur-sm">
				<div className="mb-4 h-16 w-16 animate-spin rounded-full border-4 border-blue-400/30 border-t-blue-400"></div>
				<div className="text-xl font-semibold text-blue-400">
					Loading...
				</div>
			</div>
		);
	}

	if (clipsError) {
		return (
			<div className="bg-background/80 pointer-events-auto absolute inset-0 flex items-center justify-center backdrop-blur-sm">
				<div className="text-destructive py-24 text-center">
					Error loading clips. Please try again.
				</div>
			</div>
		);
	}

	if (filteredClips.length === 0) {
		return (
			<div className="bg-background/80 pointer-events-auto absolute inset-0 flex items-center justify-center backdrop-blur-sm">
				<div className="text-muted-foreground py-24 text-center">
					<p>
						{allClipCount === 0
							? "No clips found in this server."
							: "No clips match your search."}
					</p>
					<p className="mt-2 text-sm">
						{allClipCount === 0
							? "Clips will appear here after the bot scans your channels."
							: "Try adjusting your search query."}
					</p>
				</div>
			</div>
		);
	}

	return null;
}
