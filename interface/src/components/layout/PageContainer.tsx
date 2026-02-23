import { cn } from "@/lib/utils";
import React from "react";

type PageContainerProps = {
	children: React.ReactNode;
	className?: string;
	maxWidth?: "6xl" | "7xl" | "full";
};

/**
 * Reusable page container component that provides consistent layout and spacing.
 * Extracted from the guild layout to standardize page containers across the app.
 */
export const PageContainer = React.forwardRef<
	HTMLDivElement,
	PageContainerProps
>(({ children, className, maxWidth = "default" }, ref) => {
	const maxWidthClass = {
		default: "max-w-[1600px]",
		full: "max-w-full",
	}[maxWidth];

	return (
		<div
			ref={ref}
			className={cn(
				"container mx-auto p-4 sm:p-8",
				maxWidthClass,
				className
			)}
		>
			{children}
		</div>
	);
});

PageContainer.displayName = "PageContainer";
