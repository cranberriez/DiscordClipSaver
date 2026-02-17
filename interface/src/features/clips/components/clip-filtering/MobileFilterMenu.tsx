"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MobileFilterMenu() {
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => {
        setIsOpen(prev => !prev);
    };

    return (
        <div className="sm:hidden flex items-center gap-2 p-1 bg-sidebar rounded-xl">
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
            className="relative w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg hover:bg-background/50"
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
