"use client";

import { Hash } from "lucide-react";
import { FilterNavButton } from "./FilterButton";
import { useClipFiltersStore } from "../../stores/useClipFiltersStore";

type ChannelProps = {
    channelCount: number;
};

export function ChannelFilter({ channelCount }: ChannelProps) {
    const { selectedGuildId, selectedChannelIds, openChannelModal } =
        useClipFiltersStore();

    const hasGuildSelected = !!selectedGuildId;

    const getChannelButtonText = () => {
        if (!hasGuildSelected) return "Channels";
        if (selectedChannelIds.length === 0) return "All Channels";
        if (selectedChannelIds.length === channelCount) return "All Channels";
        return `${selectedChannelIds.length} Channel${
            selectedChannelIds.length === 1 ? "" : "s"
        }`;
    };

    return (
        <FilterNavButton onClick={openChannelModal}>
            <Hash className="h-5 w-5" />
            <span>{getChannelButtonText()}</span>
        </FilterNavButton>
    );
}
