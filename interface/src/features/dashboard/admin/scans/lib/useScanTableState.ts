"use client";

import { useState, useCallback, useMemo } from "react";
import type React from "react";
import {
	groupChannelsByType,
	getSortedChannelTypes,
} from "@/components/composite/ChannelOrganizer";
import { api } from "@/lib/api/client";
import type { ChannelWithStatus } from "../types";
import { useScanVisibilityStore } from "../stores/useScanVisibilityStore";
import {
	channelMatchesFilter,
	sortChannels,
} from "./scanStatusTableHelpers";

export function useScanTableState(
	channels: ChannelWithStatus[],
	onRefresh: () => void
) {
	const { showDisabledChannels, searchQuery, statusFilter, sortBy } =
		useScanVisibilityStore();

	// Optimistic enabled overrides: channelId -> boolean
	const [enabledOverrides, setEnabledOverrides] = useState<
		Map<string, boolean>
	>(new Map());

	// Selection state
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
	const [bulkPending, setBulkPending] = useState(false);

	// Channels with optimistic enabled state applied
	const channelsWithOverrides = useMemo(
		() =>
			channels.map((ch) =>
				enabledOverrides.has(ch.id)
					? { ...ch, message_scan_enabled: enabledOverrides.get(ch.id)! }
					: ch
			),
		[channels, enabledOverrides]
	);

	const processedChannels = useMemo(() => {
		let result = channelsWithOverrides;
		if (!showDisabledChannels) {
			result = result.filter((ch) => ch.message_scan_enabled);
		}
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase();
			result = result.filter(
				(ch) => ch.name.toLowerCase().includes(q) || ch.id.includes(q)
			);
		}
		result = result.filter((ch) => channelMatchesFilter(ch, statusFilter));
		return result;
	}, [channelsWithOverrides, showDisabledChannels, searchQuery, statusFilter]);

	// Flat ordered list for shift-select range calculation
	const orderedChannels = useMemo(() => {
		const grouped = groupChannelsByType(processedChannels, "name");
		const types = getSortedChannelTypes();
		const result: ChannelWithStatus[] = [];
		for (const type of types) {
			const group = grouped[type];
			if (group && group.length > 0) {
				result.push(...sortChannels(group, sortBy));
			}
		}
		return result;
	}, [processedChannels, sortBy]);

	const groupedChannels = useMemo(
		() => groupChannelsByType(processedChannels, "name"),
		[processedChannels]
	);

	// Selection derived state
	const allSelected =
		orderedChannels.length > 0 &&
		orderedChannels.every((ch) => selectedIds.has(ch.id));
	const someSelected = selectedIds.size > 0 && !allSelected;

	const handleGlobalCheckbox = useCallback(() => {
		if (allSelected || someSelected) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(orderedChannels.map((ch) => ch.id)));
		}
		setLastSelectedId(null);
	}, [allSelected, someSelected, orderedChannels]);

	const handleRowCheck = useCallback(
		(id: string, e: React.MouseEvent) => {
			setSelectedIds((prev) => {
				const next = new Set(prev);
				if (e.shiftKey && lastSelectedId) {
					const ids = orderedChannels.map((ch) => ch.id);
					const a = ids.indexOf(lastSelectedId);
					const b = ids.indexOf(id);
					const [lo, hi] = a < b ? [a, b] : [b, a];
					// Invert: target's current state determines the range action
					const targetCurrentlyChecked = prev.has(id);
					for (let i = lo; i <= hi; i++) {
						if (targetCurrentlyChecked) next.delete(ids[i]);
						else next.add(ids[i]);
					}
				} else {
					if (next.has(id)) next.delete(id);
					else next.add(id);
				}
				return next;
			});
			setLastSelectedId(id);
		},
		[lastSelectedId, orderedChannels]
	);

	// Toggle a single channel with optimistic update
	const handleChannelToggle = useCallback(
		async (channelId: string, enabled: boolean) => {
			const guildId = channels.find((ch) => ch.id === channelId)?.guild_id;
			if (!guildId) return;
			// Optimistically update
			setEnabledOverrides((prev) => new Map(prev).set(channelId, enabled));
			try {
				await api.channels.toggleChannel(guildId, channelId, enabled);
				onRefresh();
			} catch {
				// Revert on failure
				setEnabledOverrides((prev) => {
					const next = new Map(prev);
					next.delete(channelId);
					return next;
				});
			}
		},
		[channels, onRefresh]
	);

	// Bulk toggle all selected channels with optimistic updates
	const handleBulkToggle = useCallback(
		async (enabled: boolean) => {
			if (selectedIds.size === 0) return;
			const guildId = channels[0]?.guild_id;
			if (!guildId) return;
			setBulkPending(true);
			// Optimistically update all selected
			setEnabledOverrides((prev) => {
				const next = new Map(prev);
				for (const id of selectedIds) next.set(id, enabled);
				return next;
			});
			try {
				await Promise.all(
					[...selectedIds].map((channelId) =>
						api.channels.toggleChannel(guildId, channelId, enabled)
					)
				);
				onRefresh();
			} catch {
				// Revert overrides for selected on failure
				setEnabledOverrides((prev) => {
					const next = new Map(prev);
					for (const id of selectedIds) next.delete(id);
					return next;
				});
			} finally {
				setBulkPending(false);
			}
		},
		[selectedIds, channels, onRefresh]
	);

	return {
		processedChannels,
		orderedChannels,
		groupedChannels,
		channelsWithOverrides,
		enabledOverrides,
		selectedIds,
		allSelected,
		someSelected,
		bulkPending,
		handleGlobalCheckbox,
		handleRowCheck,
		handleChannelToggle,
		handleBulkToggle,
	};
}
