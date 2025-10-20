"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Guild } from "@/lib/api/types";

export default function ClipsPage() {
    const router = useRouter();
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGuilds();
    }, []);

    const fetchGuilds = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/guilds");
            if (!response.ok) throw new Error("Failed to fetch guilds");
            const data = await response.json();
            setGuilds(data.guilds);
        } catch (error) {
            console.error("Error fetching guilds:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGuildClick = (guildId: string) => {
        router.push(`/clips/${guildId}`);
    };

    return (
        <div className="container mx-auto py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Clips Viewer</h1>
                <p className="text-muted-foreground mt-2">
                    Select a server to browse clips
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Servers</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            Loading servers...
                        </div>
                    ) : guilds.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No servers found with clips
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {guilds.map(guild => (
                                <Button
                                    key={guild.id}
                                    variant="outline"
                                    className="h-auto py-6 justify-start"
                                    onClick={() => handleGuildClick(guild.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        {guild.icon_url && (
                                            <img
                                                src={guild.icon_url}
                                                alt={guild.name}
                                                className="w-10 h-10 rounded-full"
                                            />
                                        )}
                                        <span className="font-medium text-lg">
                                            {guild.name}
                                        </span>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
