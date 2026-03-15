"use client";

import { Navbar } from "../composite/navbar";
import { useEffect, useState } from "react";
import { AnnouncementBar } from "./AnnouncementBar";

export function HeroNavScrollContainer() {
	const [hasScrolled, setHasScrolled] = useState(false);

	useEffect(() => {
		const handleScroll = () => {
			setHasScrolled(window.scrollY > 5);
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<div className="sticky top-0 z-99 flex flex-col">
			<AnnouncementBar />
			<Navbar
				containerClassName="mt-2 py-0!"
				className={`rounded-full bg-transparent transition-all duration-400 ${
					hasScrolled
						? "bg-sidebar/50 border-border/25 backdrop-blur-sm"
						: ""
				}`}
			/>
		</div>
	);
}
