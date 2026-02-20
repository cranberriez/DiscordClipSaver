import { ScanStatus } from "@/lib/api/scan";
import { useEffect, useRef } from "react";

interface ScanStatusNotificationCallbacks {
	onSuccess?: (scans: ScanStatus[]) => void;
	onFailure?: (scans: ScanStatus[]) => void;
	onCancelled?: (scans: ScanStatus[]) => void;
}

export function useScanStatusNotifications(
	scanStatuses: ScanStatus[],
	callbacks: ScanStatusNotificationCallbacks
) {
	const prevRef = useRef<Map<string, string>>(new Map());
	const { onSuccess, onFailure, onCancelled } = callbacks;

	useEffect(() => {
		if (!scanStatuses || scanStatuses.length === 0) return;

		const currMap = new Map(
			scanStatuses.map((s) => [s.channel_id, s.status as string])
		);

		// Seed to skip initial notifications on first load
		if (prevRef.current.size === 0) {
			prevRef.current = currMap;
			return;
		}

		// Batch status changes by type
		const succeeded: ScanStatus[] = [];
		const failed: ScanStatus[] = [];
		const cancelled: ScanStatus[] = [];

		// Detect transitions to terminal states
		for (const scan of scanStatuses) {
			const prevStatus = prevRef.current.get(scan.channel_id);
			const currStatus = scan.status;

			// Only trigger if status actually changed
			if (prevStatus === currStatus) continue;

			// Batch by terminal state type
			if (currStatus === "SUCCEEDED") {
				succeeded.push(scan);
			} else if (currStatus === "FAILED") {
				failed.push(scan);
			} else if (currStatus === "CANCELLED") {
				cancelled.push(scan);
			}
		}

		// Call callbacks with batched results
		if (succeeded.length > 0 && onSuccess) {
			onSuccess(succeeded);
		}
		if (failed.length > 0 && onFailure) {
			onFailure(failed);
		}
		if (cancelled.length > 0 && onCancelled) {
			onCancelled(cancelled);
		}

		// Update the previous state map
		prevRef.current = currMap;
	}, [scanStatuses, onSuccess, onFailure, onCancelled]);
}
