"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";
import { User } from "next-auth";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout";

export function Navbar({ noLines = false }: { noLines?: boolean }) {
    const { data: session } = useSession();

    return (
        <nav 
            className="border-b border-white/10 bg-background"
            style={{ height: 'var(--navbar-height)' }}
        >
            <PageContainer noLines={noLines} className="h-full">
                <div className="flex items-center justify-between h-full">
                    {/* Logo/Brand */}
                    <Link
                        href="/"
                        className="text-xl font-bold hover:text-blue-400 transition-colors"
                    >
                        Discord Clip Saver
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-6">
                        {session && (
                            <>
                                <Link
                                    href="/clips"
                                    className="text-sm font-medium hover:text-blue-400 transition-colors"
                                >
                                    Clips
                                </Link>
                                <Link
                                    href="/dashboard"
                                    className="text-sm font-medium hover:text-blue-400 transition-colors"
                                >
                                    Dashboard
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
            </PageContainer>
        </nav>
    );
}
