"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";
import { User } from "next-auth";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout";

export function Navbar() {
	const { data: session } = useSession();

	return (
		<nav
			className="bg-background z-50 border-b border-white/10"
			style={{ height: "var(--navbar-height)" }}
		>
			<PageContainer className="h-full">
				<div className="flex h-full items-center justify-between">
					{/* Logo/Brand */}
					<Link
						href="/"
						className="hover:text-primary text-xl font-bold transition-colors"
					>
						Guild Moments
					</Link>

					{/* Navigation Links */}
					<div className="flex items-center gap-6">
						{session && (
							<>
								<Link
									href="/clips"
									className="hover:text-primary text-sm font-medium transition-colors"
								>
									Clips
								</Link>
								<Link
									href="/dashboard"
									className="hover:text-primary text-sm font-medium transition-colors"
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
