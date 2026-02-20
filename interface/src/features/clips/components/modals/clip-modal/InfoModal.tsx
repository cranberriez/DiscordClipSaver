"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { FullClip } from "@/lib/api/clip";
import { formatDuration } from "@/lib/utils/time-helpers";

interface InfoModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	clip: FullClip["clip"];
	message: FullClip["message"];
	thumbnail?: FullClip["thumbnail"] | null;
	initialClip: FullClip;
}

export function InfoModal({
	open,
	onOpenChange,
	clip,
	message,
	thumbnail,
	initialClip,
}: InfoModalProps) {
	const formatDate = (date: Date | string): string =>
		new Date(date).toLocaleString();
	const formatFileSize = (bytes: bigint | number): string => {
		const size = Number(bytes);
		if (size < 1024) return `${size} B`;
		if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
		return `${(size / (1024 * 1024)).toFixed(1)} MB`;
	};

	return (
		<DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[60] bg-black/80" />
				<DialogPrimitive.Content
					className="bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[60] max-h-[85vh] w-full max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-lg border shadow-lg"
					onEscapeKeyDown={(e) => {
						e.preventDefault();
						onOpenChange(false);
					}}
				>
					<div className="flex h-full max-h-[85vh] flex-col">
						<div className="flex items-center justify-between border-b p-6">
							<DialogPrimitive.Title className="text-lg font-semibold">
								Clip Information
							</DialogPrimitive.Title>
							<button
								onClick={() => onOpenChange(false)}
								className="ring-offset-background focus:ring-ring rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
							>
								<X className="h-4 w-4" />
								<span className="sr-only">Close</span>
							</button>
						</div>

						<div className="flex-1 overflow-y-auto p-6">
							<div className="space-y-6">
								<div>
									<h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
										Clip Information
									</h3>
									<div className="space-y-2 text-sm">
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												File Size:
											</span>
											<span className="font-medium">
												{formatFileSize(clip.file_size)}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Resolution:
											</span>
											<span className="font-medium">
												{clip.resolution || "Unknown"}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Duration:
											</span>
											<span className="font-medium">
												{clip.duration
													? formatDuration(
															clip.duration
														)
													: "Unknown"}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												MIME Type:
											</span>
											<span className="font-medium">
												{clip.mime_type}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Created:
											</span>
											<span className="font-medium">
												{formatDate(clip.created_at)}
											</span>
										</div>
										<div className="flex justify-between">
											<span className="text-muted-foreground">
												Expires:
											</span>
											<span className="font-medium">
												{formatDate(clip.expires_at)}
											</span>
										</div>
									</div>
								</div>

								<div>
									<h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
										Message Information
									</h3>
									<div className="space-y-2 text-sm">
										<div>
											<span className="text-muted-foreground mb-1 block">
												Message ID:
											</span>
											<code className="bg-muted block rounded px-2 py-1 text-xs">
												{message.id}
											</code>
										</div>
										<div>
											<span className="text-muted-foreground mb-1 block">
												Author ID:
											</span>
											<code className="bg-muted block rounded px-2 py-1 text-xs">
												{message.author_id}
											</code>
										</div>
										<div>
											<span className="text-muted-foreground mb-1 block">
												Timestamp:
											</span>
											<span className="font-medium">
												{formatDate(message.created_at)}
											</span>
										</div>
										{message.content && (
											<div>
												<span className="text-muted-foreground mb-1 block">
													Content:
												</span>
												<p className="bg-muted rounded p-2 text-xs whitespace-pre-wrap">
													{message.content}
												</p>
											</div>
										)}
									</div>
								</div>

								<div>
									<h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
										Thumbnail
									</h3>
									<div className="flex gap-2">
										{thumbnail ? (
											thumbnail.map((t) => (
												<Badge
													variant="secondary"
													key={t.size}
												>
													{t.size} ({t.width}x
													{t.height})
												</Badge>
											))
										) : (
											<span className="text-muted-foreground text-sm">
												No thumbnail available
											</span>
										)}
									</div>
								</div>

								<div>
									<details className="text-sm">
										<summary className="text-muted-foreground mb-2 cursor-pointer text-sm font-semibold tracking-wide uppercase">
											Raw Metadata (JSON)
										</summary>
										<pre className="bg-muted mt-2 overflow-x-auto rounded p-4 text-xs">
											{JSON.stringify(
												initialClip,
												null,
												2
											)}
										</pre>
									</details>
								</div>
							</div>
						</div>
					</div>
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}
