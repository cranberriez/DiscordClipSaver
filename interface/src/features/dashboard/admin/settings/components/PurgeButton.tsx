"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Clock } from "lucide-react";

interface PurgeButtonProps {
	/**
	 * Text to display on the button
	 */
	label: string;

	/**
	 * Dialog title
	 */
	title: string;

	/**
	 * Dialog description
	 */
	description: string;

	/**
	 * Text user must type to confirm (e.g., "DELETE GUILD")
	 */
	confirmText: string;

	/**
	 * Function to call when confirmed
	 */
	onConfirm: () => Promise<void>;

	/**
	 * Optional stats to show (e.g., "This will delete 1,234 clips")
	 */
	stats?: string;

	/**
	 * Button variant
	 */
	variant?:
		| "default"
		| "destructive"
		| "outline"
		| "secondary"
		| "ghost"
		| "link";

	/**
	 * Button size
	 */
	size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Reusable purge button with confirmation dialog
 *
 * Features:
 * - Type-to-confirm safety mechanism
 * - Loading states
 * - Error handling
 * - Customizable text and stats
 */
export function PurgeButton({
	label,
	title,
	description,
	confirmText,
	onConfirm,
	stats,
	variant = "destructive",
	size = "default",
}: PurgeButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [cooldownWarning, setCooldownWarning] = useState<string | null>(null);

	const handleConfirm = async () => {
		if (inputValue !== confirmText) {
			setError(`Please type "${confirmText}" to confirm`);
			return;
		}

		setIsLoading(true);
		setError(null);
		setCooldownWarning(null);

		try {
			await onConfirm();
			setIsOpen(false);
			setInputValue("");
		} catch (err: any) {
			const errorMessage = err.message || "Failed to perform operation";

			// Check if this is a cooldown error (contains "cooldown" or "Try again in")
			if (
				errorMessage.toLowerCase().includes("cooldown") ||
				errorMessage.includes("Try again in")
			) {
				setCooldownWarning(errorMessage);
			} else {
				setError(errorMessage);
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handleCancel = () => {
		setIsOpen(false);
		setInputValue("");
		setError(null);
		setCooldownWarning(null);
	};

	const isConfirmEnabled = inputValue === confirmText && !isLoading;

	return (
		<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
			<AlertDialogTrigger asChild>
				<Button variant={variant} size={size}>
					<Trash2 className="mr-2 h-4 w-4" />
					{label}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div className="space-y-4">
							<div>{description}</div>
							{stats && (
								<div className="text-muted-foreground text-sm font-medium">
									{stats}
								</div>
							)}
							<div className="space-y-2">
								<Label htmlFor="confirm-input">
									Type{" "}
									<span className="font-mono font-bold">
										{confirmText}
									</span>{" "}
									to confirm:
								</Label>
								<Input
									id="confirm-input"
									value={inputValue}
									onChange={(e) =>
										setInputValue(e.target.value)
									}
									placeholder={confirmText}
									disabled={isLoading}
									className="font-mono"
								/>
							</div>
							{cooldownWarning && (
								<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
									<Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-500" />
									<div className="text-sm font-medium text-amber-800 dark:text-amber-200">
										{cooldownWarning}
									</div>
								</div>
							)}
							{error && (
								<div className="text-destructive text-sm font-medium">
									{error}
								</div>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel
						onClick={handleCancel}
						disabled={isLoading}
					>
						Cancel
					</AlertDialogCancel>
					<Button
						onClick={(e) => {
							e.preventDefault();
							handleConfirm();
						}}
						disabled={!isConfirmEnabled}
						className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
					>
						{isLoading && (
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						)}
						Confirm Delete
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
