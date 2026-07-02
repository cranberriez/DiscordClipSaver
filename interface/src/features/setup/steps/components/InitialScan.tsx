"use client";

import { Step } from "./Step";
import { Button } from "@/components/ui/button";
import type { SetupFlow } from "../../hooks/useSetupFlow";

export function InitialScan({ scan }: { scan: SetupFlow["scan"] }) {
	const { stats } = scan;

	const getStepContent = () => {
		if (scan.state === "loading") {
			if (!scan.scanStarted) {
				return (
					<div className="space-y-2">
						<p className="text-sm font-medium">
							Starting initial scan...
						</p>
						<div className="text-muted-foreground text-xs">
							Preparing to scan {scan.missingCount} channels...
						</div>
						{scan.alreadyScannedCount > 0 && (
							<div className="text-muted-foreground text-xs">
								({scan.alreadyScannedCount} channels already
								scanned)
							</div>
						)}
					</div>
				);
			}

			return (
				<div className="space-y-3">
					<p className="text-sm font-medium">
						Initial scan in progress...
					</p>

					<div className="grid grid-cols-2 gap-4 text-sm">
						<div className="space-y-1">
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									Queued:
								</span>
								<span className="font-medium">
									{stats.queued}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									Running:
								</span>
								<span className="font-medium text-blue-600">
									{stats.running}
								</span>
							</div>
						</div>
						<div className="space-y-1">
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									Completed:
								</span>
								<span className="font-medium text-green-600">
									{stats.completed}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									Failed:
								</span>
								<span className="font-medium text-red-600">
									{stats.failed}
								</span>
							</div>
						</div>
					</div>

					<div className="h-2 w-full rounded-full bg-gray-200">
						<div
							className="h-2 rounded-full bg-blue-600 transition-all duration-300"
							style={{
								width: `${
									stats.total > 0
										? ((stats.completed + stats.failed) /
												stats.total) *
											100
										: 0
								}%`,
							}}
						/>
					</div>

					<div className="text-muted-foreground text-xs">
						Progress: {stats.completed + stats.failed} /{" "}
						{stats.total} channels
					</div>
				</div>
			);
		}

		if (scan.state === "success") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-green-600">
						Initial scan completed successfully!
					</p>
					<div className="text-sm">
						<span className="font-semibold">
							{scan.scannableCount}
						</span>{" "}
						channels processed.
					</div>
					<div className="text-muted-foreground text-xs">
						Your clip database is now ready for use.
					</div>
				</div>
			);
		}

		if (scan.state === "need_action") {
			return (
				<div className="space-y-3">
					<p className="text-sm font-medium text-yellow-600">
						Some channels failed to scan
					</p>

					<div className="text-sm">
						<span className="font-semibold text-green-600">
							{stats.completed}
						</span>{" "}
						succeeded,{" "}
						<span className="font-semibold text-red-600">
							{stats.failed}
						</span>{" "}
						failed
					</div>

					{scan.failedScans.length > 0 && (
						<div className="space-y-2">
							<div className="text-xs font-medium">
								Failed channels:
							</div>
							<div className="max-h-32 space-y-1 overflow-y-auto">
								{scan.failedScans.map((s) => (
									<div
										key={s.channel_id}
										className="rounded bg-red-50 p-2 text-xs"
									>
										<div className="font-medium">
											#{scan.getChannelName(s.channel_id)}
										</div>
										{s.error_message && (
											<div className="mt-1 text-red-600">
												{s.error_message}
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					<div className="flex gap-2">
						<Button
							onClick={scan.retryFailed}
							disabled={scan.isPending}
							size="sm"
						>
							Retry Failed Channels
						</Button>
						<Button
							onClick={scan.continueAnyway}
							variant="outline"
							size="sm"
						>
							Continue Anyway
						</Button>
					</div>
				</div>
			);
		}

		if (scan.state === "error") {
			return (
				<div className="space-y-2">
					<p className="text-sm font-medium text-red-600">
						Failed to start initial scan
					</p>
					{scan.error && (
						<div className="rounded bg-red-50 p-2 text-xs text-red-500">
							{scan.error}
						</div>
					)}
					<Button
						onClick={scan.retryMissing}
						disabled={scan.isPending}
						size="sm"
					>
						Retry
					</Button>
				</div>
			);
		}

		// state === null (waiting on previous steps)
		if (scan.alreadyScannedCount > 0 && scan.missingCount === 0) {
			return (
				<div className="space-y-2">
					<p className="text-muted-foreground text-sm">
						All scannable channels have already been scanned,
						skipping initial scan.
					</p>
					<div className="text-sm">
						<span className="font-semibold">
							{scan.alreadyScannedCount}
						</span>{" "}
						/ {scan.scannableCount} channels already scanned
					</div>
				</div>
			);
		}

		return (
			<div className="space-y-2">
				<p className="text-muted-foreground text-sm">
					We&apos;ll scan all channels to discover existing clips and
					set up the initial database.
				</p>
				{scan.alreadyScannedCount > 0 && (
					<div className="text-sm">
						<span className="font-semibold">
							{scan.alreadyScannedCount}
						</span>{" "}
						/ {scan.scannableCount} channels already scanned
					</div>
				)}
				<div className="text-muted-foreground space-y-1 text-xs">
					<div>
						• Scan{" "}
						{scan.missingCount || scan.scannableCount} channels for
						clips
					</div>
					<div>• Process up to 500 messages per channel</div>
					<div>• Build initial clip database</div>
					<div>• Category channels automatically ignored</div>
				</div>
			</div>
		);
	};

	return (
		<Step title="Initial Scan" state={scan.state}>
			{getStepContent()}
		</Step>
	);
}
