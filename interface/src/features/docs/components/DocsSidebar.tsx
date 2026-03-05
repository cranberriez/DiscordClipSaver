"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { docsNav } from "../lib/docsNav";
import { cn } from "@/lib/utils";

export function DocsSidebar({ onNavigate }: { onNavigate?: () => void }) {
	const pathname = usePathname();

	return (
		<nav className="text-sm">
			{docsNav.map((group) => (
				<div key={group.label} className="mb-6">
					<div className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
						{group.label}
					</div>

					<div className="flex flex-col gap-1">
						{group.items.map((item) => {
							const isActive = pathname === item.href;
							return (
								<Link
									key={item.href}
									href={item.href}
									onClick={() => onNavigate?.()}
									className={cn(
										"hover:bg-muted/50 rounded-md px-2 py-1.5 transition-colors",
										isActive
											? "bg-muted text-foreground font-medium"
											: "text-muted-foreground hover:text-foreground"
									)}
								>
									{item.title}
								</Link>
							);
						})}
					</div>
				</div>
			))}
		</nav>
	);
}
