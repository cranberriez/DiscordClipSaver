"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { docsNav } from "../lib/docsNav";
import { DocsSidebar } from "./DocsSidebar";

function findActiveTitle(pathname: string): string | null {
	for (const group of docsNav) {
		for (const item of group.items) {
			if (item.href === pathname) return item.title;
		}
	}
	return null;
}

export function DocsMobileNav() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);

	const activeTitle = useMemo(() => {
		return findActiveTitle(pathname) ?? "Docs";
	}, [pathname]);

	return (
		<div className="border-border/40 bg-background/70 sticky top-[calc(var(--navbar-height)+8px)] z-40 mb-6 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 backdrop-blur lg:hidden">
			<div className="min-w-0 text-sm font-medium">{activeTitle}</div>

			<Button
				variant="ghost"
				size="icon"
				onClick={() => setOpen(true)}
				aria-label="Open docs navigation"
				title="Open navigation"
			>
				<Menu className="h-4 w-4" />
			</Button>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent
					showCloseButton={true}
					className="top-0 left-0 h-dvh w-[320px] max-w-[85vw] translate-x-0 translate-y-0 gap-0 rounded-none p-0"
				>
					<div className="border-border/40 border-b p-4">
						<DialogHeader>
							<DialogTitle>Docs</DialogTitle>
						</DialogHeader>
					</div>

					<div className="min-h-0 flex-1 overflow-y-auto p-4">
						<DocsSidebar onNavigate={() => setOpen(false)} />
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
