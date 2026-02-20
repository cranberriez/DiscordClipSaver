import { ScanStatus } from "@/lib/api/scan";
import { DbChannelScanStatus } from "../db/types";
import { StatusEnum } from "@/lib/api/scan";

export class ScanMapper {
	static toScanStatus(dbScanStatus: DbChannelScanStatus): ScanStatus {
		return {
			guild_id: dbScanStatus.guild_id,
			channel_id: dbScanStatus.channel_id,
			status: dbScanStatus.status as StatusEnum,
			message_count: dbScanStatus.message_count ?? 0,
			total_messages_scanned: dbScanStatus.total_messages_scanned ?? 0,
			forward_message_id: dbScanStatus.forward_message_id ?? null,
			backward_message_id: dbScanStatus.backward_message_id ?? null,
			error_message: dbScanStatus.error_message ?? null,
			created_at: dbScanStatus.created_at,
			updated_at: dbScanStatus.updated_at,
			deleted_at: dbScanStatus.deleted_at ?? null,
		};
	}
}
