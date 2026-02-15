export function FilterNavButton({
    children,
    onClick,
    className,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
}) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 h-12 px-4 py-2 hover:bg-card/50 cursor-pointer group rounded-lg ${className} text-muted-foreground`}
        >
            {children}
        </button>
    );
}
