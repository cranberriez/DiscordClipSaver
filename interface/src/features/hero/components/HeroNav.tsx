"use client";

import { PageContainer } from "@/components/layout";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/composite/UserMenu";
import { Button } from "@/components/ui/button";
import { User } from "next-auth";
import { LayoutDashboard, TvMinimal, Clapperboard } from "lucide-react";

export function HeroNav() {
	const { data: session } = useSession();

	return (
		<PageContainer className="sticky top-2 z-99 py-0!">
			<svg
				aria-hidden="true"
				className="absolute h-0 w-0"
				focusable={false}
				xmlns="http://www.w3.org/2000/svg"
			>
				<defs>
					<linearGradient
						id="hero-nav-icon-gradient"
						x1="0%"
						y1="0%"
						x2="100%"
						y2="0%"
					>
						<stop offset="0%" stopColor="#818cf8" />
						<stop offset="50%" stopColor="#c084fc" />
						<stop offset="100%" stopColor="#818cf8" />
					</linearGradient>
				</defs>
			</svg>
			<div className="bg-sidebar/50 border-border/25 flex items-center justify-between rounded-full border p-2 pl-7 backdrop-blur-sm">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm font-bold transition-colors md:text-lg"
				>
					<Clapperboard className="stroke-[url(#hero-nav-icon-gradient)]" />
					<span>Guild Moments</span>
				</Link>
				<div className="flex items-center md:gap-4">
					{/* User Menu */}
					{session ? (
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
							<UserMenu user={session.user as User} />
						</>
					) : (
						<Button asChild>
							<Link
								href="/login"
								className="hover:bg-primary-hover! rounded-full! text-xs"
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

type NavLinkItemProps = {
	href: string;
	text: string;
	icon: React.ReactNode;
	className?: string;
};

export function NavLinkItem({ href, text, icon, className }: NavLinkItemProps) {
	return (
		<Link
			href={href}
			className={[
				"inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
				"text-foreground/80 hover:text-secondary-foreground group",
				"focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
				className ?? "",
			].join(" ")}
			aria-label={text}
			title={text}
		>
			<span className="group-hover:text-primary mt-[0.5px] shrink-0">
				{icon}
			</span>

			{/* Hide text at/under sm, show from md up */}
			<span className="hidden md:inline">{text}</span>
		</Link>
	);
}
