"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "./UserMenu";
import { User } from "next-auth";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout";
import { TvMinimal, LayoutDashboard, Clapperboard } from "lucide-react";
import { NavLinkItem } from "@/components/core";
import { HeroNavIconGradient } from "@/components/core/HeroNavIconGradient";
import { cn } from "@/lib/utils";

export function Navbar({
	containerClassName,
	className,
}: {
	containerClassName?: string;
	className?: string;
}) {
	const { data: session, status } = useSession();

	return (
		<PageContainer className={cn("mt-2 py-0!", containerClassName)}>
			<HeroNavIconGradient />
			<div
				className={cn(
					"flex items-center justify-between border border-transparent p-2 px-4 pr-2",
					className
				)}
			>
				{/* Logo/Brand */}
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm font-bold transition-colors md:text-lg"
				>
					<Clapperboard className="stroke-[url(#hero-nav-icon-gradient)]" />
					<span>Guild Moments</span>
				</Link>

				{/* Navigation Links */}
				<div className="flex items-center md:gap-4">
					{session || status === "loading" ? (
						<>
							<NavLinkItem
								href="/clips"
								text="Clips"
								icon={<TvMinimal className="h-4 w-4" />}
								className="text-xs font-medium transition-colors"
							/>
							<NavLinkItem
								href="/dashboard"
								text="Dashboard"
								icon={<LayoutDashboard className="h-4 w-4" />}
								className="text-xs font-medium transition-colors"
							/>
							<UserMenu user={session?.user as User} />
						</>
					) : (
						<Button asChild>
							<Link
								href="/login"
								className="hover:bg-primary-hover! h-8! rounded-full! text-xs"
							>
								Sign In
							</Link>
						</Button>
					)}
				</div>
			</div>
		</PageContainer>
	);
}
