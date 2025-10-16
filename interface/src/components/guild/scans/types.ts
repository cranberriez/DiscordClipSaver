export interface ChannelWithStatus {
    channelId: string;
    channelName: string;
    messageScanEnabled: boolean;
    status: string | null;
    messageCount: number;
    totalMessagesScanned: number;
    updatedAt: Date | null;
    errorMessage: string | null;
}
