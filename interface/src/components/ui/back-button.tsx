"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
    text: string;
    url: string;
    className?: string;
}

/**
 * Centralized back button component
 * 
 * Uses ghost variant with cursor-pointer for consistent navigation UX
 */
export function BackButton({ text, url, className }: BackButtonProps) {
    const router = useRouter();

    return (
        <Button
            variant="ghost"
            onClick={() => router.push(url)}
            className={cn("cursor-pointer", className)}
        >
            ← {text}
        </Button>
    );
}
