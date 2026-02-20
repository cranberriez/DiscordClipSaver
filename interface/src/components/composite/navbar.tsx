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
			className="bg-background z-50 border-b border-white/10"
			style={{ height: "var(--navbar-height)" }}
		>
			<PageContainer noLines={noLines} className="h-full">
				<div className="flex h-full items-center justify-between">
					{/* Logo/Brand */}
					<Link
						href="/"
						className="text-xl font-bold transition-colors hover:text-blue-400"
					>
						Discord Clip Saver
					</Link>

					{/* Navigation Links */}
					<div className="flex items-center gap-6">
						{session && (
							<>
								<Link
									href="/clips"
									className="text-sm font-medium transition-colors hover:text-blue-400"
								>
									Clips
								</Link>
								<Link
									href="/dashboard"
									className="text-sm font-medium transition-colors hover:text-blue-400"
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
