import { cn } from "@/lib/utils";

type PageContainerProps = {
    children: React.ReactNode;
    className?: string;
    maxWidth?: "6xl" | "7xl" | "full";
    noLines?: boolean;
};

/**
 * Reusable page container component that provides consistent layout and spacing.
 * Extracted from the guild layout to standardize page containers across the app.
 */
export function PageContainer({
    children,
    className,
    maxWidth = "6xl",
    noLines = false,
}: PageContainerProps) {
    const maxWidthClass = {
        "6xl": "max-w-6xl",
        "7xl": "max-w-7xl",
        full: "max-w-full",
    }[maxWidth];

    return (
        <div
            className={cn(
                "container mx-auto p-8",
                maxWidthClass,
                className,
                noLines ? "" : "border-x border-white/10 border-dashed"
            )}
        >
            {children}
        </div>
    );
}
