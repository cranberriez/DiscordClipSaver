"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGuilds } from "@/lib/hooks";
import { PageContainer } from "@/components/layout";

/**
 * Clips Viewer - Guild Selection
 *
 * Shows all guilds that:
 * 1. The bot is in (has database entry)
 * 2. The user has access to (Discord permissions)
 *
 * Uses the existing useGuilds() hook which returns guilds from the database
 * that the user has Discord access to.
 */
export default function ClipsPage() {
    const router = useRouter();
    const { data: guilds, isLoading, error } = useGuilds();

    const handleGuildClick = (guildId: string) => {
        router.push(`/clips/${guildId}`);
    };

    return (
        <PageContainer>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Clips Viewer</h1>
                <p className="text-muted-foreground mt-2">
                    Browse and watch clips from your Discord servers
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Select a Server</CardTitle>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <div className="text-center py-12 text-destructive">
                            Error loading servers. Please try again.
                        </div>
                    ) : isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Loading servers...
                        </div>
                    ) : !guilds || guilds.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No servers found.</p>
                            <p className="text-sm mt-2">
                                Make sure the bot is added to your server and
                                has scanned some clips.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {guilds.map(guild => (
                                <Button
                                    key={guild.id}
                                    variant="outline"
                                    className="h-auto py-6 justify-start hover:bg-accent"
                                    onClick={() => handleGuildClick(guild.id)}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        {guild.icon_url ? (
                                            <img
                                                src={guild.icon_url}
                                                alt={guild.name}
                                                className="w-12 h-12 rounded-full flex-shrink-0"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <span className="text-xl font-bold text-primary">
                                                    {guild.name
                                                        .charAt(0)
                                                        .toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                        <span className="font-medium text-lg truncate">
                                            {guild.name}
                                        </span>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageContainer>
    );
}
