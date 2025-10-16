import type { ChannelType } from "@/lib/db/types";

// Re-export for convenience
export type { ChannelType };

export interface ChannelWithStatus {
    channelId: string;
    channelName: string;
    channelType: ChannelType;
    messageScanEnabled: boolean;
    status: string | null;
    messageCount: number;
    totalMessagesScanned: number;
    updatedAt: Date | null;
    errorMessage: string | null;
}
