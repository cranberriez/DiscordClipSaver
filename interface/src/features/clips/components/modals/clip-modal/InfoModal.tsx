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
                <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    className="fixed left-[50%] top-[50%] z-[60] translate-x-[-50%] translate-y-[-50%] w-full max-w-3xl max-h-[85vh] bg-background rounded-lg border shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    onEscapeKeyDown={e => {
                        e.preventDefault();
                        onOpenChange(false);
                    }}
                >
                    <div className="flex flex-col h-full max-h-[85vh]">
                        <div className="flex items-center justify-between p-6 border-b">
                            <DialogPrimitive.Title className="text-lg font-semibold">
                                Clip Information
                            </DialogPrimitive.Title>
                            <button
                                onClick={() => onOpenChange(false)}
                                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
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
                                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                                        Message Information
                                    </h3>
                                    <div className="space-y-2 text-sm">
                                        <div>
                                            <span className="text-muted-foreground block mb-1">
                                                Message ID:
                                            </span>
                                            <code className="bg-muted px-2 py-1 rounded text-xs block">
                                                {message.id}
                                            </code>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-1">
                                                Author ID:
                                            </span>
                                            <code className="bg-muted px-2 py-1 rounded text-xs block">
                                                {message.author_id}
                                            </code>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block mb-1">
                                                Timestamp:
                                            </span>
                                            <span className="font-medium">
                                                {formatDate(message.created_at)}
                                            </span>
                                        </div>
                                        {message.content && (
                                            <div>
                                                <span className="text-muted-foreground block mb-1">
                                                    Content:
                                                </span>
                                                <p className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                                                    {message.content}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                                        Thumbnail
                                    </h3>
                                    <div className="flex gap-2">
                                        {thumbnail ? (
                                            thumbnail.map(t => (
                                                <Badge
                                                    variant="secondary"
                                                    key={t.size}
                                                >
                                                    {t.size} ({t.width}x
                                                    {t.height})
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-sm text-muted-foreground">
                                                No thumbnail available
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <details className="text-sm">
                                        <summary className="font-semibold cursor-pointer text-sm uppercase tracking-wide text-muted-foreground mb-2">
                                            Raw Metadata (JSON)
                                        </summary>
                                        <pre className="mt-2 bg-muted p-4 rounded overflow-x-auto text-xs">
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
