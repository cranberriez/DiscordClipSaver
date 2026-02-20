import type { Channel } from "@/lib/api/channel";
import type { ScanStatus } from "@/lib/api/scan";

export interface ChannelWithStatus extends Channel {
	scanStatus: ScanStatus | null;
}
