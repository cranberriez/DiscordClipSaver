"use client";

import type { Guild } from "@/lib/api/guild";
import { Step } from "./Step";
import { useScanStatuses } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play, Settings, BarChart3 } from "lucide-react";
import Link from "next/link";

export function SetupComplete({ guild }: { guild: Guild }) {
    const { data: scanStatuses = [] } = useScanStatuses(guild.id);

    // Calculate statistics from scan data
    const totalMessagesScanned = scanStatuses.reduce(
        (sum, status) => sum + (status.message_count || 0),
        0
    );
    const channelsScanned = scanStatuses.filter(
        s => s.status === "SUCCEEDED"
    ).length;
    const totalChannels = scanStatuses.length;
    const successRate =
        totalChannels > 0
            ? Math.round((channelsScanned / totalChannels) * 100)
            : 0;

    return (
        <Step title="Setup Complete" state="success">
            <div className="space-y-6">
                {/* Success Message */}
                <div className="text-center space-y-2">
                    <div className="text-4xl">🎉</div>
                    <h3 className="text-lg font-semibold text-green-600">
                        Your server is all set up!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {guild.name} is now ready to automatically scan and
                        organize your clips.
                    </p>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-foreground/5 rounded-lg">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {totalMessagesScanned.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Messages Scanned
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {channelsScanned}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Channels Processed
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                            {successRate}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Success Rate
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Link href={`/clips?guild=${guild.id}`}>
                            <Button className="w-full cursor-pointer" size="lg">
                                <Play className="w-4 h-4 mr-2" />
                                View Clips
                            </Button>
                        </Link>
                        <Link href={`/dashboard/${guild.id}`}>
                            <Button
                                variant="outline"
                                className="w-full cursor-pointer"
                                size="lg"
                            >
                                <Settings className="w-4 h-4 mr-2" />
                                Server Dashboard
                            </Button>
                        </Link>
                    </div>

                    {/* Additional Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Link href={`/dashboard/${guild.id}/scans`}>
                            <Button
                                variant="ghost"
                                className="w-full cursor-pointer"
                                size="sm"
                            >
                                <BarChart3 className="w-4 h-4 mr-2" />
                                Scan Management
                            </Button>
                        </Link>
                        <Link href="/help/getting-started" target="_blank">
                            <Button
                                variant="ghost"
                                className="w-full cursor-pointer"
                                size="sm"
                            >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Getting Started Guide
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Next Steps */}
                <div className="space-y-3 p-4 bg-blue-900/20 rounded-lg border border-blue-900/10">
                    <h4 className="font-bold text-blue-300">
                        What&apos;s Next?
                    </h4>
                    <ul className="space-y-2 text-sm text-blue-100">
                        <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-100 rounded-full mt-2 flex-shrink-0"></div>
                            <span>
                                <strong>Automatic Scanning:</strong> New
                                messages will be automatically scanned for clips
                                as they&apos;re posted
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-100 rounded-full mt-2 flex-shrink-0"></div>
                            <span>
                                <strong>Clip Organization:</strong> Use the
                                clips viewer to browse, search, and organize
                                your discovered clips
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-100 rounded-full mt-2 flex-shrink-0"></div>
                            <span>
                                <strong>Channel Management:</strong> Configure
                                which channels to scan in the dashboard settings
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-100 rounded-full mt-2 flex-shrink-0"></div>
                            <span>
                                <strong>Regular Updates:</strong> Run periodic
                                scans to catch any missed messages
                            </span>
                        </li>
                    </ul>
                </div>

                {/* Support Info */}
                <div className="text-center text-xs text-muted-foreground">
                    Need help? Talk to us on our{" "}
                    {/* TODO: Replace with actual support link */}
                    <Link href="#" className="text-blue-600 hover:underline">
                        Discord Server
                    </Link>
                </div>
            </div>
        </Step>
    );
}
