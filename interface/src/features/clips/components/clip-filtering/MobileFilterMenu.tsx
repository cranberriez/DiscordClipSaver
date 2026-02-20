"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileFilterMenu() {
	const [isOpen, setIsOpen] = useState(false);

	const toggleMenu = () => {
		setIsOpen((prev) => !prev);
	};

	return (
		<div className="bg-sidebar flex items-center gap-2 rounded-xl p-1 sm:hidden">
			<MenuButton onClick={toggleMenu} isOpen={isOpen} />
		</div>
	);
}

function MenuButton({
	onClick,
	isOpen,
}: {
	onClick: () => void;
	isOpen: boolean;
}) {
	return (
		<button
			onClick={onClick}
			aria-label="Toggle menu"
			aria-expanded={isOpen}
			className="hover:bg-background/50 relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg"
		>
			<X
				className={`absolute opacity-${isOpen ? 100 : 0} transition-opacity`}
				size={32}
			/>
			<Menu
				className={`absolute opacity-${isOpen ? 0 : 100} transition-opacity`}
				size={32}
			/>
		</button>
	);
}
