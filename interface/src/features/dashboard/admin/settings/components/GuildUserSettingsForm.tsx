"use client";

import { useGuildUserSettingsForm } from "@/lib/hooks/useGuildUserSettings";
import { userSettingsMetadata } from "@/lib/schema/guild-user-settings.schema";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import { InvalidatesScansPopover } from "./InvalidatesScansPopover";
import { NotePopover } from "./NotePopover";

interface GuildUserSettingsFormProps {
	guildId: string;
}

export default function GuildUserSettingsForm({
	guildId,
}: GuildUserSettingsFormProps) {
	const {
		settings,
		isLoading,
		isSaving,
		error,
		hasChanges,
		updateSetting,
		save,
		cancel,
	} = useGuildUserSettingsForm(guildId);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await save();
	};

	// Individual loading component for form fields
	const LoadingField = ({ children }: { children: React.ReactNode }) => {
		if (isLoading) {
			return <Skeleton className="h-9 w-full" />;
		}
		return <>{children}</>;
	};

	const LoadingCheckbox = ({ children }: { children: React.ReactNode }) => {
		if (isLoading) {
			return <Skeleton className="h-4 w-4" />;
		}
		return <>{children}</>;
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Error Display */}
			{error && (
				<div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
					<div className="flex items-center gap-2">
						<AlertTriangle className="h-4 w-4 text-red-400" />
						<p className="text-sm text-red-400">{error}</p>
					</div>
				</div>
			)}

			{/* Basic Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Clip Settings</CardTitle>
					<CardDescription>
						Configure how clips are processed and displayed
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Default Visibility */}
					<div className="space-y-2">
						<Label
							htmlFor="default_visibility"
							className="flex items-center gap-2"
						>
							{userSettingsMetadata.default_visibility.label}
							{userSettingsMetadata.default_visibility.note && (
								<NotePopover
									note={
										userSettingsMetadata.default_visibility
											.note
									}
								/>
							)}
						</Label>
						<LoadingField>
							<Select
								value={settings.default_visibility}
								onValueChange={(value) =>
									updateSetting(
										"default_visibility",
										value as any
									)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{userSettingsMetadata.default_visibility.options?.map(
										(option) => (
											<SelectItem
												key={option.value}
												value={option.value}
											>
												{option.label}
											</SelectItem>
										)
									)}
								</SelectContent>
							</Select>
						</LoadingField>
						<p className="text-muted-foreground text-xs">
							{
								userSettingsMetadata.default_visibility
									.description
							}
						</p>
					</div>

					{/* Ignore NSFW Channels */}
					<div className="space-y-2">
						<div className="flex items-center space-x-2">
							<LoadingCheckbox>
								<Checkbox
									id="ignore_nsfw_channels"
									checked={settings.ignore_nsfw_channels}
									onCheckedChange={(checked) =>
										updateSetting(
											"ignore_nsfw_channels",
											!!checked
										)
									}
								/>
							</LoadingCheckbox>
							<Label
								htmlFor="ignore_nsfw_channels"
								className="flex items-center gap-2"
							>
								{
									userSettingsMetadata.ignore_nsfw_channels
										.label
								}
								{userSettingsMetadata.ignore_nsfw_channels
									.invalidates_scans && (
									<InvalidatesScansPopover />
								)}
							</Label>
						</div>
						<p className="text-muted-foreground ml-6 text-xs">
							{
								userSettingsMetadata.ignore_nsfw_channels
									.description
							}
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Advanced Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Advanced Settings</CardTitle>
					<CardDescription>
						Additional configuration options for power users
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Max Clips Per Channel Per Day */}
					<div className="space-y-2">
						<Label
							htmlFor="max_clips_per_channel_per_day"
							className="flex items-center gap-2"
						>
							{
								userSettingsMetadata
									.max_clips_per_channel_per_day.label
							}
							{userSettingsMetadata.max_clips_per_channel_per_day
								.invalidates_scans && (
								<InvalidatesScansPopover />
							)}
						</Label>
						<LoadingField>
							<Input
								id="max_clips_per_channel_per_day"
								type="number"
								min={
									userSettingsMetadata
										.max_clips_per_channel_per_day.min
								}
								max={
									userSettingsMetadata
										.max_clips_per_channel_per_day.max
								}
								value={settings.max_clips_per_channel_per_day}
								onChange={(e) =>
									updateSetting(
										"max_clips_per_channel_per_day",
										parseInt(e.target.value) || 0
									)
								}
							/>
						</LoadingField>
						<p className="text-muted-foreground text-xs">
							{
								userSettingsMetadata
									.max_clips_per_channel_per_day.description
							}
						</p>
					</div>

					{/* Auto Archive After */}
					<div className="space-y-2">
						<Label>Auto Archive After</Label>
						<div className="flex gap-2">
							<LoadingField>
								<Select
									value={settings.auto_archive_after.unit}
									onValueChange={(value) =>
										updateSetting("auto_archive_after", {
											...settings.auto_archive_after,
											unit: value as any,
										})
									}
								>
									<SelectTrigger className="w-32">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="never">
											Never
										</SelectItem>
										<SelectItem value="days">
											Days
										</SelectItem>
										<SelectItem value="weeks">
											Weeks
										</SelectItem>
										<SelectItem value="months">
											Months
										</SelectItem>
									</SelectContent>
								</Select>
							</LoadingField>
							{settings.auto_archive_after.unit !== "never" && (
								<LoadingField>
									<Input
										type="number"
										min={1}
										value={
											settings.auto_archive_after.count
										}
										onChange={(e) =>
											updateSetting(
												"auto_archive_after",
												{
													...settings.auto_archive_after,
													count:
														parseInt(
															e.target.value
														) || 0,
												}
											)
										}
										className="w-20"
									/>
								</LoadingField>
							)}
						</div>
						<p className="text-muted-foreground text-xs">
							{
								userSettingsMetadata.auto_archive_after
									.description
							}
						</p>
					</div>

					{/* Live Scan Slow Mode */}
					<div className="space-y-4">
						<div className="flex items-center space-x-2">
							<LoadingCheckbox>
								<Checkbox
									id="live_scan_slow_mode_enabled"
									checked={
										settings.live_scan_slow_mode.enabled
									}
									onCheckedChange={(checked) =>
										updateSetting("live_scan_slow_mode", {
											...settings.live_scan_slow_mode,
											enabled: !!checked,
										})
									}
								/>
							</LoadingCheckbox>
							<Label
								htmlFor="live_scan_slow_mode_enabled"
								className="flex items-center gap-2"
							>
								Enable Live Scan Slow Mode
								{userSettingsMetadata.live_scan_slow_mode
									.invalidates_scans && (
									<InvalidatesScansPopover />
								)}
							</Label>
						</div>

						{settings.live_scan_slow_mode.enabled && (
							<div className="ml-6 space-y-2">
								<Label htmlFor="delay_seconds">
									Delay (seconds)
								</Label>
								<LoadingField>
									<Input
										id="delay_seconds"
										type="number"
										min={1}
										value={
											settings.live_scan_slow_mode
												.delay_seconds
										}
										onChange={(e) =>
											updateSetting(
												"live_scan_slow_mode",
												{
													...settings.live_scan_slow_mode,
													delay_seconds:
														parseInt(
															e.target.value
														) || 30,
												}
											)
										}
										className="w-24"
									/>
								</LoadingField>
							</div>
						)}

						<p className="text-muted-foreground ml-6 text-xs">
							{
								userSettingsMetadata.live_scan_slow_mode
									.description
							}
						</p>
					</div>
				</CardContent>
			</Card>

			{/* Action Buttons */}
			<div className="flex items-center gap-3">
				<Button
					type="submit"
					disabled={!hasChanges || isSaving}
					className="min-w-24"
				>
					{isSaving ? "Saving..." : "Save Changes"}
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={cancel}
					disabled={!hasChanges || isSaving}
				>
					Cancel Changes
				</Button>
				{hasChanges && (
					<span className="text-sm text-orange-400">
						• Unsaved changes
					</span>
				)}
			</div>
		</form>
	);
}
