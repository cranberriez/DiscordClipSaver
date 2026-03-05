import Link from "next/link";
import { DocsHeading } from "../lib/docsContent";
import { cn } from "@/lib/utils";

export function DocsToc({ headings }: { headings: DocsHeading[] }) {
	if (headings.length === 0) return null;

	return (
		<div className="text-sm">
			<div className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
				On this page
			</div>

			<div className="flex flex-col gap-2">
				{headings.map((h) => (
					<Link
						key={h.id}
						href={`#${h.id}`}
						className={cn(
							"text-muted-foreground hover:text-foreground transition-colors",
							h.depth === 3 ? "pl-3 text-xs" : "text-sm"
						)}
					>
						{h.text}
					</Link>
				))}
			</div>
		</div>
	);
}
