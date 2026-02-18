"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";
import { User } from "next-auth";
import { Button } from "@/components/ui/button";
import { Home, TvMinimal, LayoutDashboard } from "lucide-react";

export function NavbarCompact() {
    const { data: session } = useSession();

    return (
        <nav>
            <div className="flex items-center justify-between h-full gap-2 sm:gap-4 text-muted-foreground">
                {/* Logo/Brand */}
                <Link
                    href="/"
                    className="text-lg font-bold hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-background/50"
                >
                    <Home />
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center gap-2 sm:gap-4">
                    {session && (
                        <>
                            <Link
                                href="/clips"
                                className="text-sm font-medium hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-background/50"
                            >
                                <TvMinimal />
                            </Link>
                            <Link
                                href="/dashboard"
                                className="text-sm font-medium hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-background/50"
                            >
                                <LayoutDashboard />
                            </Link>
                        </>
                    )}

                    {/* User Menu */}
                    {session ? (
                        <UserMenu user={session.user as User} />
                    ) : (
                        <Button asChild>
                            <Link href="/login">Sign In</Link>
                        </Button>
                    )}
                </div>
            </div>
        </nav>
    );
}
