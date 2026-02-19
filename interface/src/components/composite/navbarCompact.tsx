"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";
import { User } from "next-auth";
import { Button } from "@/components/ui/button";
import { Home, TvMinimal, LayoutDashboard, Settings } from "lucide-react";
import { useUser } from "@/lib/hooks/useUser";
import { useGuild } from "@/lib/hooks/useGuilds";
import { useClipFiltersStore } from "@/features/clips/stores/useClipFiltersStore";
import { usePathname } from "next/navigation";

export function NavbarCompact() {
	const { data: session } = useSession();
	const pathname = usePathname();
	const isClipsPage = pathname === "/clips";

	const { data: userData } = useUser();
	const user = userData?.database;

	const { selectedGuildId } = useClipFiltersStore();
	const { data: guild } = useGuild(selectedGuildId || "");
	const isGuildOwner = !!selectedGuildId && user?.id === guild?.owner_id;

	return (
		<nav>
			<div className="text-muted-foreground flex h-full items-center justify-between gap-2 sm:gap-4">
				{/* Logo/Brand */}
				<Link
					href="/"
					className="hover:bg-background/50 rounded-lg p-2 text-lg font-bold transition-colors hover:text-blue-400"
				>
					<Home />
				</Link>

				{/* Navigation Links */}
				<div className="flex items-center gap-2 sm:gap-4">
					{session && (
						<>
							<Link
								href="/clips"
								className="hover:bg-background/50 rounded-lg p-2 text-sm font-medium transition-colors hover:text-blue-400"
							>
								<TvMinimal />
							</Link>
							<Link
								href="/dashboard"
								className="hover:bg-background/50 rounded-lg p-2 text-sm font-medium transition-colors hover:text-blue-400"
							>
								<LayoutDashboard />
							</Link>

							{isClipsPage && selectedGuildId && (
								<Link
									href={`/dashboard/${selectedGuildId}`}
									className={`hover:bg-background/50 rounded-lg p-2 text-sm font-medium transition-colors hover:text-blue-400 ${isGuildOwner ? "" : "pointer-events-none invisible"}`}
									title={
										isGuildOwner
											? "Open server dashboard"
											: undefined
									}
									aria-hidden={!isGuildOwner}
									tabIndex={isGuildOwner ? 0 : -1}
								>
									<Settings />
								</Link>
							)}
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
