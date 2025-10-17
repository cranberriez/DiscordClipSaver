import React from "react";
import {
    Hash,
    Volume2,
    MessageSquare,
    Folder,
} from "lucide-react";
import type { ChannelType } from "@/lib/db/types";

export interface ChannelTypeConfig {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    order: number;
}

/**
 * Channel type configuration with labels, icons, and display order
 */
export const CHANNEL_TYPE_CONFIG: Record<ChannelType, ChannelTypeConfig> = {
    text: {
        label: "Text Channels",
        icon: Hash,
        order: 1,
    },
    voice: {
        label: "Voice Channels",
        icon: Volume2,
        order: 2,
    },
    forum: {
        label: "Forum Channels",
        icon: MessageSquare,
        order: 3,
    },
    category: {
        label: "Categories",
        icon: Folder,
        order: 4,
    },
};

/**
 * Type constraint for objects that have a channel type property
 */
type HasChannelType = { type: ChannelType; [key: string]: any };

/**
 * Groups channels by type and sorts them alphabetically within each group.
 * Works with any object that has a `type` property of type `ChannelType`.
 * 
 * @param channels - Array of channel objects with a `type` property
 * @param sortBy - Optional property name to sort by (defaults to alphabetical by index)
 * @returns Record of channel types to arrays of channels
 * 
 * @example
 * ```tsx
 * const grouped = groupChannelsByType(channels, 'name');
 * // Returns: { text: [...], voice: [...], forum: [...], category: [...] }
 * ```
 */
export function groupChannelsByType<T extends HasChannelType>(
    channels: T[],
    sortBy?: keyof T
): Record<ChannelType, T[]> {
    const groups: Record<ChannelType, T[]> = {
        text: [],
        voice: [],
        forum: [],
        category: [],
    };

    // Group channels by type
    channels.forEach(channel => {
        groups[channel.type].push(channel);
    });

    // Sort each group
    Object.keys(groups).forEach(type => {
        const channelType = type as ChannelType;
        groups[channelType].sort((a, b) => {
            if (sortBy) {
                const aVal = a[sortBy];
                const bVal = b[sortBy];
                
                // String comparison
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return aVal.localeCompare(bVal);
                }
                
                // Number comparison
                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return aVal - bVal;
                }
            }
            
            // Default: maintain original order
            return 0;
        });
    });

    return groups;
}

/**
 * Gets channel types sorted by their configured display order
 * 
 * @returns Array of channel types in display order
 */
export function getSortedChannelTypes(): ChannelType[] {
    return (Object.keys(CHANNEL_TYPE_CONFIG) as ChannelType[]).sort(
        (a, b) => CHANNEL_TYPE_CONFIG[a].order - CHANNEL_TYPE_CONFIG[b].order
    );
}

/**
 * Renders a channel type header with icon and label
 * 
 * @param type - The channel type
 * @returns JSX element with icon and label
 */
export function ChannelTypeHeader({ type }: { type: ChannelType }) {
    const config = CHANNEL_TYPE_CONFIG[type];
    const Icon = config.icon;

    return (
        <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm text-muted-foreground">
                {config.label}
            </span>
        </div>
    );
}
