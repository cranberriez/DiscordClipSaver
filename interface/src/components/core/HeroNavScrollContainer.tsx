"use client";

import { Navbar } from "../composite/navbar";
import { useEffect, useState } from "react";
import { AnnouncementBar } from "./AnnouncementBar";
import { cn } from "@/lib/utils";

export function HeroNavScrollContainer() {
	const [hasScrolled, setHasScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setHasScrolled(window.scrollY > window.innerHeight * 0.5);
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div className="z-99 flex flex-col">
			<AnnouncementBar />
			<div
				className={cn(
					"transition-opacity duration-300",
					hasScrolled ? "pointer-events-none opacity-0" : "opacity-100"
				)}
			>
				<Navbar
					containerClassName="mt-2 py-0!"
					className="rounded-full bg-transparent transition-all duration-400"
				/>
			</div>
			<div
				className={cn(
					"pointer-events-none fixed inset-x-0 top-0 z-99 -translate-y-full opacity-0 transition-all duration-400 ease-out",
					hasScrolled && "pointer-events-auto translate-y-0 opacity-100"
				)}
			>
				<Navbar
					containerClassName="mt-2 py-0!"
					className="border-border/25 bg-sidebar/50 rounded-full backdrop-blur-sm transition-all duration-400"
				/>
			</div>
		</div>
	);
}
