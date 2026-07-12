"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DocsHeading } from "../lib/docsContent";
import { cn } from "@/lib/utils";

export function DocsToc({ headings }: { headings: DocsHeading[] }) {
	const [activeId, setActiveId] = useState(headings[0]?.id ?? "");
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (headings.length === 0) return;

		const headingElements = headings
			.map(({ id }) => document.getElementById(id))
			.filter((element): element is HTMLElement => element !== null);

		if (headingElements.length === 0) return;

		const updateActiveHeading = () => {
			const readingLine = 96;
			let current = headingElements[0].id;

			for (const heading of headingElements) {
				if (heading.getBoundingClientRect().top <= readingLine) {
					current = heading.id;
				} else {
					break;
				}
			}

			setActiveId(current);
		};

		const observer = new IntersectionObserver(updateActiveHeading, {
			rootMargin: "-96px 0px -65% 0px",
			threshold: [0, 1],
		});

		headingElements.forEach((heading) => observer.observe(heading));
		updateActiveHeading();

		return () => observer.disconnect();
	}, [headings]);

	useEffect(() => {
		const container = containerRef.current;
		const activeLink = container?.querySelector<HTMLElement>(
			`[data-heading-id="${CSS.escape(activeId)}"]`
		);

		if (!container || !activeLink) return;

		const containerRect = container.getBoundingClientRect();
		const linkRect = activeLink.getBoundingClientRect();
		const padding = 12;

		const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
			.matches
			? "auto"
			: "smooth";

		if (linkRect.top < containerRect.top + padding) {
			container.scrollBy({
				top: linkRect.top - containerRect.top - padding,
				behavior,
			});
		} else if (linkRect.bottom > containerRect.bottom - padding) {
			container.scrollBy({
				top: linkRect.bottom - containerRect.bottom + padding,
				behavior,
			});
		}
	}, [activeId]);

	if (headings.length === 0) return null;

	return (
		<div
			ref={containerRef}
			className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain text-sm"
		>
			<div className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
				On this page
			</div>

			<div className="flex flex-col gap-1.5 pb-2">
				{headings.map((h) => {
					const isActive = activeId === h.id;

					return (
						<Link
							key={h.id}
							href={`#${h.id}`}
							data-heading-id={h.id}
							onClick={() => setActiveId(h.id)}
							aria-current={isActive ? "location" : undefined}
							className={cn(
								"border-l-2 py-0.5 transition-colors",
								isActive
									? "border-primary text-foreground font-medium"
									: "text-muted-foreground hover:text-foreground border-transparent",
								h.depth === 3 ? "pl-3 text-xs" : "text-sm"
							)}
						>
							{h.text}
						</Link>
					);
				})}
			</div>
		</div>
	);
}
