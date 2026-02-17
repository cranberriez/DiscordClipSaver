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
            className={`flex items-center gap-2 h-10 px-2 hover:bg-background cursor-pointer group rounded-md ${className} text-foreground/75 hover:text-foreground `}
        >
            {children}
        </button>
    );
}
