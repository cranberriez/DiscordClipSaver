"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/layout/user-menu";
import { User } from "next-auth";

export function Navbar() {
    const { data: session } = useSession();

    return (
        <nav className="border-b border-white/10 bg-black/20 backdrop-blur-sm">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
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
                            <Link
                                href="/dashboard"
                                className="text-sm font-medium hover:text-blue-400 transition-colors"
                            >
                                Dashboard
                            </Link>
                        )}

                        {/* User Menu */}
                        {session ? (
                            <UserMenu user={session.user as User} />
                        ) : (
                            <Link
                                href="/login"
                                className="text-sm font-medium px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 transition-colors"
                            >
                                Sign In
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
